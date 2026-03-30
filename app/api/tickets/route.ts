import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import Project from '@/models/Project';
import Client from '@/models/Client';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.TICKETS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';
    const priority = searchParams.get('priority') || 'All';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};

    // Status Filter
    if (status !== 'All') {
        filter.Status = status;
    }

    // Priority Filter
    if (priority !== 'All') {
        filter.Priority = priority;
    }

    // Date Filter
    if (startDate || endDate) {
        filter.Raised_Date_Time = {};
        if (startDate) filter.Raised_Date_Time.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.Raised_Date_Time.$lte = end;
        }
    }

    // Search Logic
    if (search) {
        const clientIds = await Client.find({ Company_Name: { $regex: search, $options: 'i' } }).distinct('_id');
        filter.$or = [
            { Ticket_Number: { $regex: search, $options: 'i' } },
            { Title: { $regex: search, $options: 'i' } },
            { Client_Reference: { $in: clientIds } }
        ];
    }

    const totalItems = await Ticket.countDocuments(filter);

    let tickets;
    if (sortBy.startsWith('Company')) {
        const sortDirection = sortBy === 'Company-A-Z' ? 1 : -1;
        tickets = await Ticket.aggregate([
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
                $lookup: { from: 'projects', localField: 'Project_ID', foreignField: '_id', as: 'Project_ID' }
            },
            { $unwind: { path: '$Project_ID', preserveNullAndEmptyArrays: true } },
            { $sort: { 'Client_Reference.Company_Name': sortDirection } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]);
    } else {
        // Sort Logic
        let sortOption: any = { createdAt: -1 };
        if (sortBy === 'Oldest') sortOption = { createdAt: 1 };
        if (sortBy === 'Priority-High') sortOption = { Priority: -1, createdAt: -1 };
        if (sortBy === 'Status-Open') sortOption = { Status: 1, createdAt: -1 };
        if (sortBy === 'ID-ASC') sortOption = { Ticket_Number: 1 };
        if (sortBy === 'ID-DESC') sortOption = { Ticket_Number: -1 };

        tickets = await Ticket.find(filter)
          .populate('Project_ID', 'Project_Name Project_ID')
          .populate('Client_Reference', 'Company_Name Client_Name Contact_Number')
          .sort(sortOption)
          .skip((page - 1) * limit)
          .limit(limit);
    }

    const statusBaseFilter = { ...filter };
    delete statusBaseFilter.Status;

    const statusCounts = {
        In_Progress: await Ticket.countDocuments({ ...statusBaseFilter, Status: 'In_Progress' }),
        Open: await Ticket.countDocuments({ ...statusBaseFilter, Status: 'Open' }),
        Closed: await Ticket.countDocuments({ ...statusBaseFilter, Status: 'Closed' })
    };

    return NextResponse.json({
        tickets,
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
    const auth = await verifyPermission(PERMISSIONS.TICKETS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    if (!data.Project_ID) delete data.Project_ID;

    if (!data.Client_Reference && data.Project_ID) {
        const project = await Project.findById(data.Project_ID);
        if (project) {
            data.Client_Reference = project.Client_Reference || null;
        }
    }

    const newTicket = new Ticket(data);
    await newTicket.save();
    await newTicket.populate([
      { path: 'Project_ID', select: 'Project_Name Project_ID' },
      { path: 'Client_Reference', select: 'Company_Name Client_Name Contact_Number' }
    ]);
    return NextResponse.json(newTicket, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
