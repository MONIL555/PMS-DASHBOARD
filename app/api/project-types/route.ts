import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectType from '@/models/ProjectType';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.PROJECT_TYPES_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('active') === 'true';
    
    const query: any = activeOnly ? { IsActive: true } : {};
    if (search) {
        query.Type_Name = { $regex: search, $options: 'i' };
    }

    const totalItems = await ProjectType.countDocuments(query);
    const projectTypes = await ProjectType.find(query)
        .sort({ Type_Name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return NextResponse.json({
        projectTypes,
        totalItems
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const auth = await verifyPermission(PERMISSIONS.PROJECT_TYPES_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    const existing = await ProjectType.findOne({ Type_Name: { $regex: new RegExp(`^${data.Type_Name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: "A project type with this name already exists." }, { status: 400 });
    }

    const newType = new ProjectType(data);
    await newType.save();
    return NextResponse.json(newType, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
