# Twilio SMS送信機能 セットアップガイド

## 📋 概要

このガイドでは、Twilioを使用したSMS一括送信機能のセットアップ方法を説明します。

---

## 🚀 セットアップ手順

### ステップ1: Twilioアカウントの作成

1. **Twilioにアクセス**: https://www.twilio.com/try-twilio
2. **無料アカウントを作成**:
   - メールアドレス
   - パスワード
   - 電話番号（SMS認証用）
3. **クレジットカード情報を登録**（無料トライアル後も必要）

### ステップ2: Twilio電話番号の購入

1. **Twilio Consoleにログイン**: https://console.twilio.com/
2. **左メニューから「Phone Numbers」→「Buy a number」を選択**
3. **日本の番号を検索**:
   - Country: Japan (+81)
   - Capabilities: SMS（チェック）
4. **番号を選択して購入**:
   - 月額料金: 約1,500円
   - 初回は無料クレジットで購入可能

### ステップ3: 認証情報の取得

1. **Twilio Consoleのダッシュボード**にアクセス
2. **Account Info**セクションから以下をコピー:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: クリックして表示→コピー

### ステップ4: 環境変数の設定

1. **`backend/.env`ファイルを開く**
2. **以下の環境変数を追加**:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+819012345678
```

**注意**: 
- `TWILIO_PHONE_NUMBER`は購入した電話番号（+81で始まる形式）
- `.env`ファイルは絶対にGitにコミットしない

### ステップ5: サーバーの再起動

```bash
cd backend
npm run dev
```

### ステップ6: 動作確認

1. **SMS送信サービスの状態確認**:
```bash
curl http://localhost:3001/api/sms/status
```

期待される結果:
```json
{
  "configured": true,
  "message": "SMS送信サービスは正常に動作しています"
}
```

2. **テストSMS送信**:
```bash
curl -X POST http://localhost:3001/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "09012345678",
    "message": "テストメッセージです"
  }'
```

---

## 💰 料金について

### 初期費用
- **アカウント作成**: 無料
- **無料クレジット**: 約$15（初回登録時）

### 月額費用
- **電話番号維持費**: 約1,500円/月

### 送信料金
- **SMS送信**: 約10円/通
- **受信**: 約1円/通

### 概算（月100通送信の場合）
- 電話番号: 1,500円
- 送信料: 1,000円（100通 × 10円）
- **合計**: 約2,500円/月

---

## 📱 使い方

### フロントエンド（買主候補リスト）

1. **買主候補リストページを開く**
2. **送信したい買主をチェック**
3. **「SMS送信」ボタンをクリック**
4. **自動的に各買主に個別SMS送信**

### SMSメッセージ内容

```
{買主名}様

株式会社いふうです。

{物件所在地}を近々売りに出すことになりました！

誰よりも早く内覧可能です。ご興味がございましたらご返信ください。

物件詳細: https://property-site-frontend-kappa.vercel.app/public/properties/{物件番号}

株式会社いふう
TEL:097-533-2022
```

---

## 📨 返信の処理

### 返信の確認方法

買主がSMSに返信した場合、以下の方法で確認できます：

#### 方法1: Twilio Consoleで確認（簡単）

1. **Twilio Console**にログイン
2. **左メニューから「Monitor」→「Logs」→「Messaging」を選択**
3. **受信したSMSを確認**

#### 方法2: Webhookで自動通知（高度）

Twilioから自動的にシステムに通知を受け取る設定：

1. **Twilio Consoleで電話番号を選択**
2. **「Messaging」セクションの「A MESSAGE COMES IN」**
3. **Webhook URLを設定**: `https://your-domain.com/api/sms/webhook`
4. **HTTP Method**: POST

**注意**: Webhook機能は今回の実装には含まれていません。必要な場合は追加実装が必要です。

---

## 🔧 トラブルシューティング

### エラー1: "SMS送信サービスが設定されていません"

**原因**: 環境変数が正しく設定されていない

**解決方法**:
1. `.env`ファイルを確認
2. `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN`、`TWILIO_PHONE_NUMBER`が設定されているか確認
3. サーバーを再起動

### エラー2: "Failed to send SMS"

**原因**: 
- 電話番号のフォーマットが間違っている
- Twilioアカウントの残高不足
- 認証情報が間違っている

**解決方法**:
1. 電話番号が`+81`で始まる形式か確認
2. Twilio Consoleで残高を確認
3. Account SIDとAuth Tokenを再確認

### エラー3: 電話番号のフォーマットエラー

**正しいフォーマット**:
- ❌ `090-1234-5678`
- ❌ `09012345678`
- ✅ `+819012345678`

システムは自動的に`090-1234-5678`を`+819012345678`に変換します。

---

## 📊 送信ログの確認

### Twilio Consoleでログ確認

1. **Twilio Console**にログイン
2. **「Monitor」→「Logs」→「Messaging」**
3. **送信履歴を確認**:
   - 送信日時
   - 宛先電話番号
   - ステータス（delivered, failed, etc.）
   - エラーメッセージ（失敗時）

---

## 🔒 セキュリティ

### 重要な注意事項

1. **環境変数を保護**:
   - `.env`ファイルは絶対にGitにコミットしない
   - `.gitignore`に`.env`が含まれていることを確認

2. **認証情報の管理**:
   - Auth Tokenは定期的に更新
   - 不要になったTokenは削除

3. **送信制限**:
   - 一度に大量のSMSを送信しない（スパム判定される可能性）
   - 1分あたり最大60通程度に制限することを推奨

---

## 📚 参考リンク

- **Twilio公式ドキュメント**: https://www.twilio.com/docs/sms
- **Twilio Console**: https://console.twilio.com/
- **料金表**: https://www.twilio.com/sms/pricing/jp
- **サポート**: https://support.twilio.com/

---

## ✅ チェックリスト

セットアップ完了前に以下を確認：

- [ ] Twilioアカウントを作成した
- [ ] 日本の電話番号を購入した
- [ ] Account SIDとAuth Tokenを取得した
- [ ] `.env`ファイルに環境変数を設定した
- [ ] サーバーを再起動した
- [ ] `/api/sms/status`で動作確認した
- [ ] テストSMSを送信して動作確認した

---

**最終更新日**: 2026年2月13日  
**作成者**: Kiro AI Assistant
