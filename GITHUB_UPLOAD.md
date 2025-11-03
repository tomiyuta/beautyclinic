# GitHubアップロード手順

このドキュメントは、このプロジェクトをGitHubにアップロードする手順を説明します。

## 事前準備

1. GitHubアカウントを作成（まだの場合）
2. GitHub CLI (`gh`) がインストールされていることを確認
   ```bash
   gh --version
   ```
   インストールされていない場合：
   ```bash
   brew install gh  # macOS
   ```

## アップロード方法

### 方法1: GitHub CLIを使用（推奨）

```bash
# 1. GitHubにログイン（初回のみ）
gh auth login

# 2. リポジトリを作成してプッシュ
cd "/Users/yutatomi/Desktop/pips解析/ai-clinic-platform"
gh repo create ai-clinic-platform --public --source=. --remote=origin --push
```

### 方法2: 手動でGitHubリポジトリを作成してプッシュ

1. **GitHubでリポジトリを作成**
   - https://github.com/new にアクセス
   - リポジトリ名: `ai-clinic-platform`
   - 説明: "美容クリニック向けAI協調プラットフォーム"
   - Public または Private を選択
   - "Initialize this repository with a README" はチェックしない

2. **ローカルでコミットとプッシュ**
   ```bash
   cd "/Users/yutatomi/Desktop/pips解析/ai-clinic-platform"
   
   # 変更をステージング
   git add -A
   
   # コミット
   git commit -m "Initial commit: 美容クリニックAI協調プラットフォーム"
   
   # リモートリポジトリを追加（YOUR_USERNAMEをあなたのGitHubユーザー名に置き換え）
   git remote add origin https://github.com/YOUR_USERNAME/ai-clinic-platform.git
   
   # プッシュ
   git branch -M main
   git push -u origin main
   ```

## 注意事項

### アップロード前に確認すべきこと

1. **`.env`ファイルがアップロードされていないか**
   - `.gitignore`で`.env*`が除外されていることを確認
   - `.env.example`はアップロードOK（テンプレートとして）

2. **機密情報が含まれていないか**
   - APIキー、パスワード、トークンなどの機密情報がないか確認
   - 特に以下のファイルをチェック：
     - `.env`
     - `package.json`（スクリプト内の機密情報）
     - 設定ファイル

3. **不要なファイルが含まれていないか**
   - `node_modules/`
   - `.next/`
   - ログファイル
   - ビルド成果物

### アップロード後に設定すべきこと

1. **リポジトリ設定**
   - Description（説明）を追加
   - Topics（トピック）を追加: `nextjs`, `trpc`, `prisma`, `ai`, `beauty-clinic`
   - README.mdが表示されることを確認

2. **GitHub Actions（オプション）**
   - CI/CDパイプラインの設定
   - 自動テストの実行

3. **セキュリティ**
   - リポジトリをPrivateにするか検討
   - Dependabotを有効化（依存関係のセキュリティ更新）

## トラブルシューティング

### "Permission denied" エラー

```bash
# GitHub CLIで認証を再確認
gh auth login

# SSH鍵を使用している場合
ssh-add ~/.ssh/id_rsa
```

### "remote origin already exists" エラー

```bash
# 既存のリモートを削除
git remote remove origin

# 新しいリモートを追加
git remote add origin https://github.com/YOUR_USERNAME/ai-clinic-platform.git
```

### 大きなファイルのアップロードエラー

GitHubは100MB以上のファイルをアップロードできません。以下のコマンドで大きなファイルを確認：

```bash
find . -type f -size +10M -not -path "./.git/*" -not -path "./node_modules/*"
```

大きなファイルは`.gitignore`に追加してください。

