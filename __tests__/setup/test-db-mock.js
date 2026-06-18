// Mock database connection for tests
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'test_db',
  user: process.env.DB_USER || 'test_user',
  password: process.env.DB_PASSWORD || 'test_password',
});

// Mock the global db client
global.mockDb = {
  pool,
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  end: () => pool.end(),
};

// Test environment setup
beforeAll(() => {
  // Set test environment variables
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.OPENAI_API_KEY = 'test-key';
});

// Test environment cleanup
afterAll(async () => {
  await pool.end();
});
