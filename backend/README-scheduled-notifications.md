# 予約値下げ通知の定期実行設定

## 📋 概要

予約値下げ通知を自動的に送信するための定期実行タスクを設定します。

## 🚀 セットアップ手順

### 1. タスクを作成

`backend/setup-scheduled-task.bat`を**管理者として実行**してください。

**手順**:
1. `backend/setup-scheduled-task.bat`を右クリック
2. 「管理者として実行」を選択
3. 「はい」をクリック
4. 成功メッセージが表示されたら完了

### 2. タスクの確認

タスクが正常に作成されたか確認します：

```bash
schtasks /Query /TN "SateituikyakuScheduledNotifications" /V /FO LIST
```

### 3. ログの確認

定期実行のログは以下のファイルに記録されます：

```
backend/logs/scheduled-notifications.log
```

## 🛠️ タスクの管理

### タスクを削除

`backend/remove-scheduled-task.bat`を**管理者として実行**してください。

### タスクを手動で実行

```bash
schtasks /Run /TN "SateituikyakuScheduledNotifications"
```

### タスクを無効化

```bash
schtasks /Change /TN "SateituikyakuScheduledNotifications" /DISABLE
```

### タスクを有効化

```bash
schtasks /Change /TN "SateituikyakuScheduledNotifications" /ENABLE
```

## 📊 動作確認

### 1. テスト通知を作成

物件詳細ページで予約値下げを設定します：
1. 物件詳細ページを開く
2. 価格情報セクションの「予約値下げ」ボタンをクリック
3. 予約日を今日または明日に設定
4. メッセージを入力
5. 「予約値下げを設定」ボタンをクリック

### 2. 物件一覧で確認

予約日の9:00以降、物件一覧のサイドバーに「値下げ未完了」として表示されます。

### 3. ログで確認

`backend/logs/scheduled-notifications.log`を開いて、定期実行のログを確認します。

## 🔍 トラブルシューティング

### タスクが実行されない

1. タスクが作成されているか確認：
   ```bash
   schtasks /Query /TN "SateituikyakuScheduledNotifications"
   ```

2. ログファイルを確認：
   ```
   backend/logs/scheduled-notifications.log
   ```

3. 手動で実行してエラーを確認：
   ```bash
   cd backend
   npx ts-node process-scheduled-notifications.ts
   ```

### 通知が送信されない

1. `scheduled_notifications`テーブルを確認：
   - Supabase SQL Editorで以下を実行：
   ```sql
   SELECT * FROM scheduled_notifications WHERE status = 'pending';
   ```

2. 予約日時が正しいか確認：
   - `scheduled_at`が現在時刻より前になっているか

3. 担当者のWebhook URLが設定されているか確認：
   - スタッフ管理スプレッドシートを確認

## 📝 注意事項

- タスクの作成・削除には**管理者権限**が必要です
- タスクは1分ごとに実行されます
- ログファイルは自動的に蓄積されるため、定期的に削除してください
- PCがスリープ状態の場合、タスクは実行されません

## 🎯 代替方法（手動実行）

定期実行タスクを設定したくない場合は、手動で実行することもできます：

```bash
cd backend
npx ts-node process-scheduled-notifications.ts
```

予約日の9:00以降に上記コマンドを実行すると、通知が送信されます。
