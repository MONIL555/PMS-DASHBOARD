import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';

let lastCleanupAttempt = 0;
const CLEANUP_THROTTLE = 1000 * 60 * 60 * 6; // Run at most once every 6 hours

/**
 * Automatically cleans up stale Leads and Quotations based on age and follow-up attempts.
 * Optimized with bulk updates and throttling for Dashboard performance.
 */
export async function autoCleanupStaleItems(force = false) {
  const now = Date.now();
  if (!force && now - lastCleanupAttempt < CLEANUP_THROTTLE) return;
  lastCleanupAttempt = now;

  try {
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // 1. LEADS CLEANUP (Bulk)
    // - Inactivity (over 45 days)
    await Lead.updateMany(
      { 
        Lead_Status: { $in: ['New', 'In Progress'] },
        Inquiry_Date: { $lt: fortyFiveDaysAgo }
      },
      {
        $set: {
          Lead_Status: 'Cancelled',
          Lead_Status_Date_Time: new Date(),
          Cancel_Reason: "System: Auto-cancelled due to inactivity (over 45 days)."
        }
      }
    );

    // - Too many pending follow-ups (4+)
    // Note: Since follow-ups are an array, we can filter by size in simple cases, 
    // but the specific 'Outcome === Pending' check requires either a loop or a more complex aggregation.
    // For performance, we'll keep the loop for ONLY the complex condition, but limit the query.
    const leadsWithManyFollowups = await Lead.find({
      Lead_Status: { $in: ['New', 'In Progress'] },
      "Follow_Ups.3": { $exists: true } // At least 4 follow-ups
    }).select('Follow_Ups').lean();

    const leadsToCancel = leadsWithManyFollowups
      .filter(l => l.Follow_Ups.filter((f: any) => f.Outcome === 'Pending').length >= 4)
      .map(l => l._id);

    if (leadsToCancel.length > 0) {
      await Lead.updateMany(
        { _id: { $in: leadsToCancel } },
        {
          $set: {
            Lead_Status: 'Cancelled',
            Lead_Status_Date_Time: new Date(),
            Cancel_Reason: "System: Auto-cancelled after 4 unsuccessful follow-up attempts."
          }
        }
      );
    }

    // 2. QUOTATIONS CLEANUP (Bulk)
    // - Inactivity (over 45 days)
    await Quotation.updateMany(
      {
        Quotation_Status: { $in: ['Sent', 'Follow-up'] },
        Quotation_Date: { $lt: fortyFiveDaysAgo }
      },
      {
        $set: {
          Quotation_Status: 'Rejected',
          Cancel_Reason: "System: Auto-rejected due to inactivity (over 45 days)."
        }
      }
    );

    // - Sent -> Follow-up after 10 days
    await Quotation.updateMany(
      {
        Quotation_Status: 'Sent',
        Quotation_Date: { $lt: tenDaysAgo }
      },
      { $set: { Quotation_Status: 'Follow-up' } }
    );

    // - Too many pending follow-ups
    const quotesWithManyFollowups = await Quotation.find({
      Quotation_Status: { $in: ['Sent', 'Follow-up'] },
      "Follow_Ups.3": { $exists: true }
    }).select('Follow_Ups').lean();

    const quotesToReject = quotesWithManyFollowups
      .filter(q => q.Follow_Ups.filter((f: any) => f.Outcome === 'Pending').length >= 4)
      .map(q => q._id);

    if (quotesToReject.length > 0) {
      await Quotation.updateMany(
        { _id: { $in: quotesToReject } },
        {
          $set: {
            Quotation_Status: 'Rejected',
            Cancel_Reason: "System: Auto-rejected after 4 unsuccessful follow-up attempts."
          }
        }
      );
    }

  } catch (error) {
    console.error('Error during auto-cleanup:', error);
  }
}
