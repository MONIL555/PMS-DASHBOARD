import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import SystemConfig from '@/models/SystemConfig';
import NotificationConfig from '@/models/NotificationConfig';
import { sendEmail } from '@/lib/emailTransport';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    // --- GLOBAL OVERRIDE: Check Notification Master ---
    const followupTrigger = await NotificationConfig.findOne({
      Event_Name: { $regex: /^Lead Follow-up$/i }
    });
    if (!followupTrigger || !followupTrigger.IsEnabled) {
      return NextResponse.json({ message: 'Lead Follow-up is disabled in Notification Master.' }, { status: 200 });
    }
    if (!followupTrigger.Channels.includes('Email')) {
      return NextResponse.json({ message: 'Email channel is disabled for Lead Follow-up.' }, { status: 200 });
    }

    const lead = await Lead.findById(leadId)
      .populate('Client_Reference', 'Company_Name Client_Name Email')
      .populate('Product_Reference', 'Type SubType SubSubType');
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    console.log(`[Email Followup] Processing Lead: ${leadId}`);

    // Deduplication: only send once per day
    const today = new Date();
    const todayStr = today.toDateString();
    const lastSent = lead.Followup_Alert?.Last_Email_Sent_Date;
    if (lastSent && new Date(lastSent).toDateString() === todayStr) {
      console.log(`[Email Followup] Already sent today for Lead: ${leadId}`);
      return NextResponse.json({ message: 'Lead follow-up email already sent today.' }, { status: 200 });
    }

    // Update tracking - use findByIdAndUpdate to avoid saving populated fields
    await Lead.findByIdAndUpdate(leadId, {
      $set: { 'Followup_Alert.Last_Email_Sent_Date': today }
    });
    console.log(`[Email Followup] Tracking updated for Lead: ${leadId}`);

    // Fetch admin email from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const adminEmail = globalSettings?.Admin_Email || '';

    const clientRef: any = lead.Client_Reference;
    const productRef: any = lead.Product_Reference;
    const productName = productRef?.SubSubType || productRef?.SubType || productRef?.Type || 'N/A';

    const pendingFollowUps = lead.Follow_Ups?.filter((f: any) => f.Outcome === 'Pending') || [];
    const lastFollowUp = pendingFollowUps.length > 0 ? pendingFollowUps[pendingFollowUps.length - 1] : null;

    const subject = `🎯 Lead Follow-up Reminder: ${lead.Lead_ID} — ${clientRef?.Company_Name || 'Client'}`;
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 20px 24px; border-radius: 10px 10px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700;">🎯 Lead Follow-up Reminder</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; font-weight: 600; width: 130px;">Lead ID:</td><td>${lead.Lead_ID}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Client:</td><td>${clientRef?.Company_Name || clientRef?.Client_Name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Service:</td><td>${productName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Status:</td><td><span style="padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; background: #dbeafe; color: #1e40af;">${lead.Lead_Status}</span></td></tr>
            ${lastFollowUp ? `
            <tr><td colspan="2" style="padding-top: 12px;"><hr style="border: none; border-top: 1px solid #e2e8f0;" /></td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Last Follow-up:</td><td>${new Date(lastFollowUp.Followup_Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Remarks:</td><td style="color: #64748b; font-style: italic;">${lastFollowUp.Remarks || 'None'}</td></tr>
            ` : `
            <tr><td colspan="2" style="padding-top: 12px;"><hr style="border: none; border-top: 1px solid #e2e8f0;" /></td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Inquiry Date:</td><td>${new Date(lead.Inquiry_Date).toLocaleDateString('en-IN')}</td></tr>
            <tr><td colspan="2" style="padding: 8px 0; color: #f59e0b; font-weight: 600;">⚠️ Initial follow-up overdue.</td></tr>
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
