import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import SystemConfig from '@/models/SystemConfig';
import NotificationConfig from '@/models/NotificationConfig';
import { sendEmail } from '@/lib/emailTransport';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { projectId, serviceId, currentDateIso, nextBillingIso, isOneTime } = body;

    if (!projectId || !serviceId || !currentDateIso) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // --- GLOBAL OVERRIDE: Check Notification Master ---
    const billingTrigger = await NotificationConfig.findOne({
      Event_Name: { $regex: /^Billing Reminder$/i }
    });
    if (!billingTrigger || !billingTrigger.IsEnabled) {
      return NextResponse.json({ message: 'Billing Reminder trigger is disabled in Notification Master.' }, { status: 200 });
    }
    if (!billingTrigger.Channels.includes('Email')) {
      return NextResponse.json({ message: 'Email channel is disabled for Billing Reminder.' }, { status: 200 });
    }

    const project = await Project.findById(projectId).populate('Client_Reference');
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const service: any = project.External_Services.find((s: any) => s._id.toString() === serviceId);
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    const currentDate = new Date(currentDateIso);
    const nextBillingDate = new Date(nextBillingIso);

    // Concurrency check based on DB fields (mirroring WhatsApp logic)
    let shouldUpdateDB = false;

    if (isOneTime) {
      const lesd = service.Reminder?.Last_Email_Sent_Date;
      if (lesd && lesd.toDateString() === currentDate.toDateString()) {
        return NextResponse.json({ message: 'Already sent for today (One Time).' }, { status: 200 });
      }
      if (!service.Reminder) service.Reminder = {};
      service.Reminder.Last_Email_Sent_Date = currentDate;
      shouldUpdateDB = true;
    } else {
      const lesb = service.Reminder?.Last_Email_Sent_Billing_Date;
      if (lesb && lesb.getTime() === nextBillingDate.getTime()) {
        return NextResponse.json({ message: 'Already sent for this billing cycle.' }, { status: 200 });
      }
      if (!service.Reminder) service.Reminder = {};
      service.Reminder.Last_Email_Sent_Billing_Date = nextBillingDate;
      shouldUpdateDB = true;
    }

    if (shouldUpdateDB) {
      await project.save();
    }

    // Fetch admin email from Global System Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const adminEmail = globalSettings?.Admin_Email || '';

    const clientRef: any = project.Client_Reference;

    const subject = `Payment Reminder: ${service.Service_Name} — ${project.Project_Name}`;
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 20px 24px; border-radius: 10px 10px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700;">💳 Payment Reminder</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; font-weight: 600; width: 120px;">Project:</td><td>${project.Project_ID} — ${project.Project_Name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Client:</td><td>${clientRef?.Client_Name || clientRef?.Company_Name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Service:</td><td>${service.Service_Name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Amount:</td><td style="font-weight: 700; color: #059669;">₹${service.Amount}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated notification from PMS.</p>
        </div>
      </div>
    `;

    try {
      // --- ADMIN EMAIL (ACTIVE) ---
      if (adminEmail) {
        await sendEmail(adminEmail, subject, htmlBody);
      }

      // --- CLIENT EMAIL (COMMENTED OUT AS PER WHATSAPP PATTERN) ---
      /*
      const clientEmail = clientRef?.Email;
      if (clientEmail) {
        const clientSubject = `Payment Reminder: ${service.Service_Name}`;
        const clientHtml = `<p>Dear ${clientRef?.Client_Name || 'Valued Client'},</p>
        <p>This is a gentle reminder that the payment of ₹${service.Amount} for <strong>${service.Service_Name}</strong> is due soon.</p>
        <p>Please process the payment at your earliest convenience.</p>`;
        await sendEmail(clientEmail, clientSubject, clientHtml);
      }
      */
    } catch (err: any) {
      return NextResponse.json({ error: `Email failed to send: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
