#!/bin/bash
# マイグレーション実行スクリプト

echo "=== マイグレーション実行スクリプト ==="
echo ""

# .envからDATABASE_URLを取得
if [ -f .env ]; then
    DB_URL=$(grep "DATABASE_URL" .env | head -1 | cut -d '=' -f2-)
    echo "✅ .envファイルからDATABASE_URLを取得"
    
    # MySQL接続情報を抽出
    # mysql://user:password@host:port/database
    if [[ $DB_URL =~ mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        
        echo "データベース情報:"
        echo "  ホスト: $DB_HOST"
        echo "  ポート: $DB_PORT"
        echo "  データベース: $DB_NAME"
        echo "  ユーザー: $DB_USER"
        echo ""
        
        MIGRATION_FILE="prisma/migrations/20251122100732_add_content_generation_extensions/migration.sql"
        
        if [ -f "$MIGRATION_FILE" ]; then
            echo "✅ マイグレーションファイル確認: $MIGRATION_FILE"
            echo ""
            echo "以下のコマンドでマイグレーションを実行できます:"
            echo ""
            echo "mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < $MIGRATION_FILE"
            echo ""
            echo "または、MySQL CLIで:"
            echo "  mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME"
            echo "  source $MIGRATION_FILE"
        else
            echo "❌ マイグレーションファイルが見つかりません: $MIGRATION_FILE"
        fi
    else
        echo "⚠️ DATABASE_URLの形式が正しくありません"
        echo "形式: mysql://user:password@host:port/database"
    fi
else
    echo "❌ .envファイルが見つかりません"
fi
