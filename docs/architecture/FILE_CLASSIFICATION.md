# ファイル分類レポート

## 📋 必要なファイル（システム動作に必須）

### ソースコード
- `src/` - 全てのソースコード（必須）
- `prisma/` - データベーススキーマとマイグレーション（必須）

### 設定ファイル
- `package.json` - 依存関係とスクリプト定義（必須）
- `package-lock.json` - 依存関係のロックファイル（必須）
- `tsconfig.json` - TypeScript設定（必須）
- `next.config.js` - Next.js設定（必須）
- `next-env.d.ts` - Next.js型定義（必須）
- `vercel.json` - Vercelデプロイ設定（デプロイ時必須）
- `.gitignore` - Git除外設定（必須）
- `.dockerignore` - Docker除外設定（Docker使用時）
- `.vercelignore` - Vercel除外設定（Vercel使用時）
- `.npmrc` - npm設定（必須）
- `amplify.yml` - AWS Amplify設定（Amplify使用時）
- `app.yaml` - GCP App Engine設定（GCP使用時）

### 環境変数
- `.env` - 環境変数（本番環境では別途設定、ローカル開発用）
- `env.vercel.template` - Vercel環境変数テンプレート（参考用）
- `vercel.env` - Vercel環境変数（Vercel使用時）

### 主要ドキュメント
- `README.md` - プロジェクト概要（必須）
- `REQUIREMENTS_DOCUMENT.md` - 要件定義書（重要）
- `DEPLOYMENT.md` - デプロイ手順（重要）
- `DATABASE_SETUP.md` - データベースセットアップ（重要）
- `CHANGELOG_RECENT.md` - 最近の変更履歴（推奨）

### スクリプト
- `execute_migration.sh` - マイグレーション実行スクリプト（使用時）
- `extract_prompts.js` - プロンプト抽出スクリプト（使用時）

---

## 🗑️ 不要なファイル（削除推奨）

### 重複ドキュメント（* 2.md, * 3.md など）
以下のファイルは重複または古いバージョンです：
- `API_DATA_FLOW_VERIFICATION 2.md` → `API_DATA_FLOW_VERIFICATION.md`を保持
- `API_INTEGRATION_DOCUMENTATION 2.md` → `API_INTEGRATION_DOCUMENTATION.md`を保持
- `CLAUDE_DATA_PROCESSING_ISSUE 2.md` → `CLAUDE_DATA_PROCESSING_ISSUE.md`を保持
- `CLAUDE_STRATEGY_ANALYSIS_IMPROVEMENT_SIGNIFICANCE 2.md` → 元ファイルを保持
- `CLOUDFLARE_VS_VERCEL_COMPARISON 2.md` → 元ファイルを保持
- `CONTENT_GENERATION_EXPANSION_ROADMAP 2.md` → 元ファイルを保持
- `DATA_FLOW_DIAGRAM 2.md` → 元ファイルを保持
- `MARKET_RESEARCH_ALL_TYPES_VERIFICATION 2.md` → 元ファイルを保持
- `MARKET_RESEARCH_JSON_VERIFICATION 2.md` → 元ファイルを保持
- `PRICE_RESEARCH_MULTIPLE_PRODUCTS_FIX 2.md` → 元ファイルを保持
- `PRICE_RESEARCH_PROMPT 2.md` → 元ファイルを保持
- `PRISMA_VERCEL_FIX 2.md` → 元ファイルを保持
- `SNS_RESEARCH_DATA_FLOW_VERIFICATION 2.md` → 元ファイルを保持
- `SNS_RESEARCH_JSON_OUTPUT_ISSUE 2.md` → 元ファイルを保持
- `STRATEGY_API_DATA_PROCESSING_VERIFICATION 2.md` → 元ファイルを保持
- `STRATEGY_API_JSON_VERIFICATION 2.md` → 元ファイルを保持
- `STRATEGY_DATA_FLOW 2.md` → 元ファイルを保持
- `STRATEGY_WEB_SEARCH_IMPLEMENTATION 2.md` → 元ファイルを保持
- `TIKTOK_ANALYSIS_IMPLEMENTATION 2.md` → 元ファイルを保持
- `TIKTOK_ERROR_ANALYSIS 2.md` → 元ファイルを保持
- `TIKTOK_ERROR_RESOLUTION 2.md` → 元ファイルを保持
- `TIKTOK_ERROR_STATUS 2.md` → 元ファイルを保持
- `VERCEL_BUILD_STATUS 2.md` → 元ファイルを保持

### 一時的なドキュメント（完了済み・古い情報）
- `ACTION_COMPLETED.md` - 完了済みアクション（アーカイブ可能）
- `IMPLEMENTATION_COMPLETE.md` - 実装完了（アーカイブ可能）
- `IMPLEMENTATION_COMPLETE_SUMMARY.md` - 実装完了サマリー（アーカイブ可能）
- `IMPLEMENTATION_NEXT_STEPS.md` - 次のステップ（完了済みなら不要）
- `IMPLEMENTATION_PHASE1_COMPLETE.md` - フェーズ1完了（アーカイブ可能）
- `IMPLEMENTATION_PHASE1_SUMMARY.md` - フェーズ1サマリー（アーカイブ可能）
- `IMPLEMENTATION_STATUS.md` - 実装ステータス（古い情報なら不要）
- `MIGRATION_COMPLETED.md` - マイグレーション完了（アーカイブ可能）
- `MIGRATION_MANUAL_STEPS.md` - 手動マイグレーション手順（完了済みなら不要）

### 検証・デバッグ用ドキュメント（一時的）
- `API_DATA_FLOW_VERIFICATION.md` - 検証完了なら不要
- `API_INTEGRATION_DOCUMENTATION.md` - 統合完了なら不要
- `CLAUDE_DATA_PROCESSING_ISSUE.md` - 問題解決済みなら不要
- `MARKET_RESEARCH_ALL_TYPES_VERIFICATION.md` - 検証完了なら不要
- `MARKET_RESEARCH_JSON_VERIFICATION.md` - 検証完了なら不要
- `SNS_RESEARCH_DATA_FLOW_VERIFICATION.md` - 検証完了なら不要
- `SNS_RESEARCH_JSON_OUTPUT_ISSUE.md` - 問題解決済みなら不要
- `STRATEGY_API_DATA_PROCESSING_VERIFICATION.md` - 検証完了なら不要
- `STRATEGY_API_JSON_VERIFICATION.md` - 検証完了なら不要
- `TIKTOK_ERROR_ANALYSIS.md` - 問題解決済みなら不要
- `TIKTOK_ERROR_RESOLUTION.md` - 問題解決済みなら不要
- `TIKTOK_ERROR_STATUS.md` - 問題解決済みなら不要
- `VERCEL_BUILD_STATUS.md` - ビルド問題解決済みなら不要

### テストファイル（ルートディレクトリ）
- `test-claude-opus.ts` - テストファイル（テストディレクトリに移動推奨）
- `test-claude-sonnet45.ts` - テストファイル（テストディレクトリに移動推奨）
- `test_ai_info_debug.tsx` - デバッグファイル（削除または移動推奨）

### 一時ファイル・キャッシュ
- `.DS_Store` - macOSシステムファイル（削除推奨、.gitignoreに追加）
- `tsconfig.tsbuildinfo` - TypeScriptビルド情報（自動生成、.gitignoreに追加推奨）
- `.next/` - Next.jsビルド成果物（自動生成、.gitignoreに追加推奨）
- `node_modules/` - 依存関係（自動生成、.gitignoreに追加推奨）
- `.next/cache 2/` - 古いキャッシュ（削除推奨）

### その他の一時ファイル
- `contents.md` - 一時的な内容ファイル（用途不明、確認後削除可能）
- `prompt.txt` - 一時的なプロンプトファイル（用途不明、確認後削除可能）

---

## 📚 参考ドキュメント（保持推奨、ただし整理可能）

### 実装ドキュメント
- `DETAILED_DESIGN_DOCUMENT.md` - 詳細設計書（重要、保持推奨）
- `INTEGRATION_ANALYSIS.md` - 統合分析（参考用）
- `ATLASSIAN_IMPLEMENTATION_STATUS.md` - Atlassian実装状況（参考用）

### API・機能ドキュメント
- `CHATGPT_STRATEGY_PROMPTS.md` - ChatGPT戦略プロンプト（参考用）
- `DALL_E3_PROMPT_DOCUMENTATION.md` - DALL-E 3プロンプト（参考用）
- `DALL_E3_PROMPT_EXAMPLES.md` - DALL-E 3例（参考用）
- `PIKA_LABS_API_CHECK.md` - Pika Labs API確認（参考用）
- `PIKA_LABS_FAL_AI_IMPLEMENTATION.md` - Pika Labs実装（参考用）
- `VIDEO_API_DOCUMENTATION.md` - 動画API（参考用）
- `VIDEO_API_IMPLEMENTATION.md` - 動画実装（参考用）

### デプロイ関連ドキュメント
- `VERCEL_COMPLETE_GUIDE.md` - Vercel完全ガイド（参考用）
- `VERCEL_DEPLOYMENT.md` - Vercelデプロイ（参考用）
- `VERCEL_ENV_REQUIRED.md` - Vercel環境変数（参考用）
- `VERCEL_ENV_SETUP.md` - Vercel環境設定（参考用）
- `VERCEL_QUICKSTART.md` - Vercelクイックスタート（参考用）
- `VERCEL_VS_GCP.md` - Vercel vs GCP（参考用）
- `VERCEL_BUILD_FIX.md` - Vercelビルド修正（参考用）
- `GCP_DEPLOYMENT_ISSUES.md` - GCPデプロイ問題（参考用）
- `PRISMA_VERCEL_FIX.md` - Prisma Vercel修正（参考用）

### データフロー・分析ドキュメント
- `DATA_FLOW_DIAGRAM.md` - データフロー図（参考用）
- `STRATEGY_DATA_FLOW.md` - 戦略データフロー（参考用）
- `STRATEGY_WEB_SEARCH_IMPLEMENTATION.md` - 戦略Web検索実装（参考用）
- `TIKTOK_ANALYSIS_IMPLEMENTATION.md` - TikTok分析実装（参考用）

### 問題解決ドキュメント
- `PRICE_RESEARCH_MULTIPLE_PRODUCTS_FIX.md` - 価格調査修正（参考用）
- `PRICE_RESEARCH_PROMPT.md` - 価格調査プロンプト（参考用）

---

## 🎯 推奨アクション

### 即座に削除可能
1. 全ての `* 2.md` ファイル（重複）
2. `.DS_Store` ファイル
3. `.next/cache 2/` ディレクトリ
4. `tsconfig.tsbuildinfo`（.gitignoreに追加）

### アーカイブ推奨（docs/archive/ に移動）
1. 完了済みの実装ドキュメント
2. 解決済みの問題ドキュメント
3. 検証完了のドキュメント

### 整理推奨（docs/ ディレクトリに整理）
1. 参考ドキュメントをカテゴリ別に整理
2. テストファイルを `tests/` ディレクトリに移動

### .gitignoreに追加推奨
```
.DS_Store
tsconfig.tsbuildinfo
.next/
node_modules/
*.log
*.tmp
*.cache
```

---

## 📊 統計

- **総Markdownファイル数**: 約60+ファイル
- **重複ファイル数**: 約20ファイル
- **不要ファイル数**: 約30-40ファイル（重複・完了済み・一時的）
- **必要ファイル数**: 約20-30ファイル（ソースコード、設定、主要ドキュメント）

---

## ⚠️ 注意事項

削除前に以下を確認してください：
1. 重要な情報が他のファイルに含まれているか
2. チームメンバーが参照している可能性
3. バックアップの作成

