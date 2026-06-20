# Bugfix Requirements Document

## Introduction

公開物件サイト（`https://property-site-frontend-kappa.vercel.app/public/properties/AA3959`）において、物件AA3959の詳細ページで「画像がありません」と表示されるバグを修正する。

Google Driveには `AA3959_火売土地_杉田...` フォルダ内の `athome公開` サブフォルダに複数の画像ファイル（`0412 区画 AA3959.jpg` など）が存在しているにもかかわらず、公開物件サイトで画像が表示されない。

このバグは、`PropertyImageService` が `athome公開` フォルダを正しく検索・取得できていないことに起因する可能性が高い。具体的には以下のいずれか（または複数）が原因と考えられる：

1. `storage_location` がデータベースに設定されていない
2. `storage_location` が設定されていても、`findFolderByName` による `athome公開` フォルダの検索が共有ドライブのパラメータ設定の問題で失敗している
3. `searchFolderByName` による物件番号フォルダの検索が、共有ドライブ検索時に正しく機能していない

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーが公開物件サイトで物件AA3959の詳細ページ（`/public/properties/AA3959`）にアクセスする THEN システムは「画像がありません」と表示する

1.2 WHEN `/api/public/properties/AA3959/images` エンドポイントが呼び出される THEN システムは空の画像配列（`images: []`）を返す

1.3 WHEN `PropertyImageService.getImagesFromStorageUrl()` が実行される THEN システムは Google Drive の `athome公開` フォルダを見つけられず、空の配列を返す

### Expected Behavior (Correct)

2.1 WHEN ユーザーが公開物件サイトで物件AA3959の詳細ページにアクセスする THEN システムは Google Drive の `athome公開` フォルダ内の画像（`0412 区画 AA3959.jpg` など）を表示する

2.2 WHEN `/api/public/properties/AA3959/images` エンドポイントが呼び出される THEN システムは `athome公開` フォルダ内の画像ファイルの一覧を含むレスポンスを返す

2.3 WHEN `PropertyImageService.getImagesFromStorageUrl()` または関連する検索処理が実行される THEN システムは `AA3959_火売土地_杉田...` フォルダ内の `athome公開` サブフォルダを正しく特定し、画像を取得する

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `storage_location` が正しく設定されている他の物件（例: AA12649など）の画像を取得する THEN システムは引き続き正常に画像を表示する

3.2 WHEN `athome公開` フォルダが存在しない物件の画像を取得する THEN システムは引き続き「画像がありません」と表示する（エラーなし）

3.3 WHEN `atbb公開` フォルダのみが存在する物件の画像を取得する THEN システムは引き続き `atbb公開` フォルダから画像を取得して表示する

3.4 WHEN 複数の物件の画像を一覧ページで取得する THEN システムは引き続き正常にサムネイル画像を表示する
