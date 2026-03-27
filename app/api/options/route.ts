import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
import Ticket from '@/models/Ticket';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const options = {
      leadStatuses: Lead.getLeadStatuses(),
      quotation: Quotation.getDropdownOptions(),
      project: Project.getProjectOptions(),
      ticket: Ticket.getTicketOptions()
    };
    return NextResponse.json(options);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
