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
    const { projectId, currentDateIso, nextBillingIso } = body;

    if (!projectId || !currentDateIso || !nextBillingIso) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // --- GLOBAL OVERRIDE: Check Notification Master ---
    const billingTrigger = await NotificationConfig.findOne({
      Event_Name: { $regex: /^Billing Reminder$/i }
    });
    if (!billingTrigger || !billingTrigger.IsEnabled) {
      return NextResponse.json({ message: 'Billing Reminder is disabled in Notification Master.' }, { status: 200 });
    }
    if (!billingTrigger.Channels.includes('Email')) {
      return NextResponse.json({ message: 'Email channel is disabled for Billing Reminder.' }, { status: 200 });
    }

    const project = await Project.findById(projectId).populate('Client_Reference');
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const currentDate = new Date(currentDateIso);
    const nextBillingDate = new Date(nextBillingIso);

    // --- NEW: Check if cycle is already paid ---
    const isPaid = (project.Go_Live?.Payment_History || []).some((ph: any) =>
      new Date(ph.Cycle_Date).getTime() === nextBillingDate.getTime()
    );
    if (isPaid) {
      return NextResponse.json({ message: 'Payment already collected for this renewal cycle. Skipping notification.' }, { status: 200 });
    }

    // Deduplication: check if already sent for this billing cycle
    const lastSent = project.Go_Live?.Renewal_Reminder?.Last_Email_Sent_Billing_Date;
    if (lastSent && new Date(lastSent).getTime() === nextBillingDate.getTime()) {
      return NextResponse.json({ message: 'Already sent for this renewal cycle.' }, { status: 200 });
    }

    // Update tracking
    if (!project.Go_Live) (project as any).Go_Live = {};
    if (!project.Go_Live.Renewal_Reminder) (project.Go_Live as any).Renewal_Reminder = {};
    project.Go_Live.Renewal_Reminder!.Last_Email_Sent_Billing_Date = nextBillingDate;
    project.Go_Live.Renewal_Reminder!.Last_Email_Sent_Date = currentDate;
    await project.save();

    // Fetch admin email from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const adminEmail = globalSettings?.Admin_Email || '';

    const clientRef: any = project.Client_Reference;
    const daysLeft = Math.ceil((nextBillingDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    const subject = `💳 Renewal Due: ${project.Project_Name} — ₹${project.Go_Live?.Renewal_Rate?.toLocaleString() || '0'} (${daysLeft} day(s))`;
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 20px 24px; border-radius: 10px 10px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700;">💳 Project Renewal Reminder</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; font-weight: 600; width: 140px;">Project:</td><td>${project.Project_ID} — ${project.Project_Name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Client:</td><td>${clientRef?.Company_Name || clientRef?.Client_Name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Renewal Amount:</td><td style="font-weight: 700; color: #8b5cf6;">₹${project.Go_Live?.Renewal_Rate?.toLocaleString() || '0'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Schedule:</td><td>${project.Go_Live?.Payment_Schedule || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Due Date:</td><td style="font-weight: 700; color: ${daysLeft <= 3 ? '#dc2626' : '#059669'};">${nextBillingDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Days Left:</td><td style="font-weight: 700; color: ${daysLeft <= 3 ? '#dc2626' : '#059669'};">${daysLeft} day(s)</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated notification from PMS.</p>
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
