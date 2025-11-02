@echo off
REM 美容クリニックAI協調プラットフォーム - Windows用起動スクリプト

echo ========================================
echo 美容クリニックAI協調プラットフォーム
echo ワンクリック起動スクリプト
echo ========================================
echo.

REM スクリプトのディレクトリに移動
cd /d %~dp0

REM 1. .envファイルの存在確認
echo [1/5] 環境変数ファイルの確認...
if not exist .env (
    echo .envファイルが存在しません。テンプレートを作成します...
    (
        echo DATABASE_URL="mysql://ai_user:TempPass123!@localhost:3306/ai_clinic"
        echo GEMINI_API_KEY=""
        echo GROK_API_KEY=""
        echo CLAUDE_API_KEY=""
        echo OPENAI_API_KEY=""
        echo GEMINI_MODEL=""
        echo GROK_API_URL="https://api.x.ai/v1/chat/completions"
        echo GROK_MODEL="grok-3"
        echo CLAUDE_MODEL=""
    ) > .env
    echo .envファイルを作成しました
    echo APIキーを設定してください（ブラウザから設定することもできます）
) else (
    echo .envファイルが存在します
)

REM 2. node_modulesの確認
echo [2/5] 依存関係の確認...
if not exist node_modules (
    echo node_modulesが存在しません。npm installを実行します...
    call npm install
    echo 依存関係のインストールが完了しました
) else (
    echo 依存関係はインストール済みです
)

REM 3. Prismaクライアントの生成
echo [3/5] Prismaクライアントの生成...
call npx prisma generate >nul 2>&1
if %errorlevel% neq 0 (
    echo Prismaクライアントの生成に失敗しました
    pause
    exit /b 1
)
echo Prismaクライアントを生成しました

REM 4. データベース接続確認（オプション）
echo [4/5] データベース接続確認...
call npx prisma db push --accept-data-loss >nul 2>&1
if %errorlevel% equ 0 (
    echo データベース接続成功
) else (
    echo データベース接続に失敗しましたが、続行します
    echo データベースが正しく設定されているか確認してください
)

REM 5. 開発サーバーの起動
echo [5/5] 開発サーバーの起動...
echo.
echo ========================================
echo 起動完了！
echo ブラウザで http://localhost:3000 にアクセスしてください
echo 停止するには Ctrl+C を押してください
echo ========================================
echo.

REM 既存のnext devプロセスを停止（ポート競合を避ける）
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *next dev*" >nul 2>&1
timeout /t 1 /nobreak >nul

REM 開発サーバーを起動
call npm run dev

