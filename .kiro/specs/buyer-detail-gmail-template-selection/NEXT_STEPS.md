# Next Steps - Gmail Template Selection Feature

## 今すぐ実行すべきこと

### 1. データベースマイグレーション実行 🔴 必須

```bash
cd backend
npx ts-node migrations/run-061-migration.ts
```

このマイグレーションは`email_history`テーブルに`template_id`と`template_name`カラムを追加します。

### 2. 動作確認 🟡 推奨

1. バックエンドとフロントエンドを起動
2. 買主詳細ページに移動
3. 問合せ履歴が1件以上ある買主を選択
4. 「Gmail送信」ボタンをクリック
5. テンプレート選択フローをテスト

## 今後の実装が必要な機能

### 3. Gmail API統合 🔴 必須

**ファイル**: `frontend/src/components/BuyerGmailSendButton.tsx`
**場所**: 115行目付近の`handleSendEmail`関数

**現在の実装**:
```typescript
const handleSendEmail = async (emailData: EmailData) => {
  try {
    // TODO: Implement actual email sending via Gmail API
    // For now, just save to email history
    await api.post('/api/email-history', {
      // ... email history data
    });
  }
}
```

**必要な変更**:
1. 既存のEmailServiceまたはGmailAPIサービスを使用
2. 実際のメール送信を実装
3. 送信成功後にメール履歴を保存

**参考ファイル**:
- `backend/src/services/EmailService.ts`
- `backend/src/services/EmailService.supabase.ts`
- `frontend/src/services/gmailDistributionService.ts`

### 4. 送信者アドレスの取得 🔴 必須

**ファイル**: `frontend/src/components/BuyerGmailSendButton.tsx`
**場所**: 115行目付近

**現在の実装**:
```typescript
senderEmail: 'current-user@example.com', // TODO: Get from auth context
```

**必要な変更**:
1. 認証コンテキストから現在のユーザー情報を取得
2. ユーザーのメールアドレスを使用

**参考ファイル**:
- `frontend/src/store/authStore.ts`
- `frontend/src/components/SenderAddressSelector.tsx`

## オプションの改善

### 5. テンプレートの追加 🟢 オプション

**ファイル**: `backend/src/config/emailTemplates.ts`

新しいテンプレートを追加する場合:
```typescript
{
  id: 'new-template',
  name: '新しいテンプレート',
  description: 'テンプレートの説明',
  subject: '件名 {{propertyNumber}}',
  body: `本文...`,
  placeholders: ['{{buyerName}}', '{{propertyNumber}}']
}
```

### 6. プレースホルダーの追加 🟢 オプション

**ファイル**: `backend/src/services/EmailTemplateService.ts`
**メソッド**: `createDataMap()`

新しいプレースホルダーを追加する場合、このメソッドを更新してください。

### 7. テスト 🟢 オプション

- プロパティベーステスト
- 統合テスト
- E2Eテスト

### 8. UI改善 🟢 オプション

- レスポンシブデザインの確認
- アクセシビリティの確認
- ユーザビリティの改善

## トラブルシューティング

### 問題: ボタンが表示されない
- 問合せ履歴が0件の場合は表示されません
- `inquiryHistoryTable`が正しく渡されているか確認

### 問題: テンプレート選択モーダルが開かない
- ブラウザのコンソールでエラーを確認
- バックエンドAPIが起動しているか確認

### 問題: プレースホルダーが置換されない
- EmailTemplateServiceの`createDataMap()`を確認
- プレースホルダー名が正しいか確認

### 問題: メール送信が失敗する
- 現在はメール履歴への保存のみ実装されています
- Gmail API統合が必要です

## 実装優先度

1. 🔴 **高**: データベースマイグレーション実行
2. 🔴 **高**: Gmail API統合
3. 🔴 **高**: 送信者アドレス取得
4. 🟡 **中**: 動作確認とテスト
5. 🟢 **低**: UI改善とオプション機能

## 関連ドキュメント

- `IMPLEMENTATION_SUMMARY.md` - 実装の詳細
- `INTEGRATION_COMPLETE.md` - 統合完了の詳細
- `requirements.md` - 要件定義
- `design.md` - 設計書
- `tasks.md` - タスクリスト
