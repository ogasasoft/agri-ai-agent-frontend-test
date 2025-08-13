# 🔍 コード品質検査チェックリスト

このドキュメントは、コードベース品質の徹底的な検証を行うための標準化されたチェックリストです。

## 📊 品質検査項目 (10項目)

### 🔥 CRITICAL レベル (4項目)

#### 1. ビルドエラー・警告確認
```bash
npm run build 2>&1 | grep -E "(Error|Warning|Failed|error|warning|failed)" | wc -l
```
**期待値**: 0件  
**説明**: 本番ビルドでエラーや警告が発生していないか確認

#### 2. TypeScriptコンパイルエラー確認
```bash
npm run typecheck 2>&1 | grep "error TS" | wc -l
```
**期待値**: 0件  
**説明**: TypeScriptの型エラーが完全に解決されているか確認

#### 3. セキュリティ脆弱性確認
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "(password|secret|key).*=" | grep -v "PASSWORD|SECRET|API_KEY|password_hash" | head -3
```
**期待値**: ハードコードされた秘密情報なし  
**説明**: パスワード、APIキー、秘密情報のハードコードがないか確認

#### 4. 動的ルート設定確認
```bash
grep -r "export const dynamic" src --include="*.ts" | wc -l
```
**期待値**: request.headersを使用するAPI数と一致  
**説明**: Next.js動的レンダリング設定が適切か確認

### ⚡ HIGH レベル (3項目)

#### 5. デバッグログ残存確認
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "console\.(log|debug|info)" | wc -l
```
**期待値**: 0件 (console.errorは除く)  
**説明**: 本番環境に不適切なデバッグログが残っていないか確認

#### 6. 問題コメント確認
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "TODO|FIXME|XXX|HACK" | wc -l
```
**期待値**: 0件 (適切なNOTEコメントは可)  
**説明**: 未解決のタスクや問題コメントが残っていないか確認

#### 7. 関数重複確認
```bash
find src -name "*.ts" | xargs grep -l "async function getDbClient" | wc -l
```
**期待値**: 1件 (src/lib/db.ts のみ)  
**説明**: 重複したユーティリティ関数が存在しないか確認

### 🛡️ MEDIUM レベル (2項目)

#### 8. 環境変数型定義確認
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "process\.env\." | grep -v "NODE_ENV|DATABASE_URL|OPENAI_API_KEY|YAMATO_API|NEXT_PUBLIC_BASE_URL" | wc -l
```
**期待値**: 0件  
**説明**: 未定義の環境変数が使用されていないか確認 (src/types/env.d.ts と照合)

#### 9. テスト用モック残存確認
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "\.mock\." | wc -l
```
**期待値**: 0件  
**説明**: 本番コードにテスト用モックが残っていないか確認

### 📈 LOW レベル (1項目)

#### 10. any型使用状況確認
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -c "any" | grep -v ":0" | wc -l
```
**期待値**: 可能な限り少数  
**説明**: any型の過度な使用がないか確認 (型安全性の観点)

---

## 🎯 品質スコア計算

### スコア基準
- **CRITICAL**: 各4点 (最大16点)
- **HIGH**: 各3点 (最大9点)  
- **MEDIUM**: 各2点 (最大4点)
- **LOW**: 各1点 (最大1点)

**満点**: 30点  
**合格基準**: 27点以上 (90%以上)

### 品質レベル判定
- **30点**: 🏆 Perfect - 企業レベル品質
- **27-29点**: ✅ Excellent - 本番デプロイ可能
- **24-26点**: ⚠️ Good - 軽微な改善推奨
- **21-23点**: 🔧 Fair - 改善必要
- **20点以下**: ❌ Poor - 大幅な修正必要

---

## 📋 検査実行例

```bash
#!/bin/bash
echo "🔍 コード品質検査開始..."

# CRITICAL
echo "1. ビルドエラー:"
npm run build 2>&1 | grep -E "(Error|Warning|Failed|error|warning|failed)" | wc -l

echo "2. TypeScriptエラー:"
npm run typecheck 2>&1 | grep "error TS" | wc -l

echo "3. セキュリティ脆弱性:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "(password|secret|key).*=" | grep -v "PASSWORD|SECRET|API_KEY|password_hash" | wc -l

echo "4. 動的ルート設定:"
grep -r "export const dynamic" src --include="*.ts" | wc -l

# HIGH
echo "5. デバッグログ:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "console\.(log|debug|info)" | wc -l

echo "6. 問題コメント:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "TODO|FIXME|XXX|HACK" | wc -l

echo "7. 関数重複:"
find src -name "*.ts" | xargs grep -l "async function getDbClient" | wc -l

# MEDIUM
echo "8. 未定義環境変数:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "process\.env\." | grep -v "NODE_ENV|DATABASE_URL|OPENAI_API_KEY|YAMATO_API|NEXT_PUBLIC_BASE_URL" | wc -l

echo "9. テスト用モック:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -E "\.mock\." | wc -l

# LOW
echo "10. any型使用:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -c "any" | grep -v ":0" | wc -l

echo "✅ 検査完了"
```

---

## 📝 使用方法

1. **定期検査**: リリース前、PR作成時に実行
2. **問題発見時**: 品質問題を報告された際の網羅的確認
3. **品質向上**: 継続的な品質改善の基準として使用

## 🔄 更新履歴

- **v1.0 (2025-08-13)**: 初版作成
  - 10項目の品質検査チェックリスト策定
  - 4段階品質レベル判定基準確立
  - 自動化スクリプト例作成

---

**💡 Tips**: このチェックリストを使用して「本当に大丈夫？」の問いに対し、客観的な数値と根拠に基づいた回答を提供できます。