import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
// SystemConfig import removed — recipients now stored per-event on NotificationConfig
import NotificationConfig from '@/models/NotificationConfig';
import { sendEmail } from '@/lib/emailTransport';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // --- GLOBAL OVERRIDE: Check Notification Master ---
    const deadlineTrigger = await NotificationConfig.findOne({
      Event_Name: { $regex: /^Project Deadline Alert$/i }
    });
    if (!deadlineTrigger || !deadlineTrigger.IsEnabled) {
      return NextResponse.json({ message: 'Project Deadline Alert is disabled in Notification Master.' }, { status: 200 });
    }
    if (!deadlineTrigger.Channels.includes('Email')) {
      return NextResponse.json({ message: 'Email channel is disabled for Project Deadline Alert.' }, { status: 200 });
    }

    const project = await Project.findById(projectId).populate('Client_Reference');
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Deduplication: only send once per day (Cross-channel synchronized)
    const today = new Date();
    const todayStr = today.toDateString();
    
    const lastEmail = project.Deadline_Alert?.Last_Email_Sent_Date;
    const lastWA = project.Deadline_Alert?.Last_WA_Sent_Date;
    
    if (lastEmail && new Date(lastEmail).toDateString() === todayStr) {
      console.log(`[Email Deadline] Already sent today (Email) for Project: ${projectId}`);
      return NextResponse.json({ message: 'Deadline email already sent today.' }, { status: 200 });
    }
    if (lastWA && new Date(lastWA).toDateString() === todayStr) {
      console.log(`[Email Deadline] Already sent today (WA) for Project: ${projectId}`);
      return NextResponse.json({ message: 'Deadline WhatsApp already sent today. Skipping Email.' }, { status: 200 });
    }

    // Update tracking
    if (!project.Deadline_Alert) (project as any).Deadline_Alert = {};
    project.Deadline_Alert!.Last_Email_Sent_Date = today;
    await project.save();

    // Fetch internal recipients from the trigger (consolidated list)
    const internalRecipients = deadlineTrigger.Internal_Recipients || [];

    const endDate = project.Start_Details?.End_Date;
    const daysLeft = endDate ? Math.ceil((new Date(endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const subject = `⚠️ Deadline Alert: ${project.Project_Name} — ${daysLeft !== null ? `${daysLeft} day(s) remaining` : 'No deadline set'}`;
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px 24px; border-radius: 10px 10px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700;">⚠️ Project Deadline Alert</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; font-weight: 600; width: 140px;">Project:</td><td>${project.Project_ID} — ${project.Project_Name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Assigned To:</td><td>${project.Start_Details?.Assigned_Person || 'Unassigned'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Deadline:</td><td style="font-weight: 700; color: ${daysLeft !== null && daysLeft <= 3 ? '#dc2626' : '#d97706'};">${endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Set'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Days Remaining:</td><td style="font-weight: 700; color: ${daysLeft !== null && daysLeft <= 3 ? '#dc2626' : '#059669'};">${daysLeft !== null ? `${daysLeft} day(s)` : 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600;">Status:</td><td>${project.Pipeline_Status}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated alert from PMS.</p>
        </div>
      </div>
    `;

    try {
      // Send to each internal recipient who has an email defined
      for (const recipient of internalRecipients) {
        if (recipient.email) {
          await sendEmail(recipient.email, subject, htmlBody);
        }
      }
    } catch (err: any) {
      return NextResponse.json({ error: `Email failed: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
