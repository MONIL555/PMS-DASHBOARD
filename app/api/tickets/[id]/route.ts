import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.TICKETS_VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { id } = await params;
        const ticket = await Ticket.findById(id)
            .populate('Project_ID', 'Project_Name Project_ID')
            .populate('Client_Reference', 'Company_Name Client_Name Contact_Number');
        if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        return NextResponse.json(ticket);
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

        const auth = await verifyPermission(PERMISSIONS.TICKETS_EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const body = await request.json();
        const ticket = await Ticket.findById(id);
        if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

        Object.keys(body).forEach(key => ticket.set(key, body[key]));
        await ticket.save();
        await ticket.populate([
            { path: 'Project_ID', select: 'Project_Name Project_ID' },
            { path: 'Client_Reference', select: 'Company_Name Client_Name Contact_Number' }
        ]);
        return NextResponse.json(ticket);
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

        const auth = await verifyPermission(PERMISSIONS.TICKETS_DELETE);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const ticket = await Ticket.findByIdAndDelete(id);
        if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        return NextResponse.json({ message: "Ticket deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
