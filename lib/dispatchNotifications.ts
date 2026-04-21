/**
 * lib/dispatchNotifications.ts
 * 
 * Core notification dispatch logic — extracted so it can be called from:
 *  1. The built-in daily scheduler (instrumentation.ts) at 9:15 AM
 *  2. Admin login trigger (with 6-hour rate limit)
 *
 * No external cron service required.
 */

import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
import SystemConfig from '@/models/SystemConfig';

const RATE_LIMIT_HOURS = 6; // Minimum hours between login-triggered dispatches

/** Returns true if dispatch should run based on last run time */
export async function shouldDispatch(reason: 'login' | 'schedule'): Promise<boolean> {
  if (reason === 'schedule') return true; // Scheduled runs always execute
  try {
    await connectDB();
    const cfg = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    if (!cfg?.Last_Cron_Run) return true; // Never run before
    const hoursSince = (Date.now() - new Date(cfg.Last_Cron_Run).getTime()) / (1000 * 60 * 60);
    return hoursSince >= RATE_LIMIT_HOURS;
  } catch {
    return false;
  }
}

/** Marks the last run timestamp in the database */
async function markLastRun() {
  try {
    await SystemConfig.findOneAndUpdate(
      { Config_Key: 'global_notification_settings' },
      { $set: { Last_Cron_Run: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error('[Dispatch] Failed to update Last_Cron_Run:', err);
  }
}

/** Internal fetch helper — calls the specialised sub-dispatchers */
async function callRoute(baseUrl: string, path: string, body: object) {
  try {
    await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error(`[Dispatch] Failed to call ${path}:`, err);
  }
}

/**
 * Main dispatcher — scans all Leads, Quotations, Projects and triggers
 * the appropriate notification sub-routes.
 */
export async function runDispatch(baseUrl: string) {
  try {
    await connectDB();
    const today = new Date();
    const summary = { leads: 0, quotations: 0, deadlines: 0, services: 0, costing: 0 };

    console.log(`[Dispatch] Starting at ${today.toISOString()}`);

    // ── 1. LEADS FOLLOW-UP ─────────────────────────────────────────────────────
    const leads = await Lead.find({ Lead_Status: { $nin: ['Converted', 'Cancelled'] } });
    for (const lead of leads) {
      let shouldAlert = false;
      const hasFollowUps = lead.Follow_Ups && lead.Follow_Ups.length > 0;
      const lastPending = hasFollowUps
        ? lead.Follow_Ups?.findLast((f: any) => f.Outcome === 'Pending')
        : null;

      if (!hasFollowUps) {
        const createDate = new Date(lead.Inquiry_Date || (lead as any).createdAt);
        const days = Math.ceil((today.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 5) shouldAlert = true;
      } else if (lastPending) {
        if (lastPending.Next_Followup_Date) {
          const nextDate = new Date(lastPending.Next_Followup_Date);
          nextDate.setHours(0, 0, 0, 0);
          const todayStart = new Date(today);
          todayStart.setHours(0, 0, 0, 0);
          if (todayStart.getTime() >= nextDate.getTime()) shouldAlert = true;
        } else {
          const followUpDate = new Date(lastPending.Followup_Date);
          const days = Math.ceil((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 3) shouldAlert = true;
        }
      }

      if (shouldAlert) {
        await callRoute(baseUrl, '/api/whatsapp/lead-followup', { leadId: lead._id });
        await callRoute(baseUrl, '/api/email/lead-followup', { leadId: lead._id });
        summary.leads++;
      }
    }

    // ── 2. QUOTATIONS FOLLOW-UP ───────────────────────────────────────────────
    const quotations = await Quotation.find({ Quotation_Status: { $in: ['Sent', 'Follow-up'] } });
    for (const qtn of quotations) {
      let shouldAlert = false;
      const hasFollowUps = qtn.Follow_Ups && qtn.Follow_Ups.length > 0;
      const lastPending = hasFollowUps
        ? qtn.Follow_Ups?.findLast((f: any) => f.Outcome === 'Pending')
        : null;

      if (!hasFollowUps) {
        const createDate = new Date(qtn.Quotation_Date || (qtn as any).createdAt);
        const days = Math.ceil((today.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 5) shouldAlert = true;
      } else if (lastPending) {
        if (lastPending.Next_Followup_Date) {
          const nextDate = new Date(lastPending.Next_Followup_Date);
          nextDate.setHours(0, 0, 0, 0);
          const todayStart = new Date(today);
          todayStart.setHours(0, 0, 0, 0);
          if (todayStart.getTime() >= nextDate.getTime()) shouldAlert = true;
        } else {
          const followUpDate = new Date(lastPending.Followup_Date);
          const days = Math.ceil((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 3) shouldAlert = true;
        }
      }

      if (shouldAlert) {
        await callRoute(baseUrl, '/api/whatsapp/quotation-followup', { quotationId: qtn._id });
        await callRoute(baseUrl, '/api/email/quotation-followup', { quotationId: qtn._id });
        summary.quotations++;
      }
    }

    // ── 3. PROJECT DEADLINES ──────────────────────────────────────────────────
    const activeProjects = await Project.find({ Pipeline_Status: { $in: ['Active', 'On Hold'] } });
    for (const project of activeProjects) {
      if (!project.Start_Details?.End_Date) continue;
      const endDate = new Date(project.Start_Details.End_Date);
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft >= 0) {
        await callRoute(baseUrl, '/api/whatsapp/deadline', { projectId: (project as any)._id });
        await callRoute(baseUrl, '/api/email/deadline', { projectId: (project as any)._id });
        summary.deadlines++;
      }
    }

    // ── 4. EXTERNAL SERVICES & PROJECT COSTING ───────────────────────────────
    const allProjects = await Project.find({});
    for (const project of allProjects) {
      // External Services
      if (project.External_Services?.length) {
        for (const service of project.External_Services as any[]) {
          if (!service.Reminder?.Enabled || (!service.Cycle_Anchor_Date && !service.Status_Date)) continue;
          const baseDate = service.Cycle_Anchor_Date || service.Status_Date;
          const monthsInterval = service.Payment_Terms === 'Quarterly' ? 3 : service.Payment_Terms === 'Annually' ? 12 : 1;
          let nextBilling = new Date(baseDate);
          while (nextBilling <= today) nextBilling.setMonth(nextBilling.getMonth() + monthsInterval);
          const daysLeft = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const notifyBefore = service.Reminder.Notify_Before === '7 days before' ? 7 : 3;
          if (daysLeft <= notifyBefore && service.Billing_Status !== 'Received') {
            const payload = { projectId: (project as any)._id, serviceId: service._id, currentDateIso: today.toISOString(), nextBillingIso: nextBilling.toISOString() };
            await callRoute(baseUrl, '/api/whatsapp/remind', payload);
            await callRoute(baseUrl, '/api/email/remind', payload);
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
        while (nextRenewal <= today && nextRenewal < oneYearLater) nextRenewal.setMonth(nextRenewal.getMonth() + monthsPerCycle);
        const daysLeftCosting = Math.ceil((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeftCosting <= 5 && nextRenewal < oneYearLater && nextRenewal >= today) {
          const payload = { projectId: (project as any)._id, currentDateIso: today.toISOString(), nextBillingIso: nextRenewal.toISOString() };
          await callRoute(baseUrl, '/api/whatsapp/project-costing', payload);
          await callRoute(baseUrl, '/api/email/project-costing', payload);
          summary.costing++;
        }
      }
    }

    // Mark last run timestamp
    await markLastRun();
    console.log(`[Dispatch] Completed. Summary:`, summary);
    return summary;
  } catch (err) {
    console.error('[Dispatch] Error:', err);
    throw err;
  }
}
