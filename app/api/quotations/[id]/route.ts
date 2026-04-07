import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.QUOTATIONS_VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { id } = await params;
        const quotation = await Quotation.findById(id)
            .populate('Client_Reference')
            .populate('Product_Reference')
            .populate('Product_Reference');
        if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
        return NextResponse.json(quotation);
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

        const auth = await verifyPermission(PERMISSIONS.QUOTATIONS_EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const body = await request.json();
        const quotation = await Quotation.findByIdAndUpdate(id, body, { new: true, runValidators: true })
            .populate('Client_Reference')
            .populate('Product_Reference')
            .populate('Product_Reference');
        if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
        return NextResponse.json(quotation);
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

        const auth = await verifyPermission(PERMISSIONS.QUOTATIONS_DELETE);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const quotation = await Quotation.findByIdAndDelete(id);
        if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
        return NextResponse.json({ message: "Quotation deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
