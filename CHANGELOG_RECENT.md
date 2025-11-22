# 最近の変更履歴

## 2025年11月22日 - 動画生成機能とUI改善

### 1. 動画生成機能の実装

#### Pika Labs API統合（fal-ai経由）
- **パッケージ**: `@fal-ai/client@1.7.2` を追加
- **アクセス方法**: fal-ai経由で `fal-ai/pika/v2.2/text-to-video` モデルにアクセス
- **環境変数**: `FAL_KEY` (優先) または `PIKA_LABS_API_KEY` (後方互換)
- **対応コンテンツ**: Instagram Reels, TikTok, YouTube Shorts
- **パラメータ**:
  - `aspect_ratio`: 16:9, 9:16, 1:1, 4:5, 5:4, 3:2, 2:3
  - `resolution`: 720p, 1080p
  - `duration`: 5, 10秒 (15秒は10秒に自動変換)
  - `negative_prompt`, `seed` (オプション)
- **機能**: リトライロジック（最大3回、指数バックオフ）、エラーハンドリング、医療広告ガイドライン準拠

#### Synthesia API統合
- **対応コンテンツ**: 施術説明動画、事前ケア動画、アフターケア動画、FAQ動画
- **環境変数**: `SYNTHESIA_API_KEY`
- **機能**: ポーリング機能、リトライロジック、エラーハンドリング

### 2. コンテンツ生成UIの改善

#### 使用AI表示の動的更新
- `useMemo`を使用してコンテンツタイプ変更時に再計算
- 動画コンテンツ選択時: PIKA (Pika Labs) または SYNTHESIA を表示
- 画像コンテンツ選択時: DALL-E 3 を表示
- テキストコンテンツ選択時: CHATGPT (gpt-5.1) を表示
- APIキー設定状態に応じて「未設定」を表示（赤背景）

#### コンテンツ履歴表示の改善
- **動画コンテンツ**: `<video>`タグで表示、コントロール付き
- **画像コンテンツ**: `<img>`タグで表示
- **ダウンロードボタン**: 動画は「動画をダウンロード」、画像は「画像をダウンロード」
- **mimeType判定**: `video/mp4` と `image/*` を適切に判定
- **フォールバック**: 画像読み込み失敗時にテキスト表示にフォールバック
- **ファイル拡張子**: mimeTypeに基づいて自動判定

### 3. APIキー管理の拡張

#### 新規APIキー対応
- **Pika Labs API Key (fal-ai)**: fal-ai経由でPika 2.2モデルにアクセス
- **Synthesia API Key**: 施術説明動画生成用
- UIに「fal-ai経由」の説明を追加
- 取得方法リンクを更新

### 4. AIエージェント状態表示の拡張

#### ワークフロー管理画面
- **PIKA**: Pika Labs APIの状態を表示
- **SYNTHESIA**: Synthesia APIの状態を表示
- ヘルスチェック機能を拡張
- APIキー設定状態に応じて正常/異常を表示

### 5. データベーススキーマ拡張

#### GeneratedContentモデル
- `fileUrl`: 画像・動画の外部ストレージURL
- `fileSize`: ファイルサイズ（bytes）
- `mimeType`: MIME type (image/png, video/mp4等)
- `complianceStatus`: コンプライアンスステータス
- `complianceReport`: コンプライアンスチェック結果（JSON）
- `templateId`: 使用したテンプレートID
- `variations`: バリエーション情報（JSON）

#### AiAgent enum拡張
- `pika`: Pika Labs (fal-ai経由)
- `synthesia`: Synthesia

### 6. 実装ファイル

#### 新規ファイル
- `src/server/services/video-generation.ts`: 動画生成サービス
  - `generateShortVideoWithPika()`: Pika Labs API統合
  - `generateExplanationVideoWithSynthesia()`: Synthesia API統合
  - `pollSynthesiaVideoStatus()`: Synthesia動画ステータスポーリング

#### 変更ファイル
- `src/server/api/routers/content.ts`: 動画生成APIエンドポイント追加
- `src/server/api/routers/api-key.ts`: Pika Labs/Synthesia APIキー管理
- `src/server/services/ai-health-check.ts`: Pika Labs/Synthesiaヘルスチェック
- `src/features/content/content-generation.tsx`: UI改善、使用AI表示、履歴表示
- `src/features/api-key/api-key-management.tsx`: APIキー管理UI拡張
- `prisma/schema.prisma`: スキーマ拡張

### 7. 環境変数

#### 新規環境変数
```env
# 動画生成API
FAL_KEY=your_fal_ai_api_key_here          # fal-ai APIキー（優先）
PIKA_LABS_API_KEY=your_fal_ai_api_key      # 後方互換（FAL_KEYとしても設定）
SYNTHESIA_API_KEY=your_synthesia_api_key   # Synthesia APIキー

# オプション
PIKA_LABS_API_URL=https://api.pika.art/v1  # デフォルト: https://fal.run
SYNTHESIA_API_URL=https://api.synthesia.io # デフォルト: https://api.synthesia.io
```

### 8. 動作確認手順

1. **APIキー設定**
   - `/api-key`にアクセス
   - Pika Labs API Key (fal-ai) と Synthesia API Key を設定
   - サーバーを再起動

2. **動画生成テスト**
   - `/content-generation`にアクセス
   - コンテンツカテゴリーで「動画コンテンツ」を選択
   - コンテンツタイプで「Instagram Reels」などを選択
   - 使用AIが「PIKA (Pika Labs)」と表示されることを確認
   - 動画生成を実行

3. **AIエージェント状態確認**
   - `/workflow`にアクセス
   - PIKA, SYNTHESIAのステータスを確認

4. **コンテンツ履歴確認**
   - 生成した動画が`<video>`タグで表示されることを確認
   - 「動画をダウンロード」ボタンが表示されることを確認
