import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function POST(request: NextRequest) {
  // Starting database migration
  
  try {
    const client = await getDbClient();
    
    try {
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          is_super_admin BOOLEAN DEFAULT false,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP,
          password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Users table created

      // Create sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_token TEXT UNIQUE NOT NULL,
          csrf_token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          ip_address INET,
          user_agent TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Sessions table created

      // Create categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT DEFAULT '',
          color VARCHAR(20) DEFAULT 'gray',
          icon VARCHAR(50) DEFAULT 'Package',
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name, user_id)
        )
      `);
      // Categories table created

      // Create orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_code VARCHAR(100) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          address TEXT,
          price INTEGER,
          order_date DATE,
          delivery_date DATE,
          notes TEXT,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          source VARCHAR(50) DEFAULT 'manual',
          extra_data JSONB DEFAULT '{}',
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(order_code, user_id)
        )
      `);
      // Orders table created

      // Create audit_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50),
          resource_id INTEGER,
          details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          success BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Audit logs table created

      // Insert default admin user
      await client.query(`
        INSERT INTO users (username, email, password_hash, salt, is_super_admin)
        VALUES ('admin', 'silentogasasoft@gmail.com', '$2b$12$dummy_hash', 'dummy_salt', true)
        ON CONFLICT (username) DO NOTHING
      `);
      // Default admin user created (if not exists)

      return NextResponse.json({
        success: true,
        message: 'Database migration completed successfully',
        tables: ['users', 'sessions', 'categories', 'orders', 'audit_logs']
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database migration failed',
      error: error.message
    }, { status: 500 });
  }
}