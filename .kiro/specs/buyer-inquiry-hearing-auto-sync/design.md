# Design Document

## Overview

買主管理システムにおいて、問合せ時ヒアリング（inquiry_hearing）フィールドに入力された特定のテキストパターンを自動的にパースし、希望条件フィールド（desired_timing, desired_parking_spaces, desired_price_range）に反映する機能を実装します。

この機能により、営業担当者がヒアリング内容を一度入力するだけで、希望条件フィールドに自動的に値が設定されるため、二重入力の手間を省き、データ入力の効率化と正確性の向上を実現します。

## Architecture

### システム構成

```
Frontend (React)
  └─ BuyerDesiredConditionsPage.tsx
      └─ クイックボタン名変更: "リフォーム込みの予算（最高額）" → "予算"

Backend (Express + TypeScript)
  ├─ routes/buyers.ts
  │   └─ PUT /api/buyers/:id エンドポイント
  │       └─ 問合せ時ヒアリング保存時にパース処理を実行
  │
  └─ services/
      ├─ BuyerService.ts
      │   └─ update() メソッド
      │       └─ InquiryHearingParser を呼び出し
      │
      └─ InquiryHearingParser.ts (新規作成)
          ├─ parseInquiryHearing() - メインパース処理
          ├─ extractFieldValue() - フィールド値抽出
          ├─ mapPriceRange() - 価格帯マッピング
          └─ shouldOverwrite() - 上書き判定

Database (Supabase/PostgreSQL)
  └─ buyers テーブル
      ├─ inquiry_hearing (text)
      ├─ inquiry_hearing_updated_at (timestamp) - 新規追加
      ├─ desired_timing (text)
      ├─ desired_timing_updated_at (timestamp) - 新規追加
      ├─ desired_parking_spaces (text)
      ├─ desired_parking_spaces_updated_at (timestamp) - 新規追加
      ├─ desired_price_range (text)
      └─ desired_price_range_updated_at (timestamp) - 新規追加
```

### データフロー

```
1. ユーザーが問合せ時ヒアリングを入力
   ↓
2. フロントエンドがPUT /api/buyers/:id を呼び出し
   ↓
3. BuyerService.update() が呼び出される
   ↓
4. inquiry_hearing が更新される場合、InquiryHearingParser.parseInquiryHearing() を呼び出し
   ↓
5. パース結果を取得（desired_timing, desired_parking_spaces, desired_price_range）
   ↓
6. 各フィールドの最終更新日時を比較
   ↓
7. 上書き可能な場合のみ、希望条件フィールドを更新
   ↓
8. データベースに保存（トランザクション内）
   ↓
9. 更新結果をフロントエンドに返す
```

## Components and Interfaces

### InquiryHearingParser (新規作成)

問合せ時ヒアリングのテキストをパースして、希望条件フィールドに反映する値を抽出します。

```typescript
export interface ParsedInquiryHearing {
  desired_timing?: string;
  desired_parking_spaces?: string;
  desired_price_range?: string;
}

export class InquiryHearingParser {
  /**
   * 問合せ時ヒアリングをパースして希望条件フィールドの値を抽出
   */
  parseInquiryHearing(inquiryHearing: string): ParsedInquiryHearing;

  /**
   * フィールド値を抽出
   */
  private extractFieldValue(text: string, pattern: RegExp): string | undefined;

  /**
   * 価格帯をマッピング
   */
  private mapPriceRange(budgetText: string): string | undefined;

  /**
   * 上書き可能かどうかを判定
   */
  shouldOverwrite(
    fieldName: string,
    currentValue: any,
    currentUpdatedAt: Date | null,
    inquiryHearingUpdatedAt: Date
  ): boolean;
}
```

### BuyerService の拡張

既存の `update()` メソッドを拡張して、問合せ時ヒアリングの自動パース機能を追加します。

```typescript
async update(
  buyerNumber: string,
  updateData: Partial<any>,
  userId?: string,
  userEmail?: string
): Promise<any> {
  // 既存の処理...

  // 問合せ時ヒアリングが更新される場合、自動パース処理を実行
  if (updateData.inquiry_hearing !== undefined) {
    const parser = new InquiryHearingParser();
    const parsed = parser.parseInquiryHearing(updateData.inquiry_hearing);
    
    // 各フィールドの上書き判定
    const inquiryHearingUpdatedAt = new Date();
    
    if (parsed.desired_timing !== undefined) {
      if (parser.shouldOverwrite(
        'desired_timing',
        existing.desired_timing,
        existing.desired_timing_updated_at,
        inquiryHearingUpdatedAt
      )) {
        updateData.desired_timing = parsed.desired_timing;
        updateData.desired_timing_updated_at = inquiryHearingUpdatedAt;
      }
    }
    
    // desired_parking_spaces, desired_price_range も同様
    
    updateData.inquiry_hearing_updated_at = inquiryHearingUpdatedAt;
  }

  // データベース更新...
}
```

## Data Models

### buyers テーブルの拡張

以下のカラムを追加します：

| カラム名 | 型 | NULL許可 | デフォルト値 | 説明 |
|---------|---|---------|------------|------|
| inquiry_hearing_updated_at | timestamp | YES | NULL | 問合せ時ヒアリングの最終更新日時 |
| desired_timing_updated_at | timestamp | YES | NULL | 希望時期の最終更新日時 |
| desired_parking_spaces_updated_at | timestamp | YES | NULL | 駐車場希望台数の最終更新日時 |
| desired_price_range_updated_at | timestamp | YES | NULL | 予算の最終更新日時 |

**マイグレーション SQL**:

```sql
-- 問合せ時ヒアリングの最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS inquiry_hearing_updated_at TIMESTAMP;

-- 希望時期の最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_timing_updated_at TIMESTAMP;

-- 駐車場希望台数の最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_parking_spaces_updated_at TIMESTAMP;

-- 予算の最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_price_range_updated_at TIMESTAMP;

-- インデックスを追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_buyers_inquiry_hearing_updated_at ON buyers(inquiry_hearing_updated_at);
CREATE INDEX IF NOT EXISTS idx_buyers_desired_timing_updated_at ON buyers(desired_timing_updated_at);
CREATE INDEX IF NOT EXISTS idx_buyers_desired_parking_spaces_updated_at ON buyers(desired_parking_spaces_updated_at);
CREATE INDEX IF NOT EXISTS idx_buyers_desired_price_range_updated_at ON buyers(desired_price_range_updated_at);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: パターンマッチング正確性

*For any* 問合せ時ヒアリングテキストに「希望時期：〇〇」が含まれる場合、コロンの後ろから改行または文末までの文字列が正確に抽出される

**Validates: Requirements 2.1**

### Property 2: 複数パターン抽出

*For any* 問合せ時ヒアリングテキストに複数のパターン（「希望時期：」「駐車場希望台数：」「予算：」）が含まれる場合、全てのパターンが正確に抽出される

**Validates: Requirements 1.3**

### Property 3: 価格帯マッピング正確性

*For any* 予算テキストに「〇〇万円」が含まれる場合、対応する価格帯選択肢が正確にマッピングされる

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: 上書きルール遵守

*For any* フィールドについて、希望条件フィールドの最終更新日時が問合せ時ヒアリングの最終更新日時より新しい場合、希望条件フィールドの値が保持される

**Validates: Requirements 4.2**

### Property 5: 上書きルール遵守（逆方向）

*For any* フィールドについて、問合せ時ヒアリングの最終更新日時が希望条件フィールドの最終更新日時より新しい場合、問合せ時ヒアリングからパースした値で上書きされる

**Validates: Requirements 4.3**

### Property 6: NULL値の上書き

*For any* フィールドについて、希望条件フィールドが未設定（null）の場合、最終更新日時に関係なく問合せ時ヒアリングからパースした値が設定される

**Validates: Requirements 4.4**

### Property 7: パースエラー時の保存成功

*For any* 問合せ時ヒアリングテキストについて、パース処理が例外をスローした場合でも、問合せ時ヒアリングの保存は成功する

**Validates: Requirements 1.2, 6.3**

### Property 8: トランザクション整合性

*For any* 更新処理について、希望条件フィールドの更新が失敗した場合、問合せ時ヒアリングの保存もロールバックされる

**Validates: Requirements 6.2**

### Property 9: 最終更新日時の一貫性

*For any* 更新処理について、複数のフィールドを同時に更新する場合、全てのフィールドの最終更新日時が同じ値に設定される

**Validates: Requirements 6.4**

### Property 10: パターンマッチング失敗時のスキップ

*For any* 問合せ時ヒアリングテキストについて、パターンマッチングが失敗した場合、該当フィールドはスキップされ、他のパターンの処理が継続される

**Validates: Requirements 2.4**

## Error Handling

### パースエラー

**エラーケース**: 問合せ時ヒアリングのパース処理中に例外が発生

**処理**:
1. エラーをキャッチしてログに記録
2. 問合せ時ヒアリングの保存は成功させる
3. 希望条件フィールドは更新しない
4. ユーザーにはエラーを通知しない（サイレントエラー）

**実装例**:
```typescript
try {
  const parser = new InquiryHearingParser();
  const parsed = parser.parseInquiryHearing(updateData.inquiry_hearing);
  // パース結果を反映...
} catch (error) {
  console.error('[BuyerService.update] Failed to parse inquiry hearing:', error);
  // 問合せ時ヒアリングの保存は継続
}
```

### データベース更新エラー

**エラーケース**: 希望条件フィールドの更新中にデータベースエラーが発生

**処理**:
1. トランザクションをロールバック
2. 問合せ時ヒアリングの保存も失敗させる
3. エラーメッセージをユーザーに返す

**実装例**:
```typescript
const { data, error } = await this.supabase
  .from('buyers')
  .update(allowedData)
  .eq('buyer_number', buyerNumber)
  .select()
  .single();

if (error) {
  throw new Error(`Failed to update buyer: ${error.message}`);
}
```

### 価格帯マッピングエラー

**エラーケース**: 予算テキストが価格帯選択肢にマッピングできない

**処理**:
1. `mapPriceRange()` が `undefined` を返す
2. `desired_price_range` フィールドは更新しない
3. ログに警告を記録
4. 他のフィールドの処理は継続

**実装例**:
```typescript
const priceRange = this.mapPriceRange(budgetText);
if (priceRange === undefined) {
  console.warn('[InquiryHearingParser] Failed to map price range:', budgetText);
  return undefined;
}
```

## Testing Strategy

### Unit Tests

以下の具体的なケースをテストします：

1. **パターンマッチング**:
   - 「希望時期：2年以内」→ `desired_timing = "2年以内"`
   - 「駐車場希望台数：2台」→ `desired_parking_spaces = "2台"`
   - 「予算：3000万円」→ `desired_price_range = "3000万円台"`

2. **エッジケース**:
   - 空文字列の入力
   - パターンが存在しない入力
   - 複数のパターンが混在する入力
   - 改行を含む入力

3. **価格帯マッピング**:
   - 「3000万円」→ 「3000万円台」
   - 「2000万円以下」→ 「2000万円以下」
   - 「5000万円以上」→ 「5000万円以上」
   - マッピング不可能な値（例: 「応相談」）

4. **上書きルール**:
   - 希望条件フィールドが新しい場合は保持
   - 問合せ時ヒアリングが新しい場合は上書き
   - 希望条件フィールドがnullの場合は常に設定

5. **エラーハンドリング**:
   - パースエラー時も保存成功
   - データベースエラー時はロールバック

### Property-Based Tests

以下の普遍的な性質をテストします（最低100回の反復実行）：

1. **Property 1: パターンマッチング正確性**
   - ランダムな問合せ時ヒアリングテキストを生成
   - 「希望時期：」パターンを含む場合、正確に抽出されることを検証

2. **Property 2: 複数パターン抽出**
   - ランダムな問合せ時ヒアリングテキストを生成（複数パターンを含む）
   - 全てのパターンが正確に抽出されることを検証

3. **Property 3: 価格帯マッピング正確性**
   - ランダムな予算テキストを生成
   - 価格帯選択肢に正確にマッピングされることを検証

4. **Property 4-6: 上書きルール遵守**
   - ランダムな最終更新日時を生成
   - 上書きルールが正しく適用されることを検証

5. **Property 7: パースエラー時の保存成功**
   - ランダムな不正な入力を生成
   - パースエラーが発生しても保存が成功することを検証

6. **Property 8: トランザクション整合性**
   - ランダムな更新データを生成
   - データベースエラー時にロールバックされることを検証

7. **Property 9: 最終更新日時の一貫性**
   - ランダムな複数フィールドの更新を生成
   - 全てのフィールドの最終更新日時が同じ値になることを検証

8. **Property 10: パターンマッチング失敗時のスキップ**
   - ランダムな問合せ時ヒアリングテキストを生成（一部のパターンのみ含む）
   - マッチしないパターンがスキップされ、他のパターンが処理されることを検証

**Property-Based Testing Configuration**:
- ライブラリ: fast-check (TypeScript/JavaScript用)
- 反復回数: 最低100回
- タグ形式: `Feature: buyer-inquiry-hearing-auto-sync, Property {number}: {property_text}`

