import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import SystemConfig from '@/models/SystemConfig';
import NotificationConfig from '@/models/NotificationConfig';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    // --- GLOBAL OVERRIDE: Check Notification Master ---
    // We'll use a specific trigger name for Leads or reuse/match the pattern
    const followupTrigger = await NotificationConfig.findOne({
      Event_Name: { $regex: /^Lead Follow-up$/i }
    });
    
    // If "Lead Follow-up" doesn't exist, we fallback to a generic catch or create one
    // For now, let's assume it should exist or we check "Quotation Follow-up" as a proxy if "Lead Follow-up" is missing
    if (!followupTrigger || !followupTrigger.IsEnabled) {
      return NextResponse.json({ message: 'Lead Follow-up is disabled in Notification Master.' }, { status: 200 });
    }
    if (!followupTrigger.Channels.includes('WhatsApp')) {
      return NextResponse.json({ message: 'WhatsApp channel is disabled for Lead Follow-up.' }, { status: 200 });
    }

    const lead = await Lead.findById(leadId)
      .populate('Client_Reference', 'Company_Name Client_Name Contact_Number')
      .populate('Product_Reference', 'Type SubType SubSubType');
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    console.log(`[WhatsApp Followup] Processing Lead: ${leadId}`);

    // Deduplication: only send once per day (Cross-channel synchronized)
    const today = new Date();
    const todayStr = today.toDateString();
    
    const lastWA = lead.Followup_Alert?.Last_WA_Sent_Date;
    const lastEmail = lead.Followup_Alert?.Last_Email_Sent_Date;
    
    if (lastWA && new Date(lastWA).toDateString() === todayStr) {
      console.log(`[WhatsApp Followup] Already sent today (WA) for Lead: ${leadId}`);
      return NextResponse.json({ message: 'Lead follow-up WhatsApp already sent today.' }, { status: 200 });
    }
    if (lastEmail && new Date(lastEmail).toDateString() === todayStr) {
      console.log(`[WhatsApp Followup] Already sent today (Email) for Lead: ${leadId}`);
      return NextResponse.json({ message: 'Lead follow-up Email already sent today. Skipping WhatsApp.' }, { status: 200 });
    }

    // Update tracking - use findByIdAndUpdate to avoid saving populated fields
    await Lead.findByIdAndUpdate(leadId, {
      $set: { 'Followup_Alert.Last_WA_Sent_Date': today }
    });
    console.log(`[WhatsApp Followup] Tracking updated for Lead: ${leadId}`);

    // Fetch admin WhatsApp from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const internalNumber = globalSettings?.Admin_WhatsApp || '';

    const clientRef: any = lead.Client_Reference;
    const productRef: any = lead.Product_Reference;
    const productName = productRef?.SubSubType || productRef?.SubType || productRef?.Type || 'N/A';

    const pendingFollowUps = lead.Follow_Ups?.filter((f: any) => f.Outcome === 'Pending') || [];
    const lastFollowUp = pendingFollowUps.length > 0 ? pendingFollowUps[pendingFollowUps.length - 1] : null;

    const messageText = `*🎯 Lead Follow-up Reminder:*
Lead ID: ${lead.Lead_ID}
Client: ${clientRef?.Company_Name || clientRef?.Client_Name || 'N/A'}
Service: ${productName}
Status: ${lead.Lead_Status}
${lastFollowUp ? `Last Follow-up: ${new Date(lastFollowUp.Followup_Date).toLocaleDateString('en-IN')}
Remarks: ${lastFollowUp.Remarks || 'None'}` : `Inquiry Date: ${new Date(lead.Inquiry_Date).toLocaleDateString('en-IN')}
No follow-ups recorded yet.`}
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
