# 公開物件サイトの同期認証・切替手順（本番適用前の確認事項）

## 影響する経路

- 公開サイトのAPI: `https://property-site-frontend-kappa.vercel.app/api/sync/trigger` (POST)。現行 `main` は認証なし。PR #11 で `Authorization: Bearer <CRON_SECRET>` を必須にする。
- 保存されている参考GAS: `docs/gas/property-listing-trigger-batch.gs`。**稼働中のGoogle Apps Scriptそのものではない**。
- GitHub Actions: PR #14 により `.github/workflows/scheduled-property-sync.yml` へ移行済み（毎時17分・47分）。認証キーがある場合のみ `POST /api/sync/trigger` に Bearer ヘッダーを送信する。稼働中GASの切替は別作業。
- 旧式の `/api/cron/sync-property-listings` と `/api/cron/sync-inquiries` はPR #10で認証必須化済み。

## 適用条件（すべて満たすこと）

1. Apps Script の本番プロジェクトを開いて、動作中のスクリプトが `POST /api/sync/trigger` を使っているか、他の同期経路があるか確認する。Google Driveで検索しても Apps Script プロジェクトは見つからなかったので、**本番GASが参考ファイルと同じ内容だと決めつけないこと**。
2. スクリプトプロパティ `CRON_SECRET` に **本番Vercel側で設定されたキーと同じ値** を登録する。キーの値をGitHubのコード・ログ・チャットへ貼らない。
3. 本番GASの `UrlFetchApp.fetch` に `headers: { Authorization: 'Bearer ' + PropertiesService.getScriptProperties().getProperty('CRON_SECRET') }` を付け、認証ヘッダー付きの呼び出しが現行本番APIで成功することを確かめる。**保存された参考GASの修正だけでは本番GASは変更されない**。
4. GitHub Actionsのシークレット `CRON_SECRET` が登録されていることを確認する。キーの値は見せず、設定の有無だけ確認する。
5. 同期経路が複数ある場合、それぞれが認証付きになるまでバックエンド側の認証必須化は本番反映しない。
6. 上記を確認してからPR #11をマージする。認証なしが401になり、認証ありは200となることを確認。同期が実際に完了したこともVercelログと物件数・更新日時で検証する。POSTの200はバックグラウンド同期の完了を意味しない。
7. 問合せ処理・いふう／くじらの公開物件検索を再確認。異常があれば直近の正常なVercelデプロイへ戻し、影響を切り分ける。

## 本番リリース禁止事項

- 実際のGASトリガー・参照先・Script Propertiesが未確認の状態でPR #11をマージしない。
- `CRON_SECRET` を直接ソース、公開ログ、デバッグ画面へ記載しない。
- 旧Cronの認証修正PR #10と新しい定期実行PR #14は既に本番統合済み。PR #11は本番GASを確認するまでマージしない。

## 検証記録

- 2026-10-18 の GitHub Actions Periodic Full Sync の実行が404 `NOT_FOUND` で失敗した（例: run 39178302396）。
- `vercel.json` には cron スケジュール設定がない。GitHub Actions と GAS の実際の稼働状況は別途確認が必要。
- 公開サイトの物件APIは匿名アクセス可能なまま維持する。同期の書き込みAPIだけを認証で保護する。
