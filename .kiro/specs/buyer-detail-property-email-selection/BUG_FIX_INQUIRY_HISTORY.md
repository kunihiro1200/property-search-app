# Bug Fix: 買主問合せ履歴取得エラー

## 問題の概要

買主6647の詳細ページで「問合せ履歴の取得に失敗しました」というエラーが発生しています。

## 根本原因

`BuyerService.getInquiryHistory()` メソッドで、`property_listings` テーブルを検索する際に、`buyer_id` カラム（UUID）と買主番号（文字列）を混同しています。

### 現在のコード（問題あり）

```typescript
// Get all buyer numbers (current + past)
const buyerNumbers = [buyer.buyer_number];
const pastBuyerNumbers = this.parsePastBuyerList(buyer.past_buyer_list);
buyerNumbers.push(...pastBuyerNumbers);

// ❌ 問題: buyer_id は UUID だが、buyerNumbers は買主番号（文字列）
const { data: properties, error } = await this.supabase
  .from('property_listings')
  .select(`...`)
  .in('buyer_id', buyerNumbers);  // ← ここが間違い
```

## 修正方法

### オプション1: buyer_number カラムで検索（推奨）

`property_listings` テーブルに `buyer_number` カラムがある場合、それを使用します。

```typescript
// Get all buyer numbers (current + past)
const buyerNumbers = [buyer.buyer_number];
const pastBuyerNumbers = this.parsePastBuyerList(buyer.past_buyer_list);
buyerNumbers.push(...pastBuyerNumbers);

// ✅ 修正: buyer_number カラムで検索
const { data: properties, error } = await this.supabase
  .from('property_listings')
  .select(`
    id,
    property_number,
    address,
    reception_date,
    buyer_number
  `)
  .in('buyer_number', buyerNumbers);

if (error) {
  throw new Error(`Failed to fetch inquiry history: ${error.message}`);
}

if (!properties || properties.length === 0) {
  return [];
}

// Map to inquiry history format
const history = properties.map(property => ({
  buyerNumber: property.buyer_number,
  propertyNumber: property.property_number,
  propertyAddress: property.address || '',
  inquiryDate: property.reception_date || '',
  status: (property.buyer_number === buyer.buyer_number ? 'current' : 'past') as 'current' | 'past',
  propertyId: property.id,
  propertyListingId: property.id,
}));
```

### オプション2: buyers テーブルと JOIN（より正確）

過去の買主番号に対応する buyer_id を取得してから検索します。

```typescript
// Get all buyer numbers (current + past)
const buyerNumbers = [buyer.buyer_number];
const pastBuyerNumbers = this.parsePastBuyerList(buyer.past_buyer_list);
buyerNumbers.push(...pastBuyerNumbers);

// Step 1: Get all buyer IDs for these buyer numbers
const { data: buyers, error: buyersError } = await this.supabase
  .from('buyers')
  .select('id, buyer_number')
  .in('buyer_number', buyerNumbers);

if (buyersError) {
  throw new Error(`Failed to fetch buyers: ${buyersError.message}`);
}

if (!buyers || buyers.length === 0) {
  return [];
}

const buyerIds = buyers.map(b => b.id);
const buyerNumberMap = new Map(buyers.map(b => [b.id, b.buyer_number]));

// Step 2: Fetch property listings using buyer IDs
const { data: properties, error } = await this.supabase
  .from('property_listings')
  .select(`
    id,
    property_number,
    address,
    reception_date,
    buyer_id
  `)
  .in('buyer_id', buyerIds);

if (error) {
  throw new Error(`Failed to fetch inquiry history: ${error.message}`);
}

if (!properties || properties.length === 0) {
  return [];
}

// Map to inquiry history format
const history = properties.map(property => {
  const propertyBuyerNumber = buyerNumberMap.get(property.buyer_id) || '';
  return {
    buyerNumber: propertyBuyerNumber,
    propertyNumber: property.property_number,
    propertyAddress: property.address || '',
    inquiryDate: property.reception_date || '',
    status: (propertyBuyerNumber === buyer.buyer_number ? 'current' : 'past') as 'current' | 'past',
    propertyId: property.id,
    propertyListingId: property.id,
  };
});
```

## テストケース

### 買主6647のテスト

```typescript
describe('BuyerService.getInquiryHistory', () => {
  it('should fetch inquiry history for buyer 6647', async () => {
    const buyerService = new BuyerService();
    
    // Get buyer 6647
    const buyer = await buyerService.getByBuyerNumber('6647');
    expect(buyer).toBeTruthy();
    
    // Get inquiry history
    const history = await buyerService.getInquiryHistory(buyer.id);
    
    // Should include current inquiry (AA10225)
    expect(history).toContainEqual(
      expect.objectContaining({
        buyerNumber: '6647',
        propertyNumber: 'AA10225',
        status: 'current'
      })
    );
    
    // Should include past inquiries if past_buyer_list is populated
    if (buyer.past_buyer_list) {
      const pastNumbers = buyer.past_buyer_list.split(',').map(n => n.trim());
      pastNumbers.forEach(pastNumber => {
        expect(history.some(h => h.buyerNumber === pastNumber && h.status === 'past')).toBe(true);
      });
    }
  });
  
  it('should handle buyer with no past inquiries', async () => {
    const buyerService = new BuyerService();
    
    // Create test buyer with no past_buyer_list
    const testBuyer = await buyerService.create({
      name: 'テスト買主',
      property_number: 'AA99999',
      past_buyer_list: null
    });
    
    const history = await buyerService.getInquiryHistory(testBuyer.id);
    
    // Should only have current inquiry
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('current');
  });
  
  it('should handle buyer with empty past_buyer_list', async () => {
    const buyerService = new BuyerService();
    
    const testBuyer = await buyerService.create({
      name: 'テスト買主2',
      property_number: 'AA99998',
      past_buyer_list: ''
    });
    
    const history = await buyerService.getInquiryHistory(testBuyer.id);
    
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('current');
  });
});
```

## 実装手順

1. **property_listings テーブルのスキーマを確認**
   - `buyer_number` カラムが存在するか確認
   - 存在する場合: オプション1を使用
   - 存在しない場合: オプション2を使用

2. **BuyerService.getInquiryHistory() を修正**
   - 上記の修正を適用

3. **エラーハンドリングを改善**
   - 買主が見つからない場合
   - 物件が見つからない場合
   - データベースエラーの場合

4. **フロントエンドのエラー表示を改善**
   - より具体的なエラーメッセージ
   - リトライボタン

5. **テストを追加**
   - 買主6647でのテスト
   - 過去の買主番号がある場合のテスト
   - 過去の買主番号がない場合のテスト

## 関連ファイル

- `backend/src/services/BuyerService.ts` - 修正が必要
- `backend/src/routes/buyers.ts` - エラーハンドリングの改善
- `frontend/src/pages/BuyerDetailPage.tsx` - エラー表示の改善
- `frontend/src/components/InquiryHistoryTable.tsx` - エラー状態の処理

## 優先度

**高** - 買主詳細ページの主要機能が動作していない

## 影響範囲

- 買主6647だけでなく、過去の買主番号を持つ全ての買主に影響
- 問合せ履歴テーブルが表示されない
- メール送信機能も影響を受ける可能性
