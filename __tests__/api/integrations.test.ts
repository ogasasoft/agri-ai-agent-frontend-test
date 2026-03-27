/** @jest-environment node */

// FILE: __tests__/api/integrations.test.ts

import { GET, POST } from '@/app/api/integrations/route';
import { createMockRequest } from '../setup/test-utils';

describe('/api/integrations', () => {
  describe('GET /api/integrations', () => {
    it('should return 200 with platforms data', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('platforms');
      expect(Array.isArray(data.platforms)).toBe(true);
    });

    it('should return ColorMi Shop as the first platform', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(data.platforms.length).toBeGreaterThan(0);
      expect(data.platforms[0].name).toBe('ColorMi Shop');
    });

    it('should return platform with correct shape', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      const platform = data.platforms[0];
      expect(platform).toHaveProperty('name');
      expect(platform).toHaveProperty('enabled');
      expect(platform).toHaveProperty('lastSync');
      expect(platform).toHaveProperty('syncStatus');
      expect(platform).toHaveProperty('totalOrders');
      expect(platform).toHaveProperty('pendingOrders');
      expect(platform).toHaveProperty('syncInterval');
    });

    it('should return platform with enabled=true', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(data.platforms[0].enabled).toBe(true);
    });

    it('should return platform with syncStatus connected', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(data.platforms[0].syncStatus).toBe('connected');
    });

    it('should return settings object with colorMi configuration', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('settings');
      expect(data.settings).toHaveProperty('colorMi');
      expect(data.settings.colorMi).toHaveProperty('apiKey');
      expect(data.settings.colorMi).toHaveProperty('shopId');
      expect(data.settings.colorMi).toHaveProperty('autoSync');
      expect(data.settings.colorMi).toHaveProperty('syncInterval');
    });

    it('should use mock-api-key when COLORMI_API_KEY env var is not set', async () => {
      const savedKey = process.env.COLORMI_API_KEY;
      delete process.env.COLORMI_API_KEY;

      const request = createMockRequest({ method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.settings.colorMi.apiKey).toBe('mock-api-key');

      if (savedKey !== undefined) {
        process.env.COLORMI_API_KEY = savedKey;
      }
    });

    it('should use env COLORMI_API_KEY when set', async () => {
      const savedKey = process.env.COLORMI_API_KEY;
      process.env.COLORMI_API_KEY = 'real-api-key-123';

      const request = createMockRequest({ method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.settings.colorMi.apiKey).toBe('real-api-key-123');

      if (savedKey !== undefined) {
        process.env.COLORMI_API_KEY = savedKey;
      } else {
        delete process.env.COLORMI_API_KEY;
      }
    });

    it('should return metadata with version and integrationType', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('metadata');
      expect(data.metadata.version).toBe('1.0.0');
      expect(data.metadata.integrationType).toBe('e-commerce');
      expect(data.metadata).toHaveProperty('lastUpdated');
    });

    it('should return lastSync as a valid ISO date string', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      const lastSync = data.platforms[0].lastSync;
      expect(() => new Date(lastSync)).not.toThrow();
      expect(new Date(lastSync).toISOString()).toBe(lastSync);
    });

    it('should return totalOrders of 1250 for ColorMi Shop', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(data.platforms[0].totalOrders).toBe(1250);
    });
  });

  describe('POST /api/integrations', () => {
    it('should return 200 with syncResult for valid request body', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { platform: 'colormi', action: 'sync' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return correct sync result fields', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { platform: 'colormi', action: 'sync' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('platform');
      expect(data).toHaveProperty('ordersSynced');
      expect(data).toHaveProperty('totalOrders');
      expect(data).toHaveProperty('syncTime');
      expect(data).toHaveProperty('message');
    });

    it('should return platform name as ColorMi Shop', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.platform).toBe('ColorMi Shop');
    });

    it('should report 45 orders synced out of 1250', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { action: 'manual_sync' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.ordersSynced).toBe(45);
      expect(data.totalOrders).toBe(1250);
    });

    it('should return a valid ISO date string for syncTime', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { action: 'sync' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(() => new Date(data.syncTime)).not.toThrow();
      expect(new Date(data.syncTime).toISOString()).toBe(data.syncTime);
    });

    it('should return 500 when request body is invalid JSON', async () => {
      // Craft a Request whose body is malformed JSON to trigger the catch branch
      const request = new Request('http://localhost:3000/api/integrations', {
        method: 'POST',
        body: '{ invalid json :::',
        headers: { 'Content-Type': 'application/json' },
      }) as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Sync failed');
    });

    it('should accept empty body object without error', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return success message string in response', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { platform: 'colormi' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(typeof data.message).toBe('string');
      expect(data.message.length).toBeGreaterThan(0);
    });
  });
});
