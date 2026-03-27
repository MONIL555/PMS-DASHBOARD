import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeadSource from '@/models/LeadSource';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.LEAD_SOURCES_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('active') === 'true';
    
    const query: any = activeOnly ? { IsActive: true } : {};
    if (search) {
        query.Source_Name = { $regex: search, $options: 'i' };
    }

    const totalItems = await LeadSource.countDocuments(query);
    const sources = await LeadSource.find(query)
        .sort({ Source_Name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return NextResponse.json({
        sources,
        totalItems
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const auth = await verifyPermission(PERMISSIONS.LEAD_SOURCES_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    const existing = await LeadSource.findOne({ Source_Name: { $regex: new RegExp(`^${data.Source_Name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: "A lead source with this name already exists." }, { status: 400 });
    }

    const newSource = new LeadSource(data);
    await newSource.save();
    return NextResponse.json(newSource, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
