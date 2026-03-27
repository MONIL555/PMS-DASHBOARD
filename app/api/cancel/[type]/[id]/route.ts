import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
import Ticket from '@/models/Ticket';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ type: string, id: string }> }
) {
    try {
        await connectDB();
        const { type, id } = await params;

        // Map type to permission
        const permissionMap: Record<string, string> = {
            lead: PERMISSIONS.LEADS_DELETE,
            quotation: PERMISSIONS.QUOTATIONS_DELETE,
            project: PERMISSIONS.PROJECTS_DELETE,
            ticket: PERMISSIONS.TICKETS_DELETE
        };

        const permission = permissionMap[type.toLowerCase()];
        if (permission) {
            const auth = await verifyPermission(permission);
            if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });
        }

        const { reason } = await request.json();

        const updates: Record<string, any> = {
            lead: { Lead_Status: 'Cancelled', Cancel_Reason: reason },
            quotation: { Quotation_Status: 'Rejected', Cancel_Reason: reason },
            project: { Pipeline_Status: 'Closed' },
            ticket: { Status: 'Closed', Cancel_Reason: reason }
        };

        const update = updates[type.toLowerCase()];
        if (!update) return NextResponse.json({ error: "Invalid type for cancellation" }, { status: 400 });

        const models: Record<string, any> = { lead: Lead, quotation: Quotation, project: Project, ticket: Ticket };
        const Model = models[type.toLowerCase()];
        
        const doc = await Model.findByIdAndUpdate(id, update);
        if (!doc) return NextResponse.json({ error: `${type} not found` }, { status: 404 });

        return NextResponse.json({ message: `${type} successfully cancelled and moved to archives.` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
