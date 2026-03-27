import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectType from '@/models/ProjectType';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.PROJECT_TYPES_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    const updatedType = await ProjectType.findByIdAndUpdate(id, data, { new: true });
    if (!updatedType) {
      return NextResponse.json({ error: "Project Type not found" }, { status: 404 });
    }
    return NextResponse.json(updatedType);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.PROJECT_TYPES_DELETE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const deletedType = await ProjectType.findByIdAndDelete(id);
    if (!deletedType) {
      return NextResponse.json({ error: "Project Type not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Project Type deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

