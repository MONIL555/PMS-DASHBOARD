import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { projectId, serviceId, currentDateIso, nextBillingIso, isOneTime } = body;

    if (!projectId || !serviceId || !currentDateIso) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const project = await Project.findById(projectId).populate('Client_Reference');
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const service: any = project.External_Services.find((s: any) => s._id.toString() === serviceId);
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    const currentDate = new Date(currentDateIso);
    const nextBillingDate = new Date(nextBillingIso);
    
    // Concurrency check based on DB fields
    // Ensure we haven't already fired completely for this timeframe
    let shouldUpdateDB = false;
    
    if (isOneTime) {
       const lwsd = service.Reminder.Last_WA_Sent_Date;
       if (lwsd && lwsd.toDateString() === currentDate.toDateString()) {
           return NextResponse.json({ message: 'Already sent for today (One Time).' }, { status: 200 });
       }
       service.Reminder.Last_WA_Sent_Date = currentDate;
       shouldUpdateDB = true;
    } else {
       const lwsb = service.Reminder.Last_WA_Sent_Billing_Date;
       if (lwsb && lwsb.getTime() === nextBillingDate.getTime()) {
           return NextResponse.json({ message: 'Already sent for this billing cycle.' }, { status: 200 });
       }
       service.Reminder.Last_WA_Sent_Billing_Date = nextBillingDate;
       shouldUpdateDB = true;
    }

    if (shouldUpdateDB) {
       await project.save();
    }

    // Prepare WhatsApp Message Content
    const clientRef: any = project.Client_Reference; // Populated
    const internalNumber = process.env.INTERNAL_WHATSAPP_NUMBER || '';
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER;
    const waApiUrl = process.env.WHATSAPP_API_URL;
    
    const messageText = `*Payment Reminder:*
Project: ${project.Project_ID} - ${project.Project_Name}
Client: ${clientRef?.Client_Name || clientRef?.Company_Name}
Service: ${service.Service_Name}
Amount: ₹${service.Amount}
This is an automated notification from PMS.`;

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
          console.warn('WhatsApp API environment variables not configured. Skipping active dispatch.');
       }
    };
    
    try {
        // --- ADMIN / US LOGIC (ACTIVE) ---
        if (internalNumber) {
           await sendWhatsApp(internalNumber, messageText);
        }
        
        // --- CLIENT LOGIC (COMMENTED OUT AS REQUESTED) ---
        /*
        const clientNumber = clientRef?.Contact_Number;
        if (clientNumber) {
           const clientMessage = `Dear ${clientRef?.Client_Name || 'Valued Client'},

This is a gentle reminder that the payment of ₹${service.Amount} for ${service.Service_Name} is due soon.

Please process the payment at your earliest convenience.`;
           await sendWhatsApp(clientNumber, clientMessage);
        }
        */
    } catch(err: any) {
        return NextResponse.json({ error: `Message failed to send: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
