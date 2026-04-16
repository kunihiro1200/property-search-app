# Bugfix Requirements Document

## Introduction

公開物件サイト（`/public/properties`）において、リストビューから地図ビューに切り替えた際のパフォーマンスが著しく低下している。地図ビューを開くと、フロントエンドの `fetchAllProperties` 関数が `while` ループで繰り返しAPIを呼び出し、最大10,000件の物件データを全件取得しようとするため、ユーザーが地図を操作できるまでに数秒〜数十秒の待機が発生する。

この問題はユーザー体験を大きく損ない、特にフィルター変更のたびに全件再取得が走ることで、繰り返し遅延が発生する。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーが「地図で検索」ボタンをクリックして地図ビューに切り替えた THEN システムは `fetchAllProperties` を呼び出し、`while` ループで `limit=1000` のAPIリクエストを繰り返し実行して最大10,000件の物件データを全件取得する

1.2 WHEN `fetchAllProperties` が実行中である THEN システムは `isLoadingAllProperties=true` のローディング状態を表示し続け、ユーザーは地図を操作できない

1.3 WHEN ユーザーが地図ビュー表示中にフィルター条件（物件タイプ・価格帯・築年数など）を変更した THEN システムは `searchParams` の変更を検知して `fetchAllProperties` を再度実行し、全件再取得が毎回走る

1.4 WHEN `allProperties` の配列が空（`allProperties.length === 0`）の状態で地図ビューに切り替えた THEN システムは `fetchAllProperties` を実行するが、フィルター変更後に `allProperties` が既に存在する場合でも `searchParams` の変更により再取得が走る

### Expected Behavior (Correct)

2.1 WHEN ユーザーが「地図で検索」ボタンをクリックして地図ビューに切り替えた THEN システムは座標付き物件のみを対象に、ページネーションなしの単一APIリクエストで取得を完了し、地図表示までの待機時間を大幅に短縮する（`withCoordinates=true`・`skipImages=true` パラメータを活用）

2.2 WHEN 地図ビュー用のデータ取得が完了した THEN システムは取得した物件データを地図上にマーカーとして表示し、ユーザーが即座に地図を操作できる状態にする

2.3 WHEN ユーザーが地図ビュー表示中にフィルター条件を変更した THEN システムは変更されたフィルター条件で地図用データを再取得するが、不要な重複リクエストを防ぐ制御（デバウンスまたはリクエストキャンセル）を行う

2.4 WHEN バックエンドAPIが `withCoordinates=true` パラメータを受け取った THEN システムは `latitude` と `longitude` が両方 `null` でない物件のみをフィルタリングして返し、座標のない物件を除外することでレスポンスサイズを削減する

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ユーザーがリストビューで物件を閲覧している THEN システムは従来通りページネーション付きで物件一覧を取得・表示し続ける

3.2 WHEN ユーザーが地図ビューから詳細ページに遷移して戻ってきた THEN システムは従来通りリストビューに戻り、フィルター状態・ページ番号・スクロール位置を復元する

3.3 WHEN ユーザーが地図上のマーカーをクリックして物件の情報ウィンドウを表示した THEN システムは従来通り物件の種別・価格・住所・詳細リンクを表示する

3.4 WHEN ユーザーがフィルター条件を変更してリストビューで検索した THEN システムは従来通りフィルター条件をURLパラメータに反映し、ページネーションをリセットして検索結果を表示する

3.5 WHEN バックエンドAPIが `withCoordinates=false`（デフォルト）でリクエストを受け取った THEN システムは従来通り座標の有無に関わらず全物件を返す
