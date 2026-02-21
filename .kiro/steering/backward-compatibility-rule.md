# 後方互換性ルール（絶対に守るべきルール）

## ⚠️ 最重要：既存のURLを壊さない

**絶対に守るべき原則**:
- **既存のURLは常に動作し続けなければならない**
- **URLの変更や削除は、必ず事前にユーザーに報告する**
- URLの変更や削除は、ユーザーに大きな影響を与える
- お客様が過去のURLを見れなくなると大変なことになる

---

## 🚨 URL変更時の必須手順

### ステップ1: ユーザーに事前報告（必須）

**URLを変更・削除する前に、必ずユーザーに報告してください**:
1. 変更内容を説明
2. 影響範囲を説明
3. 代替URLを提供
4. 移行期間を設定（最低1週間）

### ステップ2: 変更を実装

ユーザーの承認を得てから、変更を実装してください。

### ステップ3: リダイレクトを追加

古いURLから新しいURLへのリダイレクトを必ず追加してください。

---

## 📋 URL変更の影響

### 影響を受けるもの
1. **ブックマーク**: ユーザーが保存したURL
2. **外部リンク**: 他のサイトからのリンク
3. **メール**: 送信済みのメール内のリンク
4. **SNS**: シェアされたリンク
5. **検索エンジン**: Googleなどにインデックスされたページ

### 過去の問題例
- **2026年2月6日**: `/public/properties/AA5030`が404エラーになった
  - 原因: `publicPropertiesRoutes`がコメントアウトされていた
  - 影響: パスパラメータURLが動作しなくなった
  - 解決: `publicPropertiesRoutes`のコメントアウトを解除

---

## ✅ 正しいURL変更の手順

### ステップ1: 既存のURLを確認

変更前に、以下を確認：
- [ ] 既存のURLパターンをリストアップ
- [ ] 各URLが現在動作しているか確認
- [ ] 変更後も動作し続けるか確認

### ステップ2: 後方互換性を保つ

**新しいURLを追加する場合**:
- ✅ 既存のURLはそのまま残す
- ✅ 新しいURLを追加する
- ✅ 両方のURLが動作することを確認

**URLを変更する場合**:
- ✅ 古いURLから新しいURLへリダイレクト（301 Moved Permanently）
- ✅ 古いURLは最低6ヶ月間は動作させる
- ✅ ユーザーに事前に通知する

### ステップ3: ユーザーに報告

**既存のURLが動作しなくなる場合**:
1. **事前にユーザーに報告する**（最低1週間前）
2. 影響範囲を説明する
3. 代替URLを提供する
4. 移行期間を設ける

---

## 🚨 絶対にやってはいけないこと

### ❌ 禁止事項1: 既存のURLを突然削除

```typescript
// ❌ 間違い: 既存のエンドポイントをコメントアウト
// app.use('/api/public', publicPropertiesRoutes);
```

**影響**:
- 既存のURLが404エラーになる
- ユーザーがアクセスできなくなる
- ブックマークが壊れる

### ❌ 禁止事項2: URLパターンを変更

```typescript
// ❌ 間違い: URLパターンを変更
// 変更前: /public/properties/:id
// 変更後: /properties/:id
```

**影響**:
- 既存のURLが動作しなくなる
- 外部リンクが壊れる

### ❌ 禁止事項3: リダイレクトなしでURLを変更

```typescript
// ❌ 間違い: 古いURLを削除して新しいURLを追加
router.delete('/old-endpoint', ...);
router.get('/new-endpoint', ...);
```

**正しい方法**:
```typescript
// ✅ 正しい: 古いURLから新しいURLへリダイレクト
router.get('/old-endpoint', (req, res) => {
  res.redirect(301, '/new-endpoint');
});
router.get('/new-endpoint', ...);
```

---

## 📝 URL変更チェックリスト

変更前に以下を確認：

### 1. 既存のURLを確認
- [ ] 現在動作しているURLをリストアップ
- [ ] 各URLのアクセス頻度を確認
- [ ] 外部リンクの有無を確認

### 2. 後方互換性を確認
- [ ] 既存のURLが動作し続けるか確認
- [ ] リダイレクトが必要か確認
- [ ] テストを実行して動作確認

### 3. ユーザーへの影響を確認
- [ ] 影響を受けるユーザー数を推定
- [ ] 代替URLを用意
- [ ] 移行期間を設定

### 4. ユーザーに報告
- [ ] 変更内容を説明
- [ ] 影響範囲を説明
- [ ] 代替URLを提供
- [ ] 移行期間を通知

---

## 🎯 実装例

### 例1: 新しいURLを追加（既存のURLはそのまま）

```typescript
// ✅ 正しい: 既存のURLはそのまま、新しいURLを追加
router.get('/properties/:id', ...); // 既存のURL
router.get('/properties/:id/details', ...); // 新しいURL
```

### 例2: URLを変更（リダイレクトを追加）

```typescript
// ✅ 正しい: 古いURLから新しいURLへリダイレクト
router.get('/old-properties/:id', (req, res) => {
  res.redirect(301, `/properties/${req.params.id}`);
});
router.get('/properties/:id', ...); // 新しいURL
```

### 例3: クエリパラメータとパスパラメータの両方をサポート

```typescript
// ✅ 正しい: 両方のURLパターンをサポート
router.get('/properties', async (req, res) => {
  const { propertyNumber } = req.query;
  if (propertyNumber) {
    // クエリパラメータでの検索
    // /properties?propertyNumber=AA5030
  }
  // 通常の一覧取得
});

router.get('/properties/:identifier', async (req, res) => {
  // パスパラメータでの取得
  // /properties/AA5030
});
```

---

## 📊 URL変更の影響度

| 変更内容 | 影響度 | 対応 |
|---------|-------|------|
| 新しいURLを追加 | 低 | そのまま追加 |
| URLパラメータを追加 | 低 | 既存のURLはそのまま |
| URLパターンを変更 | 高 | リダイレクト必須 |
| URLを削除 | 最高 | 事前通知 + リダイレクト必須 |

---

## 🔍 テスト方法

### 1. 既存のURLが動作するか確認

```bash
# パスパラメータURL
curl https://property-site-frontend-kappa.vercel.app/public/properties/AA5030

# クエリパラメータURL
curl "https://property-site-frontend-kappa.vercel.app/public/properties?propertyNumber=AA5030"

# UUID形式
curl https://property-site-frontend-kappa.vercel.app/public/properties/90de1182-b015-430d-9d53-4ccf9dc2591a
```

### 2. リダイレクトが動作するか確認

```bash
# リダイレクトを確認（-Lオプションでリダイレクトを追跡）
curl -L https://property-site-frontend-kappa.vercel.app/old-url
```

---

## まとめ

**絶対に守るべきルール**:

1. **既存のURLは常に動作し続けなければならない**
2. **URLを変更する場合は、リダイレクトを追加する**
3. **既存のURLが動作しなくなる場合は、事前にユーザーに報告する**
4. **新しいURLを追加する場合は、既存のURLはそのまま残す**
5. **テストを実行して、既存のURLが動作することを確認する**

**このルールを徹底することで、ユーザーに影響を与えることなく、システムを改善できます。**

---

**最終更新日**: 2026年2月6日  
**作成理由**: 既存のURLが動作しなくなる問題を防ぐため  
**関連する問題**: `/public/properties/AA5030`が404エラーになった問題
