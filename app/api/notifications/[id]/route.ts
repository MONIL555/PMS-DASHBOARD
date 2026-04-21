import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NotificationConfig from '@/models/NotificationConfig';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.NOTIFICATIONS_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    // Check if updating name and if it conflicts with another
    if (data.Event_Name) {
        const existing = await NotificationConfig.findOne({ 
            Event_Name: { $regex: new RegExp(`^${data.Event_Name}$`, 'i') },
            _id: { $ne: id }
        });
        if (existing) {
            return NextResponse.json({ error: "Another notification configuration for this event already exists." }, { status: 400 });
        }
    }

    const updatedConfig = await NotificationConfig.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!updatedConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error('[Notification API] Error:', error);
    let message = "An error occurred.";
    if (error.name === 'ValidationError') message = "Validation failed. Please check your inputs.";
    else if (error.name === 'CastError') message = "Invalid data format provided.";
    else if (error.code === 11000) message = "A duplicate record already exists.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.NOTIFICATIONS_DELETE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const deletedConfig = await NotificationConfig.findByIdAndDelete(id);

    if (!deletedConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Configuration deleted successfully" });
  } catch (error: any) {
    console.error('[Notification API] Error:', error);
    let message = "An error occurred.";
    if (error.name === 'ValidationError') message = "Validation failed. Please check your inputs.";
    else if (error.name === 'CastError') message = "Invalid data format provided.";
    else if (error.code === 11000) message = "A duplicate record already exists.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
