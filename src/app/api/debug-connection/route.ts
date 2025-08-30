import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Debug Connection Test Start ===');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
    
    // Check all possible DATABASE environment variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    };

    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      return NextResponse.json({
        success: false,
        error: 'No database URL environment variable is set',
        env_check: envCheck,
        available_env_vars: Object.keys(process.env).filter(key => 
          key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('VERCEL')
        )
      }, { status: 500 });
    }

    console.log('Attempting database connection...');
    const client = await getDbClient();
    console.log('Database client created successfully');

    // Test simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('Database query successful:', result.rows[0]);

    // Test user table
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('User count:', userCount.rows[0]);

    // Test specific user
    const user = await client.query('SELECT id, username, email, role FROM users WHERE email = $1', ['tanaka@farm.com']);
    console.log('Tanaka user found:', user.rows.length > 0);

    await client.end();
    console.log('Database connection closed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        current_time: result.rows[0].current_time,
        db_version: result.rows[0].db_version,
        user_count: userCount.rows[0].count,
        tanaka_user_exists: user.rows.length > 0,
        user_data: user.rows[0] || null
      }
    });

  } catch (error: any) {
    console.error('=== Debug Connection Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('DATABASE_URL (first 50 chars):', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    return NextResponse.json({
      success: false,
      error: error.message,
      error_code: error.code,
      error_type: error.constructor.name,
      database_url_exists: !!process.env.DATABASE_URL,
      node_env: process.env.NODE_ENV
    }, { status: 500 });
  }
}