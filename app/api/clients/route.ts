import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.CLIENTS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';
    
    const query: any = {};
    if (status === 'Active') query.IsActive = true;
    if (status === 'Inactive') query.IsActive = false;
    
    if (search) {
        query.$or = [
            { Company_Name: { $regex: search, $options: 'i' } },
            { Client_ID: { $regex: search, $options: 'i' } },
            { Client_Name: { $regex: search, $options: 'i' } },
            { Contact_Number: { $regex: search, $options: 'i' } },
            { Email: { $regex: search, $options: 'i' } }
        ];
    }

    let sortOption: any = { createdAt: -1 };
    if (sortBy === 'Company-A-Z') sortOption = { Company_Name: 1 };
    if (sortBy === 'Company-Z-A') sortOption = { Company_Name: -1 };
    if (sortBy === 'ID-ASC') sortOption = { Client_ID: 1 };
    if (sortBy === 'ID-DESC') sortOption = { Client_ID: -1 };
    if (sortBy === 'Newest') sortOption = { createdAt: -1 };

    const totalItems = await Client.countDocuments(query);
    const clients = await Client.find(query)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit);

    return NextResponse.json({
        clients,
        totalItems
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const auth = await verifyPermission(PERMISSIONS.CLIENTS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    // Check if company already exists
    const existing = await Client.findOne({ Company_Name: { $regex: new RegExp(`^${data.Company_Name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: "A client with this company name already exists." }, { status: 400 });
    }

    const newClient = new Client(data);
    await newClient.save();
    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ error: "A client with this company name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
