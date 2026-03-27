/** @jest-environment node */

// FILE: __tests__/api/ai-insights.test.ts

import { POST } from '@/app/api/ai-insights/route';
import { createMockRequest } from '../setup/test-utils';

describe('/api/ai-insights', () => {
  // Helper to build a valid DashboardData payload
  function buildDashboardData(overrides: {
    totalOrders?: number;
    totalRevenue?: number;
    pendingOrders?: number;
    deliveredOrders?: number;
    productStats?: Array<{ productName: string; orderCount: number; revenue: number }>;
    dateRange?: { from: string; to: string };
  } = {}) {
    return {
      stats: {
        totalOrders: overrides.totalOrders ?? 100,
        totalRevenue: overrides.totalRevenue ?? 1000000,
        pendingOrders: overrides.pendingOrders ?? 10,
        deliveredOrders: overrides.deliveredOrders ?? 85,
      },
      productStats: overrides.productStats ?? [
        { productName: 'トマト', orderCount: 50, revenue: 600000 },
        { productName: 'きゅうり', orderCount: 30, revenue: 300000 },
        { productName: 'なす', orderCount: 20, revenue: 100000 },
      ],
      dateRange: overrides.dateRange ?? { from: '2024-01-01', to: '2024-01-31' },
    };
  }

  describe('POST /api/ai-insights', () => {
    it('should return 200 with insights array for valid dashboard data', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.insights)).toBe(true);
      expect(data.insights.length).toBeGreaterThan(0);
    });

    it('should always include a top-performer info insight', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData(),
      });

      const response = await POST(request);
      const data = await response.json();

      const infoInsight = data.insights.find((i: any) => i.type === 'info');
      expect(infoInsight).toBeDefined();
      expect(infoInsight.title).toBe('トップパフォーマー');
    });

    it('should always include a seasonal trend insight', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData(),
      });

      const response = await POST(request);
      const data = await response.json();

      const trendInsight = data.insights.find((i: any) => i.type === 'trend');
      expect(trendInsight).toBeDefined();
    });

    it('should return success insight when average order value exceeds 15000', async () => {
      // 10 orders, 200000 revenue → avg = 20000 > 15000
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 10,
          totalRevenue: 200000,
          pendingOrders: 1,
          deliveredOrders: 9,
          productStats: [
            { productName: 'プレミアム野菜セット', orderCount: 10, revenue: 200000 },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const successInsight = data.insights.find(
        (i: any) => i.type === 'success' && i.title === '高い平均注文単価'
      );
      expect(successInsight).toBeDefined();
      expect(successInsight.suggestion).toBe('高単価商品の販売促進を継続しましょう');
    });

    it('should return warning insight when average order value is below 8000', async () => {
      // 10 orders, 50000 revenue → avg = 5000 < 8000
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 10,
          totalRevenue: 50000,
          pendingOrders: 1,
          deliveredOrders: 9,
          productStats: [
            { productName: '格安野菜', orderCount: 10, revenue: 50000 },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const warningInsight = data.insights.find(
        (i: any) => i.type === 'warning' && i.title === '平均注文単価の改善余地'
      );
      expect(warningInsight).toBeDefined();
      expect(warningInsight.priority).toBe('high');
      expect(warningInsight.suggestion).toContain('セット商品');
    });

    it('should NOT return an order-value insight when average is between 8000 and 15000', async () => {
      // 10 orders, 100000 revenue → avg = 10000 (between thresholds)
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 10,
          totalRevenue: 100000,
          pendingOrders: 1,
          deliveredOrders: 9,
          productStats: [
            { productName: '普通野菜', orderCount: 10, revenue: 100000 },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const avgValueInsights = data.insights.filter(
        (i: any) => i.title === '高い平均注文単価' || i.title === '平均注文単価の改善余地'
      );
      expect(avgValueInsights.length).toBe(0);
    });

    it('should return warning insight when pending ratio exceeds 0.3', async () => {
      // 100 orders, 40 pending → ratio = 0.4 > 0.3
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 100,
          totalRevenue: 1000000,
          pendingOrders: 40,
          deliveredOrders: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const pendingWarning = data.insights.find(
        (i: any) => i.type === 'warning' && i.title === '未処理注文が多い状況'
      );
      expect(pendingWarning).toBeDefined();
      expect(pendingWarning.priority).toBe('high');
      expect(pendingWarning.message).toContain('40.0%');
    });

    it('should return success insight when pending ratio is below 0.1', async () => {
      // 100 orders, 5 pending → ratio = 0.05 < 0.1
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 100,
          totalRevenue: 1000000,
          pendingOrders: 5,
          deliveredOrders: 90,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const efficientProcessing = data.insights.find(
        (i: any) => i.type === 'success' && i.title === '効率的な注文処理'
      );
      expect(efficientProcessing).toBeDefined();
      expect(efficientProcessing.priority).toBe('low');
    });

    it('should NOT add pending insight when ratio is between 0.1 and 0.3', async () => {
      // 100 orders, 20 pending → ratio = 0.2 (in range)
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 100,
          totalRevenue: 1000000,
          pendingOrders: 20,
          deliveredOrders: 70,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const pendingInsights = data.insights.filter(
        (i: any) => i.title === '未処理注文が多い状況' || i.title === '効率的な注文処理'
      );
      expect(pendingInsights.length).toBe(0);
    });

    it('should return success insight when delivery ratio exceeds 0.8', async () => {
      // 100 orders, 85 delivered → ratio = 0.85 > 0.8
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 100,
          totalRevenue: 1000000,
          pendingOrders: 10,
          deliveredOrders: 85,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const deliverySuccess = data.insights.find(
        (i: any) => i.type === 'success' && i.title === '配達効率が良好'
      );
      expect(deliverySuccess).toBeDefined();
      expect(deliverySuccess.message).toContain('85.0%');
      expect(deliverySuccess.priority).toBe('low');
    });

    it('should NOT include delivery insight when ratio is 0.8 or below', async () => {
      // 100 orders, 75 delivered → ratio = 0.75 ≤ 0.8
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 100,
          totalRevenue: 1000000,
          pendingOrders: 20,
          deliveredOrders: 75,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const deliveryInsight = data.insights.find(
        (i: any) => i.title === '配達効率が良好'
      );
      expect(deliveryInsight).toBeUndefined();
    });

    it('should return warning insight for low-performing products', async () => {
      // totalRevenue = 1000000; products below 10% threshold (< 100000)
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 100,
          totalRevenue: 1000000,
          pendingOrders: 10,
          deliveredOrders: 85,
          productStats: [
            { productName: 'トマト', orderCount: 80, revenue: 950000 },
            { productName: 'なす', orderCount: 10, revenue: 30000 },   // below 10%
            { productName: 'きゅうり', orderCount: 10, revenue: 20000 }, // below 10%
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const lowPerformWarning = data.insights.find(
        (i: any) => i.title === '売上の少ない商品'
      );
      expect(lowPerformWarning).toBeDefined();
      expect(lowPerformWarning.type).toBe('warning');
      expect(lowPerformWarning.message).toContain('2つの商品');
    });

    it('should NOT include low-performing warning when all products exceed threshold', async () => {
      // All products above 10% of total
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 30,
          totalRevenue: 300000,
          pendingOrders: 3,
          deliveredOrders: 25,
          productStats: [
            { productName: 'トマト', orderCount: 15, revenue: 150000 },   // 50%
            { productName: 'きゅうり', orderCount: 10, revenue: 100000 }, // 33%
            { productName: 'なす', orderCount: 5, revenue: 50000 },       // 17%
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const lowPerformWarning = data.insights.find(
        (i: any) => i.title === '売上の少ない商品'
      );
      expect(lowPerformWarning).toBeUndefined();
    });

    it('should correctly identify top product by revenue', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          productStats: [
            { productName: 'トマト', orderCount: 30, revenue: 300000 },
            { productName: '高級メロン', orderCount: 10, revenue: 800000 },
            { productName: 'きゅうり', orderCount: 50, revenue: 200000 },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const topPerformer = data.insights.find((i: any) => i.title === 'トップパフォーマー');
      expect(topPerformer).toBeDefined();
      expect(topPerformer.message).toContain('高級メロン');
    });

    it('should sort insights by priority: high before medium before low', async () => {
      // Force both high-priority warnings to appear:
      // - pendingRatio > 0.3 → high
      // - avgOrderValue < 8000 → high
      // - lowPerformingProducts → medium
      // - trendInsight → medium
      // - topPerformer → medium
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData({
          totalOrders: 100,
          totalRevenue: 500000, // avg = 5000 < 8000
          pendingOrders: 40,     // ratio = 0.4 > 0.3
          deliveredOrders: 50,   // ratio = 0.5 ≤ 0.8 → no delivery insight
          productStats: [
            { productName: 'トマト', orderCount: 90, revenue: 490000 },
            { productName: 'なす', orderCount: 10, revenue: 10000 }, // below 10%
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const priorities: string[] = data.insights.map((i: any) => i.priority);
      const priorityRank = { high: 3, medium: 2, low: 1 } as Record<string, number>;

      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorityRank[priorities[i]]).toBeGreaterThanOrEqual(priorityRank[priorities[i + 1]]);
      }
    });

    it('should return 500 when request body is malformed JSON', async () => {
      // Simulate a request that throws on .json() by providing no body
      // We create a request where json() will fail
      const request = new Request('http://localhost:3000/api/ai-insights', {
        method: 'POST',
        body: 'this is not valid json{{{',
        headers: { 'Content-Type': 'application/json' },
      }) as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('AI分析でエラーが発生しました');
    });

    it('should handle missing productStats gracefully (throws → 500)', async () => {
      // productStats.reduce will throw on empty array in some engines;
      // or accessing undefined fields will cause an error
      const request = createMockRequest({
        method: 'POST',
        body: {
          stats: {
            totalOrders: 10,
            totalRevenue: 100000,
            pendingOrders: 2,
            deliveredOrders: 8,
          },
          productStats: [], // empty → reduce throws on empty array
          dateRange: { from: '2024-01-01', to: '2024-01-31' },
        },
      });

      const response = await POST(request);
      // Empty array reduce without initial value throws TypeError
      expect(response.status).toBe(500);
      expect((await response.json()).success).toBe(false);
    });

    it('should include suggestion field on top-performer insight', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData(),
      });

      const response = await POST(request);
      const data = await response.json();

      const topPerformer = data.insights.find((i: any) => i.title === 'トップパフォーマー');
      expect(topPerformer.suggestion).toBeDefined();
      expect(topPerformer.suggestion).toContain('在庫確保');
    });

    it('should include all required fields in each insight', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildDashboardData(),
      });

      const response = await POST(request);
      const data = await response.json();

      data.insights.forEach((insight: any) => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('message');
        expect(insight).toHaveProperty('priority');
        expect(['success', 'warning', 'info', 'trend']).toContain(insight.type);
        expect(['high', 'medium', 'low']).toContain(insight.priority);
      });
    });
  });
});
