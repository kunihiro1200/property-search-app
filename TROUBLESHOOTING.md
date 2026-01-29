# AA13497が「当日TEL分_未着手」に表示されない問題のトラブルシューティング

## 確認済み事項

### データベース
- ✅ `unreachable_status`: NULL
- ✅ `next_call_date`: 2026-01-28（今日以前）
- ✅ `inquiry_date`: 2026-01-28（2026年1月1日以降）
- ✅ `status`: 追客中
- ✅ 期待されるステータス: 「当日TEL分_未着手」

### コード
- ✅ ステータス計算ロジックは正しい（`frontend/src/utils/sellerStatusUtils.ts`）
- ✅ `seller.inquiry_date || seller.inquiryDate`の両方をチェックしている

## 解決手順

### 1. バックエンドを再起動
```bash
cd backend
npm run dev
```

### 2. フロントエンドを再起動
```bash
cd frontend
npm run dev
```

### 3. ブラウザのキャッシュをクリア
- Ctrl + Shift + R（Windows）
- Cmd + Shift + R（Mac）

### 4. 売主リストページをリロード
- 売主リストページを開く
- 「当日TEL分_未着手」タブをクリック
- AA13497が表示されることを確認

### 5. デバッグ用コンソールログを追加（必要に応じて）

`frontend/src/utils/sellerStatusUtils.ts`の`calculateSellerStatus`関数に以下を追加：

```typescript
export function calculateSellerStatus(seller: Seller): string[] {
  const statuses: string[] = [];
  const today = getTodayJST();

  // デバッグログ（AA13497のみ）
  if (seller.seller_number === 'AA13497') {
    console.log('=== AA13497 ステータス計算 ===');
    console.log('unreachableStatus:', seller.unreachableStatus);
    console.log('inquiry_date:', seller.inquiry_date);
    console.log('inquiryDate:', seller.inquiryDate);
    console.log('next_call_date:', seller.next_call_date);
    console.log('status:', seller.status);
  }

  // ... 既存のコード
}
```

### 6. APIレスポンスを確認

ブラウザの開発者ツール（F12）→ Networkタブ → `/api/sellers`のレスポンスを確認：
- AA13497の`unreachable_status`がNULLであることを確認
- `inquiry_date`が2026-01-28であることを確認

## 考えられる原因

1. **フロントエンドのキャッシュ**: ブラウザが古いデータをキャッシュしている
2. **バックエンドのキャッシュ**: APIが古いデータを返している
3. **型の不一致**: `inquiry_date`と`inquiryDate`のフィールド名が異なる
4. **日付のパース問題**: 日付文字列のフォーマットが異なる

## 次のステップ

上記の手順を実行しても問題が解決しない場合：
1. ブラウザのコンソールログを確認
2. APIレスポンスを確認
3. デバッグログを追加して、ステータス計算の詳細を確認
