import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';

/**
 * MASTER CRON DISPATCHER
 * This route is intended to be called by a scheduled task (e.g., Windows Task Scheduler)
 * It scans the entire database for items needing reminders and triggers the respective dispatchers.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Security check (Optional but recommended)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    // if (secret !== process.env.CRON_SECRET) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const baseUrl = req.headers.get('host')?.includes('localhost') 
      ? `http://${req.headers.get('host')}` 
      : `https://${req.headers.get('host')}`;

    console.log(`[Cron] Starting global dispatch at ${new Date().toISOString()}`);
    const summary: any = { leads: 0, quotations: 0, deadlines: 0, services: 0, costing: 0 };
    const today = new Date();
    const todayStr = today.toDateString();

    // --- 1. LEADS FOLLOW-UP ---
    const leads = await Lead.find({ Lead_Status: { $nin: ['Converted', 'Cancelled'] } });
    for (const lead of leads) {
      let shouldAlert = false;
      const hasFollowUps = lead.Follow_Ups && lead.Follow_Ups.length > 0;
      const lastPending = hasFollowUps ? lead.Follow_Ups?.findLast((f: any) => f.Outcome === 'Pending') : null;

      if (!hasFollowUps) {
        const createDate = new Date(lead.Inquiry_Date || (lead as any).createdAt);
        const days = Math.ceil((today.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 5) shouldAlert = true;
      } else if (lastPending) {
        const followUpDate = new Date(lastPending.Followup_Date);
        const days = Math.ceil((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 3) shouldAlert = true;
      }

      if (shouldAlert) {
        await fetch(`${baseUrl}/api/whatsapp/lead-followup`, { method: 'POST', body: JSON.stringify({ leadId: lead._id }) });
        await fetch(`${baseUrl}/api/email/lead-followup`, { method: 'POST', body: JSON.stringify({ leadId: lead._id }) });
        summary.leads++;
      }
    }

    // --- 2. QUOTATIONS FOLLOW-UP ---
    const quotations = await Quotation.find({ Status: 'Pending' });
    for (const qtn of quotations) {
      let shouldAlert = false;
      const hasFollowUps = qtn.Follow_Ups && qtn.Follow_Ups.length > 0;
      const lastPending = hasFollowUps ? qtn.Follow_Ups?.findLast((f: any) => f.Outcome === 'Pending') : null;

      if (!hasFollowUps) {
        const createDate = new Date(qtn.Quotation_Date || (qtn as any).createdAt);
        const days = Math.ceil((today.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 5) shouldAlert = true;
      } else if (lastPending) {
        const followUpDate = new Date(lastPending.Followup_Date);
        const days = Math.ceil((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 3) shouldAlert = true;
      }

      if (shouldAlert) {
        await fetch(`${baseUrl}/api/whatsapp/quotation-followup`, { method: 'POST', body: JSON.stringify({ quotationId: qtn._id }) });
        await fetch(`${baseUrl}/api/email/quotation-followup`, { method: 'POST', body: JSON.stringify({ quotationId: qtn._id }) });
        summary.quotations++;
      }
    }

    // --- 3. PROJECT DEADLINES ---
    const activeProjects = await Project.find({ Pipeline_Status: { $in: ['Active', 'On Hold'] } });
    for (const project of activeProjects) {
        if (!project.Start_Details?.End_Date) continue;
        const endDate = new Date(project.Start_Details.End_Date);
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 7 && daysLeft >= 0) {
            await fetch(`${baseUrl}/api/whatsapp/deadline`, { method: 'POST', body: JSON.stringify({ projectId: (project as any)._id }) });
            await fetch(`${baseUrl}/api/email/deadline`, { method: 'POST', body: JSON.stringify({ projectId: (project as any)._id }) });
            summary.deadlines++;
        }
    }

    // --- 4. EXTERNAL SERVICES & PROJECT COSTING ---
    const allProjects = await Project.find({}); // All projects (global visibility)
    for (const project of allProjects) {
      // External Services
      if (project.External_Services?.length) {
        for (const service of project.External_Services as any[]) {
          if (!service.Reminder?.Enabled || (!service.Cycle_Anchor_Date && !service.Status_Date)) continue;
          
          // Re-using simplified ESB logic: Calculate next billing
          const baseDate = service.Cycle_Anchor_Date || service.Status_Date;
          const monthsInterval = service.Payment_Terms === 'Quarterly' ? 3 : service.Payment_Terms === 'Annually' ? 12 : 1;
          let nextBilling = new Date(baseDate);
          
          // Advance until we find the current/next cycle
          while (nextBilling <= today) { 
            nextBilling.setMonth(nextBilling.getMonth() + monthsInterval); 
          }
          
          const daysLeft = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const notifyBefore = service.Reminder.Notify_Before === '7 days before' ? 7 : 3;

          if (daysLeft <= notifyBefore && service.Billing_Status !== 'Received') {
            const payload = { 
              projectId: (project as any)._id, 
              serviceId: service._id, 
              currentDateIso: today.toISOString(), 
              nextBillingIso: nextBilling.toISOString() 
            };
            await fetch(`${baseUrl}/api/whatsapp/remind`, { method: 'POST', body: JSON.stringify(payload) });
            await fetch(`${baseUrl}/api/email/remind`, { method: 'POST', body: JSON.stringify(payload) });
            summary.services++;
          }
        }
      }

      // Project Costing
      const goLive = project.Go_Live;
      if (goLive?.GoLive_Date && goLive?.Payment_Schedule && project.Pipeline_Status !== 'Closed') {
        const anchorDate = new Date(goLive.GoLive_Date);
        let nextRenewal = new Date(anchorDate);
        const monthsPerCycle = goLive.Payment_Schedule === 'Monthly' ? 1 : goLive.Payment_Schedule === 'Quarterly' ? 3 : 12;
        
        const oneYearLater = new Date(anchorDate); 
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        while (nextRenewal <= today && nextRenewal < oneYearLater) {
          nextRenewal.setMonth(nextRenewal.getMonth() + monthsPerCycle);
        }

        const daysLeftCosting = Math.ceil((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeftCosting <= 5 && nextRenewal < oneYearLater && nextRenewal >= today) {
           const payload = { 
             projectId: (project as any)._id, 
             currentDateIso: today.toISOString(), 
             nextBillingIso: nextRenewal.toISOString() 
           };
           await fetch(`${baseUrl}/api/whatsapp/project-costing`, { method: 'POST', body: JSON.stringify(payload) });
           await fetch(`${baseUrl}/api/email/project-costing`, { method: 'POST', body: JSON.stringify(payload) });
           summary.costing++;
        }
      }
    }

    return NextResponse.json({ success: true, summary, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Cron Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
