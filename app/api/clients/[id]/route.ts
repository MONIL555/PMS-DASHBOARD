import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const auth = await verifyPermission(PERMISSIONS.CLIENTS_EDIT);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    const updatedClient = await Client.findByIdAndUpdate(id, data, { new: true });
    
    if (!updatedClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedClient);
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ error: "A client with this company name already exists." }, { status: 400 });
    }
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

    const auth = await verifyPermission(PERMISSIONS.CLIENTS_DELETE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const deletedClient = await Client.findByIdAndDelete(id);
    
    if (!deletedClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
