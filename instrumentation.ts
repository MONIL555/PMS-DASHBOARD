/**
 * instrumentation.ts
 *
 * Next.js Server Instrumentation Hook.
 * This file is called ONCE when the Next.js server starts.
 * It sets up a daily timer to fire the notification dispatcher at 9:15 AM.
 *
 * No external cron service (cPanel, Windows Task Scheduler, etc.) is needed.
 * The system is self-scheduling as long as the Next.js server is running.
 */

export async function register() {
  // Only run in Node.js runtime (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Scheduler] Instrumentation hook activated. Daily dispatch scheduled at 9:15 AM.');
    scheduleDailyDispatch();
  }
}

/** Calculate milliseconds until the next 9:15 AM */
function msUntilNext915AM(): number {
  const now = new Date();
  const target = new Date();
  target.setHours(9, 15, 0, 0);

  // If 9:15 AM already passed today, schedule for tomorrow
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const ms = target.getTime() - now.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  console.log(`[Scheduler] Next dispatch in ${hours}h ${minutes}m (at 9:15 AM).`);
  return ms;
}

/** Recursively schedules itself every 24 hours after first firing at 9:15 AM */
function scheduleDailyDispatch() {
  const delay = msUntilNext915AM();

  setTimeout(async () => {
    console.log('[Scheduler] 9:15 AM — Running daily notification dispatch...');
    try {
      // Dynamically import to avoid issues during build phase
      const { runDispatch } = await import('@/lib/dispatchNotifications');

      // Determine the base URL from environment (for internal fetch calls inside runDispatch)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await runDispatch(baseUrl);
      console.log('[Scheduler] Daily dispatch complete.');
    } catch (err) {
      console.error('[Scheduler] Daily dispatch failed:', err);
    }

    // Schedule the next day
    scheduleDailyDispatch();
  }, delay);
}
