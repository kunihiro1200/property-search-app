# Bugfix Requirements Document

## Introduction

公開物件サイト（`frontend/`）において、地図表示（マップビュー）から物件をクリックして詳細ページに遷移した後、詳細ページのヘッダーにある「物件一覧」ボタンを押すと、地図表示に戻るべきところ、リスト一覧（リストビュー）に戻ってしまうバグ。

ユーザーが地図ビューで物件を探している最中に詳細を確認して戻ろうとすると、地図ビューが失われてリストビューに切り替わってしまい、操作の継続性が損なわれる。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーが地図表示（マップビュー）から物件マーカーをクリックして詳細ページに遷移した場合 THEN 詳細ページの「物件一覧」ボタンを押すと、リスト一覧（リストビュー）に戻ってしまう

1.2 WHEN 地図ビューから詳細ページに遷移した際に `viewMode: 'map'` が `navigationState` に保存されている場合 THEN `PublicPropertyHeader` の `handleBackClick` がその `viewMode` 情報を無視して `/public/properties` へ遷移する

1.3 WHEN `PublicPropertiesPage` が `navigationState` を受け取って状態を復元する場合 THEN `viewMode` を強制的に `'list'` に設定するコードが実行され、地図ビューが上書きされる

### Expected Behavior (Correct)

2.1 WHEN ユーザーが地図表示（マップビュー）から物件マーカーをクリックして詳細ページに遷移した場合 THEN 詳細ページの「物件一覧」ボタンを押すと、地図表示（マップビュー）に戻るべきである

2.2 WHEN 地図ビューから詳細ページに遷移した際に `viewMode: 'map'` が `navigationState` に保存されている場合 THEN `PublicPropertyHeader` の `handleBackClick` はその `viewMode` 情報を読み取り、`/public/properties?view=map` へ遷移するべきである

2.3 WHEN `PublicPropertiesPage` が `viewMode: 'map'` を含む `navigationState` を受け取って状態を復元する場合 THEN `viewMode` を `'map'` として復元するべきであり、強制的に `'list'` に上書きしてはならない

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ユーザーがリスト一覧（リストビュー）から物件カードをクリックして詳細ページに遷移した場合 THEN 詳細ページの「物件一覧」ボタンを押すと、リスト一覧（リストビュー）に戻るべきである

3.2 WHEN ユーザーが詳細ページから「物件一覧」ボタンで一覧に戻った場合 THEN スクロール位置・ページ番号・フィルター設定（物件タイプ・価格帯・築年数・検索クエリ）が復元されるべきである

3.3 WHEN ユーザーが地図ビューから詳細ページに遷移した場合 THEN `canHide=true` パラメータが存在する場合は、戻り先URLにも `canHide=true` が引き継がれるべきである

3.4 WHEN `navigationState` が存在しない状態で詳細ページにアクセスした場合 THEN 「物件一覧」ボタンはデフォルトのリストビュー（`/public/properties`）に遷移するべきである
