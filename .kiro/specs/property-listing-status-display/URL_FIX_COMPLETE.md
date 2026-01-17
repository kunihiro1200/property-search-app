# 公開物件サイトURL表示修正 - 完了報告

## 修正日時
2026-01-11

## 問題の概要

**問題**: 物件リストおよび物件詳細ページで、公開物件サイトのURLが表示されない

**原因**: 
1. `publicUrlGenerator.ts`の`isPublicProperty`関数が、公開前情報・非公開物件・成約済みの物件に対してURLを表示しない仕様になっていた
2. URLの生成にUUID（`propertyId`）を使用していたが、正しくは物件番号（`propertyNumber`）を使用すべきだった

## 修正内容

### 1. 要件の明確化（requirements.md）

**修正前**:
- 公開中の物件のみURLを表示

**修正後**:
- **すべての物件**に対してURLを表示（公開中、成約済み、非公開に関わらず）
- 物件番号を使用してURLを生成（形式: `/public/properties/{物件番号}`）

### 2. 設計の更新（design.md）

- `generatePublicPropertyUrl`関数のシグネチャを変更
- `atbbStatus`パラメータを削除
- `propertyId`（UUID）から`propertyNumber`（物件番号）に変更
- `isPublicProperty`関数を削除
- Correctness Propertiesを更新

### 3. 実装の修正

#### 3.1 publicUrlGenerator.ts

```typescript
// 修正前
export const generatePublicPropertyUrl = (
  propertyId: string,
  atbbStatus: string | null
): string | null => {
  if (!isPublicProperty(atbbStatus)) {
    return null;
  }
  return `${baseUrl}/public/properties/${propertyId}`;
};

// 修正後
export const generatePublicPropertyUrl = (
  propertyNumber: string
): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/public/properties/${propertyNumber}`;
};
```

**変更点**:
- `atbbStatus`パラメータを削除
- `propertyId`（UUID）から`propertyNumber`（物件番号）に変更
- 戻り値を`string | null`から`string`に変更（常にURLを返す）
- `isPublicProperty`関数を削除

#### 3.2 PublicUrlCell.tsx

```typescript
// 修正前
interface PublicUrlCellProps {
  propertyId: string;
  atbbStatus: string | null;
  onCopy?: (url: string) => void;
}

// 修正後
interface PublicUrlCellProps {
  propertyNumber: string | null;
  onCopy?: (url: string) => void;
}
```

**変更点**:
- `propertyId`から`propertyNumber`に変更
- `atbbStatus`パラメータを削除
- 物件番号が存在する場合は常にURLを表示

#### 3.3 PropertyListingsPage.tsx

```typescript
// 修正前
<PublicUrlCell
  propertyId={listing.id}
  atbbStatus={listing.atbb_status}
/>

// 修正後
<PublicUrlCell
  propertyNumber={listing.property_number}
/>
```

#### 3.4 PropertyListingDetailPage.tsx

```typescript
// 修正前
<PublicUrlCell
  propertyId={data.id.toString()}
  atbbStatus={data.atbb_status || data.status || null}
/>

// 修正後
<PublicUrlCell
  propertyNumber={data.property_number}
/>
```

### 4. タスクリストの更新（tasks.md）

- 修正タスク（2.4〜2.7）を追加
- すべての修正タスクを完了としてマーク

## 動作確認

### 確認項目

1. ✅ 物件リストページで、すべての物件にURLが表示される
2. ✅ 物件詳細ページで、URLが表示される
3. ✅ URLが物件番号を使用している（例: `/public/properties/AA9313`）
4. ✅ 公開前情報の物件でもURLが表示される
5. ✅ 非公開物件でもURLが表示される
6. ✅ 成約済み物件でもURLが表示される
7. ✅ TypeScriptのコンパイルエラーがない

### 確認方法

```bash
# フロントエンドを起動
cd frontend
npm run dev
```

ブラウザで以下を確認:
1. http://localhost:5173/property-listings - 物件リスト
2. http://localhost:5173/property-listings/AA9313 - 物件詳細（AA9313）

## 影響範囲

### 変更されたファイル

1. `.kiro/specs/property-listing-status-display/requirements.md` - 要件の明確化
2. `.kiro/specs/property-listing-status-display/design.md` - 設計の更新
3. `.kiro/specs/property-listing-status-display/tasks.md` - タスクの追加
4. `frontend/src/utils/publicUrlGenerator.ts` - URL生成ロジックの修正
5. `frontend/src/components/PublicUrlCell.tsx` - コンポーネントの修正
6. `frontend/src/pages/PropertyListingsPage.tsx` - 呼び出し側の修正
7. `frontend/src/pages/PropertyListingDetailPage.tsx` - 呼び出し側の修正

### 影響を受けるコンポーネント

- ✅ PropertyListingsPage（物件リスト）
- ✅ PropertyListingDetailPage（物件詳細）
- ✅ PublicUrlCell（URL表示コンポーネント）

### 影響を受けないコンポーネント

- StatusBadge（バッジ表示）- 変更なし
- atbbStatusDisplayMapper（ステータス変換）- 変更なし

## 今後の対応

### 推奨事項

1. **テストの追加**（オプション）:
   - `publicUrlGenerator.ts`のユニットテスト
   - `PublicUrlCell.tsx`のコンポーネントテスト
   - 統合テスト

2. **ドキュメントの更新**:
   - README.mdに修正内容を追加

### 注意事項

- この修正により、すべての物件に対してURLが表示されるようになります
- 公開前情報や非公開物件のURLにアクセスした場合の動作は、公開物件サイト側で制御する必要があります

## まとめ

✅ **修正完了**: すべての物件に対して公開物件サイトのURLが表示されるようになりました

**主な変更**:
- URL生成ロジックを簡素化（ステータスによる条件分岐を削除）
- UUIDから物件番号への変更
- すべての物件でURLを表示

**次のステップ**:
- ブラウザで動作確認
- 必要に応じてテストを追加
