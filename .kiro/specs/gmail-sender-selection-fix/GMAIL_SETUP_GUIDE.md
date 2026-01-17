# Gmail "Send As" 設定ガイド

## 概要

このガイドでは、Gmailの「別のアドレスから送信」(Send As) 機能を設定する手順を説明します。この設定により、認証されたGmailアカウント(例: tomoko.kunihiro@ifoo-oita.com)から、他のメールアドレス(例: hiromitsu-kakui@ifoo-oita.com)を使用してメールを送信できるようになります。

## 前提条件

- 認証に使用するGmailアカウントへのアクセス権限
- 送信元として使用したいメールアドレスへのアクセス権限(確認メールを受信するため)
- Google Workspaceアカウント(推奨)

## 設定手順

### ステップ1: Gmailの設定を開く

1. 認証アカウント(例: tomoko.kunihiro@ifoo-oita.com)でGmailにログイン
2. 右上の歯車アイコン(⚙️)をクリック
3. 「すべての設定を表示」をクリック

### ステップ2: 「アカウントとインポート」タブを開く

1. 設定画面で「アカウントとインポート」タブをクリック
2. 「名前」セクションを探す
3. 「他のメールアドレスを追加」をクリック

### ステップ3: 送信元アドレスを追加

以下のアドレスをそれぞれ追加してください:

#### 3.1 tenant@ifoo-oita.com の追加

1. 「他のメールアドレスを追加」をクリック
2. 新しいウィンドウが開きます
3. 以下の情報を入力:
   - **名前**: `株式会社いふう`
   - **メールアドレス**: `tenant@ifoo-oita.com`
   - **エイリアスとして扱います**: ✅ チェックを入れる(推奨)
4. 「次のステップ」をクリック
5. SMTP設定画面が表示されます:
   - **SMTPサーバー**: `smtp.gmail.com`
   - **ポート**: `587`
   - **ユーザー名**: `tenant@ifoo-oita.com` (または認証アカウント)
   - **パスワード**: (認証アカウントのパスワード)
   - **TLS を使用したセキュリティで保護された接続**: ✅ チェック
6. 「変更を保存」をクリック

#### 3.2 gyosha@ifoo-oita.com の追加

上記と同じ手順で以下の情報を入力:
- **名前**: `株式会社いふう (業者向け)`
- **メールアドレス**: `gyosha@ifoo-oita.com`
- **エイリアスとして扱います**: ✅ チェックを入れる

#### 3.3 hiromitsu-kakui@ifoo-oita.com の追加

上記と同じ手順で以下の情報を入力:
- **名前**: `角井宏充`
- **メールアドレス**: `hiromitsu-kakui@ifoo-oita.com`
- **エイリアスとして扱います**: ✅ チェックを入れる

### ステップ4: メールアドレスの確認

各アドレスを追加すると、確認メールが送信されます:

1. 追加したメールアドレス(例: hiromitsu-kakui@ifoo-oita.com)の受信トレイを開く
2. Gmailから「メールアドレスの確認」という件名のメールを探す
3. メール内の確認リンクをクリック
4. または、メールに記載されている確認コードをGmailの設定画面に入力

**重要**: 確認が完了するまで、そのアドレスからメールを送信できません。

### ステップ5: 設定の確認

1. Gmailの設定 → アカウントとインポート → 名前 を開く
2. 追加したすべてのアドレスが表示されていることを確認
3. 各アドレスの横に「確認済み」と表示されていることを確認

## Google Workspace での設定(推奨)

Google Workspaceを使用している場合、より簡単に設定できます:

### 管理者による設定

1. Google Workspace管理コンソールにログイン
2. 「アプリ」→「Google Workspace」→「Gmail」を開く
3. 「ユーザー設定」→「送信ゲートウェイ」を設定
4. または、各ユーザーに「別のアドレスから送信」の権限を付与

### エイリアスの使用

Google Workspaceでは、ドメイン内のエイリアスを自動的にSend Asとして使用できます:

1. 管理コンソールで「ユーザー」を開く
2. 対象ユーザーを選択
3. 「ユーザー情報」→「メールエイリアス」を追加
4. 追加したエイリアスは自動的にSend Asとして利用可能

## トラブルシューティング

### 問題: 確認メールが届かない

**解決方法:**
1. 迷惑メールフォルダを確認
2. Gmailの設定画面で「確認メールを再送信」をクリック
3. メールアドレスのスペルミスがないか確認

### 問題: 「このアドレスから送信できません」エラー

**解決方法:**
1. メールアドレスが確認済みか確認
2. SMTP設定が正しいか確認
3. 認証アカウントのパスワードが正しいか確認

### 問題: メールが送信されるが、送信元が認証アカウントのまま

**解決方法:**
1. 「エイリアスとして扱います」にチェックが入っているか確認
2. Gmail APIのコードでSend Asパラメータを使用しているか確認
3. OAuth2スコープに `gmail.send` が含まれているか確認

### 問題: Google Workspaceで設定できない

**解決方法:**
1. 管理者権限があるか確認
2. Gmailサービスが有効になっているか確認
3. ユーザーに「別のアドレスから送信」の権限があるか確認

## 設定の検証

### 手動テスト

1. Gmailで新規メール作成
2. 「From」フィールドをクリック
3. 追加したアドレスが選択肢に表示されることを確認
4. 各アドレスを選択してテストメールを送信
5. 受信側で送信元アドレスが正しいことを確認

### APIテスト

以下のコマンドでSend As設定を確認できます:

```bash
# backend ディレクトリで実行
cd backend
npx ts-node -e "
import { google } from 'googleapis';
import { GoogleAuthService } from './src/services/GoogleAuthService';

async function listSendAs() {
  const authService = new GoogleAuthService();
  const auth = await authService.getAuthenticatedClient();
  const gmail = google.gmail({ version: 'v1', auth });
  
  const response = await gmail.users.settings.sendAs.list({
    userId: 'me'
  });
  
  console.log('Available Send As addresses:');
  response.data.sendAs?.forEach(sendAs => {
    console.log(\`- \${sendAs.sendAsEmail} (\${sendAs.displayName})\`);
    console.log(\`  Verified: \${sendAs.isDefault ? 'Yes (Default)' : sendAs.verificationStatus}\`);
  });
}

listSendAs().catch(console.error);
"
```

## 必要なアドレス一覧

以下のアドレスをすべて設定してください:

- [ ] tenant@ifoo-oita.com (株式会社いふう)
- [ ] gyosha@ifoo-oita.com (株式会社いふう - 業者向け)
- [ ] hiromitsu-kakui@ifoo-oita.com (角井宏充)
- [ ] tomoko.kunihiro@ifoo-oita.com (国広智子) ※認証アカウント自身

## 参考リンク

- [Gmail ヘルプ: 別のアドレスやエイリアスからメールを送信する](https://support.google.com/mail/answer/22370)
- [Google Workspace 管理者ヘルプ: Gmail の送信設定](https://support.google.com/a/answer/176600)
- [Gmail API: Send As Settings](https://developers.google.com/gmail/api/reference/rest/v1/users.settings.sendAs)

## 次のステップ

Send As設定が完了したら:

1. ✅ すべてのアドレスが確認済みであることを確認
2. ✅ APIテストでアドレスが表示されることを確認
3. ➡️ コードの実装に進む(タスク2以降)
