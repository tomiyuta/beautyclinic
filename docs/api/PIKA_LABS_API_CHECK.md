# Pika Labs API動作確認レポート

## 更新日
2025年11月22日

## 動作確認結果

### ✅ 実装状況
- **実装ファイル**: `src/server/services/video-generation.ts`
- **関数**: `generateShortVideoWithPika()`
- **実装内容**: 完全実装済み

### ⚠️ API動作確認
- **エンドポイント**: `https://api.pika.art/v1/videos/generate`
- **テスト結果**: HTTP 403 (アクセス拒否)
- **APIキー**: 設定済み

### 考えられる原因
1. **エンドポイントURLが正しくない**
   - 実装: `https://api.pika.art/v1/videos/generate`
   - 可能性: `https://api.pika.art/v1/generate` または別のパス
   
2. **認証方法が異なる**
   - 実装: `Bearer {apiKey}`
   - 可能性: 別の認証形式が必要

3. **APIキーの形式が異なる**
   - APIキーが正しい形式か確認が必要

4. **レート制限やアクセス権限**
   - APIキーに適切な権限があるか確認

## 実装されている機能

### 1. リトライロジック
- 最大3回のリトライ
- 指数バックオフ（1秒、2秒、4秒...最大10秒）

### 2. エラーハンドリング
- HTTPステータスコードに基づくエラー分類
- 詳細なエラーメッセージ
- ログ出力

### 3. パラメータマッピング
- アスペクト比: `9:16`, `16:9`, `1:1`
- 動画スタイル: `realistic`, `animated`, `slideshow`
- 動画の長さ: `5`, `10`, `15`秒
- BGM有効/無効
- テキストオーバーレイ

### 4. 医療広告ガイドライン準拠
- プロンプトの自動サニタイズ
- 禁止表現の除去

## 実装コード

```typescript
// src/server/services/video-generation.ts (55-168行目)
export async function generateShortVideoWithPika(
  options: ShortVideoGenerationOptions,
  contentText?: string
): Promise<GeneratedVideo> {
  const apiKey = process.env.PIKA_LABS_API_KEY;
  const apiBaseUrl = process.env.PIKA_LABS_API_URL || "https://api.pika.art/v1";
  const endpoint = `${apiBaseUrl}/videos/generate`;
  
  const requestBody = {
    prompt: sanitizedPrompt,
    duration: options.duration,
    aspect_ratio: pikaAspectRatio,
    style: pikaStyle,
    ...(options.bgmEnabled && { bgm: true }),
    ...(options.textOverlay && { text_overlay: options.textOverlay }),
  };
  
  // リトライロジック付きでAPI呼び出し
  // ...
}
```

## 次のステップ

### 1. 公式ドキュメント確認
- [Pika Labs公式サイト](https://pika.art/)
- [APIドキュメント](https://pikalabs.org/api/) (要確認)
- 正しいエンドポイントURLを確認

### 2. APIキー確認
- APIキーの形式が正しいか
- 適切な権限があるか
- レート制限の確認

### 3. サンプルリクエストテスト
```bash
curl -X POST https://api.pika.art/v1/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test video",
    "duration": 5,
    "aspect_ratio": "9:16"
  }'
```

### 4. 実装の修正
正しいエンドポイントが判明したら、`src/server/services/video-generation.ts`の以下を修正:
- `apiBaseUrl`のデフォルト値
- エンドポイントパス
- リクエストパラメータの形式
- レスポンスのパース方法

## 現在の実装の強み

✅ **完全なエラーハンドリング**
- リトライロジック
- 詳細なエラーメッセージ
- ログ出力

✅ **柔軟な設定**
- 環境変数によるカスタマイズ
- デフォルト値の設定

✅ **医療広告ガイドライン準拠**
- プロンプトの自動サニタイズ

⚠️ **要確認項目**
- 実際のAPIエンドポイントURL
- リクエスト/レスポンス形式
- 認証方法
