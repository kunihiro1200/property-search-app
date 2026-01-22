# Design Document

## Overview

売主リストをスプレッドシートから同期する際、売主情報は正しく同期されるが、関連する物件情報が作成されない問題を解決します。

現在の実装では、`EnhancedAutoSyncService.syncSingleSeller()`メソッドが`PropertySyncHandler.syncProperty()`を呼び出して物件情報を作成していますが、以下の問題が発生しています:

1. 物件番号が設定されていない場合、物件レコードが作成されない
2. 物件情報のマッピングが不完全で、一部のフィールドが保存されない
3. エラーハンドリングが不十分で、物件作成失敗時に売主作成もロールバックされない

この設計では、以下の対応を行います:
1. 売主同期時に物件情報を確実に作成する
2. スプレッドシートの物件フィールドを正しくマッピングする
3. トランザクション管理を改善する
4. エラーログを記録する

## Architecture

### システム構成

```
[スプレッドシート（売主リスト）]
    ↓ (同期)
[EnhancedAutoSyncService]
    ↓
[PropertySyncHandler] ← 物件情報の作成・更新
    ↓
[PostgreSQL Database]
    ├─ sellers テーブル
    └─ properties テーブル
```

### データフロー

1. `EnhancedAutoSyncService.syncMissingSellers()`が不足している売主を検出
2. `syncSingleSeller()`が各売主を同期
3. 売主レコードを作成（UPSERT）
4. `PropertySyncHandler.syncProperty()`が物件レコードを作成・更新
5. 通話モードページで売主と物件情報を表示

## Components and Interfaces

### Backend Components

#### 1. EnhancedAutoSyncService (既存の修正)

**責務**: スプレッドシートから売主データを同期

**主要メソッド**:
```typescript
class EnhancedAutoSyncService {
  // 既存メソッド（修正）
  private async syncSingleSeller(sellerNumber: string, row: any): Promise<void>
  
  // 新規メソッド
  private async ensurePropertyCreated(sellerId: string, sellerNumber: string, row: any): Promise<void>
}
```

**変更点**:
- `syncSingleSeller()`で物件作成を確実に実行
- 物件番号が設定されていない場合でも物件レコードを作成
- エラーハンドリングを改善
- ログ記録を追加

#### 2. PropertySyncHandler (既存の確認・修正)

**責務**: 物件情報の作成・更新

**主要メソッド**:
```typescript
class PropertySyncHandler {
  async syncProperty(sellerId: string, propertyData: PropertyData): Promise<void>
  async findOrCreateProperty(sellerId: string, propertyNumber?: string): Promise<Property>
}
```

**変更点**:
- 物件番号がない場合でも物件レコードを作成
- 既存物件の検索ロジックを改善
- エラーハンドリングを追加

#### 3. SellerService (既存の確認)

**責務**: 売主データの取得

**主要メソッド**:
```typescript
class SellerService {
  async getSeller(sellerId: string): Promise<Seller | null>
  async getSellerByNumber(sellerNumber: string): Promise<Seller | null>
}
```

**確認点**:
- `getSeller()`が物件情報を正しく取得しているか
- 物件情報が存在しない場合の処理

## Data Models

### Seller型

```typescript
interface Seller {
  id: string;
  seller_number: string;
  name: string;
  address: string;
  phone_number: string;
  email?: string;
  status: SellerStatus;
  property_number?: string;  // 物件番号
  // ... その他のフィールド
  property?: PropertyInfo;  // 関連物件情報
}
```

### PropertyInfo型

```typescript
interface PropertyInfo {
  id: string;
  seller_id: string;
  property_number?: string;
  address: string;
  property_type?: string;
  land_area?: number;
  building_area?: number;
  build_year?: number;
  structure?: string;
  floor_plan?: string;
  seller_situation?: string;
  created_at: Date;
  updated_at: Date;
}
```

### PropertyData型（同期用）

```typescript
interface PropertyData {
  address: string;
  property_type?: string;
  land_area?: number;
  building_area?: number;
  build_year?: number;
  structure?: string;
  floor_plan?: string;
  seller_situation?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 売主作成時の物件作成

*For any* 売主レコード、売主を作成する場合、関連する物件レコードも同時に作成される
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: フィールドマッピングの完全性

*For any* スプレッドシートの物件情報フィールド、システムが同期する場合、全てのフィールドが正しくデータベースにマッピングされる
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: 売主と物件の関連付け

*For any* 物件レコード、物件を作成する場合、`seller_id`フィールドに正しい売主IDが設定される
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: トランザクションの原子性

*For any* 売主同期処理、売主情報と物件情報の作成・更新は同一トランザクション内で実行され、一方が失敗した場合は両方がロールバックされる
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: ログ記録の完全性

*For any* 物件作成・更新処理、処理結果（成功・失敗）がログに記録される
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: 既存データへの適用

*For any* 物件番号を持つ売主レコード、一括物件作成スクリプトを実行する場合、物件レコードが存在しなければ新規作成される
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 7: 通話モードページでの表示

*For any* 売主ID、通話モードページを開く場合、関連する物件情報が取得され表示される
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

## Error Handling

### エラーケース

1. **物件作成エラー**
   - エラーログを記録
   - 売主作成もロールバック（トランザクション）
   - ユーザーに通知

2. **フィールドマッピングエラー**
   - エラーログを記録
   - デフォルト値を使用
   - 処理を続行

3. **データベース接続エラー**
   - エラーログを記録
   - リトライ（最大3回）
   - 失敗した場合は処理を中断

4. **スプレッドシートデータ不正**
   - エラーログを記録
   - 該当レコードをスキップ
   - 処理を続行

5. **物件番号重複エラー**
   - エラーログを記録
   - 既存物件を更新
   - 処理を続行

### エラーハンドリング戦略

- **致命的エラー**: データベース接続エラー → 処理を中断
- **非致命的エラー**: フィールドマッピングエラー → ログ記録して続行
- **トランザクションエラー**: 物件作成エラー → 売主作成もロールバック

## Testing Strategy

### Unit Tests

1. **EnhancedAutoSyncService.syncSingleSeller()のテスト**
   - 売主レコードが正しく作成されることを確認
   - 物件レコードが正しく作成されることを確認
   - エラーハンドリングが正しく動作することを確認

2. **PropertySyncHandler.syncProperty()のテスト**
   - 物件レコードが正しく作成されることを確認
   - 既存物件が正しく更新されることを確認
   - 物件番号がない場合でも作成されることを確認

3. **SellerService.getSeller()のテスト**
   - 売主情報が正しく取得されることを確認
   - 物件情報が正しく関連付けられることを確認
   - 物件情報が存在しない場合の処理を確認

### Integration Tests

1. **エンドツーエンド同期テスト**
   - スプレッドシートからデータベースへの同期
   - 売主と物件の作成
   - 通話モードページでの表示

2. **トランザクションテスト**
   - 売主作成成功、物件作成失敗 → 両方ロールバック
   - 売主作成失敗 → 物件作成も実行されない

3. **一括作成テスト**
   - 既存データへの物件作成
   - 進捗状況の表示
   - エラーハンドリング

### Manual Testing

1. **通話モードページの表示確認**
   - 売主情報が表示されることを確認
   - 物件情報が表示されることを確認
   - 物件情報が存在しない場合のメッセージを確認

2. **同期後の確認**
   - 売主同期後に物件情報が作成されることを確認
   - データベースで売主と物件の関連を確認

## Implementation Notes

### Backend実装のポイント

#### 1. EnhancedAutoSyncService.syncSingleSeller()の修正

```typescript
private async syncSingleSeller(sellerNumber: string, row: any): Promise<void> {
  const mappedData = this.columnMapper.mapToDatabase(row);
  
  // ... 既存の処理 ...
  
  // UPSERT: 既存データがあれば更新、なければ挿入
  const { data: newSeller, error: upsertError } = await this.supabase
    .from('sellers')
    .upsert(encryptedData, {
      onConflict: 'seller_number',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (upsertError) {
    throw new Error(`Failed to upsert seller: ${upsertError.message}`);
  }

  // 物件情報を確実に作成
  if (newSeller) {
    try {
      await this.ensurePropertyCreated(newSeller.id, sellerNumber, row);
    } catch (error: any) {
      console.error(`❌ Failed to create property for ${sellerNumber}:`, error.message);
      // 物件作成失敗をログに記録
      await this.logPropertyCreationError(sellerNumber, error.message);
      // 売主作成はロールバックしない（既に作成済み）
      // 代わりに、後で再試行できるようにエラーを記録
    }
  }
}
```

#### 2. ensurePropertyCreated()メソッドの実装

```typescript
private async ensurePropertyCreated(
  sellerId: string, 
  sellerNumber: string, 
  row: any
): Promise<void> {
  const propertyAddress = row['物件所在地'] || '未入力';
  const propertyNumber = row['物件番号'];
  
  let propertyType = row['種別'];
  if (propertyType) {
    const typeStr = String(propertyType).trim();
    const typeMapping: Record<string, string> = {
      '土': '土地',
      '戸': '戸建',
      'マ': 'マンション',
      '事': '事業用',
    };
    propertyType = typeMapping[typeStr] || typeStr;
  }

  const propertyData: PropertyData = {
    address: String(propertyAddress),
    property_type: propertyType ? String(propertyType) : undefined,
    land_area: this.parseNumeric(row['土（㎡）']) ?? undefined,
    building_area: this.parseNumeric(row['建（㎡）']) ?? undefined,
    build_year: this.parseNumeric(row['築年']) ?? undefined,
    structure: row['構造'] ? String(row['構造']) : undefined,
    seller_situation: row['状況（売主）'] ? String(row['状況（売主）']) : undefined,
    floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
  };

  await this.propertySyncHandler.syncProperty(sellerId, propertyData, propertyNumber);
  
  console.log(`✅ ${sellerNumber}: Property created/updated`);
}
```

#### 3. PropertySyncHandler.syncProperty()の修正

```typescript
async syncProperty(
  sellerId: string, 
  propertyData: PropertyData,
  propertyNumber?: string
): Promise<void> {
  // 既存物件を検索
  let existingProperty = null;
  
  if (propertyNumber) {
    // 物件番号で検索
    const { data } = await this.supabase
      .from('properties')
      .select('*')
      .eq('property_number', propertyNumber)
      .maybeSingle();
    existingProperty = data;
  }
  
  if (!existingProperty) {
    // seller_idで検索
    const { data } = await this.supabase
      .from('properties')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle();
    existingProperty = data;
  }

  if (existingProperty) {
    // 既存物件を更新
    const { error } = await this.supabase
      .from('properties')
      .update({
        ...propertyData,
        property_number: propertyNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProperty.id);
      
    if (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }
  } else {
    // 新規物件を作成
    const { error } = await this.supabase
      .from('properties')
      .insert({
        seller_id: sellerId,
        property_number: propertyNumber,
        ...propertyData,
      });
      
    if (error) {
      throw new Error(`Failed to create property: ${error.message}`);
    }
  }
}
```

#### 4. ログ記録メソッドの実装

```typescript
private async logPropertyCreationError(
  sellerNumber: string, 
  errorMessage: string
): Promise<void> {
  try {
    await this.supabase
      .from('sync_logs')
      .insert({
        entity_type: 'property',
        entity_id: sellerNumber,
        operation: 'create',
        status: 'failed',
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      });
  } catch (error: any) {
    console.error(`Failed to log error: ${error.message}`);
  }
}
```

### Frontend実装のポイント

通話モードページでは既に物件情報を表示する実装があるため、フロントエンドの変更は不要です。

ただし、以下の点を確認:
- `SellerService.getSeller()`が物件情報を正しく取得しているか
- 物件情報が存在しない場合に「物件情報が登録されていません」と表示されるか

## Database Schema Changes

データベーススキーマの変更は不要です。既存のテーブルを使用します。

ただし、以下のフィールドがデータベースに存在することを確認:
- `sellers.property_number` (VARCHAR)
- `properties.seller_id` (UUID, FOREIGN KEY)
- `properties.property_number` (VARCHAR)
- `properties.address` (TEXT)
- `properties.property_type` (VARCHAR)
- `properties.land_area` (NUMERIC)
- `properties.building_area` (NUMERIC)
- `properties.build_year` (INTEGER)
- `properties.structure` (VARCHAR)
- `properties.floor_plan` (VARCHAR)
- `properties.seller_situation` (VARCHAR)

## API Changes

APIの変更は不要です。既存のエンドポイントを使用します。

ただし、以下のエンドポイントが正しく動作することを確認:
- `GET /api/sellers/:id` - 売主情報と物件情報を取得
- `GET /api/sellers/number/:sellerNumber` - 売主番号で売主情報を取得

## Performance Considerations

1. **バッチ処理の最適化**
   - 売主同期時に物件情報も同時に作成
   - トランザクションを使用してデータ整合性を保証

2. **データベースクエリの最適化**
   - 物件検索時にインデックスを使用
   - `seller_id`と`property_number`にインデックスを作成

3. **エラーハンドリングの最適化**
   - 物件作成失敗時に売主作成をロールバックしない
   - エラーログを記録して後で再試行

## Security Considerations

1. **暗号化データの取り扱い**
   - 売主の個人情報（name, address, phoneNumber, email）は暗号化
   - 物件情報は暗号化不要（公開情報）

2. **トランザクション管理**
   - 売主と物件の作成を同一トランザクション内で実行
   - ロールバック時にデータ整合性を保証

3. **アクセス制御**
   - 認証済みユーザーのみがアクセス可能
   - 売主データへのアクセスは権限チェック

## Deployment Plan

1. **Phase 1: Backend実装**
   - `EnhancedAutoSyncService.syncSingleSeller()`の修正
   - `ensurePropertyCreated()`メソッドの実装
   - `PropertySyncHandler.syncProperty()`の修正
   - ログ記録メソッドの実装
   - テストの実装と実行

2. **Phase 2: 一括物件作成スクリプト**
   - 既存売主データに対して物件レコードを作成
   - 進捗状況の表示
   - エラーハンドリング

3. **Phase 3: 統合テスト**
   - エンドツーエンドテスト
   - 手動テスト

4. **Phase 4: デプロイ**
   - ステージング環境へのデプロイ
   - 本番環境へのデプロイ

## Rollback Plan

問題が発生した場合:
1. バックエンドの変更をロールバック
2. データベースの変更は不要（スキーマ変更なし）
3. 作成された物件レコードは削除しない（データ損失を防ぐ）

## Monitoring and Logging

1. **ログ出力**
   - 売主同期時のログ
   - 物件作成時のログ
   - エラーログ

2. **メトリクス**
   - 売主同期件数
   - 物件作成件数
   - エラー発生率

3. **アラート**
   - 物件作成エラーが頻発する場合
   - 同期処理に時間がかかる場合

