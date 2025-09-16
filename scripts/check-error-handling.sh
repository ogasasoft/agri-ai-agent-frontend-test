#!/bin/bash

# AI判断型エラー検知システム - Pre-commit Hook
# このスクリプトは、コミット前にエラーハンドリングの実装をチェックします

set -e

echo "🔍 エラーハンドリング実装チェック開始..."

# 色付き出力の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# エラーカウンター
ERROR_COUNT=0
WARNING_COUNT=0

# 1. API routeでのErrorBuilder使用チェック
echo -e "${BLUE}📋 1. API Routeのエラーハンドリングチェック...${NC}"

API_FILES=$(find src/app/api -name "*.ts" -type f 2>/dev/null || true)

if [ -n "$API_FILES" ]; then
  for file in $API_FILES; do
    echo "  checking: $file"

    # ErrorBuilderのインポートチェック
    if ! grep -q "ErrorBuilder" "$file"; then
      if grep -q "NextResponse\.json.*status.*[4-5][0-9][0-9]" "$file"; then
        echo -e "    ${RED}❌ ERROR: $file にErrorBuilderのインポートがありません${NC}"
        echo -e "    ${YELLOW}    追加推奨: import { AuthErrorBuilder } from '@/lib/auth-error-details';${NC}"
        ((ERROR_COUNT++))
      fi
    else
      echo -e "    ${GREEN}✅ ErrorBuilder使用済み${NC}"
    fi

    # シンプルなエラーレスポンスの検出
    if grep -q "return NextResponse\.json.*message.*status.*[4-5][0-9][0-9]" "$file"; then
      if ! grep -q "\.build()" "$file"; then
        echo -e "    ${YELLOW}⚠️  WARNING: $file でシンプルなエラーレスポンスが検出されました${NC}"
        echo -e "    ${YELLOW}    推奨: ErrorBuilderクラスを使用してください${NC}"
        ((WARNING_COUNT++))
      fi
    fi

    # ログ記録のチェック
    if grep -q "catch.*error" "$file"; then
      if ! grep -q "logDatabaseOperation\|logExternalAPICall\|logAuthAttempt" "$file"; then
        echo -e "    ${YELLOW}⚠️  WARNING: $file でエラーログ記録が不足している可能性があります${NC}"
        echo -e "    ${YELLOW}    推奨: logDatabaseOperation()などを使用してください${NC}"
        ((WARNING_COUNT++))
      fi
    fi
  done
else
  echo -e "    ${YELLOW}⚠️  API routeファイルが見つかりません${NC}"
fi

# 2. React componentでのエラーハンドリングチェック
echo -e "${BLUE}📋 2. React Componentのエラーハンドリングチェック...${NC}"

COMPONENT_FILES=$(find src/app -name "*.tsx" -type f 2>/dev/null || true)
PAGE_FILES=$(find src/app -name "page.tsx" -type f 2>/dev/null || true)

if [ -n "$COMPONENT_FILES" ]; then
  for file in $COMPONENT_FILES; do
    echo "  checking: $file"

    # useErrorHandlerの使用チェック（fetchまたはtry-catchがある場合）
    if grep -q "fetch\|try.*{" "$file"; then
      if ! grep -q "useErrorHandler\|useFormErrorHandler\|useApiErrorHandler" "$file"; then
        echo -e "    ${YELLOW}⚠️  WARNING: $file でuseErrorHandlerの使用を推奨します${NC}"
        echo -e "    ${YELLOW}    推奨: import { useErrorHandler } from '@/hooks/useErrorHandler';${NC}"
        ((WARNING_COUNT++))
      else
        echo -e "    ${GREEN}✅ useErrorHandler使用済み${NC}"
      fi
    fi
  done
fi

if [ -n "$PAGE_FILES" ]; then
  for file in $PAGE_FILES; do
    echo "  checking page: $file"

    # ErrorBoundaryの使用チェック
    if ! grep -q "ErrorBoundary" "$file"; then
      echo -e "    ${YELLOW}⚠️  WARNING: $file でErrorBoundaryの使用を推奨します${NC}"
      echo -e "    ${YELLOW}    推奨: import { ErrorBoundary } from '@/components/ErrorBoundary';${NC}"
      ((WARNING_COUNT++))
    else
      echo -e "    ${GREEN}✅ ErrorBoundary使用済み${NC}"
    fi
  done
fi

# 3. テストファイルでのエラーシナリオチェック
echo -e "${BLUE}📋 3. テストファイルのエラーシナリオチェック...${NC}"

TEST_FILES=$(find __tests__ -name "*.test.ts" -type f 2>/dev/null || true)

if [ -n "$TEST_FILES" ]; then
  for file in $TEST_FILES; do
    echo "  checking test: $file"

    # エラーシナリオのテストがあるかチェック
    if ! grep -q "error\|Error\|should.*fail\|should.*throw" "$file"; then
      echo -e "    ${YELLOW}⚠️  WARNING: $file でエラーシナリオのテストを推奨します${NC}"
      echo -e "    ${YELLOW}    推奨: エラーケースのテストを追加してください${NC}"
      ((WARNING_COUNT++))
    else
      echo -e "    ${GREEN}✅ エラーシナリオテストあり${NC}"
    fi
  done
else
  echo -e "    ${YELLOW}⚠️  テストファイルが見つかりません${NC}"
fi

# 4. 必須ファイルの存在チェック
echo -e "${BLUE}📋 4. 必須ファイルの存在チェック...${NC}"

REQUIRED_FILES=(
  "src/lib/error-details.ts"
  "src/lib/auth-error-details.ts"
  "src/lib/api-error-details.ts"
  "src/lib/client-error-details.ts"
  "src/hooks/useErrorHandler.ts"
  "src/components/ErrorBoundary.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✅ $file 存在${NC}"
  else
    echo -e "  ${RED}❌ ERROR: $file が見つかりません${NC}"
    ((ERROR_COUNT++))
  fi
done

# 5. CLAUDE.mdの更新チェック
echo -e "${BLUE}📋 5. ドキュメント更新チェック...${NC}"

if [ -f "CLAUDE.md" ]; then
  if grep -q "構造化エラー診断システム\|ErrorBuilder" "CLAUDE.md"; then
    echo -e "  ${GREEN}✅ CLAUDE.md にエラーハンドリング情報が記載されています${NC}"
  else
    echo -e "  ${YELLOW}⚠️  WARNING: CLAUDE.md にエラーハンドリングルールの記載を推奨します${NC}"
    ((WARNING_COUNT++))
  fi
fi

if [ -f "ERROR_HANDLING_RULES.md" ]; then
  echo -e "  ${GREEN}✅ ERROR_HANDLING_RULES.md が存在します${NC}"
else
  echo -e "  ${YELLOW}⚠️  WARNING: ERROR_HANDLING_RULES.md の作成を推奨します${NC}"
  ((WARNING_COUNT++))
fi

# 結果サマリー
echo -e "${BLUE}📊 チェック結果サマリー${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
  echo -e "${GREEN}🎉 すべてのチェックに合格しました！${NC}"
  echo -e "${GREEN}   エラーハンドリング実装が適切に行われています。${NC}"
  exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
  echo -e "${YELLOW}⚠️  警告: ${WARNING_COUNT}個の改善推奨項目があります${NC}"
  echo -e "${YELLOW}   コミットは可能ですが、改善を検討してください。${NC}"
  exit 0
else
  echo -e "${RED}❌ エラー: ${ERROR_COUNT}個の必須修正項目があります${NC}"
  echo -e "${RED}   警告: ${WARNING_COUNT}個の改善推奨項目があります${NC}"
  echo -e "${RED}   修正してからコミットしてください。${NC}"
  echo ""
  echo -e "${BLUE}💡 ヘルプ:${NC}"
  echo -e "   - ERROR_HANDLING_RULES.md を参照してください"
  echo -e "   - 実装例: src/app/api/auth/login/route.ts"
  echo -e "   - フロントエンド例: src/hooks/useErrorHandler.ts"
  echo ""
  exit 1
fi