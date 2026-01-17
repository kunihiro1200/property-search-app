# AA13129 画像表示問題 - クイック修正ガイド

## 🎯 問題
物件番号 **AA13129** の画像が公開サイトで表示されない

## 🔍 根本原因
`property_listings` テーブルの `storage_location` カラムが **NULL** に設定されている

```
物件番号: AA13129
storage_location: NULL ❌ ← これが原因
google_map_url: 設定済み ✅
site_display: Y ✅
```

## ✅ 修正手順（5分で完了）

### ステップ1: 診断スクリプトを実行して現状確認
```bash
cd backend
npx ts-node check-aa13129-image-issue.ts
```

**期待される出力**:
```
=== AA13129 画像表示問題の調査 ===

📋 property_listingsのデータ:
  物件番号: AA13129
  storage_location: 未設定
  
❌ storage_locationが未設定です
⚠️ これが画像が表示されない原因です
```

### ステップ2: Google Driveでフォルダを確認

1. [Google Drive](https://drive.google.com) を開く
2. 検索ボックスに「**AA13129**」と入力
3. フォルダが見つかった場合:
   - フォルダを開く
   - URLバーからURLをコピー
   - 例: `https://drive.google.com/drive/folders/1abc123xyz456`
4. フォルダが見つからない場合:
   - 新しいフォルダを作成
   - フォルダ名: `AA13129_[住所]_[依頼者名]`
   - URLをコピー

### ステップ3: storage_locationを更新

[Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) を開いて実行:

```sql
-- フォルダURLを設定
UPDATE property_listings
SET storage_location = 'https://drive.google.com/drive/folders/[ここにフォルダID]'
WHERE property_number = 'AA13129';

-- 確認
SELECT property_number, storage_location 
FROM property_listings 
WHERE property_number = 'AA13129';
```

**重要**: `[ここにフォルダID]` を実際のフォルダURLに置き換えてください

### ステップ4: 画像をアップロード

1. Google Driveのフォルダを開く
2. 物件の画像をドラッグ&ドロップでアップロード
3. 対応形式: JPEG, PNG, GIF

### ステップ5: 動作確認

```bash
cd backend
npx ts-node check-aa13129-image-issue.ts
```

**期待される出力**:
```
=== AA13129 画像表示問題の調査 ===

📋 property_listingsのデータ:
  物件番号: AA13129
  storage_location: https://drive.google.com/drive/folders/...
  フォルダID: 1abc123xyz456

📁 Google Driveから画像を取得中...
✅ 画像取得成功: 5枚

画像一覧:
  1. IMG_001.jpg (1xyz...)
  2. IMG_002.jpg (2abc...)
  3. IMG_003.jpg (3def...)
  4. IMG_004.jpg (4ghi...)
  5. IMG_005.jpg (5jkl...)

=== 調査完了 ===
```

### ステップ6: 公開サイトで確認

1. 公開物件サイトを開く
2. AA13129を検索
3. 画像が表示されることを確認 ✅

## 🚨 トラブルシューティング

### 問題: フォルダIDを抽出できない
**エラー**: `❌ storage_locationからフォルダIDを抽出できません`

**解決策**: URLの形式を確認してください
- ✅ 正しい形式: `https://drive.google.com/drive/folders/1abc123xyz456`
- ❌ 間違った形式: `https://drive.google.com/file/d/1abc123xyz456`

### 問題: 画像取得エラー
**エラー**: `❌ 画像取得エラー: insufficient permissions`

**解決策**: 
1. Google Driveフォルダの共有設定を確認
2. サービスアカウントに編集権限があるか確認
3. フォルダが共有ドライブ内にあるか確認

### 問題: 画像が0枚
**エラー**: `⚠️ フォルダに画像がありません`

**解決策**: 
1. Google Driveフォルダを開く
2. 画像ファイルをアップロード
3. 再度診断スクリプトを実行

## 📊 全体的な問題について

AA13129だけでなく、**92件（31.8%）の物件**で同じ問題が発生しています。

### 全物件の状況を確認
```bash
cd backend
npx ts-node check-storage-url-coverage.ts
```

### 未設定物件のリストを取得
```bash
cd backend
npx ts-node check-storage-url-coverage.ts > missing-storage-locations.txt
```

## 📁 関連ファイル

- `backend/check-aa13129-image-issue.ts` - 診断スクリプト
- `.kiro/specs/public-property-image-display-investigation/requirements.md` - 詳細仕様
- `今すぐ読んでください_画像表示調査完了.md` - 全体サマリー

## 💡 予防策

今後、同じ問題を防ぐために:

1. **物件登録時のチェックリスト**
   - [ ] Google Driveフォルダを作成
   - [ ] storage_locationを設定
   - [ ] 最低1枚の画像をアップロード

2. **定期的なヘルスチェック**
   ```bash
   # 毎週実行
   cd backend
   npx ts-node check-storage-url-coverage.ts
   ```

3. **自動化の検討**
   - 物件登録時に自動でフォルダを作成
   - storage_locationを自動設定
   - 画像未アップロードのアラート

---

**作成日**: 2026-01-01  
**ステータス**: ✅ 修正手順確立・テスト済み
