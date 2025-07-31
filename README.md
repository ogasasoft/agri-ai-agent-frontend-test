# Agri AI Agent Frontend

農業EC統合管理システム - Next.js 14 + TypeScript + PostgreSQL

## 🌟 概要

農業事業者向けの包括的なEC注文管理・AI支援システムです。複数のECプラットフォームからの注文を統合管理し、AI によるデータ分析とチャット支援を提供します。

### 主要機能

- 📦 **注文管理**: 複数ECサイトからの注文を統合管理
- 🤖 **AI チャット**: OpenAI GPT による注文データ分析と相談機能
- 👥 **顧客管理**: 顧客データの一元管理と分析
- 📊 **カテゴリ管理**: 商品・注文の動的カテゴリ分類
- 🚚 **配送管理**: ヤマト運輸API連携による配送ラベル作成
- 🔒 **認証・セキュリティ**: 多要素認証、段階的ロックアウト、Remember Me機能
- 👑 **管理者システム**: スーパー管理者による全システム管理
- 🔌 **API連携**: カラーミーショップ・食べチョクとの自動同期

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 14** - App Router使用
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Lucide React** - アイコン
- **Zustand** - 状態管理
- **React Hook Form + Zod** - フォームバリデーション
- **TanStack Query** - API通信

### バックエンド
- **Next.js API Routes** - サーバーサイドAPI
- **PostgreSQL** - メインデータベース（Neon）
- **bcryptjs** - パスワードハッシュ化
- **Node.js pg** - データベースクライアント

### AI・外部連携
- **OpenAI GPT-3.5-turbo** - AIチャット機能
- **ヤマト運輸API** - 配送ラベル作成（予定）
- **カラーミーショップAPI** - 注文同期（予定）
- **食べチョクAPI** - 注文同期（予定）

## 🚀 セットアップ

### 前提条件
- Node.js 18以上
- PostgreSQL データベース
- OpenAI API キー

### インストール

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd agri-ai-agent-frontend-test
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
`.env.local` ファイルを作成:
```env
# データベース
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# ヤマト運輸API（今後実装予定）
YAMATO_API_KEY=your-yamato-api-key
YAMATO_API_SECRET=your-yamato-api-secret
YAMATO_API_BASE_URL=https://api.yamato.co.jp/v1

# API連携（今後実装予定）
COLORMI_API_KEY=your-colormi-api-key
TABECHOKU_API_KEY=your-tabechoku-api-key
```

4. **データベースの初期化**
```bash
# 開発サーバー起動
npm run dev

# ブラウザで以下にアクセスしてデータベースセットアップ
http://localhost:3000/api/migrate-auth
http://localhost:3000/api/migrate-security-enhancements
http://localhost:3000/api/migrate-admin-system
```

5. **開発サーバー起動**
```bash
npm run dev
```

## 👤 ログイン情報

### 一般ユーザー
- **ユーザー名**: `admin`
- **パスワード**: `admin123`
- **アクセスURL**: `http://localhost:3000/login`

### スーパー管理者
- **Email**: `silentogasasoft@gmail.com`
- **パスワード**: `Ogasa1995`  
- **管理者画面**: `http://localhost:3000/admin`

## 📁 プロジェクト構造

```
src/
├── app/                    # Next.js 14 App Router
│   ├── admin/             # 管理者画面
│   │   ├── customers/     # 顧客管理
│   │   ├── prompts/       # AIプロンプト設定
│   │   └── integrations/  # API連携設定
│   ├── api/               # API Routes
│   │   ├── admin/         # 管理者専用API
│   │   ├── auth/          # 認証API
│   │   ├── orders/        # 注文管理API
│   │   ├── categories/    # カテゴリ管理API
│   │   └── chat/          # AIチャットAPI
│   ├── orders/            # 注文管理画面
│   │   ├── register/      # 注文登録
│   │   └── shipping/      # 配送管理
│   ├── categories/        # カテゴリ管理画面
│   ├── login/             # ログイン画面
│   └── change-password/   # パスワード変更
├── components/            # 共通コンポーネント
├── lib/                   # ユーティリティ
│   ├── auth.ts           # 基本認証機能
│   ├── auth-enhanced.ts  # 拡張セキュリティ機能
│   └── admin-auth.ts     # 管理者認証
└── stores/               # Zustand ストア
```

## 🔐 セキュリティ機能

### 認証システム
- **多要素認証**: セッション + CSRF トークン
- **Remember Me**: 30日間自動ログイン
- **段階的ロックアウト**: 5分 → 24時間まで段階的に増加
- **IPベースレート制限**: 15分間に20回まで
- **パスワードスプレー攻撃対策**: 異なるユーザー名での攻撃を検出
- **セッション自動延長**: 期限2時間前に自動延長

### データ保護
- **個人情報マスキング**: `田中太郎` → `田***郎`
- **パスワードハッシュ化**: bcrypt + salt
- **SQL インジェクション対策**: パラメータ化クエリ
- **Row Level Security**: PostgreSQL RLS による多テナント分離

## 🛠️ 開発・運用コマンド

```bash
# 開発
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run start        # プロダクションサーバー起動

# 品質管理
npm run typecheck    # TypeScript 型チェック
npm run lint         # ESLint 実行

# デプロイ（Vercel）
vercel               # ステージングデプロイ
vercel --prod        # プロダクションデプロイ
```

## 🌐 デプロイ

### Vercel デプロイ

1. **Vercel CLI インストール**
```bash
npm i -g vercel
vercel login
```

2. **環境変数設定**
Vercel ダッシュボードまたはCLIで設定:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `YAMATO_API_KEY`
- `YAMATO_API_SECRET`

3. **デプロイ実行**
```bash
vercel --prod
```

## 📊 データベース構造

### 主要テーブル
- **users**: ユーザー管理（ロール、権限）
- **sessions**: セッション管理
- **orders**: 注文データ
- **categories**: 動的カテゴリ管理
- **customers**: 顧客情報（自動生成）
- **system_settings**: システム設定・プロンプト
- **api_integrations**: 外部API連携設定
- **security_events**: セキュリティイベント
- **admin_audit_logs**: 管理者操作ログ

### セキュリティテーブル
- **remember_tokens**: Remember Me トークン
- **rate_limits**: レート制限管理
- **audit_logs**: 操作監査ログ

## 🤖 AI機能

### チャット機能
- **動的システムコンテキスト**: リアルタイムデータベース統計
- **ページ認識**: 現在のページに応じたコンテキスト注入
- **ライブデータ統合**: 注文データに基づく分析・提案
- **フォールバック機能**: OpenAI API 利用不可時の代替応答

### プロンプト管理
- **システムプロンプト**: 基本AI動作定義
- **分析プロンプト**: データ分析特化
- **自動化プロンプト**: 自動処理用プロンプト

## 🔌 外部連携（今後実装）

### 対応予定API
- **カラーミーショップ**: 商品・注文自動同期
- **食べチョク**: 注文データ取得
- **ヤマト運輸**: 配送ラベル自動作成

### 同期機能
- **自動インポート**: 設定間隔での自動同期
- **重複チェック**: 注文コードによる重複防止
- **エラーハンドリング**: 同期失敗時の再試行機能

## 📈 管理者機能

### ダッシュボード
- **システム統計**: ユーザー数、注文数、顧客数
- **リアルタイム監視**: システム状態、API状況
- **活動履歴**: 管理者操作ログ

### 管理機能
- **顧客管理**: 全ユーザーの顧客データ統合管理
- **プロンプト設定**: AIシステムプロンプトの編集
- **API連携設定**: 外部サービス連携の設定・テスト
- **セキュリティ監視**: 不正アクセス試行の監視

## 🐛 トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - `DATABASE_URL` の確認
   - SSL設定の確認（Neon使用の場合）

2. **OpenAI API エラー**
   - API キーの確認
   - クォータ上限の確認

3. **認証エラー**
   - セッションの期限切れ → 再ログイン
   - CSRF トークンエラー → ブラウザリロード

### ログ確認
```bash
# 開発環境
npm run dev
# ブラウザ開発者ツールでネットワーク・コンソールを確認

# プロダクション環境
# Vercel ダッシュボードでログ確認
```

## 🤝 開発ガイドライン

### コードスタイル
- **TypeScript**: 厳密な型定義
- **関数型プログラミング**: 副作用の最小化
- **セキュリティファースト**: 入力値検証の徹底

### データベース
- **パラメータ化クエリ**: SQL インジェクション対策
- **トランザクション**: データ整合性保証
- **インデックス最適化**: パフォーマンス向上

### セキュリティ
- **認証必須**: 全保護ルートで認証確認
- **権限チェック**: ロールベースアクセス制御
- **監査ログ**: 重要操作の記録

## 📝 ライセンス

このプロジェクトは私的利用のものです。

## 🙋‍♂️ サポート

問題や質問がある場合は、GitHubのIssuesまたは開発者まで連絡してください。

---

**Agri AI Agent Frontend** - 農業ECビジネスのためのインテリジェントな統合管理システム