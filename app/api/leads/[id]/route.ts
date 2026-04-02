import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.LEADS_VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { id } = await params;
        const lead = await Lead.findById(id)
            .populate('Client_Reference')
            .populate('Product_Reference')
            .populate('Source_Reference')
            .populate('Assigned_User', 'User_ID Name Email');
        if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        return NextResponse.json(lead);
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

        const auth = await verifyPermission(PERMISSIONS.LEADS_EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const body = await request.json();
        const existing = await Lead.findById(id);
        if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

        // Auto-set timestamp when status changes
        if (body.Lead_Status && body.Lead_Status !== existing.Lead_Status) {
            body.Lead_Status_Date_Time = new Date();
        }

        const lead = await Lead.findByIdAndUpdate(id, body, { new: true, runValidators: true })
            .populate('Client_Reference')
            .populate('Product_Reference')
            .populate('Source_Reference')
            .populate('Assigned_User', 'User_ID Name Email');
        return NextResponse.json(lead);
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

        const auth = await verifyPermission(PERMISSIONS.LEADS_DELETE);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const lead = await Lead.findByIdAndDelete(id);
        if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        return NextResponse.json({ message: "Lead deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
