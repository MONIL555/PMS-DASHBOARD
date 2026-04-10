import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.LEADS_EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { id } = await params;
        const body = await request.json();
        const { Outcome } = body;

        // Outcome-based status mapping for Leads:
        // Pending (default) -> In Progress
        // Cancelled -> Cancelled
        // Converted -> Converted
        const statusMap: Record<string, string> = { 
            'Converted': 'Converted', 
            'Cancelled': 'Cancelled' 
        };
        const newStatus = statusMap[Outcome] || 'In Progress';

        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            { 
                $push: { Follow_Ups: body }, 
                $set: { 
                    Lead_Status: newStatus, 
                    Lead_Status_Date_Time: new Date() 
                } 
            },
            { new: true, runValidators: true }
        );

        if (!updatedLead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        return NextResponse.json(updatedLead);
    } catch (error: any) {
        console.error('Error recording lead follow-up:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
