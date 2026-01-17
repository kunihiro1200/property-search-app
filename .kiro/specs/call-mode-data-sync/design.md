# Design Document

## Overview

通話モードページにおいて、スプレッドシートから同期されたデータが正しく表示されない問題を解決します。現在、`SellerService.getSeller()`メソッドは売主情報と物件情報を取得していますが、通話モードページで必要な全てのフィールドが正しくマッピングされていない可能性があります。

この設計では、以下の対応を行います:
1. データベースから取得したデータを正しく復号化し、フロントエンドに渡す
2. 通話モードページで必要な全てのフィールドをマッピングする
3. キャッシュクリア機能を実装して、常に最新データを取得できるようにする
4. スプレッドシートコメントとAI要約を正しく表示する

## Architecture

### システム構成

```
[スプレッドシート] 
    ↓ (同期)
[PostgreSQL Database]
    ↓ (API)
[Backend: SellerService]
    ↓ (REST API)
[Frontend: CallModePage]
    ↓ (表示)
[ユーザー]
```

### データフロー

1. スプレッドシートから`SpreadsheetSyncService`がデータを同期
2. データは暗号化されてPostgreSQLに保存
3. `SellerService.getSeller()`がデータを取得・復号化
4. REST APIを通じてフロントエンドに送信
5. `CallModePage`がデータを表示

## Components and Interfaces

### Backend Components

#### 1. SellerService (既存の拡張)

**責務**: 売主データの取得、復号化、キャッシュ管理

**主要メソッド**:
```typescript
class SellerService {
  // 既存メソッド（拡張）
  async getSeller(sellerId: string): Promise<Seller | null>
  
  // 新規メソッド
  async clearSellerCache(sellerId: string): Promise<void>
}
```

**変更点**:
- `getSeller()`メソッドで全てのフィールドを正しくマッピング
- スプレッドシートコメント(`comments`)フィールドを追加
- 訪問関連フィールド(`visit_date`, `visit_time`, `visit_assignee`, `visit_valuation_acquirer`)を追加
- 査定関連フィールド(`valuation_assignee`, `phone_assignee`)を追加

#### 2. Cache API Endpoint (新規)

**責務**: キャッシュのクリア

**エンドポイント**:
```typescript
DELETE /api/cache/seller/:id
```

**レスポンス**:
```typescript
{
  success: boolean;
  message: string;
}
```

### Frontend Components

#### 1. CallModePage (既存の修正)

**責務**: 通話モードページの表示とデータ管理

**主要な変更点**:
- `loadAllData()`関数でキャッシュクリアAPIを呼び出す
- 全てのセクションで正しいフィールドを参照する
- スプレッドシートコメントを表示する
- AI要約にスプレッドシートコメントを含める

## Data Models

### Seller型の拡張

```typescript
interface Seller {
  // 既存フィールド
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  status: SellerStatus;
  confidence?: ConfidenceLevel;
  assignedTo?: string;
  appointmentDate?: Date;
  appointmentNotes?: string;
  nextCallDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Phase 1フィールド
  sellerNumber?: string;
  inquirySource?: string;
  inquiryYear?: number;
  inquiryDate?: Date;
  inquiryDatetime?: Date;
  isUnreachable: boolean;
  unreachableSince?: Date;
  firstCallerInitials?: string;
  firstCallerEmployeeId?: string;
  confidenceLevel?: ConfidenceLevel;
  duplicateConfirmed: boolean;
  duplicateConfirmedAt?: Date;
  duplicateConfirmedBy?: string;
  
  // 査定関連フィールド
  fixedAssetTaxRoadPrice?: number;
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  valuationAssignedBy?: string;
  valuationAssignee?: string;  // 追加
  phoneAssignee?: string;      // 追加
  
  // 競合情報フィールド
  competitorName?: string;
  competitorNameAndReason?: string;
  exclusiveOtherDecisionFactors?: string[];
  otherDecisionCountermeasure?: string;
  contractYearMonth?: Date;
  exclusiveOtherDecisionMeeting?: string;
  
  // サイト・除外関連フィールド
  site?: string;
  exclusionDate?: Date;
  exclusionAction?: string;
  
  // スプレッドシートコメント（追加）
  comments?: string;
  
  // 訪問関連フィールド（追加）
  visitDate?: Date;
  visitTime?: string;
  visitAssignee?: string;
  visitValuationAcquirer?: string;
  
  // 物件情報
  property?: PropertyInfo;
}
```

### PropertyInfo型

```typescript
interface PropertyInfo {
  id: string;
  sellerId: string;
  address: string;
  prefecture?: string;
  city?: string;
  propertyType?: string;
  landArea?: number;
  buildingArea?: number;
  landAreaVerified?: boolean;
  buildingAreaVerified?: boolean;
  buildYear?: number;
  structure?: string;
  floorPlan?: string;
  floors?: number;
  rooms?: number;
  sellerSituation?: string;
  parking?: string;
  additionalInfo?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: データ取得の完全性

*For any* 売主ID、システムがデータベースから売主情報を取得する場合、全ての定義されたフィールドが正しくマッピングされ、nullまたはundefinedでない値が適切に設定されている
**Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 5.1, 6.1**

### Property 2: 暗号化フィールドの復号化

*For any* 暗号化されたフィールド（name, address, phoneNumber, email）、システムが復号化する場合、復号化後の値は元の平文と一致する
**Validates: Requirements 1.2**

### Property 3: キャッシュクリアの効果

*For any* 売主ID、キャッシュクリアAPIを呼び出した後にデータを取得する場合、取得されるデータはデータベースの最新の状態と一致する
**Validates: Requirements 8.1, 8.3**

### Property 4: 物件情報の関連付け

*For any* 売主ID、売主情報を取得する場合、関連する物件情報が存在すればそれが`property`フィールドに正しく設定される
**Validates: Requirements 2.1, 2.3**

### Property 5: 日本語ラベルの変換

*For any* 物件種別または状況（売主）の値、システムが表示する場合、対応する日本語ラベルが正しく表示される
**Validates: Requirements 2.4, 2.5**

### Property 6: AI要約の包括性

*For any* 売主ID、AI要約を生成する場合、通話履歴とスプレッドシートコメントの両方が要約に含まれる
**Validates: Requirements 7.1, 7.2**

### Property 7: URLリンク化

*For any* スプレッドシートコメントまたはテキストフィールド、URLパターンにマッチする文字列が含まれる場合、それらはクリック可能なリンクとして表示される
**Validates: Requirements 6.2**

### Property 8: 査定情報の表示

*For any* 売主ID、査定額が設定されている場合、査定額1、査定額2、査定額3が万円単位で正しく表示され、手入力/自動計算の区別が明示される
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 9: 訪問予約情報の表示

*For any* 売主ID、訪問予約が設定されている場合、訪問日時、担当者、訪問査定取得者が正しく表示される
**Validates: Requirements 3.1**

### Property 10: ステータス情報の表示

*For any* 売主ID、ステータスと確度が設定されている場合、それらが正しく表示され、関連する日付情報（次回電話日、除外日、決定日）も表示される
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

## Error Handling

### エラーケース

1. **データベース接続エラー**
   - エラーメッセージを表示
   - ユーザーに再試行を促す

2. **復号化エラー**
   - エラーログを記録
   - 該当フィールドを空文字列として扱う
   - 処理を続行

3. **キャッシュクリアエラー**
   - エラーを無視して続行
   - データ取得は継続

4. **AI要約生成エラー**
   - エラーを無視
   - 要約なしで画面を表示

5. **物件情報取得エラー**
   - 「物件情報なし」と表示
   - 売主情報の表示は継続

### エラーハンドリング戦略

- **致命的エラー**: データベース接続エラー → ユーザーに通知して処理を中断
- **非致命的エラー**: 復号化エラー、キャッシュエラー → ログ記録して処理を続行
- **オプショナルエラー**: AI要約エラー → 無視して続行

## Testing Strategy

### Unit Tests

1. **SellerService.getSeller()のテスト**
   - 全フィールドが正しくマッピングされることを確認
   - 暗号化フィールドが正しく復号化されることを確認
   - 物件情報が正しく関連付けられることを確認

2. **キャッシュクリアAPIのテスト**
   - キャッシュが正しくクリアされることを確認
   - エラーケースでも処理が続行されることを確認

3. **CallModePage.loadAllData()のテスト**
   - キャッシュクリアAPIが呼び出されることを確認
   - データが正しく取得されることを確認
   - エラーハンドリングが正しく動作することを確認

### Integration Tests

1. **エンドツーエンドデータフロー**
   - スプレッドシートからデータベースへの同期
   - データベースからフロントエンドへのデータ取得
   - フロントエンドでの表示

2. **キャッシュ動作**
   - キャッシュヒット時の動作
   - キャッシュクリア後の動作
   - キャッシュミス時の動作

### Manual Testing

1. **通話モードページの表示確認**
   - 全セクションにデータが表示されることを確認
   - スプレッドシートコメントが表示されることを確認
   - AI要約が表示されることを確認
   - URLがリンク化されることを確認

2. **データ更新後の表示確認**
   - データ更新後にページをリロードして最新データが表示されることを確認

## Implementation Notes

### Backend実装のポイント

1. **SellerService.decryptSeller()の拡張**
   - `comments`フィールドを追加
   - `visit_date`, `visit_time`, `visit_assignee`, `visit_valuation_acquirer`フィールドを追加
   - `valuation_assignee`, `phone_assignee`フィールドを追加

2. **キャッシュクリアAPIの実装**
   ```typescript
   // backend/src/routes/cache.ts
   router.delete('/cache/seller/:id', async (req, res) => {
     const { id } = req.params;
     await CacheHelper.del(CacheHelper.generateKey('seller', id));
     res.json({ success: true, message: 'Cache cleared' });
   });
   ```

### Frontend実装のポイント

1. **loadAllData()関数の修正**
   ```typescript
   const loadAllData = async () => {
     // キャッシュをクリア
     try {
       await api.delete(`/cache/seller/${id}`);
     } catch (cacheError) {
       console.log('⚠️ キャッシュクリアに失敗（続行）:', cacheError);
     }
     
     // データ取得
     const [sellerResponse, activitiesResponse, employeesResponse] = await Promise.all([
       api.get(`/sellers/${id}`),
       api.get(`/sellers/${id}/activities`),
       api.get('/employees'),
     ]);
     
     // ... データ設定
   };
   ```

2. **スプレッドシートコメントの表示**
   ```typescript
   {seller?.comments && (
     <Box sx={{ mt: 2 }}>
       <Typography variant="h6">スプレッドシートコメント</Typography>
       <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
         {renderTextWithLinks(seller.comments)}
       </Typography>
     </Box>
   )}
   ```

3. **AI要約へのコメント追加**
   ```typescript
   const memosToSummarize: string[] = [];
   
   // スプレッドシートコメントを最初に追加
   if (sellerData.comments && sellerData.comments.trim()) {
     memosToSummarize.push(`【スプレッドシートコメント】\n${sellerData.comments}`);
   }
   
   // 通話履歴を追加
   phoneCalls.forEach((call: Activity) => {
     memosToSummarize.push(call.content);
   });
   ```

## Database Schema Changes

データベーススキーマの変更は不要です。既存のフィールドを正しくマッピングするだけです。

ただし、以下のフィールドがデータベースに存在することを確認する必要があります:
- `sellers.comments` (TEXT)
- `sellers.visit_date` (DATE)
- `sellers.visit_time` (TIME)
- `sellers.visit_assignee` (TEXT)
- `sellers.visit_valuation_acquirer` (TEXT)
- `sellers.valuation_assignee` (TEXT)
- `sellers.phone_assignee` (TEXT)

これらのフィールドは既にmigration 030で追加されているはずです。

## API Changes

### 新規エンドポイント

```
DELETE /api/cache/seller/:id
```

**説明**: 指定された売主のキャッシュをクリアします。

**パラメータ**:
- `id` (path): 売主ID

**レスポンス**:
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "message": "Failed to clear cache"
  }
}
```

### 既存エンドポイントの変更

```
GET /api/sellers/:id
```

**変更点**: レスポンスに以下のフィールドを追加
- `comments`
- `visitDate`
- `visitTime`
- `visitAssignee`
- `visitValuationAcquirer`
- `valuationAssignee`
- `phoneAssignee`

## Performance Considerations

1. **キャッシュ戦略**
   - 通話モードページを開く際は常にキャッシュをクリアして最新データを取得
   - 一覧ページではキャッシュを活用して高速化

2. **データ取得の最適化**
   - 売主情報、活動履歴、従業員情報を並列で取得
   - AI要約は非同期で生成（画面表示をブロックしない）

3. **レンダリングの最適化**
   - 大量のテキストはスクロール可能な領域で表示
   - URLリンク化は正規表現で効率的に処理

## Security Considerations

1. **暗号化データの取り扱い**
   - 個人情報（name, address, phoneNumber, email）は暗号化されたまま保存
   - 復号化はバックエンドでのみ実行
   - フロントエンドには復号化済みのデータを送信

2. **キャッシュのセキュリティ**
   - キャッシュには復号化済みのデータを保存
   - キャッシュのTTLを適切に設定
   - 機密性の高いデータはキャッシュしない

3. **APIアクセス制御**
   - 認証済みユーザーのみがアクセス可能
   - 売主データへのアクセスは権限チェック

## Deployment Plan

1. **Phase 1: Backend実装**
   - SellerService.decryptSeller()の拡張
   - キャッシュクリアAPIの実装
   - テストの実装と実行

2. **Phase 2: Frontend実装**
   - CallModePage.loadAllData()の修正
   - スプレッドシートコメントの表示
   - AI要約へのコメント追加
   - テストの実装と実行

3. **Phase 3: 統合テスト**
   - エンドツーエンドテスト
   - 手動テスト

4. **Phase 4: デプロイ**
   - ステージング環境へのデプロイ
   - 本番環境へのデプロイ

## Rollback Plan

問題が発生した場合:
1. フロントエンドの変更をロールバック
2. バックエンドの変更をロールバック
3. データベースの変更は不要（スキーマ変更なし）

## Monitoring and Logging

1. **ログ出力**
   - データ取得時のログ
   - 復号化エラーのログ
   - キャッシュクリアのログ

2. **メトリクス**
   - データ取得時間
   - キャッシュヒット率
   - エラー発生率

3. **アラート**
   - 復号化エラーが頻発する場合
   - データ取得に時間がかかる場合
