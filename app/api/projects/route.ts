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
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const phase = searchParams.get('phase') || 'All';
    const pipeline = searchParams.get('pipeline') || 'All';
    const person = searchParams.get('person') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};

    // Pipeline Filter
    if (pipeline !== 'All') {
        filter.Pipeline_Status = pipeline;
    }

    // Person Filter
    if (person !== 'All') {
        filter['Start_Details.Assigned_Person'] = { $regex: new RegExp(`^\\s*${person.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i') };
    }

    // Date Filter
    if (startDate || endDate) {
        filter['Start_Details.Start_Date'] = {};
        if (startDate) filter['Start_Details.Start_Date'].$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter['Start_Details.Start_Date'].$lte = end;
        }
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

    const totalItems = await Project.countDocuments(filter);

    let projects;
    if (sortBy.startsWith('Company')) {
        const sortDirection = sortBy === 'Company-A-Z' ? 1 : -1;
        projects = await Project.aggregate([
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
        // Sort Logic
        let sortOption: any = { createdAt: -1 };
        if (sortBy === 'Oldest') sortOption = { createdAt: 1 };
        if (sortBy === 'Priority-High') sortOption = { Priority: -1, createdAt: -1 };
        if (sortBy === 'Costing-High') sortOption = { 'Start_Details.Costing': -1 };
        if (sortBy === 'ID-ASC') sortOption = { Project_ID: 1 };
        if (sortBy === 'ID-DESC') sortOption = { Project_ID: -1 };

        projects = await Project.find(filter)
            .populate('Client_Reference', 'Company_Name Client_Name Contact_Number')
            .populate('Product_Reference', 'Type SubType SubSubType')
            .populate('Lead_Reference', 'Lead_ID')
            .populate('Quotation_Reference', 'Quotation_ID Commercial Requirement Project_Scope_Description')
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);
    }

    // Base filter for counts (including Pipeline, Person, and Search but NO phase)
    const countFilter: any = {};
    if (pipeline !== 'All') countFilter.Pipeline_Status = pipeline;
    if (person !== 'All') countFilter['Start_Details.Assigned_Person'] = filter['Start_Details.Assigned_Person'];
    if (search) countFilter.$or = filter.$or;
    if (filter['Start_Details.Start_Date']) countFilter['Start_Details.Start_Date'] = filter['Start_Details.Start_Date'];

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

    const body = await request.json();
    const { newClientData, ...projectData } = body;

    let clientReference = projectData.Client_Reference;

    // Handle nested client creation
    if (newClientData) {
      const newClient = new Client(newClientData);
      await newClient.save();
      clientReference = newClient._id;
    }

    if (!clientReference && !projectData.Quotation_Reference && !projectData.Lead_Reference) {
      return NextResponse.json({ error: 'Client Reference is required' }, { status: 400 });
    }

    if (!projectData.Lead_Reference) delete projectData.Lead_Reference;
    if (!projectData.Quotation_Reference) delete projectData.Quotation_Reference;

    const newProject = new Project({
      ...projectData,
      Client_Reference: clientReference
    });

    await newProject.save();

    if (projectData.Quotation_Reference) {
        const quote = await Quotation.findById(projectData.Quotation_Reference);
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
        { path: 'Quotation_Reference', select: 'Quotation_ID Commercial Requirement Project_Scope_Description' }
    ]);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
