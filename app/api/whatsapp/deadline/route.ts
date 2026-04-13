import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import SystemConfig from '@/models/SystemConfig';
import NotificationConfig from '@/models/NotificationConfig';

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
    if (!deadlineTrigger.Channels.includes('WhatsApp')) {
      return NextResponse.json({ message: 'WhatsApp channel is disabled for Project Deadline Alert.' }, { status: 200 });
    }

    const project = await Project.findById(projectId).populate('Client_Reference');
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Deduplication: only send once per day (Cross-channel synchronized)
    const today = new Date();
    const todayStr = today.toDateString();
    
    const lastWA = project.Deadline_Alert?.Last_WA_Sent_Date;
    const lastEmail = project.Deadline_Alert?.Last_Email_Sent_Date;
    
    if (lastWA && new Date(lastWA).toDateString() === todayStr) {
      console.log(`[WhatsApp Deadline] Already sent today (WA) for Project: ${projectId}`);
      return NextResponse.json({ message: 'Deadline WhatsApp already sent today.' }, { status: 200 });
    }
    if (lastEmail && new Date(lastEmail).toDateString() === todayStr) {
      console.log(`[WhatsApp Deadline] Already sent today (Email) for Project: ${projectId}`);
      return NextResponse.json({ message: 'Deadline Email already sent today. Skipping WhatsApp.' }, { status: 200 });
    }

    // Update tracking
    if (!project.Deadline_Alert) (project as any).Deadline_Alert = {};
    project.Deadline_Alert!.Last_WA_Sent_Date = today;
    await project.save();

    // Fetch admin WhatsApp from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const internalNumber = globalSettings?.Admin_WhatsApp || '';

    const endDate = project.Start_Details?.End_Date;
    const daysLeft = endDate ? Math.ceil((new Date(endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : '?';

    const messageText = `*⚠️ Project Deadline Alert:*
Project: ${project.Project_ID} - ${project.Project_Name}
Assigned: ${project.Start_Details?.Assigned_Person || 'Unassigned'}
Deadline: ${endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'Not Set'}
Days Remaining: ${daysLeft}
Status: ${project.Pipeline_Status}
This is an automated alert from PMS.`;

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER;
    const waApiUrl = process.env.WHATSAPP_API_URL;

    const sendWhatsApp = async (to: string, text: string) => {
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      if (waApiUrl) {
        await fetch(waApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}` },
          body: JSON.stringify({ to: formattedTo, body: text })
        });
      } else if (twilioAccountSid && twilioAuthToken) {
        const client = require('twilio')(twilioAccountSid, twilioAuthToken);
        await client.messages.create({
          body: text,
          from: twilioPhone || 'whatsapp:+14155238886',
          to: formattedTo
        });
      } else {
        console.warn('WhatsApp API not configured. Skipping dispatch.');
      }
    };

    try {
      if (internalNumber) {
        await sendWhatsApp(internalNumber, messageText);
      }
    } catch (err: any) {
      return NextResponse.json({ error: `WhatsApp failed: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
