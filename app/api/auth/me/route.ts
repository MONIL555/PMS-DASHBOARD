import { NextResponse } from 'next/server';
import { getSession, getLivePermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Refresh permissions from DB for live update
  const livePermissions = await getLivePermissions();
  const user = { ...session, Permissions: livePermissions };
  
  return NextResponse.json({ user });
}
