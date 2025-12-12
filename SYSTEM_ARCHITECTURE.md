# システムアーキテクチャ完全ドキュメント

このドキュメントは、本プロジェクトのシステム構成を他のAIエージェントや開発者が完全に理解できるよう、詳細に記述しています。

> **⚠️ 重要な変更通知**
>
> **Manual Category Feature Removed (マニュアルカテゴリ機能削除)**
>
> 従来の手動カテゴリ選択機能（`categories`テーブル、`/api/categories` API、カテゴリ管理ページ）は完全に削除されました。
> 新しい**Product Master + Product Mapping + AI Suggestion**システムに置き換えられます。
>
> **削除されたもの:**
> - ✗ `categories`テーブル (データベース)
> - ✗ `orders.category_id`カラム (データベース)
> - ✗ `/api/categories` APIエンドポイント
> - ✗ `/api/upload-with-category` APIエンドポイント
> - ✗ `/categories` ページ (カテゴリ管理UI)
> - ✗ Sidebarの「カテゴリ管理」リンク
> - ✗ 配送画面のカテゴリフィルター
>
> **Migration:** `/api/migrate-drop-categories` を実行してデータベースから削除してください。
>
> 詳細は本ドキュメントの最後の「Category Feature Removal Summary」セクションを参照してください。

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [技術スタック](#技術スタック)
3. [ディレクトリ構造](#ディレクトリ構造)
4. [データベースアーキテクチャ](#データベースアーキテクチャ)
5. [認証・セキュリティシステム](#認証セキュリティシステム)
6. [API Routes 詳細](#api-routes-詳細)
7. [フロントエンドアーキテクチャ](#フロントエンドアーキテクチャ)
8. [エラーハンドリングシステム](#エラーハンドリングシステム)
9. [状態管理とデータフロー](#状態管理とデータフロー)
10. [開発ワークフロー](#開発ワークフロー)
11. [デプロイメント](#デプロイメント)

---

## プロジェクト概要

### 基本情報
- **プロジェクト名**: Agricultural AI Agent Frontend
- **バージョン**: 0.1.0
- **フレームワーク**: Next.js 14.2.0 (App Router)
- **言語**: TypeScript 5.4.0
- **データベース**: PostgreSQL (Neon)
- **AI統合**: OpenAI GPT-4o-mini
- **対象市場**: 日本国内農業ビジネス

### プロジェクトの目的
農業ビジネス向けの包括的なEC注文管理システムで、以下の機能を提供:
- 注文データの一元管理（手動入力、CSV一括アップロード）
- AI搭載チャットボットによる経営相談
- ダッシュボードによる売上・顧客分析
- ヤマト運輸APIとの連携による配送ラベル生成
- マルチテナント対応（ユーザーごとのデータ分離）
- 管理者システムによる全体管理

### 主要な特徴
1. **マルチテナントアーキテクチャ**: 全てのデータがuser_idで分離
2. **3層認証システム**: Basic Auth → Enhanced Security → Admin Auth
3. **AI判断型エラー検知**: 構造化エラー診断システムで自動問題解決
4. **完全TDD**: 140+テストケースでカバレッジ100%
5. **日本語完全対応**: UI、エラーメッセージ、日付フォーマット全て日本語

---

## 技術スタック

### フロントエンド
```json
{
  "フレームワーク": "Next.js 14.2.0 (App Router)",
  "言語": "TypeScript 5.4.0",
  "UIライブラリ": "React 18.3.0",
  "スタイリング": "Tailwind CSS 3.4.0",
  "フォーム管理": "React Hook Form 7.51.0 + Zod 3.23.0",
  "状態管理": "Zustand 4.5.0",
  "アイコン": "Lucide React 0.376.0",
  "チャート": "Recharts 2.12.0",
  "日付処理": "date-fns 3.6.0 (日本語ロケール対応)"
}
```

### バックエンド
```json
{
  "API": "Next.js API Routes",
  "データベースクライアント": "pg 8.16.3 (PostgreSQL)",
  "認証": "bcryptjs 3.0.2",
  "CSV処理": "papaparse 5.4.0",
  "ファイルアップロード": "react-dropzone 14.2.0",
  "バリデーション": "Zod 3.23.0"
}
```

### インフラストラクチャ
```json
{
  "ホスティング": "Vercel",
  "データベース": "Neon (Serverless PostgreSQL)",
  "外部API": ["OpenAI GPT-4o-mini", "Yamato Transport API"],
  "環境変数管理": "dotenv 17.2.0"
}
```

### 開発ツール
```json
{
  "テストフレームワーク": "Jest 29.7.0",
  "テストライブラリ": "@testing-library/react 14.3.1",
  "リンター": "ESLint 8.57.0",
  "フォーマッター": "Prettier 3.2.0",
  "型チェック": "TypeScript 5.4.0"
}
```

---

## ディレクトリ構造

### 完全なディレクトリツリー
```
agri-ai-agent-frontend-test/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # ルートページ（/orders へリダイレクト）
│   │   ├── layout.tsx                # グローバルレイアウト
│   │   │
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # 認証API
│   │   │   │   ├── login/route.ts           # ログイン（Remember Me対応）
│   │   │   │   ├── logout/route.ts          # ログアウト
│   │   │   │   ├── auto-login/route.ts      # Remember Token自動ログイン
│   │   │   │   ├── me/route.ts              # セッション検証
│   │   │   │   └── change-password/route.ts # パスワード変更
│   │   │   │
│   │   │   ├── orders/               # 注文管理API
│   │   │   │   ├── route.ts                 # GET/POST（一覧・作成）
│   │   │   │   └── [id]/route.ts           # GET/PUT/DELETE（詳細・更新・削除）
│   │   │   │
│   │   │   ├── categories/           # カテゴリ管理API
│   │   │   │   └── route.ts                # GET/POST/PUT/DELETE
│   │   │   │
│   │   │   ├── customers/            # 顧客データAPI
│   │   │   │   └── route.ts                # GET（注文から派生）
│   │   │   │
│   │   │   ├── shipping/             # 配送管理API
│   │   │   │   ├── route.ts                # POST（配送ラベル生成）
│   │   │   │   └── cancel/route.ts         # POST（配送キャンセル）
│   │   │   │
│   │   │   ├── upload/               # CSVアップロード
│   │   │   │   └── route.ts                # POST（一般CSV）
│   │   │   ├── upload-with-category/ # カテゴリ付きCSVアップロード
│   │   │   │   └── route.ts                # POST
│   │   │   │
│   │   │   ├── chat/                 # AIチャット
│   │   │   │   └── route.ts                # POST（OpenAI統合）
│   │   │   │
│   │   │   ├── dashboard/            # ダッシュボードAPI
│   │   │   │   ├── stats/route.ts          # 統計データ
│   │   │   │   └── latest-date/route.ts    # 最新出荷日
│   │   │   │
│   │   │   ├── yamato/               # ヤマト運輸API
│   │   │   │   └── route.ts                # POST（Mock実装）
│   │   │   ├── yamato-csv/           # ヤマトCSV生成
│   │   │   │   └── route.ts                # POST
│   │   │   ├── yamato-settings/      # ヤマト設定
│   │   │   │   └── route.ts                # GET/POST
│   │   │   │
│   │   │   ├── admin/                # 管理者API
│   │   │   │   ├── me/route.ts              # 管理者セッション検証
│   │   │   │   ├── customers/               # 全顧客管理
│   │   │   │   │   ├── route.ts            # GET/POST
│   │   │   │   │   ├── [customerId]/route.ts  # PUT/DELETE
│   │   │   │   │   └── bulk-delete/route.ts    # DELETE
│   │   │   │   ├── integrations/            # API連携設定
│   │   │   │   │   ├── route.ts            # GET/POST
│   │   │   │   │   └── [integrationId]/
│   │   │   │   │       ├── toggle/route.ts # POST
│   │   │   │   │       ├── test/route.ts   # POST
│   │   │   │   │       └── sync/route.ts   # POST
│   │   │   │   ├── dashboard/               # 管理者ダッシュボード
│   │   │   │   │   ├── stats/route.ts      # システム統計
│   │   │   │   │   └── activities/route.ts # アクティビティログ
│   │   │   │   ├── security/                # セキュリティ監視
│   │   │   │   │   ├── events/route.ts     # セキュリティイベント
│   │   │   │   │   ├── stats/route.ts      # セキュリティ統計
│   │   │   │   │   └── rate-limits/route.ts # レート制限状況
│   │   │   │   └── users/                   # ユーザー管理
│   │   │   │       ├── route.ts            # GET/POST
│   │   │   │       ├── create-customer/route.ts  # POST
│   │   │   │       ├── setup-password/route.ts   # POST
│   │   │   │       └── passwords/route.ts        # PUT
│   │   │   │
│   │   │   └── migrate-*/            # データベースマイグレーション
│   │   │       ├── migrate-auth/route.ts                 # 基本認証テーブル
│   │   │       ├── migrate-security-enhancements/route.ts # セキュリティ強化
│   │   │       └── migrate-admin-system/route.ts          # 管理者システム
│   │   │
│   │   ├── orders/                   # 注文管理ページ
│   │   │   ├── page.tsx                     # リダイレクト
│   │   │   ├── shipping/                    # 配送管理
│   │   │   │   ├── pending/page.tsx        # 配送待ち一覧
│   │   │   │   ├── completed/page.tsx      # 配送済み一覧
│   │   │   │   ├── confirm/page.tsx        # 配送確認画面
│   │   │   │   └── complete/page.tsx       # 配送完了画面
│   │   │   └── register/                    # 注文登録
│   │   │       ├── choose/page.tsx         # 登録方法選択
│   │   │       ├── manual/page.tsx         # 手動入力
│   │   │       ├── csv-upload/page.tsx     # CSV一括登録
│   │   │       ├── confirm/page.tsx        # 確認画面
│   │   │       ├── complete/page.tsx       # 完了画面
│   │   │       └── result/page.tsx         # 結果表示
│   │   │
│   │   ├── categories/               # カテゴリ管理
│   │   │   └── page.tsx
│   │   │
│   │   ├── dashboard/                # ダッシュボード
│   │   │   └── page.tsx
│   │   │
│   │   ├── admin/                    # 管理者ページ
│   │   │   ├── page.tsx                     # ダッシュボード
│   │   │   ├── customers/page.tsx           # 顧客管理
│   │   │   ├── integrations/page.tsx        # API連携
│   │   │   ├── security/page.tsx            # セキュリティ監視
│   │   │   └── users/page.tsx               # ユーザー管理
│   │   │
│   │   ├── login/                    # ログインページ
│   │   │   └── page.tsx
│   │   │
│   │   └── change-password/          # パスワード変更
│   │       └── page.tsx
│   │
│   ├── components/                   # Reactコンポーネント
│   │   ├── OrderList.tsx                    # 注文リストコンポーネント
│   │   ├── OrderFilters.tsx                 # フィルター機能
│   │   ├── OrderConfirmation.tsx            # 注文確認
│   │   ├── Sidebar.tsx                      # サイドバーナビゲーション
│   │   ├── ChatPanel.tsx                    # AIチャットパネル
│   │   ├── DashboardCharts.tsx              # ダッシュボードグラフ
│   │   ├── ShippingLabelButton.tsx          # 配送ラベルボタン
│   │   ├── YamatoCsvButton.tsx              # ヤマトCSVボタン
│   │   ├── ExportModal.tsx                  # エクスポートモーダル
│   │   ├── ErrorBoundary.tsx                # エラー境界
│   │   └── LayoutWrapper.tsx                # レイアウトラッパー
│   │
│   ├── lib/                          # コアライブラリ
│   │   ├── db.ts                            # データベース接続ユーティリティ
│   │   ├── auth.ts                          # 基本認証システム
│   │   ├── auth-enhanced.ts                 # 拡張認証（Remember Me等）
│   │   ├── admin-auth.ts                    # 管理者認証
│   │   ├── security.ts                      # セキュリティユーティリティ
│   │   ├── error-details.ts                 # エラー詳細ビルダー基底クラス
│   │   ├── auth-error-details.ts            # 認証エラー分析
│   │   ├── api-error-details.ts             # API/DBエラー分析
│   │   ├── client-error-details.ts          # クライアントエラー分析
│   │   ├── csv-error-diagnostics.ts         # CSVエラー診断
│   │   ├── csv-encoding.ts                  # CSV文字エンコーディング
│   │   ├── csv-debug.ts                     # CSVデバッグ
│   │   └── debug-logger.ts                  # デバッグロガー
│   │
│   ├── hooks/                        # カスタムフック
│   │   └── useErrorHandler.ts               # エラーハンドリングフック
│   │
│   ├── types/                        # TypeScript型定義
│   │   ├── order.ts                         # 注文型
│   │   ├── shipping.ts                      # 配送型
│   │   ├── yamato.ts                        # ヤマト運輸型
│   │   └── env.d.ts                         # 環境変数型
│   │
│   ├── stores/                       # Zustand状態管理
│   │
│   └── middleware.ts                 # Next.js Middleware（認証・レート制限）
│
├── __tests__/                        # テストスイート
│   ├── setup/
│   │   └── test-utils.ts                    # テストユーティリティ・モック
│   └── api/                                 # APIテスト（140+テストケース）
│
├── public/                           # 静的ファイル
│
├── CLAUDE.md                         # Claude Code専用ガイド
├── QUALITY_CHECKLIST.md              # 品質チェックリスト
├── package.json                      # 依存関係定義
├── tsconfig.json                     # TypeScript設定
├── next.config.js                    # Next.js設定
├── tailwind.config.ts                # Tailwind CSS設定
├── jest.config.js                    # Jest設定
└── .env.local                        # 環境変数（ローカル）
```

---

## データベースアーキテクチャ

### データベース接続
```typescript
// src/lib/db.ts
export async function getDbClient(): Promise<Client> {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  return client;
}
```

### テーブル定義詳細

#### 1. users テーブル（ユーザー）
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_super_admin BOOLEAN DEFAULT false,

  -- 基本ロックアウト
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,

  -- 拡張セキュリティ（migrate-security-enhancementsで追加）
  lockout_level INTEGER DEFAULT 0,           -- プログレッシブロックアウトレベル
  last_failed_ip INET,                       -- 最後の失敗IP
  consecutive_failures INTEGER DEFAULT 0,     -- 連続失敗回数

  -- タイムスタンプ
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**重要なユーザー**:
- `admin` / `admin123` - 標準顧客ユーザー
- `silentogasasoft@gmail.com` / `Ogasa1995` - スーパー管理者

#### 2. sessions テーブル（セッション）
```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  csrf_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**セッション管理**:
- デフォルト有効期限: 24時間
- 自動延長: 有効期限2時間前にアクセスで自動延長
- CSRF保護: 全リクエストでcsrf_token検証

#### 3. remember_tokens テーブル（Remember Me）
```sql
CREATE TABLE remember_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,  -- bcryptハッシュ
  selector VARCHAR(255) NOT NULL UNIQUE,     -- 公開識別子
  expires_at TIMESTAMP NOT NULL,             -- 30日間有効
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_remember_tokens_selector ON remember_tokens (selector);
CREATE INDEX idx_remember_tokens_expires ON remember_tokens (expires_at);
```

**セキュアパターン**:
- Selector/Validator パターン採用
- トークン盗難検知で全トークン削除
- 使用後に新トークン発行（ローテーション）

#### 4. rate_limits テーブル（レート制限）
```sql
CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  identifier VARCHAR(255) NOT NULL,      -- 'login_attempt', 'api_call' 等
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP,
  UNIQUE(ip_address, identifier)
);

CREATE INDEX idx_rate_limits_ip ON rate_limits (ip_address);
CREATE INDEX idx_rate_limits_identifier ON rate_limits (ip_address, identifier);
CREATE INDEX idx_rate_limits_blocked ON rate_limits (blocked_until);
```

**レート制限設定**:
- ログイン: 10回/分
- アップロード: 5回/分
- チャット: 30回/分
- その他API: 100回/分

#### 5. security_events テーブル（セキュリティイベント）
```sql
CREATE TABLE security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,    -- 'brute_force', 'password_spray', 'csrf_attack' 等
  ip_address INET,
  user_agent TEXT,
  target_username VARCHAR(100),
  details JSONB,
  severity VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_events_type ON security_events (event_type);
CREATE INDEX idx_security_events_ip ON security_events (ip_address);
CREATE INDEX idx_security_events_created ON security_events (created_at);
```

**検知する攻撃パターン**:
- ブルートフォース攻撃
- パスワードスプレー攻撃（1時間に5つ以上の異なるユーザー名）
- アカウント列挙攻撃
- CSRF攻撃
- Remember Token盗難

#### 6. categories テーブル（カテゴリ）
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  color VARCHAR(20) DEFAULT 'gray',
  icon VARCHAR(50) DEFAULT 'Package',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, user_id)  -- ユーザーごとに一意
);
```

**マルチテナント分離**: 全カテゴリがuser_idでスコープ化

#### 7. orders テーブル（注文）
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  price INTEGER,
  order_date DATE,
  delivery_date DATE,
  notes TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  source VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'csv', 'api'

  -- 配送情報（migrate-orders-shippingで追加）
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'shipped', 'cancelled'
  tracking_number VARCHAR(100),
  shipped_at TIMESTAMP,

  extra_data JSONB DEFAULT '{}',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_code, user_id)  -- ユーザーごとに一意
);
```

**重要な特徴**:
- マルチテナント分離（user_id必須）
- カテゴリとの関連（ON DELETE SET NULL）
- 配送ステータス管理
- JSONB extra_data で拡張データ対応

#### 8. audit_logs テーブル（監査ログ）
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,  -- 'LOGIN_SUCCESS', 'ORDER_CREATED' 等
  resource_type VARCHAR(50),     -- 'user', 'order', 'category' 等
  resource_id INTEGER,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 9. admin_audit_logs テーブル（管理者監査ログ）
```sql
CREATE TABLE admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 10. system_settings テーブル（システム設定）
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 11. api_integrations テーブル（API連携設定）
```sql
CREATE TABLE api_integrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,        -- 'ColorMi Shop', 'Tabechoku' 等
  integration_type VARCHAR(50) NOT NULL,  -- 'e-commerce', 'shipping' 等
  api_key TEXT,
  api_secret TEXT,
  endpoint_url TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### データベース関数

#### プログレッシブロックアウト計算
```sql
CREATE OR REPLACE FUNCTION calculate_lockout_duration(lockout_level INTEGER)
RETURNS INTERVAL AS $$
BEGIN
  CASE lockout_level
    WHEN 0 THEN RETURN INTERVAL '0 minutes';
    WHEN 1 THEN RETURN INTERVAL '5 minutes';
    WHEN 2 THEN RETURN INTERVAL '15 minutes';
    WHEN 3 THEN RETURN INTERVAL '30 minutes';
    WHEN 4 THEN RETURN INTERVAL '1 hour';
    WHEN 5 THEN RETURN INTERVAL '2 hours';
    WHEN 6 THEN RETURN INTERVAL '4 hours';
    WHEN 7 THEN RETURN INTERVAL '8 hours';
    ELSE RETURN INTERVAL '24 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

#### 期限切れデータ自動クリーンアップ
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_security_data()
RETURNS void AS $$
BEGIN
  DELETE FROM remember_tokens WHERE expires_at < NOW();
  DELETE FROM rate_limits
  WHERE last_attempt_at < NOW() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < NOW());
  DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '30 days';
  UPDATE sessions SET is_active = false WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 認証・セキュリティシステム

### 3層認証アーキテクチャ

#### レイヤー1: 基本認証（src/lib/auth.ts）
```typescript
// 主要機能
- authenticateUser(): ユーザー名/パスワード認証
- validateSession(): セッショントークン検証
- invalidateSession(): セッション無効化
- changePassword(): パスワード変更
- hashPassword(): bcrypt + salt によるパスワードハッシュ化
- generateSessionToken(): 64バイトランダムトークン生成
- generateCSRFToken(): 32バイトCSRFトークン生成

// セキュリティ定数
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = 15分
SESSION_DURATION = 24時間
PASSWORD_MIN_LENGTH = 8文字
```

#### レイヤー2: 拡張認証（src/lib/auth-enhanced.ts）
```typescript
// 追加機能
- authenticateUserEnhanced(): Remember Me対応ログイン
- autoLoginWithRememberToken(): Remember Token自動ログイン
- validateSessionEnhanced(): 自動セッション延長
- checkRateLimit(): IP単位のレート制限チェック
- logSecurityEvent(): セキュリティイベント記録

// プログレッシブロックアウト
PROGRESSIVE_LOCKOUT_LEVELS = [
  0分,    // レベル0: ロックなし
  5分,    // レベル1
  15分,   // レベル2
  30分,   // レベル3
  1時間,  // レベル4
  2時間,  // レベル5
  4時間,  // レベル6
  8時間,  // レベル7
  24時間  // レベル8 (最大)
]

// Remember Me
REMEMBER_TOKEN_DURATION = 30日
Selector/Validator パターン
トークン盗難検知（全トークン削除）
```

#### レイヤー3: 管理者認証（src/lib/admin-auth.ts）
```typescript
// 管理者機能
- validateAdminSession(): 管理者セッション検証
- logAdminAction(): 管理者操作監査ログ
- isSuperAdmin(): スーパー管理者チェック
- isAdmin(): 管理者チェック
- canManageUsers(): ユーザー管理権限チェック
- canManageSettings(): 設定管理権限チェック
- canManageAPI(): API管理権限チェック
```

### セキュリティヘッダー（src/lib/security.ts + next.config.js）
```typescript
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### Middleware認証フロー（src/middleware.ts）
```typescript
// ルート分類
PUBLIC_ROUTES = ['/api/auth/login', '/api/auth/auto-login', '/login']
CUSTOMER_ONLY_API_ROUTES = ['/api/orders', '/api/categories', '/api/upload', ...]
CUSTOMER_ONLY_PAGE_ROUTES = ['/orders', '/categories', '/dashboard', ...]
ADMIN_ROUTES = ['/admin', '/api/admin']

// レート制限（開発環境では無効化）
- /api/auth/login: 10回/分
- /api/upload: 5回/分
- /api/chat: 30回/分
- その他API: 100回/分

// 認証フロー
1. 静的ファイル・Next.js内部パスはスキップ
2. 公開ルートは認証なしで通過
3. 保護ルートはsession_token検証
4. session_token不在時:
   - remember_tokenあり → /login?auto=true&redirect=... へリダイレクト
   - なし → /login?redirect=... へリダイレクト
5. 認証成功時はx-session-tokenヘッダーをAPIに転送
```

### API Route セキュリティパターン
```typescript
// 全保護APIルートで必須の実装パターン
export const dynamic = 'force-dynamic';  // 動的レンダリング強制

export async function GET/POST/PUT/DELETE(request: NextRequest) {
  // 1. セッション検証
  const sessionToken = request.headers.get('x-session-token') ||
                       request.cookies.get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 });
  }

  const sessionData = await validateSession(sessionToken);
  if (!sessionData) {
    return NextResponse.json({ success: false, message: 'セッションが無効です' }, { status: 401 });
  }

  // 2. CSRF検証（POST/PUT/DELETEのみ）
  const csrfToken = request.headers.get('x-csrf-token');
  if (csrfToken !== sessionData.session.csrf_token) {
    return NextResponse.json({ success: false, message: 'CSRF検証失敗' }, { status: 403 });
  }

  // 3. 入力バリデーション・サニタイゼーション
  const body = await request.json();
  const sanitizedInput = sanitizeInput(body.someField);
  if (!validateSqlInput(sanitizedInput)) {
    return NextResponse.json({ success: false, message: '不正な入力' }, { status: 400 });
  }

  // 4. マルチテナント分離（user_id必須）
  const userId = sessionData.user.id;
  const result = await client.query(
    'SELECT * FROM orders WHERE user_id = $1',
    [userId]
  );

  // 5. 監査ログ
  await logAuditEvent(userId, 'ORDER_VIEWED', 'order', null, { count: result.rows.length });

  return NextResponse.json({ success: true, data: result.rows });
}
```

---

## API Routes 詳細

### 認証API（/api/auth/*）

#### POST /api/auth/login
```typescript
// 機能: ユーザーログイン（Remember Me対応）
// リクエスト:
{
  username: string,
  password: string,
  rememberMe?: boolean
}

// レスポンス（成功時）:
{
  success: true,
  user: {
    id: number,
    username: string,
    email: string,
    is_super_admin: boolean
  },
  requiresPasswordChange: boolean,
  message: string
}

// Cookie設定:
- session_token (HttpOnly, Secure, SameSite=Strict, 24時間)
- csrf_token (HttpOnly, Secure, SameSite=Strict, 24時間)
- remember_token (rememberMe=true時、HttpOnly, Secure, 30日間)

// セキュリティ機能:
- プログレッシブロックアウト（10失敗で最大24時間）
- IPレート制限（10回/分）
- パスワードスプレー攻撃検知
- 監査ログ記録
```

#### POST /api/auth/auto-login
```typescript
// 機能: Remember Token による自動ログイン
// Cookie: remember_token (selector:validator 形式)

// 処理フロー:
1. remember_tokenをselector/validatorに分割
2. selectorでDBからtoken_hash取得
3. validatorをbcryptで検証
4. 検証失敗 → 全remember_token削除（盗難検知）
5. 検証成功 → 新セッション作成 + 新remember_token発行

// レスポンス:
{
  success: true,
  user: User,
  message: '自動ログインしました'
}
```

#### POST /api/auth/logout
```typescript
// 機能: ログアウト
// 処理:
1. session_token無効化（is_active = false）
2. remember_token削除（該当selector）
3. Cookie削除
4. 監査ログ記録

// レスポンス:
{ success: true, message: 'ログアウトしました' }
```

#### GET /api/auth/me
```typescript
// 機能: 現在のセッション情報取得
// レスポンス:
{
  success: true,
  user: {
    id: number,
    username: string,
    email: string,
    is_super_admin: boolean,
    last_login_at: string,
    created_at: string
  },
  session: {
    expires_at: string,
    csrf_token: string
  }
}
```

#### POST /api/auth/change-password
```typescript
// 機能: パスワード変更
// リクエスト:
{
  currentPassword: string,
  newPassword: string
}

// 検証:
- セッション検証
- CSRF検証
- 現在パスワード確認
- 新パスワード長さチェック（8文字以上）

// レスポンス:
{ success: true, message: 'パスワードを変更しました' }
```

### 注文API（/api/orders/*）

#### GET /api/orders
```typescript
// 機能: 注文一覧取得（マルチテナント分離）
// クエリパラメータ:
- category?: number
- status?: 'pending' | 'shipped' | 'cancelled'
- search?: string (customer_name, order_code, phone)
- dateFrom?: string (YYYY-MM-DD)
- dateTo?: string (YYYY-MM-DD)

// SQL例:
SELECT o.*, c.name as category_name, c.color as category_color
FROM orders o
LEFT JOIN categories c ON o.category_id = c.id
WHERE o.user_id = $1
  AND ($2::INTEGER IS NULL OR o.category_id = $2)
  AND ($3::VARCHAR IS NULL OR o.status = $3)
ORDER BY o.created_at DESC

// レスポンス:
{
  success: true,
  orders: Order[],
  total: number
}
```

#### POST /api/orders
```typescript
// 機能: 新規注文作成
// リクエスト:
{
  order_code: string,
  customer_name: string,
  phone?: string,
  address?: string,
  price?: number,
  order_date?: string,
  delivery_date?: string,
  notes?: string,
  category_id?: number,
  source: 'manual' | 'csv' | 'api'
}

// 検証:
- 必須フィールドチェック
- order_code重複チェック（user_idスコープ内）
- category_id存在チェック（user_idスコープ内）
- 監査ログ記録

// レスポンス:
{
  success: true,
  order: Order,
  message: '注文を作成しました'
}
```

#### PUT /api/orders/[id]
```typescript
// 機能: 注文更新
// パスパラメータ: id (注文ID)
// リクエスト: Order部分更新オブジェクト

// セキュリティ:
WHERE id = $1 AND user_id = $2  // マルチテナント分離

// レスポンス:
{
  success: true,
  order: Order,
  message: '注文を更新しました'
}
```

#### DELETE /api/orders/[id]
```typescript
// 機能: 注文削除
// セキュリティ:
WHERE id = $1 AND user_id = $2

// レスポンス:
{ success: true, message: '注文を削除しました' }
```

### カテゴリAPI（/api/categories）

#### GET /api/categories
```typescript
// 機能: カテゴリ一覧取得（user_idスコープ）
// レスポンス:
{
  success: true,
  categories: Category[]
}
```

#### POST /api/categories
```typescript
// 機能: カテゴリ作成
// リクエスト:
{
  name: string,
  description?: string,
  color?: string,
  icon?: string,
  display_order?: number
}

// 制約:
UNIQUE(name, user_id)  // ユーザーごとに一意

// レスポンス:
{
  success: true,
  category: Category,
  message: 'カテゴリを作成しました'
}
```

### CSVアップロードAPI

#### POST /api/upload
```typescript
// 機能: 一般CSV一括アップロード
// Content-Type: multipart/form-data
// フィールド: file (CSV)

// 処理フロー:
1. ファイルサイズ検証（10MB以下）
2. CSV文字エンコーディング自動検出（UTF-8, Shift-JIS）
3. ヘッダー行自動検出・マッピング
4. データ検証・サニタイゼーション
5. 一括INSERT（トランザクション）
6. 監査ログ記録

// 日本語ヘッダーマッピング:
{
  '注文番号': 'order_code',
  '顧客名': 'customer_name',
  '電話番号': 'phone',
  '住所': 'address',
  '金額': 'price',
  '注文日': 'order_date',
  '配送希望日': 'delivery_date',
  '備考': 'notes'
}

// レスポンス:
{
  success: true,
  imported: number,
  failed: number,
  errors: string[],
  message: `${imported}件の注文をインポートしました`
}
```

#### POST /api/upload-with-category
```typescript
// 機能: カテゴリ指定CSV一括アップロード
// Content-Type: multipart/form-data
// フィールド:
- file: CSV
- categoryId: number

// 処理: /api/upload と同様 + category_id自動設定
```

### 配送API（/api/shipping/*）

#### POST /api/shipping
```typescript
// 機能: 配送ラベル生成・ステータス更新
// リクエスト:
{
  orderIds: number[],
  shippingDate?: string,
  shippingMethod?: string
}

// 処理:
1. 注文存在確認（user_idスコープ）
2. ヤマト運輸API呼び出し（または将来のAPI）
3. tracking_number生成
4. status = 'shipped', shipped_at = CURRENT_TIMESTAMP
5. 監査ログ記録

// レスポンス:
{
  success: true,
  trackingNumbers: string[],
  message: `${count}件の配送ラベルを生成しました`
}
```

#### POST /api/shipping/cancel
```typescript
// 機能: 配送キャンセル
// リクエスト:
{
  orderId: number
}

// 処理:
status = 'pending', tracking_number = NULL, shipped_at = NULL

// レスポンス:
{ success: true, message: '配送をキャンセルしました' }
```

### AIチャットAPI（/api/chat）

#### POST /api/chat
```typescript
// 機能: OpenAI GPT-4o-miniによるAI相談
// リクエスト:
{
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>,
  context?: {
    currentPage?: string,
    ordersCount?: number,
    categoriesCount?: number
  }
}

// OpenAI統合:
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `あなたは農業ビジネスの経営コンサルタントです。
        ユーザーの注文管理システムのデータを基に、的確なアドバイスを提供してください。`
      },
      ...conversationHistory,
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })
});

// エラーハンドリング:
- API Key不在 → フォールバックレスポンス
- レート制限 → エラー詳細レスポンス
- タイムアウト → リトライ提案

// レスポンス:
{
  success: true,
  response: string,
  usage: {
    prompt_tokens: number,
    completion_tokens: number
  }
}
```

### ダッシュボードAPI（/api/dashboard/*）

#### GET /api/dashboard/stats
```typescript
// 機能: ダッシュボード統計データ取得
// クエリパラメータ:
- dateFrom?: string (YYYY-MM-DD)
- dateTo?: string (YYYY-MM-DD)

// デフォルト期間:
最新出荷日から1ヶ月前まで（今日ではなく最新出荷日基準）

// 計算項目:
{
  totalRevenue: number,        // 合計売上（shipped orders only）
  revenueGrowth: number,       // 前期比成長率 (%)
  totalOrders: number,         // 合計注文数（shipped）
  orderGrowth: number,         // 前期比成長率 (%)
  averageOrderValue: number,   // 平均注文額
  topCustomers: Array<{        // 上位顧客
    customer_name: string,
    total_orders: number,
    total_revenue: number
  }>,
  topCategories: Array<{       // 上位カテゴリ
    category_name: string,
    order_count: number,
    revenue: number
  }>,
  dailyRevenue: Array<{        // 日次売上推移
    date: string,
    revenue: number,
    orders: number
  }>,
  weekdayDistribution: {       // 曜日別分布
    Monday: number,
    Tuesday: number,
    // ...
  }
}

// レスポンス:
{
  success: true,
  stats: DashboardStats,
  period: { from: string, to: string }
}
```

#### GET /api/dashboard/latest-date
```typescript
// 機能: 最新出荷日取得
// SQL:
SELECT MAX(shipped_at)::date as latest_date
FROM orders
WHERE user_id = $1 AND status = 'shipped'

// レスポンス:
{
  success: true,
  latestDate: string  // YYYY-MM-DD
}
```

### ヤマト運輸API（/api/yamato/*）

#### POST /api/yamato
```typescript
// 機能: ヤマト運輸API呼び出し（Mock実装）
// 本番環境: 実際のYamato APIエンドポイント
// 開発環境: Mock実装

// リクエスト:
{
  orders: Array<{
    order_code: string,
    customer_name: string,
    phone: string,
    address: string,
    delivery_date?: string
  }>
}

// Mock レスポンス:
{
  success: true,
  labels: Array<{
    order_code: string,
    tracking_number: string,  // YM + 12桁数字
    label_url: string
  }>
}
```

#### POST /api/yamato-csv
```typescript
// 機能: ヤマト運輸B2形式CSV生成
// リクエスト:
{
  orderIds: number[]
}

// CSVフォーマット（Shift-JIS）:
お客様管理番号,送り状種類,クール区分,伝票番号,出荷予定日,お届け予定日,...

// レスポンス:
{
  success: true,
  csvData: string,  // Base64エンコード
  filename: string  // yamato_YYYYMMDD_HHmmss.csv
}
```

### 管理者API（/api/admin/*）

#### GET /api/admin/me
```typescript
// 機能: 管理者セッション検証
// レスポンス:
{
  success: true,
  admin: {
    id: number,
    username: string,
    email: string,
    role: string,
    is_super_admin: boolean
  }
}
```

#### GET /api/admin/dashboard/stats
```typescript
// 機能: システム全体統計
// レスポンス:
{
  success: true,
  stats: {
    totalUsers: number,
    totalOrders: number,
    totalRevenue: number,
    activeIntegrations: number,
    recentActivity: Array<{
      admin_user: string,
      action: string,
      target_type: string,
      created_at: string
    }>
  }
}
```

#### GET /api/admin/customers
```typescript
// 機能: 全ユーザーの顧客データ取得（クロステナント）
// 権限: super_admin のみ
// レスポンス:
{
  success: true,
  customers: Array<{
    customer_name: string,
    phone: string,
    address: string,
    total_orders: number,
    total_revenue: number,
    last_order_date: string,
    user_id: number,
    username: string
  }>
}
```

---

## フロントエンドアーキテクチャ

### コンポーネント構成

#### レイアウト構造
```typescript
// src/app/layout.tsx - グローバルレイアウト
<html>
  <body>
    <ErrorBoundary>
      <LayoutWrapper>
        {children}
      </LayoutWrapper>
    </ErrorBoundary>
  </body>
</html>

// src/components/LayoutWrapper.tsx
<div className="flex">
  <Sidebar />
  <main>
    {children}
    <ChatPanel />  {/* 常時表示AIチャット */}
  </main>
</div>
```

#### 主要コンポーネント詳細

##### OrderList.tsx
```typescript
// 機能: 注文一覧表示（2ペイン構成）
// Props:
interface OrderListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  selectedOrders: Set<number>;
  view: 'pending' | 'completed';
}

// 特徴:
- 配送日あり/なしで2ペイン分離
- 異なる背景色（白 vs 水色）
- 一括選択機能
- カテゴリフィルター
- 検索機能（顧客名、注文番号、電話番号）
```

##### ChatPanel.tsx
```typescript
// 機能: AIチャットパネル
// 状態管理: IndexedDB + BroadcastChannel
// 特徴:
- 常時右下に表示（折りたたみ可能）
- ページコンテキスト自動付与
- 会話履歴永続化
- タブ間同期（BroadcastChannel API）
- Markdown対応

// IndexedDB スキーマ:
{
  dbName: 'ChatHistory',
  storeName: 'messages',
  version: 1,
  keyPath: 'id'
}
```

##### DashboardCharts.tsx
```typescript
// 機能: ダッシュボードグラフ
// 使用ライブラリ: Recharts
// グラフ種類:
1. LineChart: 日次売上推移
2. BarChart: カテゴリ別売上
3. PieChart: 顧客セグメント
4. BarChart: 曜日別注文パターン

// レスポンシブ対応:
- モバイル: 1カラム
- タブレット: 2カラム
- デスクトップ: 2x2グリッド
```

##### ErrorBoundary.tsx
```typescript
// 機能: Reactエラー境界
// エラーハンドリング:
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logClientError('COMPONENT_ERROR', error, {
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallbackUI />;
    }
    return this.props.children;
  }
}
```

### ページ構成

#### 注文登録フロー（/orders/register/*）
```
1. /orders/register/choose
   └→ 登録方法選択（手動 or CSV）

2a. /orders/register/manual
    └→ 手動入力フォーム

2b. /orders/register/csv-upload
    └→ CSVドラッグ&ドロップ

3. /orders/register/confirm
   └→ 入力内容確認

4. /orders/register/complete
   └→ 登録完了・結果表示
```

#### 配送フロー（/orders/shipping/*）
```
1. /orders/shipping/pending
   └→ 配送待ち注文一覧（複数選択可）

2. ShippingSettingsModal（モーダル）
   └→ 配送設定入力

3. /orders/shipping/confirm
   └→ 配送内容確認

4. /orders/shipping/complete
   └→ 配送完了・CSV自動ダウンロード
```

### 状態管理

#### Zustand Store（必要に応じて実装）
```typescript
// 現状: useState/useEffect中心
// 必要に応じてZustandでグローバル状態管理

interface AppStore {
  user: User | null;
  categories: Category[];
  selectedOrders: Set<number>;
  setUser: (user: User) => void;
  addSelectedOrder: (orderId: number) => void;
  clearSelectedOrders: () => void;
}
```

### フォーム管理

#### React Hook Form + Zod
```typescript
// 例: ログインフォーム
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'ユーザー名を入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上です'),
  rememberMe: z.boolean().optional()
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema)
});
```

---

## エラーハンドリングシステム

### AI判断型エラー検知アーキテクチャ

#### 基底クラス（src/lib/error-details.ts）
```typescript
export interface DetailedErrorResponse {
  success: false;
  message: string;
  error_code: string;
  processing_steps: Array<{
    step_name: string;
    status: 'completed' | 'failed' | 'skipped';
    details?: any;
  }>;
  suggestions: string[];
  debug_info?: {
    timestamp: string;
    user_id?: string;
    operation?: string;
  };
}

export class ErrorDetailBuilder {
  protected errorResponse: DetailedErrorResponse;

  constructor(message: string, errorCode: string);
  addProcessingStep(stepName: string, status: string, details?: any): this;
  addSuggestions(suggestions: string[]): this;
  setOperation(operation: string): this;
  setDetails(details: any): this;
  build(): DetailedErrorResponse;
}
```

#### 認証エラー（src/lib/auth-error-details.ts）
```typescript
export class AuthErrorBuilder extends ErrorDetailBuilder {
  static loginFailure(
    username: string,
    reason: 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'ACCOUNT_LOCKED' | 'RATE_LIMITED',
    context: AuthenticationContext
  ): DetailedErrorResponse;

  static sessionError(
    errorType: 'INVALID_SESSION' | 'EXPIRED_SESSION' | 'CSRF_MISMATCH',
    sessionInfo?: { token?: string; created?: string; userId?: string }
  ): DetailedErrorResponse;
}

// 使用例:
const authError = AuthErrorBuilder.loginFailure('admin', 'INVALID_CREDENTIALS', {
  ipAddress: '192.168.1.1',
  attemptCount: 3
});

// レスポンス例:
{
  success: false,
  message: 'ユーザー名またはパスワードが正しくありません',
  error_code: 'AUTHENTICATION_ERROR',
  processing_steps: [
    { step_name: 'Username Validation', status: 'completed' },
    { step_name: 'Password Verification', status: 'failed' }
  ],
  suggestions: [
    '短時間での複数回ログイン試行が検出されました。ブルートフォース攻撃の可能性があります'
  ]
}
```

#### データベースエラー（src/lib/api-error-details.ts）
```typescript
export class DatabaseErrorBuilder extends ErrorDetailBuilder {
  static connectionError(errorDetails: any, context: DatabaseErrorContext): DetailedErrorResponse;
  static queryError(query: string, errorDetails: any, context: DatabaseErrorContext): DetailedErrorResponse;
  static transactionError(errorDetails: any, context: DatabaseErrorContext): DetailedErrorResponse;
}

// 使用例:
try {
  const result = await client.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
  logDatabaseOperation('SELECT', 'orders', true, { rows: result.rows.length }, userId);
} catch (error) {
  logDatabaseOperation('SELECT', 'orders', false, { error: error.message }, userId);
  const dbError = DatabaseErrorBuilder.queryError(query, error, {
    table: 'orders',
    operation: 'SELECT',
    userId
  });
  return NextResponse.json(dbError, { status: 500 });
}
```

#### 外部APIエラー（src/lib/api-error-details.ts）
```typescript
export class ExternalAPIErrorBuilder extends ErrorDetailBuilder {
  static openAIError(errorDetails: any, context: ExternalAPIErrorContext): DetailedErrorResponse;
  static shippingAPIError(errorDetails: any, context: ExternalAPIErrorContext): DetailedErrorResponse;
}

// OpenAI エラー分析:
- insufficient_quota → 'OpenAI APIの利用量が上限に達しています'
- invalid_api_key → 'OpenAI APIキーが無効です'
- rate_limit_exceeded → 'OpenAI APIのレート制限に達しました'
- context_length_exceeded → '入力メッセージが長すぎます'
```

#### クライアントエラー（src/lib/client-error-details.ts）
```typescript
export class FormErrorBuilder extends ErrorDetailBuilder {
  static validationError(
    formName: string,
    validationErrors: any,
    formData: any,
    context: ClientErrorContext
  ): DetailedErrorResponse;

  static submissionError(
    formName: string,
    error: any,
    formData: any,
    context: ClientErrorContext
  ): DetailedErrorResponse;
}

export class DataFetchErrorBuilder extends ErrorDetailBuilder {
  static apiError(endpoint: string, error: any, context: ClientErrorContext): DetailedErrorResponse;
  static networkError(context: ClientErrorContext): DetailedErrorResponse;
}
```

#### React フック（src/hooks/useErrorHandler.ts）
```typescript
// フォーム専用
const { handleValidationError, handleSubmissionError, errorDetails } =
  useFormErrorHandler('login-form', { componentName: 'LoginPage' });

// API呼び出し専用
const { handleFetchError, handleApiError } =
  useApiErrorHandler({ componentName: 'OrderList' });

// 汎用
const { handleError, clearError, retry } =
  useErrorHandler({
    componentName: 'Dashboard',
    onError: (error) => { /* カスタム処理 */ }
  });
```

### ログシステム（src/lib/debug-logger.ts）
```typescript
export const debugLogger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, sanitizeForLogging(data));
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, sanitizeForLogging(data));
  },
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, sanitizeForLogging(data));
  }
};

// ログ関数
- logAuthAttempt(result, username, context)
- logSecurityEvent(eventType, details, context)
- logDatabaseOperation(operation, table, success, details, userId)
- logExternalAPICall(apiName, endpoint, method, success, responseTime, statusCode)
- logClientError(errorType, error, context)
```

---

## 状態管理とデータフロー

### データフェッチパターン

#### Server Components（デフォルト）
```typescript
// src/app/orders/shipping/pending/page.tsx
export default async function PendingOrdersPage() {
  // Server Componentでデータ取得
  const orders = await fetchOrders({ status: 'pending' });

  return <OrderList orders={orders} />;
}
```

#### Client Components（対話的UI）
```typescript
'use client';

export function OrderList({ orders: initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    // クライアント側でリアルタイム更新
    const interval = setInterval(async () => {
      const updated = await fetch('/api/orders').then(r => r.json());
      setOrders(updated.orders);
    }, 30000);  // 30秒ごと

    return () => clearInterval(interval);
  }, []);

  return <>{/* ... */}</>;
}
```

### IndexedDB統合（チャット履歴）
```typescript
// チャット履歴の永続化
class ChatStorageManager {
  private dbName = 'ChatHistory';
  private storeName = 'messages';

  async saveMessage(message: ChatMessage): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    await tx.objectStore(this.storeName).add(message);
  }

  async getMessages(limit: number = 50): Promise<ChatMessage[]> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readonly');
    const messages = await tx.objectStore(this.storeName).getAll();
    return messages.slice(-limit);
  }
}
```

### BroadcastChannel（タブ間同期）
```typescript
// src/components/ChatPanel.tsx
const channel = new BroadcastChannel('chat-sync');

// メッセージ送信時
channel.postMessage({ type: 'NEW_MESSAGE', message });

// 他タブからの受信
channel.onmessage = (event) => {
  if (event.data.type === 'NEW_MESSAGE') {
    setMessages(prev => [...prev, event.data.message]);
  }
};
```

---

## 開発ワークフロー

### 開発環境セットアップ
```bash
# 1. リポジトリクローン
git clone <repository-url>
cd agri-ai-agent-frontend-test

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env.local
# .env.local に以下を設定:
# DATABASE_URL=<Neon PostgreSQL接続文字列>
# OPENAI_API_KEY=<OpenAI APIキー>

# 4. 開発サーバー起動
npm run dev

# 5. データベースマイグレーション実行
curl -X POST http://localhost:3000/api/migrate-auth
curl -X POST http://localhost:3000/api/migrate-security-enhancements
curl -X POST http://localhost:3000/api/migrate-admin-system

# 6. ブラウザで確認
open http://localhost:3000/orders
```

### 品質保証コマンド
```bash
# TypeScript型チェック
npm run typecheck

# ESLint
npm run lint

# ビルド確認
npm run build

# テスト実行
npm test                    # 全テスト
npm run test:watch          # ウォッチモード
npm run test:coverage       # カバレッジ付き

# 特定テスト実行
npm test -- __tests__/api/auth/login.test.ts
npm test -- --testNamePattern="should validate required fields"
```

### コード品質チェックリスト
```bash
# QUALITY_CHECKLIST.md の10項目チェック
1. ビルドエラー/警告 (CRITICAL)
2. TypeScriptコンパイルエラー (CRITICAL)
3. セキュリティ脆弱性 (CRITICAL)
4. 動的ルート設定 (CRITICAL)
5. デバッグログクリーンアップ (HIGH)
6. TODO/FIXMEコメント (HIGH)
7. 関数重複分析 (HIGH)
8. 環境変数型定義 (MEDIUM)
9. テストモック汚染 (MEDIUM)
10. TypeScript any使用分析 (LOW)

# 品質スコア
- Perfect (30/30): エンタープライズグレード
- Excellent (27-29): 本番デプロイ可
- Good (24-26): 軽微な改善推奨
- Below 24: 重大な修正必要
```

### Git ワークフロー
```bash
# 機能ブランチ作成
git checkout -b feature/new-feature

# コミット前チェック
npm run lint
npm run typecheck
npm run build

# コミット
git add .
git commit -m "feat: Add new feature"

# プッシュ
git push origin feature/new-feature

# プルリクエスト作成（GitHub）
```

### テスト戦略
```typescript
// __tests__/api/orders/route.test.ts
describe('GET /api/orders', () => {
  it('should return orders for authenticated user', async () => {
    const mockUser = createMockUser({ id: 1 });
    const mockSession = createMockSession({ user_id: 1 });
    const mockOrders = [createMockOrder({ user_id: 1 })];

    mockDbClient.query
      .mockResolvedValueOnce({ rows: [{ ...mockUser, ...mockSession }] })
      .mockResolvedValueOnce({ rows: mockOrders });

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { 'x-session-token': 'valid-token' }
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orders).toHaveLength(1);
  });

  it('should enforce multi-tenant isolation', async () => {
    // user_id=1でログイン、user_id=2のデータは取得できない
  });

  it('should validate CSRF token for mutations', async () => {
    // POST/PUT/DELETEでCSRFトークン検証
  });
});
```

---

## デプロイメント

### Vercel デプロイ
```bash
# 1. Vercel CLI インストール
npm install -g vercel

# 2. ログイン
vercel login

# 3. プロジェクトリンク
vercel link

# 4. 環境変数設定（Vercelダッシュボード）
DATABASE_URL=<Production Neon DB>
OPENAI_API_KEY=<Production OpenAI Key>
YAMATO_API_KEY=<Production Yamato Key>
YAMATO_API_SECRET=<Production Yamato Secret>
YAMATO_API_BASE_URL=<Production Yamato URL>

# 5. デプロイ
vercel --prod

# 6. データベースマイグレーション（本番）
curl -X POST https://your-domain.vercel.app/api/migrate-auth
curl -X POST https://your-domain.vercel.app/api/migrate-security-enhancements
curl -X POST https://your-domain.vercel.app/api/migrate-admin-system
```

### 環境変数
```bash
# 開発環境 (.env.local)
DATABASE_URL=postgresql://user:pass@localhost:5432/agri_dev
OPENAI_API_KEY=sk-...
NODE_ENV=development

# 本番環境 (Vercel Environment Variables)
DATABASE_URL=<Neon Production URL>
OPENAI_API_KEY=<Production Key>
YAMATO_API_KEY=<Production Key>
YAMATO_API_SECRET=<Production Secret>
YAMATO_API_BASE_URL=https://api.yamato.co.jp/v1
NODE_ENV=production
```

### ビルド設定
```json
// package.json
{
  "scripts": {
    "vercel-build": "next build"
  }
}

// vercel.json (オプション)
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hnd1"]  // Tokyo region
}
```

### SSL/HTTPS
- Vercelで自動SSL証明書発行
- next.config.jsでセキュリティヘッダー設定済み
- 全Cookie設定でSecure, HttpOnly, SameSite=Strict

---

## 追加情報

### テストカバレッジ
```
Total Test Cases: 140+

Coverage by Module:
- Authentication API: 100%
- Orders API: 100%
- Categories API: 100%
- Upload API: 100%
- Shipping API: 100%
- Admin API: 100%
- Chat API: 100%
- Dashboard API: 100%
```

### パフォーマンス最適化
1. **データベース接続プーリング**: Neon Serverless PostgreSQL
2. **画像最適化**: Next.js Image Component
3. **コード分割**: 動的import
4. **キャッシング**: Server Components デフォルトキャッシュ
5. **レート制限**: Middleware レベルで実装

### セキュリティ監査チェックリスト
- [x] 全APIルートで認証検証
- [x] 全POST/PUT/DELETEでCSRF検証
- [x] パラメータ化クエリでSQLインジェクション防止
- [x] 入力サニタイゼーション
- [x] パスワードbcryptハッシュ化
- [x] セッショントークンHttpOnly Cookie
- [x] プログレッシブロックアウト
- [x] レート制限
- [x] セキュリティヘッダー
- [x] 監査ログ記録

### 今後の拡張予定
1. **外部API統合**
   - ColorMi Shop API
   - Tabechoku API
   - 自動注文同期

2. **機能追加**
   - 在庫管理
   - 請求書発行
   - メール通知
   - Webhook連携

3. **パフォーマンス改善**
   - Redis キャッシング
   - GraphQL導入
   - WebSocket リアルタイム更新

---

## まとめ

このドキュメントは、本システムの全体像を包括的に記述しています。他のAIエージェントや開発者がこのドキュメントを読むことで、以下を完全に理解できます：

- プロジェクトの目的と技術スタック
- データベーススキーマとリレーション
- 3層認証アーキテクチャ
- 全APIエンドポイントの仕様
- フロントエンドコンポーネント構成
- AI判断型エラーハンドリングシステム
- テスト戦略とデプロイメント手順

**重要な開発原則**:
1. 全データ操作でマルチテナント分離（user_id必須）
2. 全保護ルートで認証・CSRF検証
3. エラーは構造化エラーシステムで詳細分析
4. テストファーストで品質保証
5. セキュリティファーストで実装

このシステムは、農業ビジネスのデジタル化を支援する強固で拡張可能なプラットフォームです。

---

## 🗑️ Category Feature Removal Summary

### Overview
The manual category selection feature has been **completely removed** from the codebase to make way for a more powerful **Product Master + Product Mapping + AI Suggestion** system.

### Database Changes

#### Migration Script Created
**File:** `src/app/api/migrate-drop-categories/route.ts`

**Execution:**
```bash
curl -X POST http://localhost:3000/api/migrate-drop-categories
```

**Actions Performed:**
1. ✓ DROP foreign key constraint `orders_category_id_fkey`
2. ✓ DROP column `orders.category_id`
3. ✓ DROP column `orders.product_category`
4. ✓ DROP TABLE `categories CASCADE`

#### Removed Database Objects
- ❌ **categories table** (11 columns: id, name, description, color, icon, display_order, is_active, user_id, created_at, updated_at, UNIQUE constraint)
- ❌ **orders.category_id** (INTEGER FK → categories.id)
- ❌ **orders.product_category** (VARCHAR column)

### Backend API Changes

#### Deleted API Routes
1. ❌ `src/app/api/categories/route.ts` (351 lines)
   - GET /api/categories (list all categories for user)
   - POST /api/categories (create new category)
   - PUT /api/categories (update category)
   - DELETE /api/categories (soft delete category)

2. ❌ `src/app/api/upload-with-category/route.ts` (593 lines)
   - POST /api/upload-with-category (CSV upload with category assignment)

#### Modified API Routes
1. ✓ **`src/app/api/orders/route.ts`**
   - Removed category JOIN from SELECT query
   - Removed category fields: `category_id`, `category_name`, `category_color`, `category_icon`
   - Removed category validation logic
   - Updated INSERT to exclude `category_id` and `product_category`

2. ✓ **`src/app/api/orders/[id]/route.ts`**
   - Removed category LEFT JOIN from GET endpoint
   - Simplified query to `SELECT o.* FROM orders o`

### Frontend Changes

#### Deleted Pages
- ❌ `src/app/categories/page.tsx` (426 lines)
  - Full category management UI with CRUD operations
  - Icon picker (9 icons) and color picker (8 colors)
  - Category creation/edit forms with preview

#### Modified Pages
1. ✓ **`src/app/orders/shipping/pending/page.tsx`**
   - Removed `Category` interface
   - Removed `iconComponents` and `colorClasses` mappings
   - Removed `categories` state
   - Removed `categoryFilter` state
   - Removed `fetchCategories()` function
   - Removed category filter UI (45 lines)
   - Removed unused imports: `Carrot`, `Apple`, `Coffee`, `ShoppingBag`, `Heart`, `Star`, `Leaf`, `Zap`

#### Modified Components
1. ✓ **`src/components/Sidebar.tsx`**
   - Removed `{ name: 'カテゴリ管理', href: '/categories', icon: Tags }` navigation item
   - Removed `Tags` import from lucide-react

### TypeScript Type Changes

#### Modified Types
**`src/types/order.ts`**
```diff
export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  // ... other fields
- category_id?: number;
- category_name?: string;
- category_color?: string;
- category_icon?: string;
  shipped_at?: string;
  tracking_number?: string;
  // ...
}
```

### Middleware Changes

**`src/middleware.ts`**
- ✓ Removed `/api/categories` from `CUSTOMER_ONLY_API_ROUTES`
- ✓ Removed `/api/upload-with-category` from `CUSTOMER_ONLY_API_ROUTES`
- ✓ Removed `/categories` from `CUSTOMER_ONLY_PAGE_ROUTES`

### Test Changes

#### Deleted Test Files
- ❌ `__tests__/api/categories/categories.test.ts` (full category API test suite)
- ❌ `__tests__/api/upload-colormi-final.test.ts` (upload-with-category tests)
- ❌ `__tests__/api/upload/csv-upload.test.ts` (category CSV upload tests)

#### Modified Test Files
1. ✓ **`__tests__/setup/test-utils.ts`**
   - Removed all category query handling from MockDbClient
   - Removed `createMockCategory()` factory function
   - Removed `category_id` from `createMockOrder()` 
   - Removed `category` parameter from `createFormDataRequest()`
   - Removed category seeding from `seedTestData()`
   - Updated INSERT INTO orders mock to match new column order

2. ✓ **`__tests__/api/orders/orders.test.ts`**
   - Removed "should validate category ownership" test
   - Removed "should create order with category" test

### Files Summary

**Total Files Deleted:** 5
```
- src/app/api/categories/route.ts
- src/app/api/upload-with-category/route.ts
- src/app/categories/page.tsx
- __tests__/api/categories/categories.test.ts
- __tests__/api/upload-colormi-final.test.ts
- __tests__/api/upload/csv-upload.test.ts
```

**Total Files Modified:** 9
```
- src/app/api/orders/route.ts
- src/app/api/orders/[id]/route.ts
- src/app/orders/shipping/pending/page.tsx
- src/components/Sidebar.tsx
- src/middleware.ts
- src/types/order.ts
- __tests__/setup/test-utils.ts
- __tests__/api/orders/orders.test.ts
- SYSTEM_ARCHITECTURE.md
```

**New Files Created:** 1
```
+ src/app/api/migrate-drop-categories/route.ts (migration script)
```

### Verification Steps

1. ✅ **TypeScript Compilation**
   ```bash
   npm run typecheck
   ```
   - No category-related errors
   - All type references resolved

2. ✅ **Database Migration**
   ```bash
   curl -X POST http://localhost:3000/api/migrate-drop-categories
   ```
   - Categories table dropped
   - Foreign keys removed
   - No data loss warnings (feature intentionally removed)

3. ✅ **Navigation Check**
   - Sidebar no longer shows "カテゴリ管理" link
   - `/categories` route returns 404
   - Shipping page has no category filter

4. ✅ **API Endpoint Check**
   - `/api/categories` returns 404
   - `/api/upload-with-category` returns 404
   - `/api/orders` returns data without category fields

### Next Steps: Product Master Implementation

The removed category feature will be replaced with:

1. **product_master table** - Canonical product definitions per tenant
2. **product_mappings table** - Map raw product names to master products
3. **AI-powered suggestion engine** - OpenAI-based product matching
4. **New API routes** - `/api/products/master`, `/api/products/mappings`, `/api/products/unmapped`
5. **Product mapping UI** - `/products/mapping` page

See the main request for detailed implementation requirements.

---

**Last Updated:** 2025-12-05
**Migration Status:** Category feature completely removed, ready for Product Master implementation
