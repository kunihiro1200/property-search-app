# コメントデータの安定性確認ガイド

## 📋 概要

このガイドは、公開物件サイトのコメントデータが定期的に消失する問題が修正されたかを確認するためのものです。

---

## 🚨 問題の背景

**症状**: 公開物件サイトで、コメント（お気に入り文言、オススメコメント、内覧前コメント）が「よく発生する」形で繰り返し消失していた

**根本原因**: `PropertyListingSyncService.syncUpdatedPropertyListings()`が5分ごとに実行され、エラー時に`null`を返していたため、既存のコメントデータが`null`で上書きされていた

**修正内容**: エラー時に`undefined`を返すように変更し、`undefined`のフィールドは既存値を保持するように修正

**修正日**: 2026年2月2日

**コミット**: `842eb51` - "Fix: Prevent null overwrite of property_details when sync errors occur"

---

## ✅ 数日後の確認方法

### 方法1: 確認スクリプトを実行（推奨）

```bash
npx ts-node backend/check-comment-data-stability.ts
```

**このスクリプトが確認すること**:
1. AA5564のコメントデータが保持されているか
2. 全物件のコメントデータ状況（空の物件数、データがある物件数）
3. 最近更新された物件のコメントデータ状況

**期待される結果**:
- AA5564のコメントデータが全て保持されている
- コメントデータが空の物件数が増えていない
- 最近更新された物件でもコメントデータが保持されている

---

### 方法2: KIROに確認を依頼

以下のように依頼してください：

```
「コメントデータの安定性を確認して」
```

または

```
「npx ts-node backend/check-comment-data-stability.ts を実行して結果を教えて」
```

KIROが自動的にスクリプトを実行して、結果を報告します。

---

### 方法3: 手動でデータベースを確認

```bash
# AA5564のコメントデータを確認
npx ts-node backend/check-aa5564-comments.ts
```

**期待される結果**:
```
[PropertyDetailsService] Found details for AA5564:
  has_property_about: true
  has_recommended_comments: true
  recommended_comments_length: 3
  has_athome_data: true
  athome_data_length: 10
  has_favorite_comment: true
```

---

## 📊 確認のタイミング

**推奨**: 修正後、以下のタイミングで確認してください

1. **1日後**: 最初の確認（問題が再発していないか）
2. **3日後**: 中間確認（安定性の確認）
3. **1週間後**: 最終確認（完全に修正されたか）

---

## 🚨 問題が再発した場合

### ステップ1: 確認スクリプトを実行

```bash
npx ts-node backend/check-comment-data-stability.ts
```

### ステップ2: Vercelログを確認

```bash
# Vercelログを確認（最新100行）
vercel logs --follow
```

**確認ポイント**:
- `[PropertyListingSyncService] Failed to get property_about for AA5564`のようなエラーログ
- `[PropertyListingSyncService] No valid data to update for AA5564 (all fields failed)`のようなログ

### ステップ3: KIROに報告

以下のように報告してください：

```
「コメントデータが再び消失した。AA5564のコメントが表示されない。Vercelログを確認して原因を調査して」
```

---

## 📝 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/services/PropertyListingSyncService.ts` | 修正済みの同期サービス |
| `backend/src/services/PropertyDetailsService.ts` | マージロジック（変更なし） |
| `backend/check-comment-data-stability.ts` | 確認用スクリプト |
| `.kiro/specs/public-property-comment-display-fix/design.md` | 根本原因の詳細分析 |

---

## 🎯 修正の効果

**修正前**:
- エラー時に`null`を返す → 既存データが`null`で上書きされる → コメントが消失

**修正後**:
- エラー時に`undefined`を返す → 既存データを保持 → コメントが消失しない

**影響範囲**:
- ✅ コメント表示: **改善**（`property_details`テーブルのみ）
- ✅ 画像表示: 影響なし（`property_listings`テーブル）
- ✅ お問合せ送信: 影響なし（`buyers`テーブル）
- ✅ バッジ表示: 影響なし（`property_listings`テーブル）
- ✅ 並び順: 影響なし（`property_listings`テーブル）

---

**最終更新日**: 2026年2月2日  
**作成理由**: 数日後にコメントデータの安定性を確認するため

