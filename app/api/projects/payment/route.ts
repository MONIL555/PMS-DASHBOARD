import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { verifyPermission, getSession } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

// POST — Mark a payment cycle as collected
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.PROJECTS_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const session = await getSession();
    const body = await req.json();
    const { projectId, serviceId, cycleDate, type, amount } = body;

    if (!projectId || !cycleDate || !type) {
      return NextResponse.json({ error: 'Missing required parameters: projectId, cycleDate, type' }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const cycleDateObj = new Date(cycleDate);
    const paymentEntry = {
      Cycle_Date: cycleDateObj,
      Collected_At: new Date(),
      Amount: amount || 0,
      Collected_By: session?.Name || session?.Email || 'System'
    };

    if (type === 'billing') {
      // External Service payment
      if (!serviceId) return NextResponse.json({ error: 'serviceId required for billing type' }, { status: 400 });

      const service: any = project.External_Services.find((s: any) => s._id.toString() === serviceId);
      if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

      // Prevent duplicates — check if this cycle is already paid
      if (!service.Payment_History) service.Payment_History = [];
      const alreadyPaid = service.Payment_History.some((ph: any) =>
        new Date(ph.Cycle_Date).getTime() === cycleDateObj.getTime()
      );
      if (alreadyPaid) {
        return NextResponse.json({ message: 'This cycle is already marked as collected.' }, { status: 200 });
      }

      service.Payment_History.push(paymentEntry);

      // Auto-flip Billing_Status for One Time services
      if (service.Payment_Terms === 'One Time') {
        service.Billing_Status = 'Received';
      }

    } else if (type === 'renewal') {
      // Go-Live renewal payment
      if (!project.Go_Live) return NextResponse.json({ error: 'No Go-Live data found' }, { status: 404 });

      if (!project.Go_Live.Payment_History) (project.Go_Live as any).Payment_History = [];
      const alreadyPaid = project.Go_Live.Payment_History.some((ph: any) =>
        new Date(ph.Cycle_Date).getTime() === cycleDateObj.getTime()
      );
      if (alreadyPaid) {
        return NextResponse.json({ message: 'This cycle is already marked as collected.' }, { status: 200 });
      }

      project.Go_Live.Payment_History.push(paymentEntry);
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "billing" or "renewal".' }, { status: 400 });
    }

    await project.save();
    return NextResponse.json({ success: true, message: 'Payment marked as collected.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Undo a payment collection
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.PROJECTS_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const body = await req.json();
    const { projectId, serviceId, cycleDate, type } = body;

    if (!projectId || !cycleDate || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const cycleDateObj = new Date(cycleDate);

    if (type === 'billing') {
      if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 });

      const service: any = project.External_Services.find((s: any) => s._id.toString() === serviceId);
      if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

      if (service.Payment_History) {
        service.Payment_History = service.Payment_History.filter((ph: any) =>
          new Date(ph.Cycle_Date).getTime() !== cycleDateObj.getTime()
        );
      }

      // Revert Billing_Status for One Time if undone
      if (service.Payment_Terms === 'One Time' && service.Billing_Status === 'Received') {
        service.Billing_Status = 'Given to Client';
      }

    } else if (type === 'renewal') {
      if (project.Go_Live?.Payment_History) {
        project.Go_Live.Payment_History = project.Go_Live.Payment_History.filter((ph: any) =>
          new Date(ph.Cycle_Date).getTime() !== cycleDateObj.getTime()
        );
      }
    }

    await project.save();
    return NextResponse.json({ success: true, message: 'Payment collection undone.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
