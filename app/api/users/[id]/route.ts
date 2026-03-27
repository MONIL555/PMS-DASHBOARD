import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import '@/models/Role'; // Ensure Role model is loaded for population
import bcrypt from 'bcryptjs';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.USERS_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    if (data.Password && data.Password.trim() !== '') {
      data.Password = await bcrypt.hash(data.Password, 10);
    } else {
      delete data.Password;
    }
    
    if (data.Email) {
      const existing = await User.findOne({ Email: data.Email.toLowerCase(), _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ error: "Email is already in use by another user." }, { status: 400 });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, data, { new: true }).populate('Role_ID', 'Role_Name');
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.USERS_DELETE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
