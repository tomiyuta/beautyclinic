#!/bin/bash

# 不要なファイルを削除するスクリプト
# 実行前に必ずバックアップを取ってください

set -e

echo "🗑️  不要なファイルの削除を開始します..."
echo ""

# 重複ドキュメント（* 2.md, * 3.md）を削除
echo "📄 重複ドキュメントを削除中..."
find . -maxdepth 1 -type f \( -name "* 2.md" -o -name "* 3.md" \) -print -delete
echo "✅ 重複ドキュメントを削除しました"
echo ""

# 一時ファイルを削除
echo "🧹 一時ファイルを削除中..."
rm -f .DS_Store
rm -f tsconfig.tsbuildinfo
echo "✅ 一時ファイルを削除しました"
echo ""

# 古いキャッシュディレクトリを削除
echo "🗂️  古いキャッシュを削除中..."
if [ -d ".next/cache 2" ]; then
  rm -rf ".next/cache 2"
  echo "✅ 古いキャッシュを削除しました"
else
  echo "ℹ️  古いキャッシュディレクトリは存在しません"
fi
echo ""

# テストファイルを削除（ルートディレクトリ）
echo "🧪 ルートディレクトリのテストファイルを削除中..."
rm -f test-claude-opus.ts
rm -f test-claude-sonnet45.ts
rm -f test_ai_info_debug.tsx
echo "✅ テストファイルを削除しました"
echo ""

# 一時的なファイルを削除
echo "📝 一時的なファイルを削除中..."
rm -f contents.md
rm -f prompt.txt
echo "✅ 一時的なファイルを削除しました"
echo ""

echo "✨ クリーンアップが完了しました！"
echo ""
echo "⚠️  注意: 完了済みのドキュメントや検証ドキュメントは手動で確認してから削除してください"

