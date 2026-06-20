# バグ修正要件ドキュメント

## はじめに

公開物件サイトにおいて、物件一覧ページでは価格が正しく表示されているにもかかわらず、詳細ページでは「価格応談」と表示されてしまうバグが存在する。CC19で確認されている。

一覧ページのAPIエンドポイント（`GET /api/public/properties`）は `PropertyListingService.getPublicProperties()` を経由して `sales_price || listing_price` を `price` フィールドとして計算・返却している。一方、詳細ページのAPIエンドポイント（`GET /api/public/properties/:propertyIdentifier`）は Supabase から `select('*')` で全フィールドを取得するが、`price` フィールドの計算を行わずそのままレスポンスを返している。フロントエンドの `formatPrice` 関数は `price` が `undefined` または `0` の場合に「価格応談」を返すため、詳細ページで価格が表示されない。

## バグ分析

### 現在の動作（不具合）

1.1 WHEN ユーザーが物件詳細ページ（`/public/properties/:id`）にアクセスする THEN システムは `GET /api/public/properties/:propertyIdentifier` エンドポイントから `price` フィールドが計算されていないレスポンスを受け取り、「価格応談」と表示する

1.2 WHEN `property_listings` テーブルに `sales_price` または `listing_price` が存在する物件の詳細ページにアクセスする THEN システムは `price` フィールドを計算せずに `undefined` のまま返すため、フロントエンドで「価格応談」と表示する

### 期待される動作（正しい動作）

2.1 WHEN ユーザーが物件詳細ページにアクセスする THEN システムは `sales_price || listing_price` を `price` フィールドとして計算し、一覧ページと同じ価格を表示する

2.2 WHEN `property_listings` テーブルに `sales_price` または `listing_price` が存在する物件の詳細ページにアクセスする THEN システムは `price` フィールドに `sales_price`（優先）または `listing_price` の値を設定してレスポンスを返す

### 変更してはいけない動作（リグレッション防止）

3.1 WHEN ユーザーが物件一覧ページにアクセスする THEN システムは引き続き `sales_price || listing_price` を `price` として正しく表示する

3.2 WHEN `sales_price` も `listing_price` も存在しない物件の詳細ページにアクセスする THEN システムは引き続き「価格応談」と表示する

3.3 WHEN ユーザーが物件詳細ページにアクセスする THEN システムは価格以外の全フィールド（住所、物件タイプ、面積、画像など）を引き続き正しく表示する

3.4 WHEN ユーザーが物件詳細ページにアクセスする THEN システムは `backend/api/` のみを変更し、`backend/src/` や `vercel.json` には影響を与えない
