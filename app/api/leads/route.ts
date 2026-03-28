import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import Client from '@/models/Client';
import Product from '@/models/Product';
import LeadSource from '@/models/LeadSource';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.LEADS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';

    const filter: any = {};

    if (status !== 'All') {
      filter.Lead_Status = status;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      
      // 1. Find matching clients first to support searching by Company/Client Name
      const matchingClients = await Client.find({
        $or: [
          { Company_Name: searchRegex },
          { Client_Name: searchRegex },
          { Contact_Number: searchRegex }
        ]
      }).select('_id');
      
      const clientIds = matchingClients.map(c => c._id);

      // 2. Find matching products
      const matchingProducts = await Product.find({
        $or: [
          { Type: searchRegex },
          { SubType: searchRegex },
          { SubSubType: searchRegex }
        ]
      }).select('_id');

      const productIds = matchingProducts.map(p => p._id);

      filter.$or = [
        { Lead_ID: searchRegex },
        { Notes: searchRegex },
        { Client_Reference: { $in: clientIds } },
        { Product_Reference: { $in: productIds } }
      ];
    }

    let sortOption: any = { createdAt: -1 };
    if (sortBy === 'Oldest') sortOption = { createdAt: 1 };
    // Sorting by Company_Name (populated field) is tricky in basic find(). 
    // Usually handled by aggregation or denormalization if needed.

    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .populate('Client_Reference')
      .populate('Product_Reference')
      .populate('Source_Reference')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    // Fetch status counts for dashboard blocks
    const counts = await Lead.aggregate([
      {
        $group: {
          _id: '$Lead_Status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts: any = {
      New: 0,
      'In Progress': 0,
      Converted: 0,
      Cancelled: 0
    };

    counts.forEach((c: any) => {
      if (c._id === 'New') statusCounts.New = c.count;
      else if (c._id === 'In Progress') statusCounts['In Progress'] = c.count;
      else if (c._id === 'Converted') statusCounts.Converted = c.count;
      else if (c._id === 'Cancelled' || c._id === 'Rejected') statusCounts.Cancelled += c.count;
    });

    return NextResponse.json({
      leads,
      totalItems: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.LEADS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const body = await request.json();
    const newLead = new Lead(body);
    await newLead.save();
    await newLead.populate(['Client_Reference', 'Product_Reference', 'Source_Reference']);
    return NextResponse.json(newLead, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
