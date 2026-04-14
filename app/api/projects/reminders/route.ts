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
  
  let next = new Date(base);
  if (paymentTerms === 'One Time') {
    return next;
  }

  let monthsInterval = 1;
  if (paymentTerms === 'Quarterly') monthsInterval = 3;
  if (paymentTerms === 'Annually') monthsInterval = 12;

  // Find the next billing date from statusDate going forward
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

        let nextBilling: Date;
        let reminderDate: Date;

        if (service.Reminder.Notify_Before === 'Custom Date' && service.Reminder.Custom_Date) {
          nextBilling = new Date(service.Reminder.Custom_Date);
          reminderDate = new Date(service.Reminder.Custom_Date); // Start reminding exactly on this date
        } else {
          const notifyDays = parseNotifyBefore(service.Reminder.Notify_Before || '3 days before');
          const baseDate = service.Cycle_Anchor_Date || service.Status_Date;
          nextBilling = getNextBillingDate(baseDate, service.Payment_Terms || 'Monthly');
          
          reminderDate = new Date(nextBilling);
          reminderDate.setDate(reminderDate.getDate() - notifyDays);
        }

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
        const daysSinceReminder = Math.floor((today.getTime() - reminderDay.getTime()) / (1000 * 60 * 60 * 24));

        let isTriggered = false;
        if (service.Billing_Status !== 'Received') {
          if (service.Reminder.Notify_Before === 'Custom Date') {
            isTriggered = (now.getTime() >= reminderDate.getTime());
          } else if (service.Payment_Terms === 'One Time') {
            isTriggered = (daysSinceReminder >= 0 && daysSinceReminder % 2 === 0);
          } else {
            isTriggered = (reminderDate <= now && now <= nextBilling);
          }
        }

        if (isTriggered) {
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
