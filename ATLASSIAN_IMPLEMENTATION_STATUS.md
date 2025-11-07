# Atlassian Design System 導入状況レポート

## 📊 現在の実装状況

### ✅ 完了した作業

1. **パッケージインストール**
   - ✅ @atlaskit/button
   - ✅ @atlaskit/textfield
   - ✅ @atlaskit/banner
   - ✅ @atlaskit/badge
   - ✅ @atlaskit/form
   - ✅ @atlaskit/table
   - ✅ @atlaskit/modal-dialog
   - ✅ @atlaskit/spinner
   - ✅ @atlaskit/empty-state
   - ✅ @atlaskit/tag
   - ✅ @atlaskit/tabs
   - ✅ @atlaskit/breadcrumbs
   - ✅ @atlaskit/link
   - ✅ @atlaskit/app-provider

2. **セットアップ**
   - ✅ AtlassianProviderコンポーネント作成
   - ✅ layout.tsxでApp Provider設定
   - ✅ ビルド成功確認

3. **コンポーネント置き換え完了**
   - ✅ **api-key-management.tsx** - 完全にAtlassian Design Systemに移行
     - Button, TextField, Banner, Badge を使用
     - インラインスタイルでAtlassianデザイントークンを使用

### 🔄 置き換えが必要なコンポーネント

#### 1. **product-management.tsx** (商品管理)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムテーブル実装
- カスタムフォーム実装

**置き換え推奨コンポーネント:**
- `@atlaskit/table` - テーブル表示
- `@atlaskit/form` - フォーム管理
- `@atlaskit/textfield` - 入力フィールド
- `@atlaskit/button` - ボタン
- `@atlaskit/banner` - フィードバックメッセージ
- `@atlaskit/checkbox` - チェックボックス

**優先度:** ⭐⭐⭐ (高)

#### 2. **market-research.tsx** (市場調査)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムフォーム実装
- カスタム入力フィールド

**置き換え推奨コンポーネント:**
- `@atlaskit/form` - フォーム管理
- `@atlaskit/textfield` - テキスト入力
- `@atlaskit/select` - セレクトボックス
- `@atlaskit/button` - ボタン
- `@atlaskit/banner` - フィードバックメッセージ
- `@atlaskit/tag` - タグ表示（施術名、都市名など）

**優先度:** ⭐⭐⭐ (高)

#### 3. **content-generation.tsx** (コンテンツ生成)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムモーダル実装
- 複雑なフォーム構造

**置き換え推奨コンポーネント:**
- `@atlaskit/modal-dialog` - モーダルダイアログ
- `@atlaskit/form` - フォーム管理
- `@atlaskit/textfield` - テキスト入力
- `@atlaskit/textarea` - テキストエリア
- `@atlaskit/select` - セレクトボックス
- `@atlaskit/button` - ボタン
- `@atlaskit/tabs` - タブ表示（コンテンツタイプ選択）

**優先度:** ⭐⭐ (中)

#### 4. **prompt-management.tsx** (プロンプト管理)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムフォーム実装

**置き換え推奨コンポーネント:**
- `@atlaskit/form` - フォーム管理
- `@atlaskit/textarea` - プロンプト編集
- `@atlaskit/button` - ボタン
- `@atlaskit/tabs` - AIエージェント別タブ
- `@atlaskit/banner` - フィードバックメッセージ

**優先度:** ⭐⭐ (中)

#### 5. **sns-research.tsx** (SNS調査)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムフォーム実装

**置き換え推奨コンポーネント:**
- `@atlaskit/form` - フォーム管理
- `@atlaskit/textfield` - キーワード入力
- `@atlaskit/select` - プラットフォーム選択
- `@atlaskit/button` - ボタン
- `@atlaskit/banner` - フィードバックメッセージ

**優先度:** ⭐⭐ (中)

#### 6. **strategy-management.tsx** (戦略管理)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムテーブル実装

**置き換え推奨コンポーネント:**
- `@atlaskit/table` - テーブル表示
- `@atlaskit/button` - ボタン
- `@atlaskit/banner` - フィードバックメッセージ

**優先度:** ⭐ (低)

#### 7. **strategy-analysis.tsx** (戦略分析)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムフォーム実装

**置き換え推奨コンポーネント:**
- `@atlaskit/form` - フォーム管理
- `@atlaskit/button` - ボタン
- `@atlaskit/banner` - フィードバックメッセージ

**優先度:** ⭐ (低)

#### 8. **workflow-management.tsx** (ワークフロー管理)
**現在の状態:**
- Tailwind CSSクラスを使用
- カスタムテーブル実装

**置き換え推奨コンポーネント:**
- `@atlaskit/table` - テーブル表示
- `@atlaskit/button` - ボタン
- `@atlaskit/spinner` - ローディング表示
- `@atlaskit/banner` - フィードバックメッセージ

**優先度:** ⭐ (低)

## 📝 実装パターン

### 現在のapi-key-management.tsxの実装パターン

1. **インラインスタイルの使用**
   - Atlassianデザイントークンの色を使用（#172B4D, #6B778C, #DFE1E6など）
   - レイアウトはflexbox/gridを使用

2. **コンポーネントの使用**
   - Button: `appearance="primary"`, `appearance="subtle"`
   - TextField: 標準のテキスト入力
   - Banner: `appearance="announcement"`, `appearance="error"`, `appearance="warning"`
   - Badge: `appearance="added"`, `appearance="removed"`

3. **状態管理**
   - React hooksを使用
   - tRPCのmutation/queryを使用

## 🎯 推奨される置き換え順序

1. **Phase 1: フォーム中心のコンポーネント**
   - product-management.tsx
   - market-research.tsx

2. **Phase 2: 複雑なUIコンポーネント**
   - content-generation.tsx
   - prompt-management.tsx

3. **Phase 3: シンプルなコンポーネント**
   - sns-research.tsx
   - strategy-management.tsx
   - strategy-analysis.tsx
   - workflow-management.tsx

## ⚠️ 注意事項

1. **スタイリング**
   - 現在はインラインスタイルを使用しているが、Atlassian Design Systemのデザイントークンを使用することを推奨
   - 将来的には`@atlaskit/theme`を使用してテーマを統一

2. **アクセシビリティ**
   - Atlassian Design Systemのコンポーネントはアクセシビリティに配慮されているため、そのまま使用可能

3. **パフォーマンス**
   - コンポーネントの置き換えは段階的に行い、各段階でテストを実施

4. **一貫性**
   - すべてのコンポーネントで同じパターンを使用することを推奨

