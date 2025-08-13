import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getDbClient } from '@/lib/db';

export async function POST(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    const { username } = await request.json();
    
    client = await getDbClient();

    // Reset user lock status
    const result = await client.query(`
      UPDATE users 
      SET 
        failed_login_attempts = 0,
        locked_until = NULL,
        lockout_level = 0,
        consecutive_failures = 0,
        last_failed_ip = NULL
      WHERE username = $1 OR email = $1
      RETURNING id, username, email
    `, [username]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      message: `User ${user.username} lock status reset`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Reset user lock error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}