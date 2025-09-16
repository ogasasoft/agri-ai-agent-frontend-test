# AI判断型エラー検知システム - 開発ルール

## 📋 概要

このプロジェクトでは、**すべての新規実装において「構造化エラー診断システム」の適用を必須**とします。これにより、ログを見なくてもAIが自動的に問題を判断し、具体的な解決策を提示するシステムを維持します。

## 🚨 必須ルール

### 1. **APIルート開発ルール**

#### ✅ 必須実装項目
```typescript
// ✅ GOOD: 必須のインポート
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, logDatabaseOperation } from '@/lib/api-error-details';
import { ExternalAPIErrorBuilder } from '@/lib/api-error-details';

// ✅ GOOD: 認証エラーの構造化
if (!sessionToken) {
  const authError = AuthErrorBuilder.sessionError('INVALID_SESSION');
  return NextResponse.json(authError, { status: 401 });
}

// ✅ GOOD: データベースエラーの詳細分析
} catch (error: any) {
  logDatabaseOperation('SELECT', 'orders', false, { error: error.message }, userId);
  const dbError = DatabaseErrorBuilder.queryError('SELECT query', error, {
    table: 'orders',
    operation: 'SELECT',
    userId
  });
  return NextResponse.json(dbError, { status: 500 });
}
```

#### ❌ 禁止パターン
```typescript
// ❌ BAD: シンプルなエラーレスポンス（禁止）
return NextResponse.json({
  success: false,
  message: 'エラーが発生しました'
}, { status: 500 });

// ❌ BAD: console.errorのみ（不十分）
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```

### 2. **React Component開発ルール**

#### ✅ 必須実装項目
```typescript
// ✅ GOOD: エラーハンドリングフックの使用
import { useFormErrorHandler } from '@/hooks/useErrorHandler';

export default function MyComponent() {
  const { handleSubmissionError, handleValidationError, errorDetails } =
    useFormErrorHandler('my-form', { componentName: 'MyComponent' });

  const handleSubmit = async (formData: any) => {
    try {
      // API呼び出し
    } catch (error) {
      const errorDetails = handleSubmissionError(error, formData);
      // エラー表示処理
    }
  };
}
```

#### ✅ Error Boundaryの必須適用
```typescript
// ✅ GOOD: コンポーネントをError Boundaryで包む
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Page() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### 3. **ライブラリ関数開発ルール**

#### ✅ 必須実装項目
```typescript
// ✅ GOOD: ライブラリ関数でのエラー詳細化
import { DatabaseErrorBuilder } from '@/lib/api-error-details';

export async function dbOperation() {
  try {
    // データベース操作
  } catch (error) {
    const errorDetails = DatabaseErrorBuilder.connectionError(error, {
      operation: 'CONNECT',
      table: 'users'
    });
    throw new Error(JSON.stringify(errorDetails));
  }
}
```

## 📝 実装チェックリスト

### API Route チェックリスト
- [ ] 適切なErrorBuilderクラスをインポート
- [ ] 認証エラーは`AuthErrorBuilder`を使用
- [ ] データベースエラーは`DatabaseErrorBuilder`を使用
- [ ] 外部APIエラーは`ExternalAPIErrorBuilder`を使用
- [ ] 成功・失敗時のログ記録を実装
- [ ] 段階的処理追跡を実装
- [ ] ユーザーへの解決提案を含む

### React Component チェックリスト
- [ ] `useErrorHandler`または専用フックを使用
- [ ] フォームエラーは`useFormErrorHandler`を使用
- [ ] APIエラーは`useApiErrorHandler`を使用
- [ ] `ErrorBoundary`でコンポーネントを包む
- [ ] エラー詳細をUI上で適切に表示
- [ ] ユーザーアクション（再試行など）を提供

### Library Function チェックリスト
- [ ] エラーを適切なErrorBuilderで構造化
- [ ] 呼び出し元に詳細情報を伝達
- [ ] ログ記録を適切に実行

## 🛠️ 開発ツールとの統合

### ESLint ルール
```json
{
  "rules": {
    "no-simple-error-responses": "error",
    "require-error-builders": "error",
    "require-error-boundaries": "warn"
  }
}
```

### Pre-commit Hook
```bash
#!/bin/sh
# エラーハンドリング必須チェック
./scripts/check-error-handling.sh
```

### テストルール
```typescript
// ✅ GOOD: エラーシナリオのテスト必須
describe('API Error Handling', () => {
  it('should return structured error for database failures', async () => {
    // データベースエラーのテスト
    const response = await request(app).post('/api/orders').send(invalidData);
    expect(response.body).toHaveProperty('error_code');
    expect(response.body).toHaveProperty('suggestions');
    expect(response.body).toHaveProperty('debug_info');
  });
});
```

## 📊 コードレビュー基準

### 承認必須条件
1. **エラーハンドリングの完全性**: すべてのエラーケースが構造化されている
2. **ログ記録の適切性**: 成功・失敗ログが適切に記録されている
3. **ユーザー体験**: 分かりやすいエラーメッセージと解決策が提供されている
4. **テストカバレッジ**: エラーシナリオのテストが含まれている

### レビュー時確認項目
- [ ] `console.error`のみの単純なエラー処理になっていないか
- [ ] エラーレスポンスに`suggestions`と`debug_info`が含まれているか
- [ ] 適切なErrorBuilderクラスが使用されているか
- [ ] ユーザーが次に取るべきアクションが明確か

## 🎯 違反時の対応

### Severity Level 1 (Critical)
- **条件**: API RouteでErrorBuilderを使用していない
- **対応**: 即座の修正が必要、マージブロック

### Severity Level 2 (High)
- **条件**: Error Boundaryが適用されていない
- **対応**: 次のスプリントで修正

### Severity Level 3 (Medium)
- **条件**: エラーテストが不足している
- **対応**: レビュー指摘、改善推奨

## 📚 学習リソース

### 必読ドキュメント
1. `src/lib/error-details.ts` - 基本ErrorBuilderクラス
2. `src/lib/auth-error-details.ts` - 認証系エラー処理
3. `src/lib/api-error-details.ts` - API・DB系エラー処理
4. `src/lib/client-error-details.ts` - フロントエンド系エラー処理
5. `src/hooks/useErrorHandler.ts` - Reactエラーハンドリング

### 実装例参考
- `src/app/api/auth/login/route.ts` - 認証エラー処理の参考例
- `src/app/api/orders/route.ts` - データベースエラー処理の参考例
- `src/app/api/chat/route.ts` - 外部APIエラー処理の参考例

## 🚀 継続改善

### 月次レビュー項目
- [ ] エラーパターンの分析と新しい検知ルールの追加
- [ ] ユーザーからのフィードバックに基づく改善
- [ ] 新しいErrorBuilderクラスの必要性検討
- [ ] パフォーマンス影響の測定

### KPI追跡
- **デバッグ時間短縮率**: 目標70%削減
- **ユーザー問い合わせ減少率**: 目標50%削減
- **エラー解決率**: 目標90%自動解決
- **開発者満足度**: 四半期アンケートで測定

---

**このルールに従うことで、保守性が高く、ユーザーフレンドリーで、デバッグしやすいアプリケーションを維持できます。**