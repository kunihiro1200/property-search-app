# クイックスタート: 50件の格納先URL一括修正

## 概要

約50件の物件（AA11165を含む）の`storage_location`が欠落しています。
一括修正スクリプトで全て修正できます。

## 3ステップで完了

### ステップ1: 診断（修正なし）

```bash
cd backend
npx ts-node find-and-fix-all-storage-location-mismatches.ts
```

**確認事項:**
- 不一致件数が約50件であること
- 対象物件が正しいこと
- スプレッドシートの値がGoogle DriveのURLであること

### ステップ2: 一括修正

```bash
cd backend
FIX=true npx ts-node find-and-fix-all-storage-location-mismatches.ts
```

**処理内容:**
- 業務依頼シートのCO列から正しい値を取得
- データベースの`storage_location`を更新
- 約1-2分で完了

### ステップ3: 確認

```bash
cd backend
npx ts-node find-and-fix-all-storage-location-mismatches.ts
```

**期待される結果:**
```
不一致件数: 0
✅ 不一致はありません！
```

## 個別修正（オプション）

特定の物件だけ修正したい場合:

```bash
cd backend

# 1件だけ修正
npx ts-node fix-storage-location-for-any-property.ts AA11165

# 複数件を指定して修正
npx ts-node fix-storage-location-for-any-property.ts AA11165 AA11166 AA11167
```

## データソース

- **正しいデータ:** 業務依頼シート（スプレッドシートID: 1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g）
- **シート名:** 業務依頼
- **A列:** 物件番号
- **CO列（93列目）:** 格納先URL（保存場所）

## 所要時間

- 診断: 約30秒
- 修正: 約1-2分（50件の場合）
- 確認: 約30秒

**合計: 約3分**

## 安全性

- ✅ 既存データは上書きされるだけ（削除されない）
- ✅ 何度実行しても安全
- ✅ 修正前に診断モードで確認できる
- ✅ 詳細なレポートで結果を確認できる

## トラブルシューティング

### エラー: サービスアカウントキーが見つからない

```bash
# 環境変数を確認
echo $GOOGLE_SERVICE_ACCOUNT_KEY_PATH

# ファイルの存在を確認
ls -la google-service-account.json
```

### エラー: 権限不足

Google Service Accountにスプレッドシートへの読み取り権限があるか確認してください。

### 一部の物件が失敗

出力されたエラーメッセージを確認してください。よくある原因:
- データベース接続の問題
- 物件番号の形式が不正
- データベース制約違反

## 完了後の確認

```sql
-- AA11165を確認
SELECT property_number, storage_location 
FROM property_listings 
WHERE property_number = 'AA11165';

-- 最近更新された物件を確認
SELECT property_number, storage_location, updated_at
FROM property_listings 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- storage_locationがある物件数を確認
SELECT 
  COUNT(*) as 合計,
  COUNT(storage_location) as 格納先あり,
  COUNT(*) - COUNT(storage_location) as 格納先なし
FROM property_listings;
```

## 関連ファイル

- `backend/今すぐ実行_50件の格納先URL修正.md` - 詳細な実行手順（日本語）
- `backend/find-and-fix-all-storage-location-mismatches.ts` - 一括修正スクリプト
- `backend/fix-storage-location-for-any-property.ts` - 個別修正スクリプト
- `.kiro/specs/property-listing-storage-url-sync-fix/BATCH_FIX_GUIDE.md` - 詳細ガイド（英語）

## まとめ

✅ **一括修正スクリプトは実装済み**  
✅ **約3分で50件全て修正可能**  
✅ **安全に何度でも実行可能**  
✅ **詳細なレポートで結果確認**  

今すぐ実行できます！
