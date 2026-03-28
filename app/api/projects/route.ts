import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Quotation from '@/models/Quotation';
import Lead from '@/models/Lead';
import Client from '@/models/Client';
import Product from '@/models/Product';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.PROJECTS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const phase = searchParams.get('phase') || 'All';
    const pipeline = searchParams.get('pipeline') || 'All';
    const person = searchParams.get('person') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';

    const filter: any = {};

    // Pipeline Filter
    if (pipeline !== 'All') {
        filter.Pipeline_Status = pipeline;
    }

    // Person Filter
    if (person !== 'All') {
        filter['Start_Details.Assigned_Person'] = { $regex: new RegExp(`^\\s*${person.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i') };
    }

    // Phase Filter (Computed)
    if (phase !== 'All') {
        if (phase === 'Go-Live Config') {
            filter['Delivery.Delivery_Status'] = 'Delivered';
        } else if (phase === 'Delivery Phase') {
            filter['Deployment.Deployment_Status'] = 'Success';
            filter['Delivery.Delivery_Status'] = { $ne: 'Delivered' };
        } else if (phase === 'Deployment Phase') {
            filter['UAT.UAT_Status'] = 'Approved';
            filter['Deployment.Deployment_Status'] = { $ne: 'Success' };
        } else if (phase === 'UAT Phase') {
            filter['UAT.UAT_Status'] = { $ne: 'Approved' };
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
            { Project_Name: { $regex: search, $options: 'i' } },
            { Project_ID: { $regex: search, $options: 'i' } },
            { Client_Reference: { $in: clientIds } },
            { Product_Reference: { $in: productIds } }
        ];
    }

    // Sort Logic
    let sortOption: any = { createdAt: -1 };
    if (sortBy === 'Oldest') sortOption = { createdAt: 1 };
    if (sortBy === 'Priority-High') sortOption = { Priority: -1, createdAt: -1 };
    if (sortBy === 'Costing-High') sortOption = { 'Start_Details.Costing': -1 };

    const totalItems = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
        .populate('Client_Reference', 'Company_Name Client_Name Contact_Number')
        .populate('Product_Reference', 'Type SubType SubSubType')
        .populate('Lead_Reference', 'Lead_ID')
        .populate('Project_Type', 'Type_Name')
        .populate('Quotation_Reference', 'Quotation_ID Commercial Requirement Project_Scope_Description')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit);

    // Base filter for counts (including Pipeline, Person, and Search but NO phase)
    const countFilter: any = {};
    if (pipeline !== 'All') countFilter.Pipeline_Status = pipeline;
    if (person !== 'All') countFilter['Start_Details.Assigned_Person'] = filter['Start_Details.Assigned_Person'];
    if (search) countFilter.$or = filter.$or;

    // Status Counts (respecting search and person filters)
    const statusBaseFilter = { ...countFilter };
    delete statusBaseFilter.Pipeline_Status;

    const statusCounts = {
        Active: await Project.countDocuments({ ...statusBaseFilter, Pipeline_Status: 'Active' }),
        'On Hold': await Project.countDocuments({ ...statusBaseFilter, Pipeline_Status: 'On Hold' }),
        Closed: await Project.countDocuments({ ...statusBaseFilter, Pipeline_Status: 'Closed' }),
        phaseCounts: {
            UAT: await Project.countDocuments({ ...countFilter, 'UAT.UAT_Status': { $ne: 'Approved' } }),
            Deployment: await Project.countDocuments({ ...countFilter, 'UAT.UAT_Status': 'Approved', 'Deployment.Deployment_Status': { $ne: 'Success' } }),
            Delivery: await Project.countDocuments({ ...countFilter, 'Deployment.Deployment_Status': 'Success', 'Delivery.Delivery_Status': { $ne: 'Delivered' } }),
            GoLive: await Project.countDocuments({ ...countFilter, 'Delivery.Delivery_Status': 'Delivered' })
        }
    };

    const assignedPersons = await Project.distinct('Start_Details.Assigned_Person');

    return NextResponse.json({
        projects,
        totalItems,
        statusCounts,
        assignedPersons
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.PROJECTS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    if (!data.Lead_Reference) delete data.Lead_Reference;
    if (!data.Quotation_Reference) delete data.Quotation_Reference;

    const newProject = new Project(data);
    await newProject.save();

    if (data.Quotation_Reference) {
        const quote = await Quotation.findById(data.Quotation_Reference);
        if (quote) {
            quote.Quotation_Status = 'Converted';
            await quote.save();

            if (quote.Lead_ID) {
                await Lead.findByIdAndUpdate(quote.Lead_ID, {
                    Lead_Status: 'Converted',
                    Lead_Status_Date_Time: new Date()
                });
            }
        }
    }
    await newProject.populate([
        { path: 'Client_Reference', select: 'Company_Name Client_Name Contact_Number' },
        { path: 'Product_Reference', select: 'Type SubType SubSubType' },
        { path: 'Lead_Reference', select: 'Lead_ID' },
        { path: 'Project_Type', select: 'Type_Name' },
        { path: 'Quotation_Reference', select: 'Quotation_ID Commercial Requirement Project_Scope_Description' }
    ]);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
