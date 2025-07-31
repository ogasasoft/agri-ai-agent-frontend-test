import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

export async function POST(request: NextRequest) {
  console.log('🔐 Starting security enhancements migration...');
  
  try {
    const client = await getDbClient();
    
    try {
      // 1. Create remember tokens table for persistent login
      console.log('🎫 Creating remember tokens table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS remember_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL UNIQUE,
          selector VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Create rate limiting table for IP-based protection
      console.log('🚫 Creating rate limiting table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id SERIAL PRIMARY KEY,
          ip_address INET NOT NULL,
          identifier VARCHAR(255) NOT NULL, -- username, 'login_attempt', etc.
          attempt_count INTEGER DEFAULT 1,
          first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          blocked_until TIMESTAMP,
          UNIQUE(ip_address, identifier)
        )
      `);

      // 3. Enhance users table with progressive lockout
      console.log('👤 Enhancing users table...');
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS lockout_level INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_ip INET;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0;
      `);

      // 4. Create security events table for advanced monitoring
      console.log('📊 Creating security events table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL, -- 'password_spray', 'brute_force', 'account_enumeration'
          ip_address INET,
          user_agent TEXT,
          target_username VARCHAR(100),
          details JSONB,
          severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 5. Create indexes for performance and security monitoring
      console.log('📊 Creating security indexes...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_remember_tokens_selector ON remember_tokens (selector);
        CREATE INDEX IF NOT EXISTS idx_remember_tokens_expires ON remember_tokens (expires_at);
        CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits (ip_address);
        CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits (ip_address, identifier);
        CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON rate_limits (blocked_until);
        CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events (event_type);
        CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events (ip_address);
        CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events (created_at);
        CREATE INDEX IF NOT EXISTS idx_users_lockout ON users (lockout_level, locked_until);
      `);

      // 6. Create function for progressive lockout calculation
      console.log('⚙️ Creating progressive lockout function...');
      await client.query(`
        CREATE OR REPLACE FUNCTION calculate_lockout_duration(lockout_level INTEGER)
        RETURNS INTERVAL AS $$
        BEGIN
          CASE lockout_level
            WHEN 0 THEN RETURN INTERVAL '0 minutes';
            WHEN 1 THEN RETURN INTERVAL '5 minutes';   -- First lockout: 5 minutes
            WHEN 2 THEN RETURN INTERVAL '15 minutes';  -- Second lockout: 15 minutes
            WHEN 3 THEN RETURN INTERVAL '30 minutes';  -- Third lockout: 30 minutes
            WHEN 4 THEN RETURN INTERVAL '1 hour';      -- Fourth lockout: 1 hour
            WHEN 5 THEN RETURN INTERVAL '2 hours';     -- Fifth lockout: 2 hours
            WHEN 6 THEN RETURN INTERVAL '4 hours';     -- Sixth lockout: 4 hours
            WHEN 7 THEN RETURN INTERVAL '8 hours';     -- Seventh lockout: 8 hours
            ELSE RETURN INTERVAL '24 hours';           -- Max lockout: 24 hours
          END CASE;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // 7. Create cleanup function for expired tokens and rate limits
      console.log('🧹 Creating cleanup functions...');
      await client.query(`
        CREATE OR REPLACE FUNCTION cleanup_expired_security_data()
        RETURNS void AS $$
        BEGIN
          -- Clean up expired remember tokens
          DELETE FROM remember_tokens WHERE expires_at < NOW();
          
          -- Clean up old rate limit entries (older than 24 hours)
          DELETE FROM rate_limits 
          WHERE last_attempt_at < NOW() - INTERVAL '24 hours' 
            AND (blocked_until IS NULL OR blocked_until < NOW());
          
          -- Clean up old security events (older than 30 days)
          DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '30 days';
          
          -- Clean up expired sessions
          UPDATE sessions SET is_active = false WHERE expires_at < NOW();
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Get stats
      const usersCount = await client.query('SELECT COUNT(*) FROM users');
      const sessionsCount = await client.query('SELECT COUNT(*) FROM sessions WHERE is_active = true');
      
      console.log('✅ Security enhancements migration completed successfully!');
      console.log(`📊 Active users: ${usersCount.rows[0].count}`);
      console.log(`📊 Active sessions: ${sessionsCount.rows[0].count}`);

      return NextResponse.json({ 
        success: true, 
        message: 'Security enhancements migration completed successfully',
        features: [
          'Remember Me tokens for persistent login',
          'Progressive lockout system (5min → 24hours)',
          'IP-based rate limiting',
          'Password spray attack detection',
          'Advanced security event monitoring',
          'Automatic cleanup of expired data'
        ],
        stats: {
          users_count: usersCount.rows[0].count,
          active_sessions: sessionsCount.rows[0].count
        }
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Security enhancements migration failed',
      error: error.message 
    }, { status: 500 });
  }
}