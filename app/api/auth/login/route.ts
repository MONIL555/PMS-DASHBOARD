import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Role from '@/models/Role'; // Ensure Role is loaded for populate
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { Email, Password } = await req.json();

    if (!Email || !Password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ Email }).select('+Password').populate('Role_ID');
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.IsActive) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    // Protect against legacy users without passwords
    if (!user.Password) {
      return NextResponse.json({ error: 'Account lacks password. Please contact Admin.' }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const roleDoc = user.Role_ID as any;
    const permissions = roleDoc?.Permissions ? Array.from(roleDoc.Permissions) : [];
    
    const token = await signToken({
      _id: user._id.toString(),
      User_ID: user.User_ID,
      Name: user.Name,
      Email: user.Email,
      Role_Name: roleDoc?.Role_Name || 'Unknown',
      Permissions: permissions as string[]
    });

    const cookieStore = await cookies();
    cookieStore.set('pms_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return NextResponse.json({ message: 'Login successful' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
