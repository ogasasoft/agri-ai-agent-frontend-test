# 貢献ガイドライン — Agri AI Agent Frontend

農業EC統合管理システムへの貢献を歓迎します！コミュニティの皆様の支援のおかげで、
このプロジェクトをより良くすることができます。

## 行動規範

このプロジェクトおよび参加者の皆様は、すべての相互作用において、
歓迎的で包括的な環境を提供することをコミットしています。

- 尊重し、建設的に相互に協力する
- 多様な背景を持つ人々を受け入れる
- 偏見や差別的な発言をしない

## 開始方法

### 前提条件

- Node.js 20.0.0 以上
- npm, yarn, または pnpm
- Git

### プロジェクトのセットアップ

1. リポジトリをフォークする
2. フォークをクローンする:
   ```bash
   git clone https://github.com/yourusername/agri-ai-agent-frontend.git
   cd agri-ai-agent-frontend
   ```

## 開発ワークフロー

### 1. ブランチを作成する

機能追加やバグ修正のために新しいブランチを作成します:
```bash
git checkout -b feature/新機能名
# または
git checkout -b fix/バグの説明
```

ブランチ命名規則:
- `feature/` - 新しい機能
- `fix/` - バグ修正
- `docs/` - ドキュメント更新
- `refactor/` - リファクタリング
- `test/` - テストとテストの更新
- `chore/` - ビルドプロセスや補助ツールの変更

### 2. 依存関係をインストールする

```bash
npm install
# または
yarn install
# または
pnpm install
```

### 3. 品質チェックを実行する

コミットする前に、必ず以下のコマンドを実行します:

```bash
# TypeScript 型チェック
npm run typecheck

# ESLint チェック
npm run lint

# テスト実行
npm test

# フォーマットチェック
npm run format:check
```

チェックに失敗した場合:
- **TypeScript エラー**: 型エラーを修正する
- **ESLint 警告/エラー**: リンティングの問題を修正する
- **テスト失敗**: テストを修正するかコードを修正する
- **フォーマット問題**: `npm run format` を実行する

### 4. 変更を行う

明確で文書化されたコードを書きます。
以下の原則に従います:

- **TypeScript**: `any` 型は可能な限り使用せず、厳格モードを使用
- **コンポーネント設計**: コンポーネントを小さく、焦点を絞ったものにする
- **テスト**: 新機能にはテストを追加する
- **ドキュメント**: README および必要に応じてドキュメントを更新する
- **コメント**: 複雑なロジックにはコメントを追加する

### 5. コミットする

コンバーショナルコミットを使用します:
```bash
git add .
git commit -m "feat: 新機能を追加"

# または修正の場合:
git commit -m "fix: X の問題を解決"

# またはドキュメントの場合:
git commit -m "docs: README を更新"
```

### 6. プッシュしてプルリクエストを作成する

```bash
git push origin feature/新機能名
```

その後、GitHub でプルリクエストを作成します。

## コードスタイル

### TypeScript

- 厳格モードを使用する
- `any` 型は使用しない
- インターフェースと型で明確さを保つ
- 必要に応じて default export を使用する

### React コンポーネント

- 関数コンポーネントとフックを使用する
- 可能な限り純粋なコンポーネントにする
- TypeScript で props と state を定義する
- 必要に応じて PropTypes を使用（必須ではない）

### ファイル構成

- コンポーネント: `src/components/ComponentName.tsx`
- ページ: `src/app/PageName.tsx`
- フック: `src/hooks/useHookName.ts`
- ユーティリティ: `src/lib/utilityName.ts`
- テスト: `src/__tests__/ComponentName.test.tsx`

### 命名規則

- コンポーネント: キャメルケース (例: `TemplateCard`)
- 関数: キャメルケース (例: `getTemplateData`)
- 定数: スネークケース (例: `API_BASE_URL`)
- 型/インターフェース: キャメルケース (例: `TemplateProps`)
- ファイル: コンポーネントはキャメルケース (例: `TemplateCard.tsx`)

### インポート順序

1. 外部ライブラリ (React, ライブラリ)
2. 内部ライブラリのインポート
3. 内部コンポーネントのインポート
4. 相対インポート (現在のファイルに最も近いものから)

### コメント

- 複雑な関数には JSDoc を使用する
- 何をなぜするかをコメントする (WHY, not WHAT)
- 明確で記述的なコメントを使用する

## テストガイドライン

### テスト構造

```typescript
describe('ComponentName', () => {
  describe('when component renders', () => {
    it('should display correctly', () => {
      // テスト実装
    });
  });

  describe('when user interacts', () => {
    it('should update state correctly', () => {
      // テスト実装
    });
  });
});
```

### テストカバレッジ

- 新しいコードでは 100% のカバレッジを目指す
- エッジケースとエラーケースをテストする
- 意味のあるテスト記述を使用する
- ハッピーパスとエラーパスの両方をテストする

### テストの実行

```bash
# すべてのテストを実行
npm test

# テストを監視モードで実行
npm run test:watch

# カバレッジレポートでテストを実行
npm run test:coverage

# 特定のテストファイルを実行
npm test -- --testPathPattern=ComponentName

# 特定のテストを実行
npm test -- --testNamePattern="should render title"
```

## ドキュメント

### README.md

- できるだけ常に最新に保つ
- 新機能をドキュメント化する
- 設定手順を含める
- 使用例を追加する

### コードコメント

- 複雑な関数をドキュメント化する
- 直感的でないロジックを説明する
- 外部 API 統合をドキュメント化する

### 型定義

- 複雑な型には JSDoc を使用する
- パブリック API をドキュメント化する
- ジェネリックパラメータを説明する

## プルリクエストプロセス

### PR テンプレート

PR を作成する際、以下を含めます:
1. **タイトル**: 変更の明確な説明
2. **説明**:
   - 何の変更を行ったか
   - なぜその変更を行ったか
   - 変更をどのようにテストするか
   - 破壊的変更がある場合は記載
3. **スクリーンショット**: UI 変更の場合
4. **関連する Issue**: 関連する issue/PR へのリンク

### PR レビュー

1. 少なくとも 1 回のレビューを待つ
2. レビューのコメントに対して対応する
3. 再度品質チェックを実行する
4. 必要に応じて PR 説明を更新する

## 質問はありますか？

- 既存の issue を確認して、同様の質問がないか確認する
- 新しい issue を開いて特定の質問をする
- プロジェクトのディスカッションで質問する

## 参考リソース

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Testing Library Documentation](https://testing-library.com/docs/intro)

## 感謝の言葉

オープンソースへの貢献は、スキルを向上させ、コミュニティに貢献する素晴らしい方法です。
私たちの助けに感謝します！

---

**作成日**: 2026-06-17
**最終更新**: 2026-06-17
