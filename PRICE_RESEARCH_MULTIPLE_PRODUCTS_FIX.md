# 複数商品の価格調査問題の修正

## 問題の概要

複数の商品を入力した場合に、価格調査が正しく行われていない問題が報告されました。

## 原因の推測

### 1. Web検索クエリの問題

**現在の実装**:
```typescript
generatePriceSearchQuery(treatments, cities, currentYear, currentMonth)
// 例: "東京都 大阪府 美容クリニック ボトックス ヒアルロン酸 価格 2025年11月"
```

**問題点**:
- 複数の商品を1つの検索クエリにまとめているため、検索結果が分散する
- 検索エンジンが複数の商品を同時に検索するため、各商品の価格情報が十分に取得できない可能性がある
- 検索クエリが長すぎて、検索エンジンが適切に処理できない可能性がある

### 2. Web検索結果の処理の問題

**問題点**:
- 1回のWeb検索で複数の商品の情報を取得しようとしているため、各商品の価格情報が混在している
- AIが各商品の価格を正確に抽出できない可能性がある
- 検索結果にどの商品の情報かが明示されていないため、AIが混乱する可能性がある

### 3. プロンプトの問題

**問題点**:
- 複数の商品が指定されている場合の処理方法が明示されていない
- 各商品について個別に価格情報を調査する指示が不十分

## 修正内容

### 1. 各商品ごとのWeb検索実行

複数の商品がある場合、各商品ごとにWeb検索を実行するように変更しました：

```typescript
if (treatments.length > 1) {
  // 複数の商品がある場合、各商品ごとに検索を実行
  for (const treatment of treatments) {
    const searchQuery = generatePriceSearchQuery([treatment], cities, currentYear, currentMonth);
    const searchResults = await performWebSearch(searchQuery, 10);
    // 検索結果に商品名を追加
    const enrichedResults = searchResults.map(result => ({
      ...result,
      snippet: `[商品: ${treatment}] ${result.snippet}`,
    }));
    allSearchResults.push(...enrichedResults);
  }
}
```

**効果**:
- 各商品について、より正確な価格情報を取得できる
- 検索結果に商品名タグを追加することで、AIが各商品の情報を識別しやすくなる

### 2. 検索結果の重複除去

複数の検索を実行した場合、重複する検索結果を除去します：

```typescript
// 重複を除去（URLベース）
const uniqueResults = Array.from(
  new Map(allSearchResults.map(result => [result.link, result])).values()
);
```

**効果**:
- 同じURLの検索結果が複数回含まれることを防ぐ
- 検索結果の質を向上させる

### 3. プロンプトの改善

複数商品対応の指示を追加しました：

```
- 複数の施術が指定されている場合、各施術について個別に価格情報を調査・記載してください
- Web検索結果に「[商品: 施術名]」というタグが含まれている場合は、そのタグを参考にして各施術の価格情報を抽出してください
```

**効果**:
- AIが各商品の価格情報を個別に調査・記載するようになる
- 検索結果のタグを活用して、より正確な情報抽出が可能になる

### 4. 詳細なログ出力

問題の原因を特定しやすくするため、詳細なログ出力を追加しました：

```typescript
console.log(`[Price Comparison] 入力パラメータ - 施術数: ${treatments.length}, 都市数: ${cities.length}`);
console.log(`[Price Comparison] 施術: ${treatments.join(", ")}`);
console.log(`[Price Comparison] 都市: ${cities.join(", ")}`);
console.log(`[Price Comparison] 商品「${treatment}」のWeb検索実行: ${searchQuery}`);
console.log(`[Price Comparison] 商品「${treatment}」のWeb検索結果: ${searchResults.length}件取得`);
console.log(`[Price Comparison] 統合されたWeb検索結果: ${uniqueResults.length}件（重複除去後）`);
console.log(`[Price Comparison] プロンプト長: ${prompt.length}文字`);
console.log(`[Price Comparison] Web検索結果の長さ: ${webSearchResults.length}文字`);
console.log(`[Price Comparison] AI応答の長さ: ${result.length}文字`);
```

**効果**:
- どの商品の検索が実行されたかを確認できる
- 検索結果の件数を確認できる
- プロンプトと応答の長さを確認できる
- 問題の原因を特定しやすくなる

## 期待される効果

1. **検索精度の向上**: 各商品ごとに検索を実行することで、より正確な価格情報を取得できる
2. **情報の識別性向上**: 検索結果に商品名タグを追加することで、AIが各商品の情報を識別しやすくなる
3. **重複の削減**: 重複する検索結果を除去することで、検索結果の質を向上させる
4. **問題の特定**: 詳細なログ出力により、問題の原因を特定しやすくなる

## 検証方法

1. 複数の商品（例: ボトックス、ヒアルロン酸、ダーマペン）を入力して価格調査を実行
2. サーバーログで以下を確認：
   - 各商品ごとに検索が実行されているか
   - 検索結果の件数
   - プロンプトと応答の長さ
3. 調査結果で以下を確認：
   - 各商品の価格情報が個別に記載されているか
   - 価格情報が正確か

## 注意事項

- 複数の商品がある場合、検索回数が増えるため、APIレート制限に注意が必要
- 検索間隔を500ms設けることで、APIレート制限を回避
- 検索結果が多くなるため、プロンプトの長さが増加する可能性がある

