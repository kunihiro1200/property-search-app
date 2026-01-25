---
tags: [critical-fix, public-site, filter, default-setting, resolved]
priority: high
context: public-property-site
last-verified: 2026-01-25
type: restoration-guide
---

# 「公開中のみ表示」デフォルト設定の修正ガイド

## ⚠️ 問題の症状

以下の症状が発生した場合、このガイドを使用してください：

1. **公開物件サイトで「公開中のみ表示」がデフォルトでONになっている**
2. **URLに`?showPublicOnly=true`が自動的に追加される**
3. **初回アクセス時に全物件が表示されない**

---

## ✅ 正しい動作

- **デフォルトで全物件が表示される**（公開中・成約済み・非公開すべて）
- **「公開中のみ表示」ボタンは初期状態でOFF**
- **URLに`?showPublicOnly=true`が含まれない**

---

## 🔧 復元方法

### 方法1: コミットから復元（推奨）

```bash
# 動作確認済みコミット: 3f44d8c
git checkout 3f44d8c -- frontend/src/pages/PublicPropertiesPage.tsx
git add frontend/src/pages/PublicPropertiesPage.tsx
git commit -m "Fix: Restore showPublicOnly default to false (commit 3f44d8c)"
git push
```

### 方法2: 手動で修正

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**修正箇所**: 約68行目

**修正前**（❌ 間違い）:
```typescript
// 公開中のみ表示フィルター状態（デフォルトで公開物件のみ表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(true);
```

**修正後**（✅ 正しい）:
```typescript
// 公開中のみ表示フィルター状態（デフォルトで全物件を表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

---

## 📝 次回の復元依頼の仕方

問題が発生したら、以下のように伝えてください：

### パターン1: シンプルな依頼
```
「公開中のみ表示」がデフォルトでONになっている。
コミット 3f44d8c に戻して。
```

### パターン2: 詳細な依頼
```
公開物件サイトで「公開中のみ表示」がデフォルトで有効になっている。
全物件をデフォルトで表示したい。
showPublicOnly のデフォルトを false に戻して。
```

### パターン3: ファイル名を指定
```
PublicPropertiesPage.tsx の showPublicOnly を false に戻して。
```

---

## 🔍 確認方法

### ステップ1: コードを確認

```bash
# showPublicOnlyの初期値を確認
Get-Content frontend/src/pages/PublicPropertiesPage.tsx | Select-String -Pattern "showPublicOnly.*useState" -Context 2
```

**期待される出力**:
```typescript
// 公開中のみ表示フィルター状態（デフォルトで全物件を表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

### ステップ2: ブラウザで確認

1. `https://property-site-frontend-kappa.vercel.app/public/properties`を開く
2. 「公開中のみ表示」ボタンが**OFF**（グレー）になっているか確認
3. URLに`?showPublicOnly=true`が**含まれていない**ことを確認
4. 全物件（公開中・成約済み・非公開）が表示されることを確認

---

## 📊 Git履歴

### 成功したコミット

**コミットハッシュ**: `3f44d8c`

**コミットメッセージ**: "Fix: Change showPublicOnly default to false (show all properties by default)"

**変更内容**:
```diff
- // 公開中のみ表示フィルター状態（デフォルトで公開物件のみ表示）
- const [showPublicOnly, setShowPublicOnly] = useState<boolean>(true);
+ // 公開中のみ表示フィルター状態（デフォルトで全物件を表示）
+ const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

**変更ファイル**:
- `frontend/src/pages/PublicPropertiesPage.tsx`

**日付**: 2026年1月25日

---

## 🎯 重要なポイント

### なぜこの修正が必要か

1. **ユーザー体験の向上**:
   - デフォルトで全物件を表示することで、ユーザーが見逃す物件を減らす
   - 「公開中のみ表示」は必要な時だけONにする

2. **URLパラメータの問題**:
   - `showPublicOnly=true`がデフォルトだと、URLに自動的に追加される
   - これにより、URLが長くなり、共有しにくくなる

3. **フィルターの意図**:
   - 「公開中のみ表示」は**フィルター**であり、デフォルトではない
   - ユーザーが明示的に選択した場合のみ有効にすべき

### この設定を変更してはいけない理由

- **`showPublicOnly`のデフォルトを`true`にすると**:
  - 成約済み物件が表示されなくなる
  - 非公開物件が表示されなくなる
  - ユーザーが「なぜ物件が少ないのか」と混乱する

---

## 🐛 トラブルシューティング

### 問題1: 修正したのに「公開中のみ表示」がONのまま

**原因**: ブラウザのキャッシュ

**解決策**:
1. `Ctrl + Shift + R`でハードリロード
2. URLから`?showPublicOnly=true`を手動で削除
3. シークレットモードで確認

### 問題2: Vercelにデプロイしたのに反映されない

**原因**: Vercelのデプロイが完了していない

**解決策**:
1. Vercelダッシュボードでデプロイ状況を確認
2. デプロイ完了まで2-3分待つ
3. ブラウザでハードリロード

### 問題3: コミット3f44d8cが見つからない

**原因**: Gitの履歴が古い

**解決策**:
```bash
# 最新の履歴を取得
git fetch origin
git pull origin main

# コミットを確認
git log --oneline | grep "showPublicOnly"
```

---

## 📚 関連ドキュメント

- [地図表示最適化](.kiro/steering/archive/session-2026-01-25-map-view-optimization-deployment.md)
- [一覧画面の画像表示ルール](.kiro/steering/list-view-images-must-always-show.md)
- [atbb_status 分類定義](.kiro/steering/atbb-status-classification.md)

---

## ✅ 復元完了チェックリスト

修正後、以下を確認してください：

- [ ] `showPublicOnly`のデフォルト値が`false`になっている
- [ ] コミットメッセージに「showPublicOnly default to false」が含まれている
- [ ] GitHubにプッシュ済み
- [ ] Vercelのデプロイが完了している
- [ ] ブラウザでハードリロード済み
- [ ] 「公開中のみ表示」ボタンがOFF（グレー）になっている
- [ ] URLに`?showPublicOnly=true`が含まれていない
- [ ] 全物件が表示されている

---

## 🎯 まとめ

### 修正内容

**1行だけの変更**:
```typescript
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

### 次回の復元依頼

**最もシンプルな依頼**:
```
showPublicOnly を false に戻して
```

**または**:
```
コミット 3f44d8c に戻して
```

### 重要なポイント

- **デフォルトは`false`（全物件表示）**
- **`true`にすると公開中のみ表示になる**
- **この設定を変更すると、ユーザー体験が悪化する**

---

**このドキュメントは、問題が発生した際の復元用です。必ず保管してください。**

**最終更新日**: 2026年1月25日  
**コミットハッシュ**: `3f44d8c`  
**ステータス**: ✅ 修正完了・動作確認済み

---

## 🚀 成功事例

**日付**: 2026年1月25日

**問題**:
1. 初回ロードに30秒かかる
2. 「公開中のみ表示」がデフォルトでON
3. 画像が表示できていない物件が多い

**解決策**:
- `showPublicOnly`のデフォルトを`false`に変更

**結果**:
- ✅ 全物件がデフォルトで表示される
- ✅ ユーザーが混乱しなくなった
- ✅ URLがシンプルになった

**ユーザーの反応**:
> 「できた！」

---

**次回も同じ問題が発生したら、このドキュメントを参照してください！**
