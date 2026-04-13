import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';

/**
 * Automatically cleans up stale Leads and Quotations based on age and follow-up attempts.
 * - Leads: Inquiry Date > 45 days OR 4+ Pending follow-ups -> Cancelled
 * - Quotations: Quotation Date > 45 days OR 4+ Pending follow-ups -> Rejected
 * - Quotations: Quotation Date > 10 days AND status 'Sent' -> Follow-up (Legacy logic)
 */
export async function autoCleanupStaleItems() {
  try {
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // 1. LEADS CLEANUP
    const leads = await Lead.find({
      Lead_Status: { $in: ['New', 'In Progress'] }
    });

    for (const lead of leads) {
      const pendingCount = lead.Follow_Ups.filter(f => f.Outcome === 'Pending').length;
      const isTooOld = lead.Inquiry_Date < fortyFiveDaysAgo;

      if (isTooOld || pendingCount >= 4) {
        lead.Lead_Status = 'Cancelled';
        lead.Lead_Status_Date_Time = new Date();
        lead.Cancel_Reason = isTooOld 
          ? "System: Auto-cancelled due to inactivity (over 45 days)." 
          : "System: Auto-cancelled after 4 unsuccessful follow-up attempts.";
        await lead.save();
      }
    }

    // 2. QUOTATIONS CLEANUP
    const quotations = await Quotation.find({
      Quotation_Status: { $in: ['Sent', 'Follow-up'] }
    });

    for (const quote of quotations) {
      const pendingCount = quote.Follow_Ups.filter(f => f.Outcome === 'Pending').length;
      const isTooOld = quote.Quotation_Date < fortyFiveDaysAgo;

      if (isTooOld || pendingCount >= 4) {
        quote.Quotation_Status = 'Rejected';
        quote.Cancel_Reason = isTooOld 
          ? "System: Auto-rejected due to inactivity (over 45 days)." 
          : "System: Auto-rejected after 4 unsuccessful follow-up attempts.";
        await quote.save();
      } else if (quote.Quotation_Status === 'Sent' && quote.Quotation_Date < tenDaysAgo) {
        // Carry over legacy logic: Sent -> Follow-up after 10 days
        quote.Quotation_Status = 'Follow-up';
        await quote.save();
      }
    }
  } catch (error) {
    console.error('Error during auto-cleanup:', error);
  }
}
