import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find({ Pipeline_Status: 'Active' })
        .populate('Lead_Reference', 'Company_Name Client_Name Contact_Number')
        .populate('Quotation_Reference', 'Quotation_ID Commercial Product_Name_Service Requirement Project_Scope_Description')
        .select('Project_ID Project_Name Priority UAT Deployment Delivery Go-Live Assign_Person Start_Details');

    return NextResponse.json({ count: projects.length, projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
