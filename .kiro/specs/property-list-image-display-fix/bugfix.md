# Bugfix Requirements Document

## Introduction

公開物件サイト（https://property-site-frontend-kappa.vercel.app/public/properties）の一覧ページで、物件カードの画像が表示されなくなっている。「公開前」などのオーバーレイバッジは表示されているが、背景の物件画像がグレーのプレースホルダーのみになっている。

以前は正常に表示されていたが、最近の変更後に発生した。原因は `PropertyImageService.convertToPropertyImages()` が画像のサムネイルURLを生成する際に `process.env.BACKEND_URL` 環境変数に依存しており、Vercel 本番環境でこの変数が未設定または誤った値の場合、`thumbnailUrl` が `http://localhost:3000/api/public/images/...` という到達不能なURLになってしまうことにある。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Vercel 本番環境で公開物件一覧ページを開いたとき THEN システムは物件カードの画像をグレーの背景（プレースホルダー）として表示する

1.2 WHEN `BACKEND_URL` 環境変数が未設定または誤った値の状態で `PropertyImageService.convertToPropertyImages()` が呼ばれたとき THEN システムは `thumbnailUrl` を `http://localhost:3000/api/public/images/{fileId}/thumbnail` という到達不能なURLで生成する

1.3 WHEN フロントエンドの `PublicPropertyCard` が `property.images[0].thumbnailUrl` を `<img src>` に設定したとき THEN システムはローカルホストへのリクエストを試みるため画像の読み込みに失敗する

### Expected Behavior (Correct)

2.1 WHEN Vercel 本番環境で公開物件一覧ページを開いたとき THEN システムは物件カードに Google Drive から取得した物件画像を正しく表示する

2.2 WHEN `PropertyImageService.convertToPropertyImages()` が呼ばれたとき THEN システムは `BACKEND_URL` 環境変数に依存せず、リクエストのオリジン（`https://property-site-frontend-kappa.vercel.app`）に基づいた正しい `thumbnailUrl` を生成する

2.3 WHEN `storage_location` が設定されている物件の画像を取得したとき THEN システムは Google Drive から画像を取得し、プロキシ経由で正しいURLを返す

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ローカル環境（localhost:5173）で公開物件一覧ページを開いたとき THEN システムは引き続き物件画像を正しく表示する

3.2 WHEN `image_url` が直接設定されている物件を表示したとき THEN システムは引き続きその `image_url` を使用して画像を表示する

3.3 WHEN `storage_location` も `image_url` も設定されていない物件を表示したとき THEN システムは引き続きプレースホルダー画像を表示する

3.4 WHEN 公開物件詳細ページ（`/public/properties/:id`）で画像を表示したとき THEN システムは引き続き正しく画像を表示する

3.5 WHEN `skipImages=true` パラメータで地図ビュー用の物件一覧を取得したとき THEN システムは引き続き画像取得をスキップして高速にレスポンスを返す
