# Bugfix Requirements Document

## Introduction

スプレッドシートから削除された物件AA13527が、公開物件サイト（`https://property-site-frontend-kappa.vercel.app/public/properties`）に引き続き表示されているバグ。

スプレッドシートから物件が削除された場合、定期同期（5分ごと）によってDBの`property_listings`レコードが非表示（`is_hidden = true`）になり、公開物件サイトの一覧・詳細ページにも表示されなくなるべきである。しかし現状では削除後もサイト上に物件が残り続けている。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 物件AA13527がスプレッドシートから削除された状態で `GET /api/public/properties` を呼び出す THEN システムはAA13527を一覧に含めて返す

1.2 WHEN 物件AA13527がスプレッドシートから削除された状態で公開物件サイトの一覧ページを表示する THEN システムはAA13527をページ上に表示する

1.3 WHEN スプレッドシートから削除された物件がDBに存在する（非表示フラグが設定されていない）THEN システムはその物件を公開物件サイトに表示し続ける

1.4 WHEN 定期同期が実行される THEN システムはスプレッドシートから消えた物件を検知しても非表示にする処理を実行しない

### Expected Behavior (Correct)

2.1 WHEN 物件AA13527がスプレッドシートから削除された状態で `GET /api/public/properties` を呼び出す THEN システムはAA13527を一覧に含めずに返す

2.2 WHEN 物件AA13527がスプレッドシートから削除された状態で公開物件サイトの一覧ページを表示する THEN システムはAA13527をページ上に表示しない

2.3 WHEN スプレッドシートから削除された物件がDBで非表示（`is_hidden = true`）になっている THEN システムはその物件を公開物件サイトの一覧・詳細取得から除外する

2.4 WHEN 定期同期が実行され、スプレッドシートに存在しない物件がDBに検出される THEN システムはその物件の `is_hidden` を `true` に設定する

### Unchanged Behavior (Regression Prevention)

3.1 WHEN スプレッドシートに存在する公開中の物件で `GET /api/public/properties` を呼び出す THEN システムは SHALL CONTINUE TO その物件を一覧に含めて返す

3.2 WHEN スプレッドシートに存在するが非公開の物件で `GET /api/public/properties` を呼び出す THEN システムは SHALL CONTINUE TO その物件を一覧から除外する

3.3 WHEN 公開物件の詳細ページ（`GET /api/public/properties/:id`）を取得する THEN システムは SHALL CONTINUE TO 正常に物件詳細データを返す

3.4 WHEN 定期同期（5分ごと）が実行される THEN システムは SHALL CONTINUE TO スプレッドシートに存在する物件のデータをDBに同期する

3.5 WHEN スプレッドシートに再登録された物件（一度削除後に再追加）がDBに存在する THEN システムは SHALL CONTINUE TO その物件を正常に公開物件サイトに表示する
