import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.PROJECTS_VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { id } = await params;
        const isProjectId = id.startsWith('PRJ-');
        const query = isProjectId ? { Project_ID: id } : { _id: id };

        const project = await Project.findOne(query)
            .populate('Client_Reference', 'Company_Name Client_Name Contact_Number')
            .populate('Product_Reference', 'Type SubType SubSubType')
            .populate('Lead_Reference', 'Lead_ID Company_Name Client_Name Contact_Number')
            .populate('Project_Type', 'Type_Name')
            .populate({
                path: 'Quotation_Reference',
                select: 'Quotation_ID Commercial Product_Name_Service Requirement Project_Scope_Description',
                populate: { path: 'Product_Reference', select: 'Type SubType SubSubType' }
            });
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        return NextResponse.json(project);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const auth = await verifyPermission(PERMISSIONS.PROJECTS_EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const body = await request.json();
        const isProjectId = id.startsWith('PRJ-');
        const query = isProjectId ? { Project_ID: id } : { _id: id };

        // Calculate phase updates manually since we are using findOneAndUpdate
        const phaseUpdates: any = {};
        if (body['UAT.UAT_Status'] === 'Approved') phaseUpdates['UAT.UAT_Date'] = new Date();
        if (body['Deployment.Deployment_Status'] === 'Success') phaseUpdates['Deployment.Deployment_Date'] = new Date();
        if (body['Delivery.Delivery_Status'] === 'Delivered') phaseUpdates['Delivery.Delivery_Date'] = new Date();

        const updateData = { ...body, ...phaseUpdates };

        const project = await Project.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true })
            .populate([
                { path: 'Client_Reference', select: 'Company_Name Client_Name Contact_Number' },
                { path: 'Product_Reference', select: 'Product_Name' },
                { path: 'Lead_Reference', select: 'Lead_ID Company_Name Client_Name Contact_Number' },
                { path: 'Project_Type', select: 'Type_Name' },
                { 
                    path: 'Quotation_Reference', 
                    select: 'Quotation_ID Commercial Product_Name_Service Requirement Project_Scope_Description',
                    populate: { path: 'Product_Reference', select: 'Product_Name' }
                }
            ]);

        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        return NextResponse.json(project);
    } catch (error: any) {
        console.error('PUT Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const auth = await verifyPermission(PERMISSIONS.PROJECTS_DELETE);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const isProjectId = id.startsWith('PRJ-');
        const query = isProjectId ? { Project_ID: id } : { _id: id };

        const project = await Project.findOneAndDelete(query);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        return NextResponse.json({ message: "Project deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
