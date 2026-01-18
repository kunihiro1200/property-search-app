# フロントエンド デバッグ手順

## 🔍 問題の診断

「スプレッドシート同期情報」セクションが表示されない問題を診断します。

## 📋 手順

### ステップ1: ブラウザの開発者ツールを開く

1. **F12**を押して開発者ツールを開く
2. **Console**タブを選択

### ステップ2: ネットワークタブでAPIリクエストを確認

1. **Network**タブを選択
2. ページをリロード（**Ctrl+R**）
3. `/api/sellers/dab10d67-54fd-4b04-9f6b-959cbd04e2fc`のリクエストを探す
4. そのリクエストをクリック
5. **Response**タブを選択

### ステップ3: レスポンスの内容を確認

以下のフィールドが含まれているか確認：

```json
{
  "sellerNumber": "AA13424",
  "visitAcquisitionDate": "2026-01-17",
  "visitDate": "2026-01-18",
  "visitValuationAcquirer": "木村侑里音",
  "visitAssignee": "山本裕子"
}
```

### ステップ4: Consoleタブでsellerオブジェクトを確認

Consoleタブで以下を実行：

```javascript
// sellerオブジェクトの内容を確認
console.log('seller:', seller);

// 訪問フィールドの存在確認
console.log('visitAcquisitionDate:', seller?.visitAcquisitionDate);
console.log('visitDate:', seller?.visitDate);
console.log('visitValuationAcquirer:', seller?.visitValuationAcquirer);
console.log('visitAssignee:', seller?.visitAssignee);
```

## 🎯 期待される結果

### ネットワークタブ（Response）

```json
{
  "id": "dab10d67-54fd-4b04-9f6b-959cbd04e2fc",
  "sellerNumber": "AA13424",
  "name": "...",
  "status": "追客中",
  "visitAcquisitionDate": "2026-01-17T00:00:00.000Z",
  "visitDate": "2026-01-18T00:00:00.000Z",
  "visitValuationAcquirer": "木村侑里音",
  "visitAssignee": "山本裕子",
  "inquiryYear": 2026,
  "inquiryDate": "2026-01-17T00:00:00.000Z",
  "inquirySite": "H"
}
```

### Consoleタブ

```
visitAcquisitionDate: 2026-01-17T00:00:00.000Z
visitDate: 2026-01-18T00:00:00.000Z
visitValuationAcquirer: 木村侑里音
visitAssignee: 山本裕子
```

## ❌ 問題のパターン

### パターン1: APIレスポンスに訪問フィールドがない

**症状**: ネットワークタブのResponseに`visitAcquisitionDate`などが含まれていない

**原因**: バックエンドの`decryptSeller`メソッドが訪問フィールドを返していない

**解決策**: バックエンドのコードを確認

### パターン2: APIレスポンスにはあるが、sellerオブジェクトにない

**症状**: ネットワークタブには表示されるが、Consoleで`seller.visitAcquisitionDate`が`undefined`

**原因**: フロントエンドの`loadSellerData`メソッドがフィールドを設定していない

**解決策**: `SellerDetailPage.tsx`の`loadSellerData`を確認

### パターン3: sellerオブジェクトにはあるが、UIに表示されない

**症状**: Consoleには表示されるが、画面に表示されない

**原因**: JSXの条件分岐またはCollapsibleSectionの問題

**解決策**: `SellerDetailPage.tsx`の1456-1503行目を確認

## 📝 結果を報告

以下の情報を報告してください：

1. **ネットワークタブのResponse**: `visitAcquisitionDate`が含まれているか？
2. **Consoleタブ**: `seller.visitAcquisitionDate`の値は？
3. **スクリーンショット**: ネットワークタブとConsoleタブの両方

これにより、問題の正確な箇所を特定できます。
