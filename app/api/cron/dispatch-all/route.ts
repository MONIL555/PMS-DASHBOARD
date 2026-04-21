import { NextResponse } from 'next/server';
import { runDispatch } from '@/lib/dispatchNotifications';

/**
 * INTERNAL NOTIFICATION DISPATCHER
 * Called internally by the built-in scheduler (instrumentation.ts) at 9:15 AM daily,
 * and by the Admin login trigger.
 *
 * This is NOT meant to be called by an external cron service.
 * The system is self-scheduling — no Windows Task Scheduler or cPanel cron needed.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const baseUrl = req.headers.get('host')?.includes('localhost')
      ? `http://${req.headers.get('host')}`
      : `https://${req.headers.get('host')}`;

    const summary = await runDispatch(baseUrl);
    return NextResponse.json({ success: true, summary, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Dispatch Route Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
