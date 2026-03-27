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
            .populate('Product_Reference', 'Product_Name')
            .populate('Lead_Reference', 'Lead_ID Company_Name Client_Name Contact_Number')
            .populate('Project_Type', 'Type_Name')
            .populate({
                path: 'Quotation_Reference',
                select: 'Quotation_ID Commercial Product_Name_Service Requirement Project_Scope_Description',
                populate: { path: 'Product_Reference', select: 'Product_Name' }
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

        const project = await Project.findOne(query);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        Object.keys(body).forEach(key => project.set(key, body[key]));

        const phaseUpdates: Record<string, { val: string, field: string }> = {
            'UAT.UAT_Status': { val: 'Approved', field: 'UAT.UAT_Date' },
            'Deployment.Deployment_Status': { val: 'Success', field: 'Deployment.Deployment_Date' },
            'Delivery.Delivery_Status': { val: 'Delivered', field: 'Delivery.Delivery_Date' }
        };

        Object.entries(phaseUpdates).forEach(([statusField, config]) => {
            if (project.isModified(statusField) && project.get(statusField) === config.val) {
                project.set(config.field, new Date());
            }
        });

        if (project.Pipeline_Status !== 'On Hold' && project.Hold_History?.length) {
            project.Hold_History.forEach((h: any) => { if (!h.Hold_End_Date) h.Hold_End_Date = new Date(); });
            project.markModified('Hold_History');
        }

        await project.save();
        await project.populate([
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
        return NextResponse.json(project);
    } catch (error: any) {
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
