# SNS調査データのフロー検証レポート

## ユーザーの理解

1. **調査履歴の表示**: わかりやすい日本語のみ（JSON形式ではない）
2. **戦略分析APIへのデータ送信**: JSON形式

## 現在の実装の確認

### 1. データベースへの保存

**ファイル**: `src/server/api/routers/sns-research.ts`

```typescript
// TikTok調査の例
const result = await analyzeTikTokTrends(input.keywords, input.timeRange);

const saved = await db.sNSResearchResult.create({
  data: {
    userId: input.userId,
    platform: "tiktok",
    keywords: input.keywords.join(","),
    aiAgent: "gemini",
    trendData: result, // テキスト形式で保存（コメントより）
  },
});
```

**問題点**:
- コメントには「テキスト形式で保存」と記載されているが、実際にはGemini APIがJSON形式で返答している可能性がある
- `result`は`callGemini()`から返される文字列で、その内容はGemini APIの応答に依存する

### 2. 調査履歴の表示

**ファイル**: `src/features/sns-research/sns-research.tsx`

```tsx
<div style={{ 
  whiteSpace: "pre-wrap", 
  // ... その他のスタイル
}}>
  {result.trendData}
</div>
```

**問題点**:
- `result.trendData`をそのまま表示している
- データベースにJSON形式で保存されていれば、JSON形式のまま表示される
- **ユーザーの期待（わかりやすい日本語のみ）と相違**

### 3. 戦略分析APIへのデータ送信

**ファイル**: `src/server/api/routers/strategy.ts`

```typescript
snsData = snsResults
  .map((result) => {
    if (!result.trendData) {
      return null;
    }
    try {
      const parsed = JSON.parse(result.trendData);
      // JSON形式の場合はパースしてオブジェクトとして送信
      if (typeof parsed === "object" && parsed !== null) {
        return {
          ...parsed,
          platform: result.platform,
          aiAgent: result.aiAgent,
        };
      }
      return parsed;
    } catch {
      // テキスト形式の場合は、プラットフォーム情報を含めたオブジェクトとして返す
      return {
        platform: result.platform,
        aiAgent: result.aiAgent,
        data: result.trendData,
      };
    }
  })
  .filter((data) => data !== null);
```

**確認結果**:
- ✅ JSON形式の場合は`JSON.parse()`してオブジェクトとして送信
- ✅ テキスト形式の場合は`{ platform, aiAgent, data }`として送信
- ✅ **戦略分析APIにはJSON形式（オブジェクト）で送信される**（ユーザーの理解と一致）

## 相違点のまとめ

### ✅ 一致している点

1. **戦略分析APIへのデータ送信**: JSON形式（オブジェクト）で送信されている

### ❌ 相違している点

1. **調査履歴の表示**: 
   - **ユーザーの期待**: わかりやすい日本語のみ（JSON形式ではない）
   - **現在の実装**: データベースに保存された形式（JSON形式の可能性）をそのまま表示
   - **問題**: JSON形式で保存されていれば、JSON形式のまま表示される

## 解決策

### オプション1: 調査履歴の表示を改善（推奨）

調査履歴の表示時に、JSON形式の場合は`<REPORT_MARKDOWN>`セクションのみを抽出して表示する。

**実装例**:
```typescript
function extractReadableContent(trendData: string): string {
  // TikTokの場合は<REPORT_MARKDOWN>セクションを抽出
  const reportMatch = trendData.match(/<REPORT_MARKDOWN>([\s\S]*?)<\/REPORT_MARKDOWN>/);
  if (reportMatch) {
    return reportMatch[1].trim();
  }
  
  // JSON形式の場合は、テキスト形式に変換を試みる
  try {
    const parsed = JSON.parse(trendData);
    // JSON形式の場合は、読みやすい形式に変換
    return JSON.stringify(parsed, null, 2);
  } catch {
    // テキスト形式の場合はそのまま返す
    return trendData;
  }
}
```

### オプション2: データベースへの保存時に処理

データベースに保存する際に、表示用のテキストとAPI用のJSONを分けて保存する。

**問題点**:
- データベーススキーマの変更が必要
- 既存データの移行が必要

### オプション3: プロンプトを修正してJSON出力を防ぐ

InstagramとYouTubeのプロンプトを修正して、JSON形式ではなくMarkdown形式で出力するように明示的に指示する。

**メリット**:
- 根本的な解決
- データベースに保存される時点で正しい形式になる

**デメリット**:
- TikTokの`<CONSENSUS_JSON>`も出力されなくなる可能性

## 推奨される対応

**オプション1 + オプション3の組み合わせ**:

1. **オプション3**: InstagramとYouTubeのプロンプトを修正して、Markdown形式での出力を明示的に指示
2. **オプション1**: TikTokの場合は`<REPORT_MARKDOWN>`セクションのみを表示

これにより：
- 調査履歴の表示がわかりやすい日本語（Markdown形式）になる
- 戦略分析APIへのデータ送信は既存の実装で正しく動作する
- TikTokの`<CONSENSUS_JSON>`は戦略分析APIで使用可能（データベースに保存されているため）

## 結論

**ユーザーの理解は正しい**が、**現在の実装が期待通りに動作していない**。

- ✅ 戦略分析APIへのデータ送信: JSON形式（実装済み、正しく動作）
- ❌ 調査履歴の表示: JSON形式のまま表示される可能性（要修正）

