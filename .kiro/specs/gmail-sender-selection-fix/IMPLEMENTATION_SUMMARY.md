# Gmail送信元アドレス修正 - 実装完了

## 問題の原因

Gmail配信機能で送信元アドレスを選択しても、実際には常に認証アカウント(tomoko.kunihiro@ifoo-oita.com)から送信されていました。

**根本原因**: Gmailの「別のアドレスから送信」(Send As)機能が設定されていなかったため、`From`ヘッダーに指定したアドレスが無視されていました。

## 解決方法

Gmail APIは、`From`ヘッダーに指定されたアドレスがGmailの「Send As」設定に含まれている場合、自動的にそのアドレスから送信します。そのため、以下の2つの対応を行いました:

### 1. Gmail設定の追加(手動作業)

認証アカウント(tomoko.kunihiro@ifoo-oita.com)のGmail設定で、以下のアドレスを「別のアドレスから送信」として追加・確認する必要があります:

- tenant@ifoo-oita.com
- gyosha@ifoo-oita.com
- hiromitsu-kakui@ifoo-oita.com

**設定手順**: `.kiro/specs/gmail-sender-selection-fix/GMAIL_SETUP_GUIDE.md` を参照

### 2. コードの改善

`EmailService.ts`に以下の機能を追加しました:

1. **Send Asアドレスのホワイトリスト**
   ```typescript
   private readonly ALLOWED_SEND_AS_ADDRESSES = [
     'tenant@ifoo-oita.com',
     'gyosha@ifoo-oita.com',
     'hiromitsu-kakui@ifoo-oita.com',
     'tomoko.kunihiro@ifoo-oita.com',
     'info@ifoo-oita.com'
   ];
   ```

2. **送信元アドレスの検証**
   ```typescript
   private validateSendAsAddress(address: string): void {
     if (!this.ALLOWED_SEND_AS_ADDRESSES.includes(address)) {
       throw new Error(`Invalid Send As address: ${address}`);
     }
   }
   ```

3. **詳細なエラーログ**
   - 送信失敗時に送信元アドレスと受信者数を記録
   - Send As設定エラーの場合、設定手順を含むエラーメッセージを表示

## 実装したファイル

### 修正したファイル
- `backend/src/services/EmailService.ts`
  - Send Asアドレスのホワイトリストを追加
  - `validateSendAsAddress()`メソッドを追加
  - `sendBatch()`メソッドに検証とログを追加
  - `sendDistributionEmail()`メソッドに事前検証を追加

### 新規作成したファイル
- `.kiro/specs/gmail-sender-selection-fix/GMAIL_SETUP_GUIDE.md`
  - Gmail Send As設定の詳細な手順書
- `backend/verify-send-as-config.ts`
  - Send As設定を確認するスクリプト

## 次のステップ

### 1. Gmail設定の確認

以下のコマンドでSend As設定を確認してください:

```bash
cd backend
npx ts-node verify-send-as-config.ts
```

このスクリプトは以下を確認します:
- 認証されているGmailアカウント
- 設定されているSend Asアドレス
- 各アドレスの確認状態
- 不足しているアドレス

### 2. Gmail設定の追加(必要な場合)

スクリプトで不足しているアドレスが表示された場合:

1. `GMAIL_SETUP_GUIDE.md`の手順に従ってアドレスを追加
2. 各アドレスの確認メールをクリックして確認
3. 再度`verify-send-as-config.ts`を実行して確認

### 3. テスト送信

すべてのアドレスが設定・確認されたら:

1. フロントエンドで物件配信画面を開く
2. 送信元アドレスを選択(例: hiromitsu-kakui@ifoo-oita.com)
3. テストメールを送信
4. 受信側で送信元アドレスが正しいことを確認

## トラブルシューティング

### 問題: メールが送信されるが、送信元が認証アカウントのまま

**原因**: Send Asアドレスが設定されていないか、確認されていない

**解決方法**:
1. `verify-send-as-config.ts`を実行して設定状態を確認
2. 不足しているアドレスを追加
3. 確認メールをクリックして確認

### 問題: "Invalid Send As address" エラー

**原因**: 選択したアドレスがホワイトリストに含まれていない

**解決方法**:
1. `EmailService.ts`の`ALLOWED_SEND_AS_ADDRESSES`を確認
2. 必要に応じてアドレスを追加
3. サーバーを再起動

### 問題: Gmail APIエラー

**原因**: OAuth2トークンの期限切れまたは権限不足

**解決方法**:
1. OAuth2トークンを再取得
2. スコープに`gmail.send`が含まれていることを確認

## 技術的な詳細

### Gmail APIのSend As動作

Gmail APIは以下のロジックで送信元アドレスを決定します:

1. `From`ヘッダーに指定されたアドレスを確認
2. そのアドレスがGmailの「Send As」設定に含まれているか確認
3. 含まれている場合: そのアドレスから送信
4. 含まれていない場合: 認証アカウントから送信(Fromヘッダーは無視)

### Send As設定の要件

- アドレスは事前にGmail設定で追加されている必要がある
- 外部アドレスの場合、確認メールによる検証が必要
- 組織内アドレスの場合、「エイリアスとして扱う」を推奨

### セキュリティ考慮事項

- ホワイトリストにより、許可されたアドレスのみ使用可能
- すべての送信試行をログに記録
- 無効なアドレスの使用を事前に検出

## 参考資料

- [Gmail API: Send As Settings](https://developers.google.com/gmail/api/reference/rest/v1/users.settings.sendAs)
- [Gmail ヘルプ: 別のアドレスやエイリアスからメールを送信する](https://support.google.com/mail/answer/22370)
- [Google Workspace 管理者ヘルプ: Gmail の送信設定](https://support.google.com/a/answer/176600)
