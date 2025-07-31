import { NextRequest, NextResponse } from 'next/server';

interface DashboardData {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    deliveredOrders: number;
  };
  productStats: Array<{
    productName: string;
    orderCount: number;
    revenue: number;
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'trend';
  title: string;
  message: string;
  suggestion?: string;
  priority: 'high' | 'medium' | 'low';
}

export async function POST(request: NextRequest) {
  try {
    const data: DashboardData = await request.json();
    
    const insights = await analyzeDataAndGenerateInsights(data);
    
    return NextResponse.json({
      success: true,
      insights
    });
    
  } catch (error: any) {
    console.error('AI insights error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'AI分析でエラーが発生しました',
        error: error.message 
      }, 
      { status: 500 }
    );
  }
}

async function analyzeDataAndGenerateInsights(data: DashboardData): Promise<AIInsight[]> {
  const { stats, productStats, dateRange } = data;
  const insights: AIInsight[] = [];
  
  // 1. 売上トレンド分析
  const averageOrderValue = stats.totalRevenue / stats.totalOrders;
  if (averageOrderValue > 15000) {
    insights.push({
      type: 'success',
      title: '高い平均注文単価',
      message: `平均注文単価が¥${averageOrderValue.toLocaleString()}と良好です`,
      suggestion: '高単価商品の販売促進を継続しましょう',
      priority: 'medium'
    });
  } else if (averageOrderValue < 8000) {
    insights.push({
      type: 'warning',
      title: '平均注文単価の改善余地',
      message: `平均注文単価が¥${averageOrderValue.toLocaleString()}です`,
      suggestion: 'セット商品やまとめ買い割引の導入を検討してください',
      priority: 'high'
    });
  }
  
  // 2. 未処理注文の警告
  const pendingRatio = stats.pendingOrders / stats.totalOrders;
  if (pendingRatio > 0.3) {
    insights.push({
      type: 'warning',
      title: '未処理注文が多い状況',
      message: `未処理注文が全体の${(pendingRatio * 100).toFixed(1)}%を占めています`,
      suggestion: '注文処理体制の強化や作業効率の改善が必要です',
      priority: 'high'
    });
  } else if (pendingRatio < 0.1) {
    insights.push({
      type: 'success',
      title: '効率的な注文処理',
      message: '未処理注文の割合が低く、処理が順調です',
      priority: 'low'
    });
  }
  
  // 3. 商品パフォーマンス分析
  const topProduct = productStats.reduce((prev, current) => 
    prev.revenue > current.revenue ? prev : current
  );
  
  const lowPerformingProducts = productStats.filter(p => 
    p.revenue < (stats.totalRevenue * 0.1)
  );
  
  insights.push({
    type: 'info',
    title: 'トップパフォーマー',
    message: `「${topProduct.productName}」が最も売上に貢献しています`,
    suggestion: '在庫確保と類似商品の開発を検討してください',
    priority: 'medium'
  });
  
  if (lowPerformingProducts.length > 0) {
    insights.push({
      type: 'warning',
      title: '売上の少ない商品',
      message: `${lowPerformingProducts.length}つの商品の売上が全体の10%未満です`,
      suggestion: 'マーケティング強化や価格見直しを検討してください',
      priority: 'medium'
    });
  }
  
  // 4. 季節性の分析（模擬的な分析）
  const currentMonth = new Date().getMonth();
  if (currentMonth >= 2 && currentMonth <= 4) { // 春
    insights.push({
      type: 'trend',
      title: '春の需要予測',
      message: '春野菜の需要が高まる季節です',
      suggestion: '春野菜セットやフレッシュサラダ用品の在庫を確保しましょう',
      priority: 'medium'
    });
  } else if (currentMonth >= 5 && currentMonth <= 7) { // 夏
    insights.push({
      type: 'trend',
      title: '夏の需要予測',
      message: '夏野菜と保存食品の需要が増加します',
      suggestion: 'トマト、キュウリ、冷凍食品の充実を図りましょう',
      priority: 'medium'
    });
  } else if (currentMonth >= 8 && currentMonth <= 10) { // 秋
    insights.push({
      type: 'trend',
      title: '秋の需要予測',
      message: '収穫期で根菜類の需要が高まります',
      suggestion: 'じゃがいも、人参、玉ねぎなどの秋野菜セットが人気です',
      priority: 'medium'
    });
  } else { // 冬
    insights.push({
      type: 'trend',
      title: '冬の需要予測',
      message: '鍋料理用食材と保存食品の需要が増加',
      suggestion: '白菜、大根、発酵食品の品揃えを強化してください',
      priority: 'medium'
    });
  }
  
  // 5. 配達効率の分析
  const deliveredRatio = stats.deliveredOrders / stats.totalOrders;
  if (deliveredRatio > 0.8) {
    insights.push({
      type: 'success',
      title: '配達効率が良好',
      message: `配達完了率が${(deliveredRatio * 100).toFixed(1)}%と高水準です`,
      priority: 'low'
    });
  }
  
  // OpenAI APIによる追加分析は削除し、基本分析のみ使用
  
  // 優先度順でソート
  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

