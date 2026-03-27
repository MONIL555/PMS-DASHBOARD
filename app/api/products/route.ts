import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.PRODUCTS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('active') === 'true';
    
    const query: any = activeOnly ? { IsActive: true } : {};
    if (search) {
        query.Product_Name = { $regex: search, $options: 'i' };
    }

    const totalItems = await Product.countDocuments(query);
    const products = await Product.find(query)
        .sort({ Product_Name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return NextResponse.json({
        products,
        totalItems
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const auth = await verifyPermission(PERMISSIONS.PRODUCTS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    const existing = await Product.findOne({ Product_Name: { $regex: new RegExp(`^${data.Product_Name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: "A product with this name already exists." }, { status: 400 });
    }

    const newProduct = new Product(data);
    await newProduct.save();
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
