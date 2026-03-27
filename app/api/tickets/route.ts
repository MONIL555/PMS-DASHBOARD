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
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';

    const filter: any = {};

    // Status Filter
    if (status !== 'All') {
        filter.Status = status;
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

    // Sort Logic
    let sortOption: any = { createdAt: -1 };
    if (sortBy === 'Oldest') sortOption = { createdAt: 1 };
    if (sortBy === 'Priority-High') {
        sortOption = { Priority: -1, createdAt: -1 };
    }
    if (sortBy === 'Status-Open') {
        sortOption = { Status: 1, createdAt: -1 };
    }

    const totalItems = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('Project_ID', 'Project_Name Project_ID')
      .populate('Client_Reference', 'Company_Name Client_Name Contact_Number')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    const statusCounts = {
        In_Progress: await Ticket.countDocuments({ Status: 'In_Progress' }),
        Open: await Ticket.countDocuments({ Status: 'Open' }),
        Closed: await Ticket.countDocuments({ Status: 'Closed' })
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
