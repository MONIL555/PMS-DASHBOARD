import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import connectDB from './mongodb';
import User from '@/models/User';
import '@/models/Role'; // Ensure Role is loaded for populate
import { cache } from 'react';

const secretKey = process.env.JWT_SECRET || 'super-secret-production-key-change-me';
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  _id: string;
  User_ID: string;
  Name: string;
  Email: string;
  Role_Name: string;
  Permissions: string[];
}

export async function signToken(payload: SessionPayload) {
  // Ensure we are passing a plain object, not a class instance or Mongoose doc
  const plainPayload = JSON.parse(JSON.stringify(payload));
  return new SignJWT(plainPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // 30 day token
    .sign(encodedKey);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('pms_session');
  if (!sessionCookie?.value) return null;
  return await verifyToken(sessionCookie.value);
});

/**
 * Gets the current live permissions for the session user.
 * This is "stable" because it reflects DB changes immediately.
 */
export const getLivePermissions = cache(async (): Promise<string[]> => {
    const session = await getSession();
    if (!session) return [];
    if (session.Role_Name === 'Admin') return ['ADMIN_BYPASS'];

    try {
        await connectDB();
        // Case-insensitive email search just in case
        const user = await User.findOne({ Email: { $regex: new RegExp(`^${session.Email}$`, 'i') } }).populate('Role_ID');
        if (!user || !user.Role_ID) {
            console.log('No user or Role_ID found for session email:', session.Email);
            return [];
        }
        const role = user.Role_ID as any;
        const permissions = role.Permissions || [];
        
        // Smart View Logic: If user has any action permission in a group, they should have VIEW too.
        // This prevents 403 errors after security hardening if the DB isn't perfectly synced.
        const smartPermissions = new Set(permissions);
        permissions.forEach((p: string) => {
            const prefix = p.split('_')[0];
            if (prefix && !smartPermissions.has(`${prefix}_view`)) {
                smartPermissions.add(`${prefix}_view`);
            }
        });
        
        // Dependency: To view/manage users, you MUST be able to see roles (for the dropdowns)
        if (smartPermissions.has('users_view') && !smartPermissions.has('roles_view')) {
            smartPermissions.add('roles_view');
        }
        
        // Ensure dashboard_view is present if user has any other permission
        if (smartPermissions.size > 0 && !smartPermissions.has('dashboard_view')) {
            smartPermissions.add('dashboard_view');
        }

        const finalPermissions = Array.from(smartPermissions) as string[];
        try {
            const fs = require('fs');
            const logMsg = `[${new Date().toISOString()}] Email: ${session.Email}, Role: ${role.Role_Name}, Final Perms: ${JSON.stringify(finalPermissions)}\n`;
            //fs.appendFileSync('c:/xampp/htdocs/PMS/auth_debug.log', logMsg);
        } catch (e) {}

        return finalPermissions;
    } catch (error) {
        console.error('Error fetching live permissions:', error);
        return session.Permissions;
    }
});

export async function hasPermission(permissionCode: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  if (session.Role_Name === 'Admin') return true;

  const permissions = await getLivePermissions();
  return permissions.includes(permissionCode);
}

/**
 * Throws an error or returns false if the user doesn't have the required permission.
 * Useful for inline checks in API routes.
 */
export async function verifyPermission(permissionCode: string) {
  const session = await getSession();
  if (!session) {
    return { authorized: false, message: 'Unauthorized', status: 401 };
  }
  
  if (session.Role_Name === 'Admin') return { authorized: true, session };

  const permissions = await getLivePermissions();
  if (!permissions.includes(permissionCode)) {
    return { authorized: false, message: 'Forbidden: Missing permission ' + permissionCode, status: 403 };
  }
  
  return { authorized: true, session };
}
