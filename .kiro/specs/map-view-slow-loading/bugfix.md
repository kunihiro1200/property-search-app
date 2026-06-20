# Bugfix Requirements Document

## Introduction

公開物件サイト（`/public/properties`）において、地図ビューからリストビューに切り替えた際のパフォーマンスが著しく低下している。「リスト表示に戻る」ボタンをクリックすると30秒程度の待機が発生し、ユーザーがリスト表示を即座に確認できない。

コミット `474618d` で `/api/public/map-properties` 専用エンドポイントを追加し、地図→リスト切り替え時の `fetchProperties` 再実行をスキップする制御を追加したが、問題は改善されていない。

スクリーンショットのログから以下が確認されている：
- `/api/public/properties` が **16,145ms（16秒）** かかっている
- `PropertyListingService` で `GaxiosError: Quota exceeded for quota` エラーが発生している
- `/api/public/folder-thumbnail/113zYynCUGbeJDZdA_f9i0b_V6hV9aCc2` への **404エラー** が多数発生している

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーが「リスト表示に戻る」ボタンをクリックして地図ビューからリストビューに切り替えた THEN システムは `fetchProperties` を呼び出し、`skipImages=false` で `/api/public/properties` にリクエストを送信する。バックエンドは各物件の `storage_location` が空の場合に `getStorageUrlFromWorkTasks` で Google Sheets API を呼び出すため、クォータ超過時に16秒以上の遅延が発生する

1.2 WHEN `viewMode` が `'map'` から `'list'` に変わった THEN `viewMode` 変更を検知した `useEffect`（`selectedTypes, minPrice, ...viewMode` を依存配列に持つ）が `searchParams` から `view=map` パラメータを削除する。この `searchParams` 変更が `filterChangedDuringMapRef.current = true` を誤って設定し、「フィルター変更なし」のスキップ制御が機能しない

1.3 WHEN バックエンドが `/api/public/properties` リクエストを処理する THEN `storage_location` が空の物件に対して `getStorageUrlFromWorkTasks` が Google Sheets API（業務リスト）を呼び出す。Google Sheets API のクォータが超過している場合、各物件の処理が遅延し、20件のリスト取得に16秒以上かかる

1.4 WHEN フロントエンドが `folder-thumbnail/113zYynCUGbeJDZdA_f9i0b_V6hV9aCc2` にリクエストを送信した THEN バックエンドはそのフォルダに画像が存在しないか権限がないため 404 を返す。この 404 エラーが多数発生しており、ブラウザのコンソールに大量のエラーが表示されている

### Expected Behavior (Correct)

2.1 WHEN ユーザーが「リスト表示に戻る」ボタンをクリックした THEN システムは既にキャッシュされているリストデータ（`properties` state）をそのまま表示し、`fetchProperties` を再実行しない。ユーザーは即座にリスト表示を確認できる

2.2 WHEN 地図ビュー中にフィルターが変更されていない状態でリストビューに戻った THEN システムは `fetchProperties` を呼び出さず、既存の `properties` データを表示する。`viewMode` 変更による `searchParams` の変化（`view=map` の削除）はフィルター変更として扱わない

2.3 WHEN `fetchProperties` がリストビューで呼ばれる THEN システムは `skipImages=true` パラメータを付与してリクエストを送信し、バックエンドは画像取得処理（`getStorageUrlFromWorkTasks` を含む）をスキップして高速にレスポンスを返す。画像は `PublicPropertyCard` の遅延ロード（`/api/public/folder-thumbnail/:folderId`）で別途取得する

2.4 WHEN バックエンドが `folder-thumbnail/:folderId` リクエストを受け取り、フォルダに画像が存在しない THEN システムは 404 ではなくプレースホルダー画像またはデフォルト画像を返し、フロントエンドのコンソールエラーを抑制する

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ユーザーがリストビューで物件を閲覧している THEN システムは従来通りページネーション付きで物件一覧を取得・表示し続ける

3.2 WHEN ユーザーが地図ビュー表示中にフィルター条件を変更してからリストビューに戻った THEN システムは変更されたフィルター条件で `fetchProperties` を再実行し、最新の検索結果を表示する

3.3 WHEN ユーザーが地図上のマーカーをクリックして物件の情報ウィンドウを表示した THEN システムは従来通り物件の種別・価格・住所・詳細リンクを表示する

3.4 WHEN ユーザーがリストビューでフィルター条件を変更した THEN システムは従来通りフィルター条件をURLパラメータに反映し、ページネーションをリセットして検索結果を表示する

3.5 WHEN ユーザーが詳細ページから戻ってきた THEN システムは従来通りリストビューに戻り、フィルター状態・ページ番号・スクロール位置を復元する
