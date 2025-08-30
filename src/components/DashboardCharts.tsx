'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ProductStats {
  productName: string;
  orderCount: number;
  revenue: number;
}

interface ChartData {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  productStats: ProductStats[];
  statusData: ChartData[];
}

const statusColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(value);
};

export default function DashboardCharts({ productStats, statusData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 商品別注文数グラフ */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">商品別注文数</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={productStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="productName" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="orderCount" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 注文ステータス分布 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">注文ステータス分布</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}