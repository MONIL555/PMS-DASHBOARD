import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeadSource from '@/models/LeadSource';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.LEAD_SOURCES_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    const updatedSource = await LeadSource.findByIdAndUpdate(id, data, { new: true });
    if (!updatedSource) {
      return NextResponse.json({ error: "Lead Source not found" }, { status: 404 });
    }
    return NextResponse.json(updatedSource);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.LEAD_SOURCES_DELETE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const deletedSource = await LeadSource.findByIdAndDelete(id);
    if (!deletedSource) {
      return NextResponse.json({ error: "Lead Source not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Lead Source deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
