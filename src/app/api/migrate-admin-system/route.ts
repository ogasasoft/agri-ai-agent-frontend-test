import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { hashPassword } from '@/lib/auth';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

export async function POST(request: NextRequest) {
  console.log('🔧 Starting admin system migration...');
  
  try {
    const client = await getDbClient();
    
    try {
      // 1. Add admin role to users table
      console.log('👤 Adding admin role to users table...');
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
      `);

      // 2. Create system_settings table for various configurations
      console.log('⚙️ Creating system_settings table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          category VARCHAR(100) NOT NULL, -- 'system_prompt', 'api_config', 'general'
          key VARCHAR(100) NOT NULL,
          value TEXT,
          description TEXT,
          is_encrypted BOOLEAN DEFAULT false,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category, key)
        )
      `);

      // 3. Create api_integrations table for external API configurations
      console.log('🔌 Creating api_integrations table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_integrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE, -- 'colormi', 'tabechoku'
          display_name VARCHAR(100) NOT NULL,
          base_url VARCHAR(255),
          api_key VARCHAR(255),
          api_secret VARCHAR(255),
          webhook_url VARCHAR(255),
          is_active BOOLEAN DEFAULT false,
          configuration JSONB DEFAULT '{}',
          last_sync_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 4. Create admin audit log table
      console.log('📊 Creating admin_audit_logs table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id SERIAL PRIMARY KEY,
          admin_user_id INTEGER REFERENCES users(id),
          action VARCHAR(100) NOT NULL, -- 'create_user', 'delete_user', 'update_setting'
          target_type VARCHAR(50), -- 'user', 'setting', 'api_integration'
          target_id VARCHAR(100),
          details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 5. Create super admin user
      console.log('👑 Creating super admin user...');
      
      // Check if admin user already exists
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        ['superadmin', 'silentogasasoft@gmail.com']
      );

      if (existingAdmin.rows.length === 0) {
        // Create new super admin user
        const { hash, salt } = await hashPassword('Ogasa1995');
        
        const adminResult = await client.query(`
          INSERT INTO users (
            username, email, password_hash, salt, 
            role, is_super_admin, is_active,
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, username, email
        `, [
          'superadmin',
          'silentogasasoft@gmail.com',
          hash,
          salt,
          'super_admin',
          true,
          true
        ]);

        const adminUser = adminResult.rows[0];
        console.log('✅ Super admin created:', adminUser);

        // Insert default system settings
        await client.query(`
          INSERT INTO system_settings (category, key, value, description, created_by) VALUES
          ('system_prompt', 'chat_default', 'あなたは農業ECサイトの専門アシスタントです。注文管理、顧客対応、商品情報について親切にサポートします。', 'デフォルトのチャットシステムプロンプト', $1),
          ('system_prompt', 'order_analysis', '注文データを分析し、売上傾向、人気商品、顧客動向について洞察を提供してください。', '注文分析用プロンプト', $1),
          ('general', 'site_name', 'Agri AI 管理システム', 'サイト名', $1),
          ('general', 'max_orders_per_day', '1000', '1日あたりの最大注文数', $1)
        `, [adminUser.id]);

        // Insert API integration placeholders
        await client.query(`
          INSERT INTO api_integrations (name, display_name, is_active, configuration) VALUES
          ('colormi', 'カラーミーショップ', false, '{"sync_interval": 3600, "auto_import": false}'),
          ('tabechoku', '食べチョク', false, '{"sync_interval": 1800, "auto_import": false}')
        `);
      } else {
        console.log('⚠️ Admin user already exists, updating role...');
        await client.query(`
          UPDATE users 
          SET role = 'super_admin', is_super_admin = true, email = $2
          WHERE username = $1 OR email = $2
        `, ['superadmin', 'silentogasasoft@gmail.com']);
      }

      // 6. Create indexes for performance
      console.log('📊 Creating indexes...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings (category);
        CREATE INDEX IF NOT EXISTS idx_api_integrations_name ON api_integrations (name);
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user ON admin_audit_logs (admin_user_id);
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs (created_at);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
      `);

      // Get final stats
      const usersCount = await client.query('SELECT COUNT(*) FROM users');
      const adminCount = await client.query('SELECT COUNT(*) FROM users WHERE is_super_admin = true');
      const settingsCount = await client.query('SELECT COUNT(*) FROM system_settings');

      console.log('✅ Admin system migration completed successfully!');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Admin system migration completed successfully',
        features: [
          'Super admin user created (silentogasasoft@gmail.com)',
          'Role-based access control',
          'System settings management',
          'API integrations framework',
          'Admin audit logging',
          'Default system prompts configured'
        ],
        stats: {
          total_users: usersCount.rows[0].count,
          admin_users: adminCount.rows[0].count,
          system_settings: settingsCount.rows[0].count
        }
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('❌ Admin migration error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Admin system migration failed',
      error: error.message 
    }, { status: 500 });
  }
}