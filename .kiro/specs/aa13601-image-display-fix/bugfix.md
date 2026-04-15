# Bugfix Requirements Document

## Introduction

公開物件サイト（本番環境: property-site-frontend-kappa.vercel.app）において、物件AA13601の詳細ページ `/public/properties/AA13601` で「画像がありません」と表示されるバグ。Google Driveの `athome公開` フォルダには画像が存在しているにもかかわらず、フロントエンドの `PropertyImageGallery` コンポーネントが空の画像リストを受け取っている。

コンソールログ `PropertyImageGallery - isLoading: false, isError: false, data: Object` から、APIリクエスト自体は成功しているが、レスポンスの `images` 配列が空であることが確認されている。

過去にAA12649で同様の問題が発生しており、その際は `backend/api/index.ts` の `PropertyImageService` コンストラクタ呼び出しが間違っていたことが原因だった。今回も同様のパターンか、AA13601の `storage_location` がデータベースに設定されていないことが原因と考えられる。

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーが `/public/properties/AA13601` にアクセスする THEN システムは「画像がありません」と表示する

1.2 WHEN フロントエンドの `usePropertyImages` フックが `/api/public/properties/AA13601/images` を呼び出す THEN システムは `images: []`（空配列）を返す

1.3 WHEN `PropertyImageGallery` コンポーネントが `data: Object` を受け取る THEN システムは `images.length === 0` と判定して「画像がありません」メッセージを表示する

1.4 WHEN バックエンドの `/api/public/properties/:identifier/images` エンドポイントが処理される THEN システムはAA13601の `storage_location` が空またはフォルダ検索に失敗して空配列を返す

### Expected Behavior (Correct)

2.1 WHEN ユーザーが `/public/properties/AA13601` にアクセスする THEN システムはGoogle Driveの `athome公開` フォルダに存在する画像を表示する

2.2 WHEN フロントエンドの `usePropertyImages` フックが `/api/public/properties/AA13601/images` を呼び出す THEN システムは `images` 配列に1件以上の画像オブジェクトを含むレスポンスを返す

2.3 WHEN バックエンドがAA13601の画像を取得する THEN システムはSHALL `storage_location`（またはフォールバックとして `athome_data[0]` や業務リストの格納先URL）からGoogle DriveフォルダIDを正しく抽出し、`athome公開` サブフォルダ内の画像一覧を返す

2.4 WHEN `PropertyImageService.getImagesFromStorageUrl()` が呼び出される THEN システムはSHALL Google Driveの `athome公開` フォルダから画像ファイルを取得して返す

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ユーザーが `storage_location` が正しく設定されている他の物件（例: AA12649）の詳細ページにアクセスする THEN システムはSHALL CONTINUE TO 画像を正常に表示する

3.2 WHEN `/api/public/properties/:identifier/images` エンドポイントが有効な `storage_location` を持つ物件に対して呼び出される THEN システムはSHALL CONTINUE TO `PropertyImageService` を通じてGoogle Driveから画像を取得して返す

3.3 WHEN `PropertyImageService.getImagesFromStorageUrl()` が有効なGoogle DriveフォルダURLで呼び出される THEN システムはSHALL CONTINUE TO `athome公開` サブフォルダを優先的に検索し、存在する場合はそのフォルダの画像を返す

3.4 WHEN 物件の `storage_location` が空の場合 THEN システムはSHALL CONTINUE TO `athome_data[0]` または業務リスト（業務依頼）スプレッドシートの格納先URLをフォールバックとして使用する

3.5 WHEN 公開物件一覧ページ（`/public/properties`）が表示される THEN システムはSHALL CONTINUE TO 各物件のサムネイル画像を正常に表示する
