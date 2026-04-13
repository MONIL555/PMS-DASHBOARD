import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.QUOTATIONS_EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { id } = await params;
        const body = await request.json();
        const { Outcome } = body;

        const statusMap: Record<string, string> = { 'Converted': 'Approved', 'Cancelled': 'Rejected' };
        const newStatus = statusMap[Outcome] || 'Follow-up';

        const updatedQuo = await Quotation.findByIdAndUpdate(
            id,
            { $push: { Follow_Ups: body }, $set: { Quotation_Status: newStatus } },
            { new: true, runValidators: true }
        );
        if (!updatedQuo) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

        // --- REAL-TIME CLEANUP CHECK ---
        // If we just reached 4+ pending follow-ups, auto-reject
        if (updatedQuo.Quotation_Status !== 'Approved' && updatedQuo.Quotation_Status !== 'Rejected' && updatedQuo.Quotation_Status !== 'Converted') {
            const pendingCount = updatedQuo.Follow_Ups.filter(f => f.Outcome === 'Pending').length;
            if (pendingCount >= 4) {
                updatedQuo.Quotation_Status = 'Rejected';
                updatedQuo.Cancel_Reason = "System: Auto-rejected after reaching 4 unsuccessful follow-up attempts.";
                await updatedQuo.save();
            }
        }
        return NextResponse.json(updatedQuo);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
