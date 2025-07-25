import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// データベース接続
async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

// システム全体の情報を取得
async function getSystemContext(): Promise<string> {
  try {
    const client = await getDbClient();
    
    try {
      // 注文データの統計を取得
      const ordersResult = await client.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(price) as total_revenue,
          COUNT(CASE WHEN delivery_date IS NULL THEN 1 END) as no_delivery_date,
          COUNT(CASE WHEN delivery_date IS NOT NULL THEN 1 END) as has_delivery_date,
          AVG(price) as avg_order_value,
          MIN(order_date) as earliest_order,
          MAX(order_date) as latest_order
        FROM orders
      `);

      const recentOrdersResult = await client.query(`
        SELECT order_code, customer_name, price, order_date, delivery_date, notes
        FROM orders 
        ORDER BY created_at DESC 
        LIMIT 10
      `);

      const stats = ordersResult.rows[0];
      const recentOrders = recentOrdersResult.rows;

      // 設定情報を取得
      const settingsInfo = await getSettingsInfo();

      return `
## 農業AI管理システムの現状 (${new Date().toLocaleDateString('ja-JP')})

### 注文統計情報
- 総注文数: ${stats.total_orders}件
- 総売上: ¥${Number(stats.total_revenue || 0).toLocaleString()}
- 平均注文金額: ¥${Math.round(stats.avg_order_value || 0).toLocaleString()}
- 配達日指定あり: ${stats.has_delivery_date}件
- 配達日指定なし: ${stats.no_delivery_date}件
- 最古の注文: ${stats.earliest_order}
- 最新の注文: ${stats.latest_order}

### 最近の注文 (直近10件)
${recentOrders.map((order, idx) => 
  `${idx + 1}. ${order.order_code} - ${order.customer_name} (¥${Number(order.price).toLocaleString()}) - 注文日: ${order.order_date} ${order.delivery_date ? `配達予定: ${order.delivery_date}` : '配達日未定'} ${order.notes ? `備考: ${order.notes}` : ''}`
).join('\n')}

### システム機能・設定情報
${settingsInfo}

このシステムは農産物販売事業者向けに設計されており、特に高齢者の方にも使いやすい設計になっています。
      `.trim();

    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('System context fetch error:', error);
    return `
システム情報の取得中にエラーが発生しました。
基本的な農業AI管理システムとして、注文管理、CSV一括アップロード、売上分析機能を提供しています。
`;
  }
}

// 設定情報を取得
async function getSettingsInfo(): Promise<string> {
  try {
    // 設定情報を模擬的に取得（実際の設定APIの代わり）
    const settingsText = `
#### システム設定機能
**UI設定:**
- テーマ: ライト/ダーク/自動から選択可能
- フォントサイズ: 小/中/大から選択可能
- フォントファミリー: 複数のフォント選択可能

**通知設定:**
- 通知メールアドレス: システム通知の送信先設定
- LINE Webhook URL: LINE通知の設定
- 発送件数通知: 配送完了時の通知設定（有効/無効）

**EC プラットフォーム連携:**
- 対応プラットフォーム: Shopify、BASE、STORES、楽天市場、Amazon、Yahoo!ショッピング
- API キー・シークレット設定
- 同期スケジュール設定（Cron形式）
- プラットフォームごとの有効/無効設定

#### システム機能
- 注文管理: 新規注文作成、編集、削除、検索
- CSVアップロード: 一括注文データインポート（日本語ヘッダー：注文番号、顧客名、電話番号、住所、金額、注文日、希望配達日、備考）
- ダッシュボード: 売上分析、商品統計、AI提案機能、期間別分析、CSV出力
- 個人情報保護: 顧客名の自動マスキング機能（例: 田中太郎 → 田**郎）
- AI分析: 売上トレンド、季節性予測、運用効率改善提案
`;
    
    return settingsText;
  } catch (error) {
    return `
#### システム機能
- 注文管理: 新規注文作成、編集、削除
- CSVアップロード: 一括注文データインポート
- ダッシュボード: 売上分析、AI提案機能
- 設定: UI設定、通知設定、EC連携設定
`;
  }
}

export async function POST(request: NextRequest) {
  const { message, customerId, pageContext } = await request.json();
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      // フォールバック: OpenAI未設定時の基本応答
      return NextResponse.json({ 
        response: await generateFallbackResponse(message, pageContext)
      });
    }

    // システム全体の情報を取得
    const systemContext = await getSystemContext();
    
    console.log('Calling OpenAI API with context...');
    const systemPrompt = `あなたは農業AI管理システムの専門アシスタントです。

以下のシステム情報を参考にして、ユーザーの質問に的確で分かりやすく回答してください：

${systemContext}

${pageContext ? `\n### 現在のページ情報\n${pageContext}` : ''}

回答時の注意点：
- 上記のシステム情報を基に、現在の状況を踏まえた回答をしてください
- 高齢者の方にも理解しやすい言葉で説明してください
- 具体的な操作手順は番号付きで説明してください
- システムで実際に利用可能な機能や設定のみを回答してください`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });
    
    if (openaiResponse.ok) {
      const data = await openaiResponse.json();
      const aiResponse = data.choices[0]?.message?.content;
      
      if (aiResponse) {
        return NextResponse.json({ 
          response: aiResponse.trim()
        });
      }
    } else {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', openaiResponse.status, errorText);
      
      // クォータ超過や他のエラーの場合はフォールバック応答
      if (openaiResponse.status === 429) {
        return NextResponse.json({ 
          response: await generateFallbackResponse(message, pageContext, 'AIサービスが利用制限に達しています。しばらく後にもう一度お試しください。')
        });
      }
      
      return NextResponse.json({ 
        response: await generateFallbackResponse(message, pageContext, `AI接続エラーが発生しました（${openaiResponse.status}）`)
      });
    }
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      response: await generateFallbackResponse(message, pageContext, 'システム接続エラーが発生しました')
    });
  }
}

// システム情報ベースの応答生成（OpenAI未設定時）
async function generateSystemBasedResponse(message: string, pageContext?: string, systemContext?: string): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // 設定に関する質問
  if (lowerMessage.includes('設定') || lowerMessage.includes('セッティング')) {
    return `設定について説明いたします。\n\n${systemContext}\n\n設定画面では以下の項目を調整できます：\n- UI設定（テーマ、フォントサイズ、フォントファミリー）\n- 通知設定（メールアドレス、LINE Webhook、発送通知）\n- EC連携設定（各種プラットフォームとの連携）\n\n具体的にどの設定についてお知りになりたいですか？`;
  }
  
  // エラーや問題に関する質問
  if (lowerMessage.includes('エラー') || lowerMessage.includes('問題') || lowerMessage.includes('困') || lowerMessage.includes('うまくいかない')) {
    return `エラーの解決をお手伝いします。\n\n${systemContext}\n\n現在のページ: ${pageContext || '不明'}\n\nよくある問題と解決法：\n1. CSVアップロード時のエラー → ファイル形式とヘッダーをご確認ください\n2. 注文が表示されない → 日付範囲の設定をご確認ください\n3. 保存ができない → 必須項目の入力をご確認ください\n\n具体的にどのようなエラーが発生していますか？`;
  }
  
  // 使い方に関する質問
  if (lowerMessage.includes('使い方') || lowerMessage.includes('方法') || lowerMessage.includes('どうやって') || lowerMessage.includes('やり方')) {
    return `システムの使い方をご説明します。\n\n${systemContext}\n\n基本的な使い方：\n1. 注文管理 → 注文の作成・編集・削除ができます\n2. CSVアップロード → 一括で注文データを取り込めます\n3. ダッシュボード → 売上分析と統計を確認できます\n4. 設定 → システムの各種設定を調整できます\n\n具体的にどの機能の使い方をお知りになりたいですか？`;
  }
  
  // データ・統計に関する質問
  if (lowerMessage.includes('データ') || lowerMessage.includes('統計') || lowerMessage.includes('売上') || lowerMessage.includes('分析')) {
    return `データ分析についてご説明します。\n\n${systemContext}\n\nダッシュボードでは以下の情報を確認できます：\n- 総注文数と売上統計\n- 商品別の売上分析\n- 期間別の売上推移\n- AI による改善提案\n\n詳細な分析結果はダッシュボードページでご確認ください。`;
  }
  
  // 一般的な応答
  return `ご質問をお受けしました。\n\n${systemContext}\n\n現在のページ: ${pageContext || '不明'}\n\nご質問：「${message}」\n\n当システムでは以下の機能をご利用いただけます：\n- 注文管理と処理\n- CSVファイルによる一括データ取り込み\n- 売上分析とダッシュボード表示\n- システム設定のカスタマイズ\n\nより詳しい情報が必要でしたら、具体的にお聞かせください。`;
}

// フォールバック応答生成（エラー時のみ）
async function generateFallbackResponse(message: string, pageContext?: string, errorMessage?: string): Promise<string> {
  if (errorMessage) {
    return `${errorMessage}\n\n申し訳ございませんが、現在AI機能が利用できません。基本的なサポート情報については、システム管理者にお問い合わせください。`;
  }
  
  return `申し訳ございませんが、現在AI機能が利用できません。\n\nご質問：「${message}」\n\nシステム管理者にお問い合わせいただくか、後ほど再度お試しください。`;
}