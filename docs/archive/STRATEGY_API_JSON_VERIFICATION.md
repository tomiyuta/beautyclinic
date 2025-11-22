# 戦略分析APIへのJSON形式データ受け渡しの検証レポート

## 検証日時
2025年1月

## 検証対象
戦略分析API（`src/server/api/routers/strategy.ts`）へのSNS調査データの受け渡し

## 検証結果

### ✅ 正しく実装されていたAPI

#### 1. `analyzeMarketPosition`（総合分析）
**ファイル**: `src/server/api/routers/strategy.ts` (160-210行目)

**実装状況**: ✅ 正しく実装済み

```typescript
// TikTok、YouTube、Instagramの場合は<CONSENSUS_JSON>セクションを抽出してJSON形式で送信
if (result.platform === "tiktok" || result.platform === "youtube" || result.platform === "instagram") {
  const consensusMatch = result.trendData.match(/<CONSENSUS_JSON>([\s\S]*?)<\/CONSENSUS_JSON>/);
  if (consensusMatch) {
    try {
      const parsed = JSON.parse(consensusMatch[1]!.trim());
      return {
        ...parsed,
        platform: result.platform,
        aiAgent: result.aiAgent,
      };
    } catch {
      // JSONパースに失敗した場合は、テキスト形式として扱う
      return {
        platform: result.platform,
        aiAgent: result.aiAgent,
        data: consensusMatch[1]!.trim(),
      };
    }
  }
}
```

**確認事項**:
- ✅ TikTok、YouTube、Instagramの3プラットフォームに対応
- ✅ `<CONSENSUS_JSON>`セクションを正しく抽出
- ✅ JSON形式でパースして送信
- ✅ プラットフォーム情報とAIエージェント情報を追加

### ❌ 問題があったAPI（修正済み）

#### 2. `generateCampaignProposals`（キャンペーン案生成）
**ファイル**: `src/server/api/routers/strategy.ts` (400-450行目)

**問題点**: TikTokのみをチェックしており、YouTubeとInstagramが含まれていなかった

**修正前**:
```typescript
// TikTokの場合は<CONSENSUS_JSON>セクションを抽出してJSON形式で送信
if (result.platform === "tiktok") {
  // ...
}
```

**修正後**:
```typescript
// TikTok、YouTube、Instagramの場合は<CONSENSUS_JSON>セクションを抽出してJSON形式で送信
if (result.platform === "tiktok" || result.platform === "youtube" || result.platform === "instagram") {
  const consensusMatch = result.trendData.match(/<CONSENSUS_JSON>([\s\S]*?)<\/CONSENSUS_JSON>/);
  if (consensusMatch) {
    try {
      const parsed = JSON.parse(consensusMatch[1]!.trim());
      return {
        ...parsed,
        platform: result.platform,
        aiAgent: result.aiAgent,
      };
    } catch {
      // JSONパースに失敗した場合は、テキスト形式として扱う
      return {
        platform: result.platform,
        aiAgent: result.aiAgent,
        data: consensusMatch[1]!.trim(),
      };
    }
  }
}
```

**修正内容**:
- ✅ YouTubeとInstagramも`<CONSENSUS_JSON>`セクションを抽出するように修正
- ✅ `analyzeMarketPosition`と同じロジックに統一

#### 3. `suggestNewTreatments`（新施術提案）
**ファイル**: `src/server/api/routers/strategy.ts` (539-566行目)

**問題点**: プラットフォームチェックがなく、単純に`JSON.parse`を試みているだけだった

**修正前**:
```typescript
// プラットフォーム情報とAIエージェント情報を明示的に含める（Grokデータの識別のため）
try {
  const parsed = JSON.parse(result.trendData);
  // ...
} catch {
  // テキスト形式の場合は、プラットフォーム情報を含めたオブジェクトとして返す
  return {
    platform: result.platform,
    aiAgent: result.aiAgent,
    data: result.trendData,
  };
}
```

**修正後**:
```typescript
// TikTok、YouTube、Instagramの場合は<CONSENSUS_JSON>セクションを抽出してJSON形式で送信
if (result.platform === "tiktok" || result.platform === "youtube" || result.platform === "instagram") {
  const consensusMatch = result.trendData.match(/<CONSENSUS_JSON>([\s\S]*?)<\/CONSENSUS_JSON>/);
  if (consensusMatch) {
    try {
      const parsed = JSON.parse(consensusMatch[1]!.trim());
      return {
        ...parsed,
        platform: result.platform,
        aiAgent: result.aiAgent,
      };
    } catch {
      // JSONパースに失敗した場合は、テキスト形式として扱う
      return {
        platform: result.platform,
        aiAgent: result.aiAgent,
        data: consensusMatch[1]!.trim(),
      };
    }
  }
  // <CONSENSUS_JSON>セクションがない場合は、全体をJSONとしてパースを試みる
}

// その他のプラットフォームまたはTikTok/YouTube/Instagramで<CONSENSUS_JSON>がない場合
// プラットフォーム情報とAIエージェント情報を明示的に含める（Grokデータの識別のため）
try {
  const parsed = JSON.parse(result.trendData);
  // ...
} catch {
  // テキスト形式の場合は、プラットフォーム情報を含めたオブジェクトとして返す
  return {
    platform: result.platform,
    aiAgent: result.aiAgent,
    data: result.trendData,
  };
}
```

**修正内容**:
- ✅ TikTok、YouTube、Instagramの`<CONSENSUS_JSON>`セクションを抽出する処理を追加
- ✅ `analyzeMarketPosition`と同じロジックに統一

## 修正後の状態

### すべての戦略分析APIで統一された処理

1. **`analyzeMarketPosition`**: ✅ 正しく実装済み
2. **`generateCampaignProposals`**: ✅ 修正完了
3. **`suggestNewTreatments`**: ✅ 修正完了

### 統一された処理フロー

すべての戦略分析APIで、以下の統一された処理フローが実装されています：

1. **TikTok、YouTube、Instagramの場合**:
   - `<CONSENSUS_JSON>`セクションを抽出
   - JSON形式でパース
   - プラットフォーム情報とAIエージェント情報を追加
   - JSON形式のオブジェクトとして送信

2. **その他のプラットフォーム（Twitter/Grok）の場合**:
   - 全体をJSON形式としてパースを試みる
   - 成功した場合はプラットフォーム情報を追加
   - 失敗した場合はテキスト形式として`{ platform, aiAgent, data }`として送信

## 確認事項

### ✅ 実装済みの機能

1. **調査履歴の表示**: `<REPORT_MARKDOWN>`セクションのみを表示
   - TikTok、YouTube、Instagramすべてに対応

2. **戦略分析APIへのデータ送信**: `<CONSENSUS_JSON>`セクションを抽出してJSON形式で送信
   - `analyzeMarketPosition`: ✅ 実装済み
   - `generateCampaignProposals`: ✅ 修正完了
   - `suggestNewTreatments`: ✅ 修正完了

### 📋 データフロー

```
SNS調査実行
  ↓
データベースに保存（trendData: 全体の文字列）
  ↓
戦略分析API呼び出し
  ↓
データベースから取得
  ↓
プラットフォーム判定
  ↓
TikTok/YouTube/Instagramの場合:
  - <CONSENSUS_JSON>セクションを抽出
  - JSON形式でパース
  - プラットフォーム情報を追加
  - JSON形式のオブジェクトとして送信
  ↓
AI API（Claude/ChatGPT/Gemini）に送信
```

## 結論

**修正前**: `generateCampaignProposals`と`suggestNewTreatments`で、YouTubeとInstagramの`<CONSENSUS_JSON>`セクションが抽出されていなかった

**修正後**: すべての戦略分析APIで、TikTok、YouTube、Instagramの3プラットフォームが統一された方法でJSON形式のデータを受け渡しするようになりました

**ステータス**: ✅ すべての戦略分析APIで正しく実装済み

