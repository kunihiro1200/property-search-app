# GitHub Pagesデプロイガイド

## 概要

このプロジェクトは GitHub Pages でホスティングされています。

- **本番URL**: https://kunihiro1200.github.io/property-search-app/
- **デプロイ元**: `docs`フォルダ（`main`ブランチ）

## 重要な注意事項

### ⚠️ `.nojekyll`ファイルを削除しないでください

`docs/.nojekyll`ファイルは**絶対に削除しないでください**。

**理由**:
- GitHub PagesはデフォルトでJekyll（静的サイトジェネレーター）を使用します
- Jekyllは`.md`ファイル内の`{{ }}`をLiquidテンプレートとして解釈しようとします
- このプロジェクトには`docs/PUBLIC_PROPERTY_HEADER_GUIDE.md`などにJavaScriptコード（`{{ }}`）が含まれています
- `.nojekyll`ファイルがないと、Jekyllがエラーを起こしてデプロイが失敗します

**エラー例**:
```
Liquid syntax error (line 128): Variable '{{ minWidth: 'auto', whiteSpace: 'nowrap', '& .MuiButton-startIcon': { marginRight: '4px', }' was not properly terminated with regexp: /\}\}/
```

## デプロイ手順

### 1. ファイルを更新

```bash
# docsフォルダ内のファイルを編集
# 例: docs/index.html, docs/app.js など
```

### 2. 変更をコミット

```bash
git add docs/
git commit -m "Update website"
git push origin main
```

### 3. デプロイを確認

#### 3.1 GitHub Actionsを確認

1. https://github.com/kunihiro1200/property-search-app/actions にアクセス
2. 最新のワークフロー（`pages build and deployment`）を確認
3. ステータスが成功（✓）になるまで待つ（通常1-3分）

#### 3.2 本番サイトを確認

1. https://kunihiro1200.github.io/property-search-app/ にアクセス
2. 変更が反映されているか確認

## トラブルシューティング

### 404エラーが発生した場合

#### 原因1: ファイルがコミットされていない

```bash
# 未追跡ファイルを確認
git status

# docsフォルダのファイルをコミット
git add docs/
git commit -m "Add missing files"
git push origin main
```

#### 原因2: `.nojekyll`ファイルがない

```bash
# .nojekyllファイルが存在するか確認
ls docs/.nojekyll

# なければ作成
touch docs/.nojekyll
git add docs/.nojekyll
git commit -m "Add .nojekyll to disable Jekyll"
git push origin main
```

#### 原因3: GitHub Pagesの設定が間違っている

1. https://github.com/kunihiro1200/property-search-app/settings/pages にアクセス
2. 以下の設定を確認：
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/docs`
3. 設定を変更した場合は**Save**をクリック

### デプロイが失敗する場合

#### ステップ1: GitHub Actionsのエラーログを確認

1. https://github.com/kunihiro1200/property-search-app/actions にアクセス
2. 失敗したワークフロー（×マーク）をクリック
3. **build**ステップをクリック
4. エラーメッセージを確認

#### ステップ2: よくあるエラーと対処法

**エラー**: `Liquid syntax error`

**原因**: `.nojekyll`ファイルがない

**対処法**:
```bash
touch docs/.nojekyll
git add docs/.nojekyll
git commit -m "Add .nojekyll"
git push origin main
```

**エラー**: `File not found`

**原因**: `docs/index.html`が存在しない

**対処法**:
```bash
# index.htmlが存在するか確認
ls docs/index.html

# なければ作成またはコミット
git add docs/index.html
git commit -m "Add index.html"
git push origin main
```

### 強制的に再デプロイする方法

```bash
# 空のコミットを作成してプッシュ
git commit --allow-empty -m "Force GitHub Pages rebuild"
git push origin main
```

## ファイル構成

```
docs/
├── .nojekyll                          ← 重要！削除しないこと
├── index.html                         ← メインHTMLファイル
├── styles.css                         ← スタイルシート
├── app.js                             ← メインJavaScript
├── PropertyForm.js                    ← フォームロジック
├── APIClient.js                       ← API通信
├── utils.js                           ← ユーティリティ関数
├── config.js                          ← 設定ファイル
└── *.md                               ← ドキュメントファイル
```

## 定期的なメンテナンス

### 毎回のデプロイ時

- [ ] `git status`で未追跡ファイルを確認
- [ ] GitHub Actionsでデプロイ成功を確認
- [ ] 本番サイトで動作確認

### 月次

- [ ] `.nojekyll`ファイルが存在するか確認
- [ ] GitHub Pagesの設定が正しいか確認
- [ ] 不要なファイルを削除

## 参考リンク

- [GitHub Pages公式ドキュメント](https://docs.github.com/ja/pages)
- [Jekyllを無効化する方法](https://docs.github.com/ja/pages/getting-started-with-github-pages/about-github-pages#static-site-generators)
- [本プロジェクトのActions](https://github.com/kunihiro1200/property-search-app/actions)
- [本プロジェクトのPages設定](https://github.com/kunihiro1200/property-search-app/settings/pages)

## まとめ

**最重要ポイント**:
1. **`.nojekyll`ファイルを削除しない**
2. **デプロイ後は必ずGitHub Actionsを確認**
3. **404エラーが出たら、まず`git status`で未追跡ファイルを確認**

これらを守れば、安定したデプロイが可能です。
