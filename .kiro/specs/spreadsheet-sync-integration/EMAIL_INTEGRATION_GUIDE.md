# メールシステム統合ガイド

## 概要

このガイドでは、既存のメールシステムから査定依頼メールを受信した際に、自動的に売主を登録してSupabaseとGoogleスプレッドシートに同期する方法を説明します。

## 統合方法

### 1. APIエンドポイント

以下のAPIエンドポイントが利用可能です：

#### 単一メール処理
```
POST /api/integration/inquiry-email
```

#### バッチ処理
```
POST /api/integration/inquiry-email/batch
```

#### 重複チェック
```
POST /api/integration/check-duplicates
```

### 2. ヘルパー関数の使用

`EmailIntegrationHelper`クラスを使用して、簡単に統合できます。

```typescript
import { emailIntegrationHelper, InquiryEmailData } from '../utils/emailIntegrationHelper';

// 査定依頼メールから売主を登録
async function handleInquiryEmail(emailData: InquiryEmailData) {
  const result = await emailIntegrationHelper.registerSellerFromEmail(emailData);
  
  if (result.success) {
    console.log('売主登録成功:', result.sellerNumber);
    console.log('売主ID:', result.sellerId);
  } else {
    console.error('売主登録失敗:', result.error);
  }
}
```

### 3. データ形式

#### InquiryEmailData

```typescript
interface InquiryEmailData {
  // 必須フィールド
  name: string;                    // 売主名
  address: string;                 // 売主住所
  phoneNumber: string;             // 電話番号
  propertyAddress: string;         // 物件住所
  inquirySource: string;           // 反響元（例: "スーモ", "イエウール"）
  inquiryDate: Date;               // 反響日
  
  // オプションフィールド
  email?: string;                  // メールアドレス
  inquiryYear?: number;            // 反響年（自動計算可能）
  propertyType?: string;           // 物件種別
  landArea?: number;               // 土地面積
  buildingArea?: number;           // 建物面積
  buildYear?: number;              // 築年
  prefecture?: string;             // 都道府県
  city?: string;                   // 市区町村
  additionalInfo?: string;         // 追加情報
}
```

## 使用例

### 例1: 単一メールの処理

```typescript
import { emailIntegrationHelper } from '../utils/emailIntegrationHelper';

async function processInquiryEmail(emailContent: any) {
  // メールコンテンツから必要な情報を抽出
  const emailData = {
    name: emailContent.senderName,
    address: emailContent.senderAddress,
    phoneNumber: emailContent.phoneNumber,
    email: emailContent.email,
    propertyAddress: emailContent.propertyAddress,
    inquirySource: 'スーモ',
    inquiryDate: new Date(emailContent.receivedAt),
    propertyType: emailContent.propertyType,
    prefecture: '大分県',
    city: '大分市',
  };

  // 売主を登録
  const result = await emailIntegrationHelper.registerSellerFromEmail(emailData);
  
  if (result.success) {
    console.log(`✅ 売主登録完了: ${result.sellerNumber}`);
    // 次のステップ（例: 自動返信メール送信）
    await sendAutoReplyEmail(result.sellerId);
  } else {
    console.error(`❌ 売主登録失敗: ${result.error}`);
    // エラー通知
    await notifyAdministrator(result.error);
  }
}
```

### 例2: バッチ処理

```typescript
import { emailIntegrationHelper } from '../utils/emailIntegrationHelper';

async function processBatchEmails(emails: any[]) {
  const emailDataList = emails.map(email => ({
    name: email.senderName,
    address: email.senderAddress,
    phoneNumber: email.phoneNumber,
    email: email.email,
    propertyAddress: email.propertyAddress,
    inquirySource: email.source,
    inquiryDate: new Date(email.receivedAt),
  }));

  const result = await emailIntegrationHelper.registerSellersFromEmails(emailDataList);
  
  console.log(`✅ 成功: ${result.successCount}件`);
  console.log(`❌ 失敗: ${result.failureCount}件`);
  
  // 失敗したメールを確認
  result.results.forEach((r, index) => {
    if (!r.success) {
      console.error(`メール${index + 1}の処理失敗:`, r.error);
    }
  });
}
```

### 例3: 重複チェック

```typescript
import { emailIntegrationHelper } from '../utils/emailIntegrationHelper';

async function checkBeforeRegistration(phoneNumber: string, email?: string) {
  const duplicateCheck = await emailIntegrationHelper.checkDuplicates(
    phoneNumber,
    email
  );
  
  if (duplicateCheck.hasDuplicates) {
    console.log('⚠️ 重複する売主が見つかりました:');
    duplicateCheck.matches.forEach(match => {
      console.log(`  - 売主番号: ${match.sellerNumber}`);
      console.log(`    マッチタイプ: ${match.matchType}`);
    });
    
    // ユーザーに確認を求める
    const shouldProceed = await confirmWithUser();
    if (!shouldProceed) {
      return false;
    }
  }
  
  return true;
}
```

## エラーハンドリング

### リトライロジック

`EmailIntegrationHelper`は自動的に3回までリトライします（exponential backoff）。

```typescript
const helper = new EmailIntegrationHelper(
  'http://localhost:3000',  // API URL
  3,                         // 最大リトライ回数
  1000                       // 初期遅延（ms）
);
```

### エラータイプ

- **バリデーションエラー**: 必須フィールドが不足している場合
- **ネットワークエラー**: API接続に失敗した場合
- **タイムアウト**: 処理に時間がかかりすぎた場合
- **重複エラー**: 同じ売主が既に存在する場合（警告のみ）

## 統合テスト

### テストデータ

```typescript
const testEmailData = {
  name: '山田太郎',
  address: '大分県大分市中央町1-1-1',
  phoneNumber: '097-123-4567',
  email: 'yamada@example.com',
  propertyAddress: '大分県大分市中央町2-2-2',
  inquirySource: 'テスト',
  inquiryDate: new Date(),
  propertyType: '戸建て',
  landArea: 150,
  buildingArea: 100,
  buildYear: 2010,
  prefecture: '大分県',
  city: '大分市',
};
```

### テスト実行

```bash
# 単一メールテスト
curl -X POST http://localhost:3000/api/integration/inquiry-email \
  -H "Content-Type: application/json" \
  -d @test-email-data.json

# 重複チェックテスト
curl -X POST http://localhost:3000/api/integration/check-duplicates \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"097-123-4567","email":"yamada@example.com"}'
```

## モニタリング

### ログの確認

同期ログは`sync_logs`テーブルに記録されます：

```sql
SELECT * FROM sync_logs 
WHERE sync_type = 'create' 
  AND metadata->>'source' = 'email_integration'
ORDER BY started_at DESC 
LIMIT 10;
```

### エラーログの確認

エラーは`error_logs`テーブルに記録されます：

```sql
SELECT * FROM error_logs 
WHERE operation = 'inquiry_email'
ORDER BY created_at DESC 
LIMIT 10;
```

## トラブルシューティング

### 問題: 売主が登録されない

1. APIエンドポイントが正しく設定されているか確認
2. 必須フィールドがすべて含まれているか確認
3. ネットワーク接続を確認
4. エラーログを確認

### 問題: スプレッドシートに同期されない

1. Google Sheets APIの認証情報を確認
2. スプレッドシートIDが正しいか確認
3. サービスアカウントに編集権限があるか確認
4. `sync_logs`テーブルでエラーを確認

### 問題: 重複する売主が作成される

1. 重複チェックAPIを使用しているか確認
2. 電話番号の形式が統一されているか確認
3. `duplicate_detection_service`の設定を確認

## ベストプラクティス

1. **バリデーション**: メールデータを登録前に必ずバリデーション
2. **重複チェック**: 登録前に重複チェックを実行
3. **エラーハンドリング**: すべてのエラーを適切にログに記録
4. **リトライ**: ネットワークエラーは自動的にリトライ
5. **モニタリング**: 定期的にログを確認して問題を早期発見

## 次のステップ

1. 既存のメールシステムに統合コードを追加
2. テスト環境で動作確認
3. 本番環境にデプロイ
4. モニタリングとアラートを設定
