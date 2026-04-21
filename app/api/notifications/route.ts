import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NotificationConfig from '@/models/NotificationConfig';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.NOTIFICATIONS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const query: any = {};
    if (search) {
        query.$or = [
            { Event_Name: { $regex: search, $options: 'i' } },
            { Trigger_ID: { $regex: search, $options: 'i' } }
        ];
    }

    const totalItems = await NotificationConfig.countDocuments(query);
    const notifications = await NotificationConfig.find(query)
        .sort({ createdAt: -1 });

    return NextResponse.json({
        notifications,
        totalItems
    });
  } catch (error: any) {
    console.error('[Notification API] Error:', error);
    let message = "An error occurred.";
    if (error.name === 'ValidationError') message = "Validation failed. Please check your inputs.";
    else if (error.name === 'CastError') message = "Invalid data format provided.";
    else if (error.code === 11000) message = "A duplicate record already exists.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const auth = await verifyPermission(PERMISSIONS.NOTIFICATIONS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    const existing = await NotificationConfig.findOne({ Event_Name: { $regex: new RegExp(`^${data.Event_Name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: "A notification configuration for this event already exists." }, { status: 400 });
    }

    const newConfig = new NotificationConfig(data);
    await newConfig.save();
    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    console.error('[Notification API] Error:', error);
    let message = "An error occurred.";
    if (error.name === 'ValidationError') message = "Validation failed. Please check your inputs.";
    else if (error.name === 'CastError') message = "Invalid data format provided.";
    else if (error.code === 11000) message = "A duplicate record already exists.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
