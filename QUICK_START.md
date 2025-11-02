# ワンクリック起動ガイド

このシステムを簡単に起動する方法を説明します。

## macOS / Linux の場合

### 方法1: スクリプトを直接実行

```bash
./start.sh
```

### 方法2: npmコマンドから実行

```bash
npm run startup
# または
npm run quick-start
```

## Windows の場合

### 方法1: バッチファイルをダブルクリック

`start.bat` をダブルクリックするだけで起動します。

### 方法2: コマンドプロンプトから実行

```cmd
start.bat
```

## 初回起動時のセットアップ

初回起動時、スクリプトは以下を自動的に実行します：

1. ✅ MySQLの起動確認（macOSの場合）
2. ✅ `.env`ファイルの作成（存在しない場合）
3. ✅ 依存関係のインストール（`node_modules`が存在しない場合）
4. ✅ Prismaクライアントの生成
5. ✅ データベース接続確認
6. ✅ 開発サーバーの起動

## 事前準備（初回のみ）

### 1. MySQLのインストールとセットアップ

**macOSの場合:**
```bash
brew install mysql
brew services start mysql

# データベースとユーザーの作成
mysql -u root -p
```

MySQL内で以下を実行：
```sql
CREATE DATABASE ai_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ai_user'@'localhost' IDENTIFIED BY 'TempPass123!';
GRANT ALL PRIVILEGES ON ai_clinic.* TO 'ai_user'@'localhost';
GRANT CREATE, DROP ON *.* TO 'ai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Windowsの場合:**
MySQL Installerを使用してMySQLをインストールし、上記と同様のSQLを実行してください。

### 2. APIキーの設定

起動後、ブラウザで以下のURLにアクセスしてAPIキーを設定できます：

```
http://localhost:3000/api-key
```

または、`.env`ファイルを直接編集することもできます。

## トラブルシューティング

### MySQLが起動しない場合

**macOS:**
```bash
brew services restart mysql
```

**Windows:**
サービスマネージャーからMySQLサービスを起動してください。

### ポート3000が使用中の場合

スクリプトは自動的に既存のプロセスを停止しようとしますが、手動で停止する場合：

**macOS/Linux:**
```bash
pkill -9 -f "next dev"
```

**Windows:**
```cmd
taskkill /F /IM node.exe
```

### データベース接続エラー

1. MySQLが起動しているか確認
2. `.env`ファイルの`DATABASE_URL`が正しいか確認
3. データベースとユーザーが正しく作成されているか確認

### その他のエラー

1. `.next`ディレクトリを削除して再起動：
   ```bash
   rm -rf .next
   ./start.sh
   ```

2. `node_modules`を削除して再インストール：
   ```bash
   rm -rf node_modules
   npm install
   ./start.sh
   ```

## カスタマイズ

### 異なるポートで起動する場合

`.env`ファイルに以下を追加：
```env
PORT=3001
```

または、`start.sh`を編集して`npm run dev`を`PORT=3001 npm run dev`に変更。

### 本番環境での起動

```bash
npm run build
npm start
```

## 便利なショートカット

### macOSの場合

`start.sh`をダブルクリックで起動できるようにするには：

1. スクリプトを右クリック
2. 「情報を見る」を選択
3. 「このアプリケーションで開く」で「ターミナル.app」を選択

または、Automatorを使ってアプリケーションとして作成することもできます。

