import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.ROLES_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('active') === 'true';
    
    const query: any = activeOnly ? { IsActive: true } : {};
    if (search) {
        query.Role_Name = { $regex: search, $options: 'i' };
    }

    const totalItems = await Role.countDocuments(query);
    const roles = await Role.find(query)
        .sort({ Role_Name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return NextResponse.json({
        roles,
        totalItems
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const auth = await verifyPermission(PERMISSIONS.ROLES_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    const existing = await Role.findOne({ Role_Name: { $regex: new RegExp(`^${data.Role_Name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: "A role with this name already exists." }, { status: 400 });
    }

    const newRole = new Role(data);
    await newRole.save();
    return NextResponse.json(newRole, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
