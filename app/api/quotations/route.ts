import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import Lead from '@/models/Lead';
import Client from '@/models/Client';
import Product from '@/models/Product';
import ProjectType from '@/models/ProjectType';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.QUOTATIONS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';
    const minComm = searchParams.get('minComm');
    const maxComm = searchParams.get('maxComm');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};

    // Status Filter
    if (status !== 'All') {
        if (status === 'Rejected') {
            filter.Quotation_Status = { $in: ['Rejected', 'Cancelled'] };
        } else {
            filter.Quotation_Status = status;
        }
    }
    
    // Commercial Range Filter
    if (minComm || maxComm) {
        filter.Commercial = {};
        if (minComm) filter.Commercial.$gte = parseFloat(minComm);
        if (maxComm) filter.Commercial.$lte = parseFloat(maxComm);
    }

    // Date Range Filter
    if (startDate || endDate) {
        filter.Quotation_Date = {};
        if (startDate) filter.Quotation_Date.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.Quotation_Date.$lte = end;
        }
    }

    // Search Logic
    if (search) {
        const clientIds = await Client.find({ Company_Name: { $regex: search, $options: 'i' } }).distinct('_id');
        const productIds = await Product.find({
          $or: [
            { Type: { $regex: search, $options: 'i' } },
            { SubType: { $regex: search, $options: 'i' } },
            { SubSubType: { $regex: search, $options: 'i' } }
          ]
        }).distinct('_id');
        
        filter.$or = [
            { Quotation_ID: { $regex: search, $options: 'i' } },
            { Client_Reference: { $in: clientIds } },
            { Product_Reference: { $in: productIds } },
            { Client_Info: { $regex: search, $options: 'i' } }
        ];
    }

    const totalItems = await Quotation.countDocuments(filter);

    let quotations;
    let sortOption: any = { createdAt: -1 };
    
    if (sortBy === 'Oldest') sortOption = { Quotation_Date: 1 };
    if (sortBy === 'Newest') sortOption = { Quotation_Date: -1 };
    if (sortBy === 'Commercial-High') sortOption = { Commercial: -1 };
    if (sortBy === 'Commercial-Low') sortOption = { Commercial: 1 };
    if (sortBy === 'ID-ASC') sortOption = { Quotation_ID: 1 };
    if (sortBy === 'ID-DESC') sortOption = { Quotation_ID: -1 };

    if (sortBy.startsWith('Company')) {
        const sortDirection = sortBy === 'Company-A-Z' ? 1 : -1;
        
        quotations = await Quotation.aggregate([
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
            { $sort: { 'Client_Reference.Company_Name': sortDirection } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]);
    } else {
        quotations = await Quotation.find(filter)
          .populate('Client_Reference')
          .populate('Product_Reference')
          .populate({ path: 'Project_Type', strictPopulate: false })
          .sort(sortOption)
          .skip((page - 1) * limit)
          .limit(limit);
    }

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    let needsRefresh = false;
    for (const q of quotations) {
        if (q.Quotation_Status === 'Sent' && new Date(q.Quotation_Date) < tenDaysAgo) {
            q.Quotation_Status = 'Follow-up';
            await q.save();
            needsRefresh = true;
        }
    }

    const finalQuotations = needsRefresh ? (
        sortBy.startsWith('Company') ? await Quotation.aggregate([
            { $match: filter },
            {
                $lookup: { from: 'clients', localField: 'Client_Reference', foreignField: '_id', as: 'Client_Reference' }
            },
            { $unwind: { path: '$Client_Reference', preserveNullAndEmptyArrays: true } },
            {
                $lookup: { from: 'products', localField: 'Product_Reference', foreignField: '_id', as: 'Product_Reference' }
            },
            { $unwind: { path: '$Product_Reference', preserveNullAndEmptyArrays: true } },
            { $sort: { 'Client_Reference.Company_Name': sortBy === 'Company-A-Z' ? 1 : -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]) : await Quotation.find(filter)
          .populate('Client_Reference')
          .populate('Product_Reference')
          .populate({ path: 'Project_Type', strictPopulate: false })
          .sort(sortOption)
          .skip((page - 1) * limit)
          .limit(limit)
    ) : quotations;

    const statusBaseFilter = { ...filter };
    delete statusBaseFilter.Quotation_Status;

    const statusCounts = {
        Sent: await Quotation.countDocuments({ ...statusBaseFilter, Quotation_Status: 'Sent' }),
        'Follow-up': await Quotation.countDocuments({ ...statusBaseFilter, Quotation_Status: 'Follow-up' }),
        Approved: await Quotation.countDocuments({ ...statusBaseFilter, Quotation_Status: 'Approved' }),
        Rejected: await Quotation.countDocuments({ ...statusBaseFilter, Quotation_Status: { $in: ['Rejected', 'Cancelled'] } }),
        Converted: await Quotation.countDocuments({ ...statusBaseFilter, Quotation_Status: 'Converted' }),
    };

    return NextResponse.json({
        quotations: finalQuotations,
        totalItems,
        statusCounts
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const auth = await verifyPermission(PERMISSIONS.QUOTATIONS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();

    // If it's a conversion from lead, check for LEADS_CONVERT permission
    if (data.Lead_ID) {
      const convertAuth = await verifyPermission(PERMISSIONS.LEADS_CONVERT);
      if (!convertAuth.authorized) return NextResponse.json({ error: convertAuth.message }, { status: convertAuth.status });
    }
    if (!data.Lead_ID) delete data.Lead_ID;

    const newQuote = new Quotation(data);
    await newQuote.save();
    await newQuote.populate([
        { path: 'Client_Reference' },
        { path: 'Product_Reference' },
        { path: 'Project_Type', strictPopulate: false }
    ]);

    if (data.Lead_ID) {
        await Lead.findByIdAndUpdate(data.Lead_ID, {
            Lead_Status: 'Converted',
            Lead_Status_Date_Time: new Date()
        });
    }
    return NextResponse.json(newQuote, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
