import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import '@/models/Role'; // Ensure Role model is loaded for population
import bcrypt from 'bcryptjs';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    // Check if viewing users is allowed (using USERS_MANAGE for now as there's no USERS_VIEW yet)
    // or just let it be if user is authenticated (getSession is usually enough for GET)
    // but USERS_MANAGE is safer for the whole list.
    const auth = await verifyPermission(PERMISSIONS.USERS_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('active') === 'true';
    
    const query: any = activeOnly ? { IsActive: true } : {};
    if (search) {
        query.$or = [
            { Full_Name: { $regex: search, $options: 'i' } },
            { Email: { $regex: search, $options: 'i' } },
            { Username: { $regex: search, $options: 'i' } }
        ];
    }

    const totalItems = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('Role_ID', 'Role_Name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
        users,
        totalItems
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const auth = await verifyPermission(PERMISSIONS.USERS_CREATE);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const data = await request.json();
    
    if (!data.Password) {
      return NextResponse.json({ error: "Password is required for new users." }, { status: 400 });
    }
    
    data.Password = await bcrypt.hash(data.Password, 10);
    
    const existing = await User.findOne({ Email: data.Email?.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
    }

    const newUser = new User(data);
    await newUser.save();
    
    const populatedUser = await User.findById(newUser._id).populate('Role_ID', 'Role_Name');
    return NextResponse.json(populatedUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
