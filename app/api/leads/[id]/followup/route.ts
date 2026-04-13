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

        // --- REAL-TIME CLEANUP CHECK ---
        // If we just reached 4+ pending follow-ups, auto-cancel
        if (updatedLead.Lead_Status !== 'Converted' && updatedLead.Lead_Status !== 'Cancelled') {
            const pendingCount = updatedLead.Follow_Ups.filter(f => f.Outcome === 'Pending').length;
            if (pendingCount >= 4) {
                updatedLead.Lead_Status = 'Cancelled';
                updatedLead.Lead_Status_Date_Time = new Date();
                updatedLead.Cancel_Reason = "System: Auto-cancelled after reaching 4 unsuccessful follow-up attempts.";
                await updatedLead.save();
            }
        }

        return NextResponse.json(updatedLead);
    } catch (error: any) {
        console.error('Error recording lead follow-up:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
