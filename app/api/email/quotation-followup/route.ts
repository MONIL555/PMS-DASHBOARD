import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import SystemConfig from '@/models/SystemConfig';
import NotificationConfig from '@/models/NotificationConfig';
import { sendEmail } from '@/lib/emailTransport';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { quotationId } = body;

    if (!quotationId) {
      return NextResponse.json({ error: 'Missing quotationId' }, { status: 400 });
    }

    // --- GLOBAL OVERRIDE: Check Notification Master ---
    const followupTrigger = await NotificationConfig.findOne({
      Event_Name: { $regex: /^Quotation Follow-up$/i }
    });
    if (!followupTrigger || !followupTrigger.IsEnabled) {
      return NextResponse.json({ message: 'Quotation Follow-up is disabled in Notification Master.' }, { status: 200 });
    }
    if (!followupTrigger.Channels.includes('Email')) {
      return NextResponse.json({ message: 'Email channel is disabled for Quotation Follow-up.' }, { status: 200 });
    }

    const quotation = await Quotation.findById(quotationId)
      .populate('Client_Reference', 'Company_Name Client_Name Email')
      .populate('Product_Reference', 'Type SubType SubSubType');
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    // Deduplication: only send once per day (Cross-channel synchronized)
    const today = new Date();
    const todayStr = today.toDateString();
    
    const lastEmail = quotation.Followup_Alert?.Last_Email_Sent_Date;
    const lastWA = quotation.Followup_Alert?.Last_WA_Sent_Date;
    
    if (lastEmail && new Date(lastEmail).toDateString() === todayStr) {
      console.log(`[Email Followup] Already sent today (Email) for Quotation: ${quotationId}`);
      return NextResponse.json({ message: 'Follow-up email already sent today.' }, { status: 200 });
    }
    if (lastWA && new Date(lastWA).toDateString() === todayStr) {
      console.log(`[Email Followup] Already sent today (WA) for Quotation: ${quotationId}`);
      return NextResponse.json({ message: 'Follow-up WhatsApp already sent today. Skipping Email.' }, { status: 200 });
    }

    // Update tracking
    if (!quotation.Followup_Alert) (quotation as any).Followup_Alert = {};
    quotation.Followup_Alert!.Last_Email_Sent_Date = today;
    await quotation.save();

    // Fetch admin email from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const adminEmail = globalSettings?.Admin_Email || '';

    const clientRef: any = quotation.Client_Reference;
    const productRef: any = quotation.Product_Reference;
    const productName = productRef?.SubSubType || productRef?.SubType || productRef?.Type || 'N/A';

    const pendingFollowUps = quotation.Follow_Ups?.filter((f: any) => f.Outcome === 'Pending') || [];
    const lastFollowUp = pendingFollowUps.length > 0 ? pendingFollowUps[pendingFollowUps.length - 1] : null;

    const subject = `📋 Follow-up Reminder: ${quotation.Quotation_ID} — ${clientRef?.Company_Name || 'Client'}`;
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px 24px; border-radius: 10px 10px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700;">📋 Quotation Follow-up Reminder</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; font-weight: 600; width: 130px;">Quotation:</td><td>${quotation.Quotation_ID}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Client:</td><td>${clientRef?.Company_Name || clientRef?.Client_Name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Service:</td><td>${productName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Value:</td><td style="font-weight: 700; color: #059669;">₹${quotation.Commercial?.toLocaleString() || '0'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Status:</td><td><span style="padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; background: #fef3c7; color: #b45309;">${quotation.Quotation_Status}</span></td></tr>
            ${lastFollowUp ? `
            <tr><td colspan="2" style="padding-top: 12px;"><hr style="border: none; border-top: 1px solid #e2e8f0;" /></td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Last Follow-up:</td><td>${new Date(lastFollowUp.Followup_Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Remarks:</td><td style="color: #64748b; font-style: italic;">${lastFollowUp.Remarks || 'None'}</td></tr>
            ` : `
            <tr><td colspan="2" style="padding-top: 12px;"><hr style="border: none; border-top: 1px solid #e2e8f0;" /></td></tr>
            <tr><td colspan="2" style="padding: 8px 0; color: #ef4444; font-weight: 600;">⚠️ No follow-ups recorded yet — initial contact overdue.</td></tr>
            `}
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated reminder from PMS.</p>
        </div>
      </div>
    `;

    try {
      if (adminEmail) {
        await sendEmail(adminEmail, subject, htmlBody);
      }
    } catch (err: any) {
      return NextResponse.json({ error: `Email failed: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
