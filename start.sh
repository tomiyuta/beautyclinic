#!/bin/bash

# 美容クリニックAI協調プラットフォーム - ワンクリック起動スクリプト

set -e  # エラーが発生したら即座に停止

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}美容クリニックAI協調プラットフォーム${NC}"
echo -e "${GREEN}ワンクリック起動スクリプト${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# スクリプトのディレクトリに移動
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. MySQLの起動確認
echo -e "${YELLOW}[1/6] MySQLの起動確認...${NC}"
if ! pgrep -x "mysqld" > /dev/null; then
    echo -e "${YELLOW}MySQLが起動していません。起動を試みます...${NC}"
    if command -v brew &> /dev/null; then
        brew services start mysql 2>/dev/null || {
            echo -e "${RED}MySQLの起動に失敗しました。手動で起動してください。${NC}"
            echo -e "${YELLOW}手動起動コマンド: brew services start mysql${NC}"
            exit 1
        }
        sleep 3  # MySQLが完全に起動するまで待機
    else
        echo -e "${RED}brewコマンドが見つかりません。MySQLを手動で起動してください。${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ MySQLは既に起動しています${NC}"
fi

# 2. .envファイルの存在確認
echo -e "${YELLOW}[2/6] 環境変数ファイルの確認...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}.envファイルが存在しません。テンプレートを作成します...${NC}"
    cat > .env << EOF
DATABASE_URL="mysql://ai_user:TempPass123!@localhost:3306/ai_clinic"
GEMINI_API_KEY=""
GROK_API_KEY=""
CLAUDE_API_KEY=""
OPENAI_API_KEY=""
GEMINI_MODEL=""
GROK_API_URL="https://api.x.ai/v1/chat/completions"
GROK_MODEL="grok-3"
CLAUDE_MODEL=""
EOF
    echo -e "${GREEN}✓ .envファイルを作成しました${NC}"
    echo -e "${YELLOW}⚠ APIキーを設定してください（ブラウザから設定することもできます）${NC}"
else
    echo -e "${GREEN}✓ .envファイルが存在します${NC}"
fi

# 3. node_modulesの確認
echo -e "${YELLOW}[3/6] 依存関係の確認...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modulesが存在しません。npm installを実行します...${NC}"
    npm install
    echo -e "${GREEN}✓ 依存関係のインストールが完了しました${NC}"
else
    echo -e "${GREEN}✓ 依存関係はインストール済みです${NC}"
fi

# 4. Prismaクライアントの生成
echo -e "${YELLOW}[4/6] Prismaクライアントの生成...${NC}"
npx prisma generate > /dev/null 2>&1 || {
    echo -e "${RED}Prismaクライアントの生成に失敗しました${NC}"
    exit 1
}
echo -e "${GREEN}✓ Prismaクライアントを生成しました${NC}"

# 5. データベース接続確認（オプション）
echo -e "${YELLOW}[5/6] データベース接続確認...${NC}"
if npx prisma db push --accept-data-loss > /dev/null 2>&1; then
    echo -e "${GREEN}✓ データベース接続成功${NC}"
else
    echo -e "${YELLOW}⚠ データベース接続に失敗しましたが、続行します${NC}"
    echo -e "${YELLOW}   データベースが正しく設定されているか確認してください${NC}"
fi

# 6. 開発サーバーの起動
echo -e "${YELLOW}[6/6] 開発サーバーの起動...${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}起動完了！${NC}"
echo -e "${GREEN}ブラウザで http://localhost:3000 にアクセスしてください${NC}"
echo -e "${GREEN}停止するには Ctrl+C を押してください${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 既存のnext devプロセスを停止（ポート競合を避ける）
pkill -9 -f "next dev" 2>/dev/null || true
sleep 1

# 開発サーバーを起動
npm run dev

