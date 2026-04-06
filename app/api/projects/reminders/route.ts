import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

function parseNotifyBefore(notifyBefore: string): number {
  if (notifyBefore === '24 hours before') return 1;
  if (notifyBefore === '3 days before') return 3;
  if (notifyBefore === '7 days before') return 7;
  // Custom cycle: try to extract number of days
  const match = notifyBefore.match(/(\d+)/);
  return match ? parseInt(match[1]) : 3;
}

function getNextBillingDate(statusDate: Date, paymentTerms: string): Date {
  const now = new Date();
  const base = new Date(statusDate);
  
  let monthsInterval = 1;
  if (paymentTerms === 'Quarterly') monthsInterval = 3;
  if (paymentTerms === 'Annually') monthsInterval = 12;

  // Find the next billing date from statusDate going forward
  let next = new Date(base);
  while (next <= now) {
    next.setMonth(next.getMonth() + monthsInterval);
  }
  return next;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.PROJECTS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    // Find all active projects with external services that have reminders enabled
    const projects = await Project.find({
      Pipeline_Status: { $in: ['Active', 'On Hold'] },
      'External_Services.Reminder.Enabled': true
    })
      .populate('Client_Reference', 'Company_Name Client_Name')
      .lean();

    const now = new Date();
    const reminders: any[] = [];

    for (const project of projects) {
      if (!project.External_Services?.length) continue;

      for (const service of project.External_Services) {
        if (!service.Reminder?.Enabled || (!service.Cycle_Anchor_Date && !service.Status_Date)) continue;

        const notifyDays = parseNotifyBefore(service.Reminder.Notify_Before || '3 days before');
        const baseDate = service.Cycle_Anchor_Date || service.Status_Date;
        const nextBilling = getNextBillingDate(baseDate, service.Payment_Terms || 'Monthly');

        // Calculate reminder trigger date
        const reminderDate = new Date(nextBilling);
        reminderDate.setDate(reminderDate.getDate() - notifyDays);

        // Show reminder if we're within the notification window (reminder date <= now <= billing date)
        if (reminderDate <= now && now <= nextBilling) {
          const daysUntilDue = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          reminders.push({
            projectId: project._id,
            projectName: project.Project_Name,
            projectCode: project.Project_ID,
            clientName: (project.Client_Reference as any)?.Company_Name || (project.Client_Reference as any)?.Client_Name || 'N/A',
            serviceName: service.Service_Name,
            amount: service.Amount,
            billingStatus: service.Billing_Status,
            paymentTerms: service.Payment_Terms,
            nextBillingDate: nextBilling,
            daysUntilDue,
            urgent: daysUntilDue <= 1
          });
        }
      }
    }

    // Sort by urgency (soonest first)
    reminders.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return NextResponse.json({ reminders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
