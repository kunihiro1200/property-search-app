# 環境定義（絶対に間違えないルール）

## ⚠️ 重要：本番環境とローカル環境の定義

このプロジェクトには**本番環境**と**ローカル環境**があります。
**絶対に混同しないでください。**

---

## ✅ 本番環境（Vercel）

**URL**: `https://property-site-frontend-kappa.vercel.app/public/properties`

**特徴**:
- Vercelにデプロイされた環境
- 実際のユーザーがアクセスする環境
- 変更は慎重に行う必要がある

**確認方法**:
- URLが`https://property-site-frontend-kappa.vercel.app`で始まる
- ブラウザのアドレスバーに`vercel.app`が含まれる

---

## ✅ ローカル環境（開発環境）

**URL**: `http://localhost:5173/public/properties`

**管理者モードURL**: `http://localhost:5173/public/properties?canHide=true`

**特徴**:
- ローカルマシンで実行されている開発環境
- Viteの開発サーバーが`npm run dev`で起動
- ポート番号は`5173`
- 変更をテストするための環境

**確認方法**:
- URLが`http://localhost:5173`で始まる
- ブラウザのアドレスバーに`localhost:5173`が含まれる

---

## 🚨 絶対に守るべきルール

### ルール1: URLで環境を判断する

**本番環境**:
```
https://property-site-frontend-kappa.vercel.app/public/properties
```

**ローカル環境**:
```
http://localhost:5173/public/properties
```

### ルール2: ユーザーが「本番環境」と言った場合

- Vercelにデプロイされた環境を指す
- URL: `https://property-site-frontend-kappa.vercel.app`

### ルール3: ユーザーが「ローカル環境」と言った場合

- ローカルマシンで実行されている開発環境を指す
- URL: `http://localhost:5173`

### ルール4: ポート番号で判断する

- **ポート5173** = ローカル環境（Vite開発サーバー）
- **ポート5174** = 別のプロジェクト（`sateituikyaku`など）← **触ってはいけない**

---

## 📋 環境の確認方法

### 方法1: URLを確認

ユーザーが提供したURLを確認：
- `localhost:5173` → ローカル環境
- `vercel.app` → 本番環境

### 方法2: スクリーンショットを確認

ブラウザのアドレスバーを確認：
- `localhost:5173` → ローカル環境
- `property-site-frontend-kappa.vercel.app` → 本番環境

### 方法3: ユーザーに確認

不明な場合は、必ずユーザーに確認：
- 「これは本番環境（Vercel）ですか？ローカル環境（localhost:5173）ですか？」

---

## 🎯 実例

### 例1: ローカル環境での作業

**ユーザー**: 「画面が崩れてる」
**URL**: `http://localhost:5173/public/properties`

**判断**: ローカル環境での問題
**対応**: ローカルのコードを修正、Viteサーバーを再起動

---

### 例2: 本番環境での問題

**ユーザー**: 「本番環境で画像が表示されない」
**URL**: `https://property-site-frontend-kappa.vercel.app/public/properties`

**判断**: 本番環境での問題
**対応**: コードを修正してVercelにデプロイ

---

### 例3: 間違った環境

**ユーザー**: 「ローカルで画面が崩れてる」
**URL**: `http://localhost:5174/public/properties`

**判断**: ⚠️ **間違った環境！** ポート5174は別のプロジェクト
**対応**: ユーザーに確認して、正しい環境（localhost:5173）で作業

---

## 💡 よくある間違い

### ❌ 間違い1: ポート番号を見ずに判断

```
ユーザー: 「ローカルで画面が崩れてる」
URL: http://localhost:5174/public/properties
```

**問題**: ポート5174は別のプロジェクト（`sateituikyaku`）
**正解**: ポート5173が正しいローカル環境

---

### ❌ 間違い2: 「本番環境」という言葉だけで判断

```
ユーザー: 「本番環境で画面が崩れてる」
URL: http://localhost:5174/public/properties
```

**問題**: URLは`localhost`なので本番環境ではない
**正解**: URLを確認して判断する

---

### ❌ 間違い3: 環境を確認せずに作業

```
ユーザー: 「画面が崩れてる」
URL: 不明
```

**問題**: どの環境か不明
**正解**: 必ずURLを確認するか、ユーザーに確認する

---

## 📝 チェックリスト

作業を開始する前に、以下を確認してください：

- [ ] ユーザーが提供したURLを確認した
- [ ] 本番環境（`vercel.app`）かローカル環境（`localhost:5173`）か判断した
- [ ] ポート番号が`5173`であることを確認した（ローカル環境の場合）
- [ ] 不明な場合はユーザーに確認した

---

## 🔧 Vite開発サーバーの確認方法

### 現在実行中のプロセスを確認

```bash
# listProcessesツールを使用
```

**正しい状態**:
```
- [ID] "npm run dev" in c:\Users\kunih\property-search-app\frontend (running)
```

**間違った状態**:
```
- [ID] "npm run dev" in c:\Users\kunih\sateituikyaku\frontend (running)
```

**対応**: 間違ったプロセスを停止して、正しいディレクトリで起動

---

## まとめ

**本番環境**:
- URL: `https://property-site-frontend-kappa.vercel.app/public/properties`
- Vercelにデプロイされた環境

**ローカル環境**:
- URL: `http://localhost:5173/public/properties`
- ポート番号: `5173`
- Vite開発サーバー

**絶対に触ってはいけない環境**:
- `http://localhost:5174` ← 別のプロジェクト（`sateituikyaku`）
- `c:\Users\kunih\sateituikyaku` ← 本番稼働中のプロジェクト

**このルールを徹底することで、環境の混同を完全に防止できます。**

---

**最終更新日**: 2026年1月29日  
**作成理由**: 本番環境とローカル環境の混同を防ぐため
