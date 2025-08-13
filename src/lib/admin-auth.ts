import { Client } from 'pg';
import { NextRequest } from 'next/server';
import { validateSession } from './auth';
import { getDbClient } from '@/lib/db';

export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  is_super_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export async function validateAdminSession(sessionToken: string): Promise<AdminUser | null> {
  try {
    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      return null;
    }

    const client = await getDbClient();
    
    try {
      const result = await client.query(`
        SELECT id, username, email, role, is_super_admin, is_active, created_at
        FROM users 
        WHERE id = $1 AND is_active = true AND (role = 'admin' OR role = 'super_admin' OR is_super_admin = true)
      `, [sessionData.user.id]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as AdminUser;
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Admin session validation error:', error);
    return null;
  }
}

export async function logAdminAction(
  adminUserId: number,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const client = await getDbClient();
  
  try {
    await client.query(`
      INSERT INTO admin_audit_logs (
        admin_user_id, action, target_type, target_id, details, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      adminUserId,
      action,
      targetType || null,
      targetId || null,
      JSON.stringify(details || {}),
      ipAddress || null,
      userAgent || null
    ]);
  } finally {
    await client.end();
  }
}

export function getClientInfo(request: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress = request.ip || 
                   request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

// Admin role checks
export function isSuperAdmin(user: AdminUser): boolean {
  return user.is_super_admin || user.role === 'super_admin';
}

export function isAdmin(user: AdminUser): boolean {
  return user.role === 'admin' || user.role === 'super_admin' || user.is_super_admin;
}

export function canManageUsers(user: AdminUser): boolean {
  return isSuperAdmin(user);
}

export function canManageSettings(user: AdminUser): boolean {
  return isAdmin(user);
}

export function canManageAPI(user: AdminUser): boolean {
  return isSuperAdmin(user);
}