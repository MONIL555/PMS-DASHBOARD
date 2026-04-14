import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { projectId, type, serviceId, cycleDate, amount, collectedBy } = await req.json();

    if (!projectId || !type || !cycleDate || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const cycleDateObj = new Date(cycleDate);
    const collectionEntry = {
      Cycle_Date: cycleDateObj,
      Collected_At: new Date(),
      Amount: amount,
      Collected_By: collectedBy || 'System'
    };

    if (type === 'Go-Live') {
      // Check if already collected for this cycle
      const alreadyCollected = project.Go_Live.Payment_History?.some(
        (p: any) => new Date(p.Cycle_Date).toDateString() === cycleDateObj.toDateString()
      );
      if (alreadyCollected) {
        return NextResponse.json({ error: 'Payment already recorded for this costing cycle' }, { status: 400 });
      }
      
      if (!project.Go_Live.Payment_History) project.Go_Live.Payment_History = [];
      project.Go_Live.Payment_History.push(collectionEntry);
    } else if (type === 'Service') {
      if (!serviceId) return NextResponse.json({ error: 'Service ID required' }, { status: 400 });
      
      const service = project.External_Services.find((s: any) => s._id.toString() === serviceId);
      if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

      // Check if already collected for this cycle
      const alreadyCollected = service.Payment_History?.some(
        (p: any) => new Date(p.Cycle_Date).toDateString() === cycleDateObj.toDateString()
      );
      if (alreadyCollected) {
        return NextResponse.json({ error: 'Payment already recorded for this service cycle' }, { status: 400 });
      }

      if (!service.Payment_History) service.Payment_History = [];
      service.Payment_History.push(collectionEntry);
    } else {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    await project.save();
    return NextResponse.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error: any) {
    console.error('Payment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
