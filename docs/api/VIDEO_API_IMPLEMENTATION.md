# 動画API統合実装完了報告

## 更新日
2025年11月22日

## 実装完了内容

### ✅ Pika Labs API統合
- **ファイル**: `src/server/services/video-generation.ts`
- **関数**: `generateShortVideoWithPika()`
- **実装内容**:
  - REST API呼び出し実装
  - リトライロジック（最大3回、指数バックオフ）
  - エラーハンドリング強化
  - 医療広告ガイドライン準拠のプロンプトサニタイズ
  - アスペクト比・動画スタイルのマッピング
  - BGM・テキストオーバーレイ対応

### ✅ Synthesia API統合
- **ファイル**: `src/server/services/video-generation.ts`
- **関数**: `generateExplanationVideoWithSynthesia()`
- **実装内容**:
  - Synthesia API v2対応
  - リトライロジック（最大3回、指数バックオフ）
  - エラーハンドリング強化
  - 多言語対応（日本語、英語、中国語、韓国語）
  - AIアバター選択
  - 背景選択（クリニック/シンプル）
  - 医療広告ガイドライン準拠のスクリプトサニタイズ

### ✅ ポーリング機能追加
- **関数**: `pollSynthesiaVideoStatus()`
- **機能**:
  - Synthesia動画生成の非同期処理対応
  - 最大30回のポーリング（10秒間隔）
  - ステータス監視（processing → complete/ready）
  - タイムアウト処理

## 環境変数

### 必須環境変数
```env
# Pika Labs API（短尺動画生成）
PIKA_LABS_API_KEY=your_pika_api_key_here

# Synthesia API（説明動画生成）
SYNTHESIA_API_KEY=your_synthesia_api_key_here
```

### オプション環境変数
```env
# Pika Labs API URL（カスタムエンドポイント）
PIKA_LABS_API_URL=https://api.pika.art/v1

# Synthesia API URL（カスタムエンドポイント）
SYNTHESIA_API_URL=https://api.synthesia.io

# SynthesiaデフォルトアバターID
SYNTHESIA_DEFAULT_AVATAR_ID=anna_costume1_cameraA_presenting
```

## APIエンドポイント

### Pika Labs API
- **ベースURL**: `https://api.pika.art/v1` (環境変数で変更可能)
- **エンドポイント**: `/videos/generate`
- **メソッド**: POST
- **認証**: Bearer token
- **リクエスト例**:
```json
{
  "prompt": "美容クリニックのキャンペーン動画",
  "duration": 10,
  "aspect_ratio": "9:16",
  "style": "realistic",
  "bgm": true,
  "text_overlay": ["キャンペーン実施中"]
}
```

### Synthesia API
- **ベースURL**: `https://api.synthesia.io` (環境変数で変更可能)
- **エンドポイント**: `/v2/videos`
- **メソッド**: POST
- **認証**: Bearer token
- **リクエスト例**:
```json
{
  "title": "施術説明動画",
  "description": "施術説明動画: ボトックス",
  "visibility": "public",
  "scenes": [{
    "type": "avatar",
    "avatar": "anna_costume1_cameraA_presenting",
    "voice": {
      "provider": "microsoft",
      "voiceId": "ja-JP-NanamiNeural"
    },
    "script": {
      "type": "text",
      "input": "ボトックス施術について説明します..."
    },
    "background": "clinic_interior"
  }]
}
```

## 実装の特徴

### 1. エラーハンドリング
- リトライロジック（最大3回）
- 指数バックオフ（1秒、2秒、4秒...最大10秒）
- 詳細なエラーメッセージ
- HTTPステータスコードに基づくエラー分類

### 2. 医療広告ガイドライン準拠
- プロンプト/スクリプトの自動サニタイズ
- 既存の`advertising-guidelines.ts`を活用
- 禁止表現の自動除去

### 3. 非同期処理対応
- Synthesia動画生成のポーリング機能
- ステータス監視
- タイムアウト処理

### 4. 柔軟な設定
- 環境変数によるカスタマイズ
- デフォルト値の設定
- API URLの変更可能

## 注意事項

### ⚠️ 実際のAPI仕様確認が必要
1. **Pika Labs API**
   - 実際のエンドポイントURLを確認
   - リクエスト/レスポンス形式を確認
   - 認証方法を確認
   - レート制限を確認

2. **Synthesia API**
   - 公式ドキュメント: https://docs.synthesia.io/
   - アバター一覧取得方法を確認
   - 動画生成時間を確認
   - Webhook対応の有無を確認

### 📋 次の実装ステップ
1. **APIキー取得とテスト**
   - Pika Labs/Synthesiaアカウント作成
   - APIキー取得
   - 実際のAPI呼び出しテスト

2. **非同期処理の改善**
   - Webhook対応（可能な場合）
   - ジョブキュー実装
   - 進捗表示UI

3. **ファイルストレージ統合**
   - AWS S3 or Cloudflare R2
   - 動画ファイルの保存
   - CDN配信

4. **エラーハンドリング強化**
   - より詳細なエラーメッセージ
   - ユーザーフレンドリーなエラー表示
   - ログ記録

## 実装統計
- **ファイル**: `src/server/services/video-generation.ts`
- **行数**: 408行（基盤実装156行 → 408行に拡張）
- **追加機能**: 
  - リトライロジック
  - ポーリング機能
  - エラーハンドリング強化
  - 環境変数対応
