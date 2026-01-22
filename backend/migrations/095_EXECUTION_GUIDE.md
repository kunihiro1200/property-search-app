# Migration 095 実行ガイド

## 問題

フロントエンドで「売主が見つかりませんでした」と表示される問題の原因：

```
Error: Failed to list sellers: Could not find a relationship between 'sellers' and 'properties' in the schema cache
```

SellerServiceが`sellers`テーブルと`properties`テーブルの関係を探していますが、新しいデータベースにはその関係が設定されていません。

## 解決方法

### 1. Supabase SQL Editorで実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクト `krxhrbtlgfjzsseegaqq` を選択
3. 左メニューから **SQL Editor** をクリック
4. `095_setup_seller_property_relationship.sql` の内容をコピー＆ペースト
5. **Run** ボタンをクリック

### 2. 実行結果の確認

以下のようなメッセージが表示されれば成功：

```
NOTICE: propertiesテーブルを作成しました
NOTICE: seller_idカラムを追加しました
NOTICE: 外部キー制約を追加しました
```

または、既に存在する場合：

```
NOTICE: propertiesテーブルは既に存在します
NOTICE: seller_idカラムは既に存在します
NOTICE: 外部キー制約は既に存在します
```

最後に外部キー制約の情報が表示されます：

```
table_name | constraint_name              | constraint_type | column_name | foreign_table_name | foreign_column_name
-----------|------------------------------|-----------------|-------------|--------------------|-----------------
properties | properties_seller_id_fkey    | FOREIGN KEY     | seller_id   | sellers            | id
```

### 3. バックエンドを再起動

マイグレーション実行後、バックエンドを再起動してください：

```bash
# バックエンドのターミナルで Ctrl+C を押して停止
cd backend
npm run dev
```

### 4. ブラウザをリロード

- http://localhost:5173 を開いているブラウザで **F5キー** を押す
- 売主リストページで **6,649件の売主データ** が表示されるはずです

## トラブルシューティング

### まだエラーが出る場合

1. **Supabaseのスキーマキャッシュをリロード**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

2. **バックエンドを完全に再起動**:
   ```bash
   # Ctrl+C で停止
   cd backend
   npm run dev
   ```

3. **フロントエンドも再起動**:
   ```bash
   # Ctrl+C で停止
   cd frontend
   npm run dev
   ```

## 注意事項

このマイグレーションは：
- `properties`テーブルが存在しない場合は作成します
- `seller_id`カラムが存在しない場合は追加します
- 外部キー制約が存在しない場合は追加します
- 既に存在する場合は何もしません（安全）

## 次のステップ

マイグレーション実行後、売主リストが正しく表示されることを確認してください。
