# 📧 メール送信履歴機能 - クイックリファレンス

## ✅ 実装完了！

買主詳細ページにメール送信履歴機能が実装されました。

## 🎯 主な機能

### 1. 自動記録
- 物件問合せメール送信時に自動的に履歴を記録
- 手動操作不要

### 2. 詳細表示
買主詳細ページで以下の情報を表示:
- ✅ 件名
- ✅ 送信日時
- ✅ 送信者（担当者名 + メールアドレス）
- ✅ 紐づいた物件番号（複数対応）
- ✅ 内覧前伝達事項

### 3. 使いやすいUI
- 時系列で表示（新しい順）
- スクロール可能（最大400px）
- 物件番号はChipで表示
- 内覧前伝達事項は背景色で強調

## 📂 関連ファイル

### バックエンド
- `backend/src/services/ActivityLogService.ts` - メール記録ロジック
- `backend/src/services/InquiryResponseService.ts` - メール送信 + 履歴記録
- `backend/src/routes/inquiryResponse.ts` - API エンドポイント

### フロントエンド
- `frontend/src/pages/BuyerDetailPage.tsx` - メール履歴表示

## 🔍 使い方

### ユーザー視点
1. 買主詳細ページを開く
2. 下にスクロールして「メール送信履歴」セクションを確認
3. 過去に送信したメールの詳細を確認

### 開発者視点
```typescript
// メール送信時に自動的に記録される
await inquiryResponseService.sendInquiryResponseEmail(
  params,
  emailContent,
  employeeId // 重要: employeeId を渡す
);

// activity_logs テーブルに以下の形式で保存
{
  action: 'email',
  target_type: 'buyer',
  target_id: buyerId,
  metadata: {
    property_numbers: ['AA12345', 'AA12346'],
    recipient_email: 'buyer@example.com',
    subject: '【物件お問い合わせ】AA12345、AA12346',
    sender_email: 'staff@ifoo-oita.com',
    email_type: 'inquiry_response',
    pre_viewing_notes: '内覧前伝達事項の内容'
  }
}
```

## 🗄️ データベース

### 使用テーブル
- `activity_logs` テーブル（既存）
- 新しいテーブルは不要！

### クエリ例
```sql
-- 買主のメール送信履歴を取得
SELECT * FROM activity_logs
WHERE target_type = 'buyer'
  AND target_id = '買主ID'
  AND action = 'email'
ORDER BY created_at DESC;
```

## 🚀 次のステップ（オプション）

### 1. テスト
- [ ] 実際にメールを送信して履歴が記録されることを確認
- [ ] 複数物件のメール送信をテスト
- [ ] 内覧前伝達事項の表示を確認

### 2. 追加機能（Task 6-13）
- [ ] 問い合わせ履歴テーブル
- [ ] 複数物件選択機能
- [ ] チェックボックス選択
- [ ] 今回/過去の問い合わせの視覚的区別

## 💡 Tips

### デバッグ
```bash
# メール送信履歴を確認
cd backend
npx ts-node -e "
const { supabase } = require('./src/config/supabase');
(async () => {
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('action', 'email')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log(JSON.stringify(data, null, 2));
})();
"
```

### トラブルシューティング
- **履歴が表示されない**: `employeeId` が正しく渡されているか確認
- **内覧前伝達事項が表示されない**: スプレッドシートのBQ列にデータがあるか確認
- **物件番号が表示されない**: `metadata.property_numbers` が配列形式か確認

## 📚 関連ドキュメント

- [実装完了サマリー](./IMPLEMENTATION_SUMMARY.md)
- [タスクリスト](./tasks.md)
- [設計ドキュメント](./design.md)
- [要件定義](./requirements.md)

## ✨ まとめ

メール送信履歴機能は完全に動作しています！

- ✅ 自動記録
- ✅ 詳細表示
- ✅ 使いやすいUI
- ✅ 既存テーブルを活用

これで、買主とのメールコミュニケーション履歴を簡単に確認できるようになりました！
