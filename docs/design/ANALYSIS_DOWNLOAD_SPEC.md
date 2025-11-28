# 戦略分析結果ダウンロード機能 要件定義書

## 1. 背景・目的

### 1.1 背景
現在の戦略分析機能では、分析結果をブラウザ上でのみ閲覧可能であり、以下の課題がある：
- 分析結果を社内共有・保存できない
- オフライン環境での閲覧ができない
- 印刷・資料作成時の利便性が低い
- 長期的なデータ保管・比較分析が困難

### 1.2 目的
戦略分析結果（単一AI分析・Council分析）をローカルファイルとしてダウンロード可能にし、以下を実現する：
- **オフライン閲覧**: インターネット接続なしでの結果確認
- **社内共有**: 分析結果の効率的な共有・配布
- **資料作成**: プレゼンテーション・レポート作成への活用
- **長期保管**: 分析履歴の体系的な管理

## 2. 機能要件

### 2.1 Phase 1: PDF基本ダウンロード機能

#### 2.1.1 対象結果
- **単一AI分析結果**: `SingleResultView`で表示される結果
- **Council分析結果**: `CouncilResultView`で表示される結果

#### 2.1.2 PDF内容構成
```
【ページ1: 表紙】
- タイトル: "戦略分析結果レポート"
- 分析日時: 2024年11月28日 14:30
- 分析タイプ: 総合分析 / 価格設定提案 / キャンペーン案 / 新施術導入提案
- 使用AI: ChatGPT / Claude / Gemini / Grok / Council
- 処理時間: 45.2秒

【ページ2以降: 分析結果】
■ 単一AI分析の場合:
- 分析結果（Markdown形式をPDF用にフォーマット）
- 使用データソース情報（オプション）

■ Council分析の場合:
- 最終統合結果（議長による統合）
- ピアレビュー結果（AI相互評価ランキング）
- 各AIの個別回答（タブ形式をページ分割）
- 処理時間詳細（Stage別）
```

#### 2.1.3 PDF仕様
- **ページサイズ**: A4
- **フォント**: 日本語対応（Noto Sans JP推奨）
- **マージン**: 上下左右 20mm
- **ヘッダー**: ページ番号、生成日時
- **フッター**: "Beauty Project - 戦略分析システム"

### 2.2 Phase 1: JSON形式ダウンロード

#### 2.2.1 JSON構造
```json
{
  "metadata": {
    "analysisId": "uuid",
    "analysisType": "comprehensive",
    "analysisMode": "single" | "council",
    "aiProvider": "chatgpt",
    "userId": 1,
    "createdAt": "2024-11-28T14:30:00Z",
    "durationMs": 45200,
    "version": "1.0"
  },
  "input": {
    "location": "東京",
    "productIds": [1, 2, 3],
    "marketDataSelection": {
      "trendIds": [10, 11],
      "priceIds": [20],
      "competitorIds": []
    }
  },
  "result": {
    "content": "分析結果の全文",
    "aiProvider": "chatgpt",
    "durationMs": 45200
  },
  "councilResult": {
    "stage1": { /* 個別回答 */ },
    "stage2": { /* ピアレビュー */ },
    "stage3": { /* 最終統合 */ },
    "totalDurationMs": 120000
  }
}
```

### 2.3 Phase 1: UI統合

#### 2.3.1 ダウンロードボタン配置
- **SingleResultView**: 分析結果表示エリアの下部
- **CouncilResultView**: 最終統合結果エリアの下部

#### 2.3.2 ボタンデザイン
```typescript
<div style={{ 
  marginTop: "24px", 
  paddingTop: "16px", 
  borderTop: "1px solid #DFE1E6",
  display: "flex", 
  gap: "12px" 
}}>
  <Button 
    appearance="primary" 
    onClick={handleDownloadPDF}
    iconBefore={<DownloadIcon />}
  >
    📄 PDFダウンロード
  </Button>
  <Button 
    appearance="subtle" 
    onClick={handleDownloadJSON}
    iconBefore={<CodeIcon />}
  >
    💾 JSON形式
  </Button>
</div>
```

### 2.4 Phase 2: Word形式ダウンロード

#### 2.4.1 Word文書構成
- **スタイル**: 見出し1〜3、本文、箇条書き
- **目次**: 自動生成（Council分析の場合）
- **ページ設定**: A4、余白標準
- **ヘッダー・フッター**: PDFと同様

#### 2.4.2 編集可能要素
- **コメント挿入**: 分析結果に対するメモ追加可能
- **書式設定**: フォント、色、サイズ変更可能
- **図表挿入**: 追加の図表・画像挿入スペース

### 2.5 Phase 2: ダウンロード設定機能

#### 2.5.1 設定モーダル
```typescript
interface DownloadOptions {
  format: "pdf" | "word" | "json";
  includeMetadata: boolean;        // メタデータ含む
  includeInputData: boolean;       // 入力データ含む
  includeTimestamps: boolean;      // タイムスタンプ含む
  customFileName?: string;         // カスタムファイル名
  pageOrientation?: "portrait" | "landscape"; // ページ向き
}
```

#### 2.5.2 設定UI
- **チェックボックス**: 含める情報の選択
- **ラジオボタン**: ページ向き選択
- **テキスト入力**: カスタムファイル名
- **プレビュー**: 設定内容の確認

## 3. 技術仕様

### 3.1 フロントエンド実装

#### 3.1.1 使用ライブラリ
- **PDF生成**: `jsPDF` + `html2canvas`
- **Word生成**: `docx`
- **ファイル保存**: `file-saver`
- **UI**: Atlaskit Design System

#### 3.1.2 コンポーネント構成
```
src/components/strategy/
├── DownloadButton.tsx          # ダウンロードボタン
├── DownloadModal.tsx           # 設定モーダル
├── PDFGenerator.tsx            # PDF生成ロジック
├── WordGenerator.tsx           # Word生成ロジック
└── DownloadUtils.ts            # 共通ユーティリティ
```

### 3.2 バックエンド実装

#### 3.2.1 API拡張
```typescript
// src/server/api/routers/strategy.ts
export const strategyRouter = router({
  // 既存API...
  
  getResultForDownload: publicProcedure
    .input(z.object({
      resultId: z.string(),
      includeInputData: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      // 分析結果 + メタデータ + 入力データを取得
      return {
        result: /* 分析結果 */,
        metadata: /* メタデータ */,
        inputData: /* 入力データ（オプション） */,
      };
    }),
});
```

#### 3.2.2 データ構造最適化
- **結果キャッシュ**: 頻繁にダウンロードされる結果のキャッシュ
- **メタデータ拡張**: ダウンロード用の追加情報
- **ファイル名生成**: 一意で分かりやすいファイル名の自動生成

### 3.3 ファイル名規則

#### 3.3.1 自動生成ファイル名
```
戦略分析_{分析タイプ}_{AI名}_{日付}.{拡張子}

例:
- 戦略分析_総合分析_ChatGPT_2024-11-28.pdf
- 戦略分析_価格設定_Council_2024-11-28.docx
- 戦略分析_キャンペーン案_Claude_2024-11-28.json
```

#### 3.3.2 カスタムファイル名
- **文字数制限**: 50文字以内
- **使用可能文字**: 日本語、英数字、ハイフン、アンダースコア
- **重複回避**: 同名ファイルには連番付与

## 4. 非機能要件

### 4.1 パフォーマンス
- **PDF生成時間**: 10秒以内（通常の分析結果）
- **Word生成時間**: 15秒以内
- **ファイルサイズ**: PDF 5MB以内、Word 10MB以内
- **同時ダウンロード**: 最大10ユーザー並行処理

### 4.2 ユーザビリティ
- **進捗表示**: 生成中のプログレスバー
- **エラーハンドリング**: 分かりやすいエラーメッセージ
- **ブラウザ対応**: Chrome、Firefox、Safari、Edge最新版
- **レスポンシブ**: モバイル端末でも操作可能

### 4.3 セキュリティ
- **アクセス制御**: ユーザー自身の分析結果のみダウンロード可能
- **ファイル検証**: 生成ファイルの整合性チェック
- **ログ記録**: ダウンロード履歴の記録

## 5. 実装スケジュール

### 5.1 Phase 1（2週間）
- **Week 1**: PDF基本ダウンロード機能
  - Day 1-2: PDF生成ロジック実装
  - Day 3-4: UI統合（ボタン追加）
  - Day 5: JSON形式ダウンロード実装
  - Day 6-7: テスト・デバッグ

### 5.2 Phase 2（1週間）
- **Week 2**: Word形式・設定機能
  - Day 1-3: Word生成機能実装
  - Day 4-5: ダウンロード設定モーダル実装
  - Day 6-7: 統合テスト・UI調整

## 6. テスト要件

### 6.1 機能テスト
- **各形式の生成**: PDF、Word、JSON
- **各分析タイプ**: 単一AI、Council
- **設定オプション**: 全組み合わせテスト
- **エラーケース**: ネットワーク断、大容量データ

### 6.2 ブラウザテスト
- **Chrome**: 最新版
- **Firefox**: 最新版  
- **Safari**: 最新版
- **Edge**: 最新版

### 6.3 パフォーマンステスト
- **生成時間**: 各形式の処理時間測定
- **メモリ使用量**: 大容量結果での動作確認
- **並行処理**: 複数ユーザー同時ダウンロード

## 7. 今後の拡張予定

### 7.1 Phase 3以降
- **Excel形式**: データ分析用スプレッドシート
- **バッチダウンロード**: 複数結果の一括処理
- **比較レポート**: 複数分析の統合ドキュメント
- **テンプレート機能**: カスタムレポート形式
- **自動配信**: 定期的な分析結果の自動送信

### 7.2 統合機能
- **メール送信**: 分析結果の直接メール配信
- **クラウド保存**: Google Drive、OneDrive連携
- **印刷最適化**: 印刷専用レイアウト
- **QRコード**: 結果共有用QRコード生成
