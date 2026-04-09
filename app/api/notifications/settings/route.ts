import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SystemConfig from '@/models/SystemConfig';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.NOTIFICATIONS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    let config = await SystemConfig.findOne({ Config_Key: 'global_notification_settings' });
    if (!config) {
        config = await SystemConfig.create({ Config_Key: 'global_notification_settings' });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.NOTIFICATIONS_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    const config = await SystemConfig.findOneAndUpdate(
        { Config_Key: 'global_notification_settings' },
        { $set: data },
        { new: true, upsert: true }
    );

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
