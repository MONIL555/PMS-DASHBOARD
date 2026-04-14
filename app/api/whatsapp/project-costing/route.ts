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
    const costingTrigger = await NotificationConfig.findOne({
      Event_Name: { $regex: /^Project Costing Reminder$/i }
    });
    if (!costingTrigger || !costingTrigger.IsEnabled) {
      return NextResponse.json({ message: 'Project Costing Reminder is disabled in Notification Master.' }, { status: 200 });
    }
    if (!costingTrigger.Channels.includes('WhatsApp')) {
      return NextResponse.json({ message: 'WhatsApp channel is disabled for Project Costing Reminder.' }, { status: 200 });
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
      return NextResponse.json({ message: 'Payment already collected for this costing cycle. Skipping notification.' }, { status: 200 });
    }

    // Deduplication: check if already sent for this billing cycle
    const lastSentWA = project.Go_Live?.Renewal_Reminder?.Last_WA_Sent_Billing_Date;
    const lastSentEmail = project.Go_Live?.Renewal_Reminder?.Last_Email_Sent_Billing_Date;
    
    if (lastSentWA && new Date(lastSentWA).getTime() === nextBillingDate.getTime()) {
      return NextResponse.json({ message: 'Project costing WhatsApp already sent for this cycle.' }, { status: 200 });
    }
    if (lastSentEmail && new Date(lastSentEmail).getTime() === nextBillingDate.getTime()) {
      return NextResponse.json({ message: 'Project costing Email already sent for this cycle. Skipping WhatsApp.' }, { status: 200 });
    }

    // Update tracking
    if (!project.Go_Live) (project as any).Go_Live = {};
    if (!project.Go_Live.Renewal_Reminder) (project.Go_Live as any).Renewal_Reminder = {};
    project.Go_Live.Renewal_Reminder!.Last_WA_Sent_Billing_Date = nextBillingDate;
    project.Go_Live.Renewal_Reminder!.Last_WA_Sent_Date = currentDate;
    await project.save();

    // Logic: Calculate Installment Amount (Match ES pattern)
    const totalCosting = project.Start_Details?.Costing || 0;
    const schedule = project.Go_Live?.Payment_Schedule || 'Annually';
    let installmentAmount = totalCosting;

    if (schedule === 'Monthly') installmentAmount = totalCosting / 12;
    else if (schedule === 'Quarterly') installmentAmount = totalCosting / 4;

    // Fetch admin WhatsApp from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const internalNumber = globalSettings?.Admin_WhatsApp || '';

    const clientRef: any = project.Client_Reference;
    
    const messageText = `*💸 Project Costing Payment Reminder:*
Project: ${project.Project_ID} - ${project.Project_Name}
Client: ${clientRef?.Company_Name || clientRef?.Client_Name || 'N/A'}
Installment: ₹${Math.round(installmentAmount).toLocaleString()} (${schedule})
Due Date: ${nextBillingDate.toLocaleDateString('en-IN')}
Status: ${project.Pipeline_Status}
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
