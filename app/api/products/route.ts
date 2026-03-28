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
    const limitInput = searchParams.get('limit');
    const limit = limitInput ? parseInt(limitInput) : 0;
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('active') === 'true';
    
    const query: any = activeOnly ? { IsActive: true } : {};
    if (search) {
        query.$or = [
            { Type: { $regex: search, $options: 'i' } },
            { SubType: { $regex: search, $options: 'i' } },
            { SubSubType: { $regex: search, $options: 'i' } },
            { Description: { $regex: search, $options: 'i' } }
        ];
    }

    const totalItems = await Product.countDocuments(query);
    let productsQuery = Product.find(query).sort({ Type: 1, SubType: 1, SubSubType: 1 });

    if (limit > 0) {
        productsQuery = productsQuery.skip((page - 1) * limit).limit(limit);
    }

    const products = await productsQuery;

    return NextResponse.json({
        products,
        totalItems
    });
  } catch (error: any) {
    console.error("API Error:", error);
    let message = "A system-wide classification error occurred.";
    if (error.name === 'ValidationError') {
      message = "Validation Failed: Incomplete hierarchical classification path.";
    } else if (error.code === 11000) {
      message = "A record with this exact classification already exists.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const auth = await verifyPermission(PERMISSIONS.PRODUCTS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    // Check for existing product with the same category triple
    const existing = await Product.findOne({
      Type: data.Type,
      SubType: data.SubType,
      SubSubType: data.SubSubType
    });
    if (existing) {
      return NextResponse.json({ error: "A product with this hierarchical path already exists." }, { status: 400 });
    }

    const newProduct = new Product({
      ...data,
      Type: data.Type,
      SubType: data.SubType,
      SubSubType: data.SubSubType
    });
    await newProduct.save();
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
