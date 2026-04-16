# Bugfix Requirements Document

## Introduction

公開物件サイト（`/public/properties`）を開くまで約20秒かかるパフォーマンス問題を修正する。

Git履歴の調査により、以下の2つの問題が重なっていることが判明した：

1. **フロントエンド**: 詳細画面から戻る時に `viewMode` を強制的に `'list'` に設定する処理が削除されており、地図ビューで詳細ページに遷移した場合、戻ってきた時に地図用データ取得（`fetchAllProperties`）が実行されて遅延が発生する
2. **バックエンド**: `/api/public/properties` エンドポイントで、各物件の `price` フィールドが `null` の場合に個別のSupabaseクエリを実行するN+1問題がある

過去の記録（`git-history-first-approach.md`）によると、同様の問題が以前も発生しており、コミット `3a209e9` で修正されていた。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーが `/public/properties` ページを開く THEN システムは約20秒間ローディング状態が続く

1.2 WHEN ユーザーが地図ビューで物件詳細ページに遷移し、ブラウザの戻るボタンで一覧に戻る THEN システムは `fetchAllProperties()` を実行して全物件データを再取得し、20秒以上の遅延が発生する

1.3 WHEN バックエンドAPIが物件一覧を返す際に `price` フィールドが `null` の物件が存在する THEN システムは各物件ごとに個別のSupabaseクエリを実行し（N+1問題）、レスポンスが大幅に遅延する

### Expected Behavior (Correct)

2.1 WHEN ユーザーが `/public/properties` ページを開く THEN システムは数秒以内（5秒以下）にページを表示する

2.2 WHEN ユーザーが地図ビューで物件詳細ページに遷移し、ブラウザの戻るボタンで一覧に戻る THEN システムは `viewMode` を強制的に `'list'` に設定し、`fetchAllProperties()` の不要な実行を防ぐ

2.3 WHEN バックエンドAPIが物件一覧を返す際 THEN システムは `sales_price` または `listing_price` を直接使用して `price` を計算し、個別のSupabaseクエリを実行しない

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ユーザーが物件タイプ・価格・築年数などのフィルターを適用する THEN システムは引き続き正しくフィルタリングされた物件一覧を表示する

3.2 WHEN ユーザーがページネーションを使用する THEN システムは引き続き正しいページの物件を表示する

3.3 WHEN ユーザーが地図ビューに切り替える THEN システムは引き続き地図上に物件を表示する

3.4 WHEN ユーザーが物件詳細ページから一覧に戻る THEN システムは引き続きスクロール位置・ページ番号・フィルター状態を復元する
