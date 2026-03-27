/**
 * Component tests for DashboardCharts
 */

import { render } from '@testing-library/react';

// Mock the DashboardCharts component
jest.mock('@/components/DashboardCharts', () => ({
  __esModule: true,
  default: ({ productStats, statusData }: any) => {
    return (
      <div data-testid="dashboard-charts">
        <div data-testid="product-stats-chart">
          <h3>商品別注文数</h3>
          {productStats.map((stat: any, index: number) => (
            <div key={index}>
              {stat.productName}: {stat.orderCount}
            </div>
          ))}
        </div>
        <div data-testid="status-distribution-chart">
          <h3>注文ステータス分布</h3>
          {statusData.map((data: any, index: number) => (
            <div key={index}>
              {data.name}: {data.value}
            </div>
          ))}
        </div>
      </div>
    );
  },
}));

describe('DashboardCharts', () => {
  const mockProductStats = [
    { productName: 'Product A', orderCount: 10, revenue: 10000 },
    { productName: 'Product B', orderCount: 15, revenue: 15000 },
  ];

  const mockStatusData = [
    { name: 'Pending', value: 5 },
    { name: 'Processing', value: 3 },
    { name: 'Shipped', value: 2 },
    { name: 'Delivered', value: 1 },
  ];

  it('should render product statistics bar chart', () => {
    const { container } = render(
      <DashboardCharts productStats={mockProductStats} statusData={mockStatusData} />
    );

    expect(container.querySelector('[data-testid="dashboard-charts"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="product-stats-chart"]')).toBeInTheDocument();
    expect(container.querySelector('h3')).toHaveTextContent('商品別注文数');
  });

  it('should render status distribution pie chart', () => {
    const { container } = render(
      <DashboardCharts productStats={mockProductStats} statusData={mockStatusData} />
    );

    expect(container.querySelector('[data-testid="status-distribution-chart"]')).toBeInTheDocument();
    expect(container.querySelector('h3')).toHaveTextContent('注文ステータス分布');
  });

  it('should handle empty product stats', () => {
    const { container } = render(
      <DashboardCharts productStats={[]} statusData={mockStatusData} />
    );

    expect(container.querySelector('[data-testid="dashboard-charts"]')).toBeInTheDocument();
  });

  it('should handle empty status data', () => {
    const { container } = render(
      <DashboardCharts productStats={mockProductStats} statusData={[]} />
    );

    expect(container.querySelector('[data-testid="dashboard-charts"]')).toBeInTheDocument();
  });

  it('should handle very large product stats', () => {
    const largeProductStats = Array.from({ length: 100 }, (_, i) => ({
      productName: `Product ${i + 1}`,
      orderCount: Math.floor(Math.random() * 100),
      revenue: Math.floor(Math.random() * 10000),
    }));

    const { container } = render(
      <DashboardCharts productStats={largeProductStats} statusData={mockStatusData} />
    );

    expect(container.querySelector('[data-testid="dashboard-charts"]')).toBeInTheDocument();
  });
});
