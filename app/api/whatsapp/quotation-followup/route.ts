import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import SystemConfig from '@/models/SystemConfig';
import NotificationConfig from '@/models/NotificationConfig';

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
    if (!followupTrigger.Channels.includes('WhatsApp')) {
      return NextResponse.json({ message: 'WhatsApp channel is disabled for Quotation Follow-up.' }, { status: 200 });
    }

    const quotation = await Quotation.findById(quotationId)
      .populate('Client_Reference', 'Company_Name Client_Name Contact_Number')
      .populate('Product_Reference', 'Type SubType SubSubType');
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    // Deduplication: only send once per day
    const today = new Date();
    const todayStr = today.toDateString();
    const lastSent = quotation.Followup_Alert?.Last_WA_Sent_Date;
    if (lastSent && new Date(lastSent).toDateString() === todayStr) {
      return NextResponse.json({ message: 'Follow-up WhatsApp already sent today.' }, { status: 200 });
    }

    // Update tracking
    if (!quotation.Followup_Alert) (quotation as any).Followup_Alert = {};
    quotation.Followup_Alert!.Last_WA_Sent_Date = today;
    await quotation.save();

    // Fetch admin WhatsApp from Global Settings
    const globalSettings = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    const internalNumber = globalSettings?.Admin_WhatsApp || '';

    const clientRef: any = quotation.Client_Reference;
    const productRef: any = quotation.Product_Reference;
    const productName = productRef?.SubSubType || productRef?.SubType || productRef?.Type || 'N/A';

    const pendingFollowUps = quotation.Follow_Ups?.filter((f: any) => f.Outcome === 'Pending') || [];
    const lastFollowUp = pendingFollowUps.length > 0 ? pendingFollowUps[pendingFollowUps.length - 1] : null;

    const messageText = `*📋 Quotation Follow-up Reminder:*
Quotation: ${quotation.Quotation_ID}
Client: ${clientRef?.Company_Name || clientRef?.Client_Name || 'N/A'}
Service: ${productName}
Value: ₹${quotation.Commercial?.toLocaleString() || '0'}
Status: ${quotation.Quotation_Status}
${lastFollowUp ? `Last Follow-up: ${new Date(lastFollowUp.Followup_Date).toLocaleDateString('en-IN')}
Remarks: ${lastFollowUp.Remarks || 'None'}` : 'No follow-ups recorded yet.'}
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
