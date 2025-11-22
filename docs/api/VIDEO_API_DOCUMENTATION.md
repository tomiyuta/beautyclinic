# 動画コンテンツ生成API仕様

## 更新日
2025年11月22日

## 概要

動画コンテンツ生成には、**2つの異なるAPI**を使用します：

1. **Pika Labs API** - 短尺動画生成（Instagram Reels, TikTok, YouTube Shorts）
2. **Synthesia API** - 施術説明動画生成（AIアバターを使用した説明動画）

---

## 1. Pika Labs API（短尺動画生成）

### 用途
- Instagram Reels
- TikTok動画
- YouTube Shorts

### 特徴
- テキストプロンプトから動画を生成
- 5-15秒の短尺動画
- リアル、アニメーション、スライドショーなどのスタイル対応
- アスペクト比指定可能（9:16, 16:9, 1:1）

### 環境変数
```env
PIKA_LABS_API_KEY=your_api_key_here
```

### 実装状況
- ✅ 基盤実装完了（`src/server/services/video-generation.ts`）
- ⚠️ **実際のAPI統合は要調査・実装**
- 現在はエラーを返す実装（API仕様確認が必要）

### 必要な調査項目
- [ ] APIエンドポイントURL
- [ ] 認証方法（Bearer token等）
- [ ] リクエストパラメータ
- [ ] レスポンス形式
- [ ] 動画生成時間
- [ ] コスト（料金体系）
- [ ] レート制限
- [ ] エラーハンドリング

### 参考情報
- Pika Labs公式サイト: https://pika.art/
- APIドキュメント: 要確認

---

## 2. Synthesia API（施術説明動画生成）

### 用途
- 施術説明動画
- 事前ケア動画
- アフターケア動画
- FAQ動画

### 特徴
- AIアバターを使用した説明動画
- テキストスクリプトから動画を生成
- 多言語対応（日本語、英語、中国語、韓国語）
- 60-180秒の説明動画
- アバター選択可能

### 環境変数
```env
SYNTHESIA_API_KEY=your_api_key_here
```

### 実装状況
- ✅ 基盤実装完了（`src/server/services/video-generation.ts`）
- ⚠️ **実際のAPI統合は要調査・実装**
- 現在はエラーを返す実装（API仕様確認が必要）

### 必要な調査項目
- [ ] APIエンドポイントURL
- [ ] 認証方法（Bearer token等）
- [ ] リクエストパラメータ
- [ ] レスポンス形式
- [ ] アバター一覧取得方法
- [ ] 動画生成時間
- [ ] コスト（料金体系）
- [ ] レート制限
- [ ] エラーハンドリング

### 参考情報
- Synthesia公式サイト: https://www.synthesia.io/
- APIドキュメント: https://docs.synthesia.io/ （要確認）

---

## 実装ファイル

### サービス層
- `src/server/services/video-generation.ts` (156行)
  - `generateShortVideoWithPika()` - Pika Labs API呼び出し
  - `generateExplanationVideoWithSynthesia()` - Synthesia API呼び出し
  - `generateVideo()` - プロバイダー自動選択

### API層
- `src/server/api/routers/content.ts`
  - `generateShortVideo` - 短尺動画生成エンドポイント
  - `generateExplanationVideo` - 説明動画生成エンドポイント

### フロントエンド
- `src/features/content/content-generation.tsx`
  - 動画生成UI（入力フォーム、プレビュー）
  - 短尺動画・説明動画の入力項目

---

## 現在の実装状態

### ✅ 完了している項目
1. データベーススキーマ拡張
   - `ContentType` enumに動画タイプを追加
   - `fileUrl`, `fileSize`, `mimeType` フィールド追加

2. APIエンドポイント実装
   - 入力バリデーション（Zod）
   - エラーハンドリング
   - データベース保存

3. フロントエンドUI実装
   - 動画カテゴリー選択
   - 入力フォーム（長さ、アスペクト比、BGM等）
   - プレビュー表示

4. サービス層の基盤実装
   - インターフェース定義
   - プロンプトサニタイズ（医療広告ガイドライン準拠）
   - エラーハンドリング

### ⚠️ 要実装項目
1. **Pika Labs API統合**
   - 実際のAPIエンドポイント呼び出し
   - リクエスト/レスポンス処理
   - 動画URL取得と保存

2. **Synthesia API統合**
   - 実際のAPIエンドポイント呼び出し
   - リクエスト/レスポンス処理
   - アバター一覧取得
   - 動画URL取得と保存

3. **非同期処理**
   - 動画生成は時間がかかるため、非同期処理が必要
   - 進捗表示
   - ポーリングまたはWebhook対応

4. **ファイルストレージ**
   - 動画ファイルの保存先（AWS S3, Cloudflare R2等）
   - CDN配信

---

## 次の実装ステップ

### 1. API調査フェーズ
```bash
# Pika Labs API調査
- APIドキュメント確認
- エンドポイントURL確認
- 認証方法確認
- サンプルリクエスト/レスポンス確認

# Synthesia API調査
- APIドキュメント確認
- エンドポイントURL確認
- 認証方法確認
- アバター一覧取得方法確認
```

### 2. API統合実装
```typescript
// src/server/services/video-generation.ts を更新
// 実際のAPI呼び出しを実装
// エラーハンドリング強化
// リトライロジック追加
```

### 3. 非同期処理実装
```typescript
// 動画生成ジョブ管理
// 進捗表示
// ポーリングまたはWebhook
```

### 4. テスト
- API接続テスト
- エラーハンドリングテスト
- UI動作確認

---

## 注意事項

1. **APIコスト**: 動画生成は高コストになる可能性があるため、料金体系を確認
2. **生成時間**: 動画生成には数分かかるため、非同期処理が必須
3. **レート制限**: APIのレート制限を確認し、適切な制御を実装
4. **医療広告ガイドライン**: 生成される動画もコンプライアンスチェックが必要
5. **ファイルサイズ**: 動画ファイルは大きいため、外部ストレージ必須

---

## 参考リンク

- [Pika Labs](https://pika.art/)
- [Synthesia](https://www.synthesia.io/)
- [要件定義書 - モジュール3: 短尺動画生成](./REQUIREMENTS_DOCUMENT.md#33-モジュール3-短尺動画生成新規)
- [要件定義書 - モジュール4: 施術説明動画生成](./REQUIREMENTS_DOCUMENT.md#34-モジュール4-施術説明動画生成新規)
