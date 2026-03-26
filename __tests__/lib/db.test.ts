
import { getDbClient, withDatabase } from '../../src/lib/db';
import { Client } from 'pg';

// Mock the 'pg' module to control its behavior
jest.mock('pg', () => {
  const mockClient = jest.fn();
  const mockConnect = jest.fn();
  const mockEnd = jest.fn();
  const mockQuery = jest.fn();

  mockClient.prototype.connect = mockConnect;
  mockClient.prototype.end = mockEnd;
  mockClient.prototype.query = mockQuery;

  return {
    Client: mockClient,
  };
});

const MockClient = Client as jest.MockedClass<typeof Client>;

describe('db.ts', () => {
  beforeEach(() => {
    // Reset mocks before each test
    MockClient.mockClear();
    (MockClient.prototype.connect as jest.Mock).mockClear();
    (MockClient.prototype.end as jest.Mock).mockClear();
    (MockClient.prototype.query as jest.Mock).mockClear();
  });

  describe('getDbClient', () => {
    it('should create and connect a new PostgreSQL client using DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:port/database';
      const client = await getDbClient();

      expect(MockClient).toHaveBeenCalledWith({
        connectionString: process.env.DATABASE_URL,
        ssl: false, // NODE_ENV is not 'production'
      });
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it('should create and connect a new PostgreSQL client using POSTGRES_URL if DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_URL = 'postgresql://user:password@host:port/database_postgres';
      const client = await getDbClient();

      expect(MockClient).toHaveBeenCalledWith({
        connectionString: process.env.POSTGRES_URL,
        ssl: false,
      });
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it('should create and connect a new PostgreSQL client using POSTGRES_URL_NON_POOLING if others are not set', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_URL;
      process.env.POSTGRES_URL_NON_POOLING = 'postgresql://user:password@host:port/database_non_pooling';
      const client = await getDbClient();

      expect(MockClient).toHaveBeenCalledWith({
        connectionString: process.env.POSTGRES_URL_NON_POOLING,
        ssl: false,
      });
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if no database connection string is found', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_URL;
      delete process.env.POSTGRES_URL_NON_POOLING;

      await expect(getDbClient()).rejects.toThrow('No database connection string found in environment variables');
    });

    it('should set ssl to rejectUnauthorized: false in production environment', async () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:port/database';
      process.env.NODE_ENV = 'production';
      await getDbClient();

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: { rejectUnauthorized: false },
        })
      );
      // Restore NODE_ENV for other tests
      process.env.NODE_ENV = 'test';
    });
  });

  describe('withDatabase', () => {
    it('should call the callback with a client and ensure the client is ended', async () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:port/database';
      const mockCallback = jest.fn(async (client: Client) => {
        await client.query('SELECT 1');
        return 'callback result';
      });

      const result = await withDatabase(mockCallback);

      expect(MockClient).toHaveBeenCalledTimes(1);
      const clientInstance = MockClient.mock.instances[0];
      expect(clientInstance.connect).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(clientInstance);
      expect(clientInstance.query).toHaveBeenCalledWith('SELECT 1');
      expect(clientInstance.end).toHaveBeenCalledTimes(1);
      expect(result).toBe('callback result');
    });

    it('should ensure the client is ended even if the callback throws an error', async () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:port/database';
      const mockCallback = jest.fn(async () => {
        throw new Error('Callback error');
      });

      await expect(withDatabase(mockCallback)).rejects.toThrow('Callback error');

      expect(MockClient).toHaveBeenCalledTimes(1);
      const clientInstance = MockClient.mock.instances[0];
      expect(clientInstance.connect).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(clientInstance);
      expect(clientInstance.end).toHaveBeenCalledTimes(1);
    });
  });
});
