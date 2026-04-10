import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const assignedUser = searchParams.get('assignedUser');

    const filter: any = {};

    if (assignedUser) {
      filter.Assigned_User = new mongoose.Types.ObjectId(assignedUser);
    }
    
    // Ensure Other references are ObjectIds if present in filter for aggregation
    if (filter.Product_Reference) filter.Product_Reference = new mongoose.Types.ObjectId(filter.Product_Reference);
    if (filter.Source_Reference) filter.Source_Reference = new mongoose.Types.ObjectId(filter.Source_Reference);
    if (filter.Client_Reference) filter.Client_Reference = new mongoose.Types.ObjectId(filter.Client_Reference);

    if (status !== 'All') {
      if (status === 'Exclude-Converted') {
        filter.Lead_Status = { $ne: 'Converted' };
      } else {
        filter.Lead_Status = status;
      }
    }

    if (startDate || endDate) {
      filter.Inquiry_Date = {};
      if (startDate) filter.Inquiry_Date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.Inquiry_Date.$lte = end;
      }
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

    const total = await Lead.countDocuments(filter);
    
    let leads;
    if (sortBy.startsWith('Company')) {
      const sortDirection = sortBy === 'Company-A-Z' ? 1 : -1;
      leads = await Lead.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'clients',
            localField: 'Client_Reference',
            foreignField: '_id',
            as: 'Client_Reference'
          }
        },
        { $unwind: { path: '$Client_Reference', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'products',
            localField: 'Product_Reference',
            foreignField: '_id',
            as: 'Product_Reference'
          }
        },
        { $unwind: { path: '$Product_Reference', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'leadsources',
            localField: 'Source_Reference',
            foreignField: '_id',
            as: 'Source_Reference'
          }
        },
        { $unwind: { path: '$Source_Reference', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            let: { userId: '$Assigned_User' },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $eq: [
                      '$_id', 
                      { $convert: { input: '$$userId', to: 'objectId', onError: '$$userId', onNull: '$$userId' } }
                    ] 
                  } 
                } 
              },
              { $project: { User_ID: 1, Name: 1, Email: 1 } }
            ],
            as: 'Assigned_User'
          }
        },
        { $unwind: { path: '$Assigned_User', preserveNullAndEmptyArrays: true } },
        { $sort: { 'Client_Reference.Company_Name': sortDirection } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]);
    } else {
      let sortOption: any = { createdAt: -1 };
      if (sortBy === 'Oldest') sortOption = { createdAt: 1 };
      if (sortBy === 'ID-ASC') sortOption = { Lead_ID: 1 };
      if (sortBy === 'ID-DESC') sortOption = { Lead_ID: -1 };
      if (sortBy === 'Newest') sortOption = { createdAt: -1 };

      leads = await Lead.find(filter)
        .populate('Client_Reference')
        .populate('Product_Reference')
        .populate('Source_Reference')
        .populate('Assigned_User', 'User_ID Name Email')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit);
    }

    // Fetch status counts for dashboard blocks
    const statusBaseFilter = { ...filter };
    delete statusBaseFilter.Lead_Status;

    const counts = await Lead.aggregate([
      { $match: statusBaseFilter },
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
    const { newClientData, ...leadData } = body;

    let clientReference = leadData.Client_Reference;

    // Handle nested client creation
    if (newClientData) {
      const newClient = new Client(newClientData);
      await newClient.save();
      clientReference = newClient._id;
    }

    if (!clientReference) {
      return NextResponse.json({ error: 'Client Reference is required' }, { status: 400 });
    }

    const newLead = new Lead({
      ...leadData,
      Client_Reference: clientReference
    });

    await newLead.save();
    await newLead.populate(['Client_Reference', 'Product_Reference', 'Source_Reference', 'Assigned_User']);
    return NextResponse.json(newLead, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
