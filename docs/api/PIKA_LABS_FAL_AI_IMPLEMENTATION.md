# Pika Labs API実装更新（fal-ai経由）

## 更新日
2025年11月22日

## 変更内容

### 1. APIアクセス方法の変更
- **旧**: 直接 `https://api.pika.art/v1/videos/generate` にアクセス
- **新**: `fal-ai`経由で `fal-ai/pika/v2.2/text-to-video` モデルにアクセス

### 2. パッケージ追加
```bash
npm install --save @fal-ai/client
```

### 3. 環境変数
- **FAL_KEY**: fal-aiのAPIキー（優先）
- **PIKA_LABS_API_KEY**: 後方互換性のため維持（FAL_KEYとしても設定される）

### 4. 実装ファイル

#### `src/server/services/video-generation.ts`
- `@fal-ai/client`をインポート
- `fal.subscribe()`を使用してPika 2.2モデルにアクセス
- モデルID: `fal-ai/pika/v2.2/text-to-video`
- リトライロジック: 最大3回（指数バックオフ）
- エラーハンドリング: 完全実装

#### パラメータマッピング
- `prompt`: テキストプロンプト（医療広告ガイドライン準拠）
- `aspect_ratio`: "16:9" | "9:16" | "1:1" | "4:5" | "5:4" | "3:2" | "2:3"
- `resolution`: "720p" | "1080p"
- `duration`: 5 | 10 (秒) - 15秒は10秒に変換
- `negative_prompt`: デフォルト "ugly, bad, terrible
- `seed`: オプション

#### レスポンス形式
```typescript
{
  data: {
    video: {
      url: string,
      file_name: string,
      content_type: string,
      file_size: number
    }
  },
  requestId: string
}
```

### 5. APIキー管理
#### `src/server/api/routers/api-key.ts`
- `PIKA_LABS_API_KEY`を設定すると、`FAL_KEY`も自動設定
- 後方互換性を維持

#### `src/features/api-key/api-key-management.tsx`
- UIに「fal-ai経由」の説明を追加
- 取得方法リンクを `https://fal.ai/` に変更

### 6. ヘルスチェック
#### `src/server/services/ai-health-check.ts`
- `FAL_KEY`または`PIKA_LABS_API_KEY`をチェック
- fal-aiエンドポイント (`https://fal.run`) を確認

### 7. コンテンツ生成API
#### `src/server/api/routers/content.ts`
- `resolution`パラメータを追加（720p/1080p）
- `aspectRatio`オプションを拡張（4:5, 5:4, 3:2, 2:3を追加）
- `aiAgent`を"pika"に設定

## 動作確認手順

### 1. パッケージインストール確認
```bash
npm list @fal-ai/client
```

### 2. 環境変数設定
```bash
# .envファイルに追加
FAL_KEY=your_fal_ai_api_key_here
# または
PIKA_LABS_API_KEY=your_fal_ai_api_key_here
```

### 3. APIキー管理画面で設定
- `/api-key`にアクセス
- "Pika Labs API Key (fal-ai)"にfal-aiのAPIキーを入力
- 保存後、サーバーを再起動

### 4. 動画生成テスト
- `/content-generation`にアクセス
- コンテンツカテゴリ: "動画"
- コンテンツタイプ: "Instagram Reels", "TikTok", "YouTube Shorts"のいずれか
- パラメータを設定して生成

### 5. AIエージェント状態確認
- `/workflow`にアクセス
- "PIKA"のステータスを確認

## 重要な注意事項

### 1. 動画の長さ
- Pika 2.2は5秒または10秒のみサポート
- 15秒を指定した場合、自動的に10秒に変換

### 2. アスペクト比
- サポート: 16:9, 9:16, 1:1, 4:5, 5:4, 3:2, 2:3
- デフォルト: 9:16

### 3. 解像度
- サポート: 720p, 1080p
- デフォルト: 720p

### 4. 非同期処理
- `fal.subscribe()`は非同期で動画を生成
- `onQueueUpdate`コールバックで進行状況を確認
- ログが出力される

### 5. エラーハンドリング
- リトライ: 最大3回
- 指数バックオフ: 1秒、2秒、4秒...最大10秒
- 詳細なエラーメッセージをログに出力

## 参考リンク
- [fal-ai公式サイト](https://fal.ai/)
- [Pika 2.2モデル](https://fal.ai/models/fal-ai/pika/v2.2)
- [@fal-ai/client ドキュメント](https://github.com/fal-ai/fal-client)
