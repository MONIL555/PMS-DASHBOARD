import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import SystemConfig from '@/models/SystemConfig';
import NotificationConfig from '@/models/NotificationConfig';

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
    if (!billingTrigger.Channels.includes('WhatsApp')) {
      return NextResponse.json({ message: 'WhatsApp channel is disabled for Billing Reminder.' }, { status: 200 });
    }

    const project = await Project.findById(projectId).populate('Client_Reference');
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const currentDate = new Date(currentDateIso);
    const nextBillingDate = new Date(nextBillingIso);

    // Deduplication: check if already sent for this billing cycle
    const lastSent = project.Go_Live?.Renewal_Reminder?.Last_WA_Sent_Billing_Date;
    if (lastSent && new Date(lastSent).getTime() === nextBillingDate.getTime()) {
      return NextResponse.json({ message: 'Already sent for this renewal cycle.' }, { status: 200 });
    }

    // Update tracking
    if (!project.Go_Live) (project as any).Go_Live = {};
    if (!project.Go_Live.Renewal_Reminder) (project.Go_Live as any).Renewal_Reminder = {};
    project.Go_Live.Renewal_Reminder!.Last_WA_Sent_Billing_Date = nextBillingDate;
    project.Go_Live.Renewal_Reminder!.Last_WA_Sent_Date = currentDate;
    await project.save();

    // Fetch admin WhatsApp from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const internalNumber = globalSettings?.Admin_WhatsApp || '';

    const clientRef: any = project.Client_Reference;
    const daysLeft = Math.ceil((nextBillingDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    const messageText = `*💳 Project Renewal Reminder:*
Project: ${project.Project_ID} - ${project.Project_Name}
Client: ${clientRef?.Company_Name || clientRef?.Client_Name || 'N/A'}
Renewal Amount: ₹${project.Go_Live?.Renewal_Rate?.toLocaleString() || '0'}
Schedule: ${project.Go_Live?.Payment_Schedule || 'N/A'}
Due Date: ${nextBillingDate.toLocaleDateString('en-IN')}
Days Left: ${daysLeft}
This is an automated reminder from PMS.`;

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
