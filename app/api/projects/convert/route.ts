import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Quotation from '@/models/Quotation';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function POST(request: Request) {
  try {
    await connectDB();

    const auth = await verifyPermission(PERMISSIONS.QUOTATIONS_CONVERT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { quotationId, projectData } = await request.json();

    const quote = await Quotation.findById(quotationId);
    if (!quote) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    if (quote.Quotation_Status !== 'Approved') {
        return NextResponse.json({ error: "Only approved quotations can be converted to projects" }, { status: 400 });
    }

    const newProject = new Project({
        Project_Name: projectData?.Project_Name || 'New Project',
        Project_Type: projectData?.Project_Type,
        Lead_Reference: quote.Lead_ID,
        Quotation_Reference: quote._id,
        Client_Reference: quote.Client_Reference,
        Product_Reference: quote.Product_Reference,
        Priority: projectData?.Priority || 'Normal',
        Start_Details: {
            Phase: projectData?.Phase || 'UAT Phase',
            Requirement: quote.Requirement || '',
            Project_Scope_Description: quote.Project_Scope_Description || '',
            Report_Type: projectData?.Report_Type || 'Overview',
            Costing: projectData?.Costing !== undefined ? Number(projectData.Costing) : Number(quote.Commercial),
            Assigned_Person: projectData?.Assigned_Person || '',
            Start_Date: projectData?.Start_Date ? new Date(projectData.Start_Date) : new Date(),
            End_Date: projectData?.End_Date ? new Date(projectData.End_Date) : undefined
        }
    });

    await newProject.save();

    quote.Quotation_Status = 'Converted';
    await quote.save();

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
