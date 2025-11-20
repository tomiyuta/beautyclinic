# TikTok分析の実装方法

## 概要

現在のシステムにTikTok分析機能を追加するための実装方法を検討します。

## 実装方法の選択肢

### 1. Web検索APIを活用した方法（推奨）⭐

**概要**: 現在のInstagram/YouTube分析と同じアプローチを使用

**メリット**:
- ✅ 既存のインフラ（SerpAPI、Google Custom Search）を活用できる
- ✅ 実装が容易で、既存コードとの統合が簡単
- ✅ 追加のAPIキーや申請が不要（既存のWeb検索APIを使用）
- ✅ TikTok公式APIの制約を受けない
- ✅ コストが低い

**デメリット**:
- ⚠️ TikTok公式APIと比較して、データの精度やリアルタイム性に制限がある可能性
- ⚠️ Web検索結果に依存するため、直接的なTikTokデータではない

**実装方法**:
1. `gemini.ts`に`analyzeTikTokTrends`関数を追加
2. Web検索クエリ生成関数を追加（`generateTikTokTrendSearchQuery`）
3. SerpAPI/Google Custom SearchでTikTok関連の検索を実行
4. Gemini APIで検索結果を分析
5. `sns-research.ts`ルーターに`analyzeTikTok`エンドポイントを追加
6. フロントエンドにTikTok選択肢を追加

**必要な変更**:
- `src/server/services/gemini.ts`: `analyzeTikTokTrends`関数を追加
- `src/server/services/web-search.ts`: `generateTikTokTrendSearchQuery`関数を追加
- `src/server/api/routers/sns-research.ts`: `analyzeTikTok`エンドポイントを追加
- `prisma/schema.prisma`: `SNSPlatform` enumに`tiktok`を追加（既に存在する場合は不要）
- `src/features/sns-research/sns-research.tsx`: TikTok選択肢を追加

**検索クエリ例**:
```
"TikTok ダーマペン トレンド 2025年1月"
"TikTok ボツリヌス注射 人気 2025年1月"
```

---

### 2. TikTok公式APIを使用する方法

**概要**: TikTok for Developers APIを利用

**メリット**:
- ✅ 公式データを直接取得できる
- ✅ データの精度が高い
- ✅ リアルタイム性が高い

**デメリット**:
- ❌ API申請と承認プロセスが必要（時間がかかる可能性）
- ❌ 主にマーケティング用途で、トレンド分析には制限がある可能性
- ❌ 追加のAPIキー管理が必要
- ❌ 利用規約や制限が厳しい可能性
- ❌ 日本での利用可能性が不明確

**必要な手順**:
1. TikTok for Developersに申請
2. APIキーの取得
3. API仕様の確認と実装
4. エラーハンドリングとレート制限の実装

**参考URL**:
- TikTok for Developers: https://developers.tiktok.com/

---

### 3. サードパーティサービスを利用する方法

**概要**: TikTok分析ツールのAPIを使用

**メリット**:
- ✅ 専門的な分析機能が利用可能
- ✅ 実装が比較的簡単

**デメリット**:
- ❌ 追加コストが発生する可能性
- ❌ サービス依存のリスク
- ❌ データの所有権やプライバシーの問題

**代表的なサービス**:
- Exolyt
- Analisa
- Social Blade API

---

## 推奨実装方法

### 推奨: Web検索APIを活用した方法

**理由**:
1. **既存システムとの統合が容易**: Instagram/YouTubeと同じパターンで実装できる
2. **コスト効率**: 追加のAPIキーやサービス契約が不要
3. **実装速度**: 既存コードをベースに短時間で実装可能
4. **柔軟性**: Web検索結果を基にした分析は、トレンド情報の取得に適している

### 実装手順

#### 1. データベーススキーマの確認・更新

```prisma
enum SNSPlatform {
  twitter
  instagram
  youtube
  tiktok  // 追加
}
```

#### 2. Web検索クエリ生成関数の追加

`src/server/services/web-search.ts`に追加:

```typescript
export function generateTikTokTrendSearchQuery(
  keywords: string[],
  currentYear: number,
  currentMonth: number,
): string {
  const keywordStr = keywords.join(" ");
  return `TikTok ${keywordStr} トレンド ${currentYear}年${currentMonth}月`;
}
```

#### 3. TikTok分析関数の追加

`src/server/services/gemini.ts`に追加:

```typescript
export async function analyzeTikTokTrends(
  keywords: string[],
  timeRange: "last_week" | "last_month" | "last_3months" = "last_month",
): Promise<string> {
  // Instagram/YouTube分析と同じパターンで実装
  // Web検索 → Gemini APIで分析
}
```

#### 4. tRPCルーターの更新

`src/server/api/routers/sns-research.ts`に追加:

```typescript
analyzeTikTok: publicProcedure
  .input(...)
  .mutation(async ({ input }) => {
    const result = await analyzeTikTokTrends(input.keywords, input.timeRange);
    // データベースに保存
  })
```

#### 5. フロントエンドの更新

`src/features/sns-research/sns-research.tsx`に追加:

```typescript
const platformOptions = [
  { label: "Twitter/X (Grok API)", value: "twitter" },
  { label: "Instagram (Gemini API)", value: "instagram" },
  { label: "YouTube (Gemini API)", value: "youtube" },
  { label: "TikTok (Gemini API)", value: "tiktok" }, // 追加
];
```

#### 6. 履歴表示の更新

既存の履歴表示セクションに「TikTok調査履歴」を追加

---

## プロンプト設計

TikTok分析用のプロンプトは、Instagram/YouTube分析と同様の構造で、以下の点を考慮:

- TikTok特有の要素（ハッシュタグ、サウンド、エフェクトなど）
- 短動画コンテンツの特徴
- トレンドの変化速度
- 若年層への訴求力

---

## 今後の拡張可能性

1. **TikTok公式APIとの統合**: 将来的に公式APIが利用可能になった場合、Web検索と併用
2. **動画分析機能**: 動画コンテンツ自体の分析（音声認識、画像認識など）
3. **インフルエンサー分析**: TikTokクリエイターの分析機能
4. **競合分析**: 競合クリニックのTikTok戦略分析

---

## 注意事項

1. **利用規約の遵守**: TikTokの利用規約を確認し、遵守する
2. **データの正確性**: Web検索結果に依存するため、重要な判断には複数の情報源を参照
3. **レート制限**: Web検索APIのレート制限に注意
4. **プライバシー**: 個人情報の取り扱いに注意

---

## まとめ

**推奨実装方法**: Web検索APIを活用した方法

この方法により、既存システムとの統合が容易で、コスト効率が高く、短時間で実装可能です。将来的にTikTok公式APIが利用可能になった場合、段階的に移行することも可能です。

