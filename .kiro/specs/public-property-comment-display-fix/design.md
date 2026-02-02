# 公開物件サイト - コメント表示修正 設計書

## 🎯 設計方針

### 1. Git履歴優先アプローチ
以前動作していたコミットを確認し、何が変わったのかを理解してから修正する。

### 2. 最小限の変更
既存のコードを可能な限り維持し、必要最小限の修正のみを行う。

### 3. システム隔離
公開物件サイト専用のファイル（`backend/api/`）のみを変更し、売主リスト関連のファイルは変更しない。

## 📊 原因分析

### 根本原因（確定）

**問題: エラー時にnullで上書き**

`PropertyListingSyncService.syncUpdatedPropertyListings()`が5分ごとに実行され、`updatePropertyDetailsFromSheets()`が全ての物件に対して実行される。

**問題のコード**:

```typescript
// PropertyListingSyncService.updatePropertyDetailsFromSheets()
const [propertyAbout, recommendedComment, favoriteComment, athomeData] = await Promise.all([
  propertyService.getPropertyAbout(propertyNumber).catch(err => {
    console.error(`[PropertyListingSyncService] Failed to get property_about for ${propertyNumber}:`, err);
    return null; // ← ここで null を返す
  }),
  // ...
]);

// property_detailsテーブルにupsert
const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
  property_about: propertyAbout, // ← null が渡される
  recommended_comments: recommendedComment.comments,
  athome_data: athomeData.data,
  favorite_comment: favoriteComment.comment
});
```

**問題の流れ**:
1. `propertyService.getPropertyAbout()`がエラーになる（Google Sheets APIクォータ制限など）
2. `.catch()`で`null`を返す
3. `upsertPropertyDetails()`に`property_about: null`が渡される
4. `PropertyDetailsService.upsertPropertyDetails()`のマージロジックは、`null`を明示的な値として扱う
5. **既存の`property_about`が`null`で上書きされる**

**マージロジックの動作**:
```typescript
// PropertyDetailsService.upsertPropertyDetails()
const mergedData = {
  property_about: details.property_about !== undefined ? details.property_about : existing.property_about,
  // ↑ null !== undefined なので、null が使用される
};
```

**結論**: エラーが発生した場合、`null`ではなく`undefined`を返すべき。これにより、`upsertPropertyDetails()`は既存の値を保持する。

### 現在の実装状況

#### `/complete`エンドポイント（`backend/api/index.ts`）
```typescript
// コメントデータがnullまたは空の場合、Athomeシートから自動同期
const needsSync = !details.favorite_comment || 
                 !details.recommended_comments || 
                 (Array.isArray(details.recommended_comments) && details.recommended_comments.length === 0);

if (needsSync) {
  // AthomeSheetSyncServiceを使用して同期
  const athomeSheetSyncService = new AthomeSheetSyncService();
  const englishPropertyType = convertPropertyTypeToEnglish(property.property_type);
  const syncSuccess = await athomeSheetSyncService.syncPropertyComments(
    property.property_number,
    englishPropertyType
  );
  
  if (syncSuccess) {
    // 同期後のデータを再取得
    const updatedDetails = await propertyDetailsService.getPropertyDetails(property.property_number);
    return updatedDetails;
  }
}
```

### 問題点

1. **Google Sheets APIクォータ制限**
   - 1分あたり60リクエストの制限
   - 複数のユーザーが同時にアクセスすると制限に達する可能性

2. **Vercelの実行時間制限**
   - Hobby planは10秒の制限
   - 自動同期が10秒以内に完了しない場合、タイムアウト

3. **エラーハンドリング不足**
   - 自動同期が失敗した場合、空のデータが返される
   - ユーザーにエラーメッセージが表示されない

## 🔧 解決策

### 最優先: エラー時のnull上書き問題を修正

**修正箇所**: `backend/src/services/PropertyListingSyncService.ts`の`updatePropertyDetailsFromSheets()`メソッド

**修正内容**: エラーが発生した場合、`null`ではなく`undefined`を返す。

**修正前**:
```typescript
const [propertyAbout, recommendedComment, favoriteComment, athomeData] = await Promise.all([
  propertyService.getPropertyAbout(propertyNumber).catch(err => {
    console.error(`[PropertyListingSyncService] Failed to get property_about for ${propertyNumber}:`, err);
    return null; // ← null を返す
  }),
  // ...
]);
```

**修正後**:
```typescript
const [propertyAbout, recommendedComment, favoriteComment, athomeData] = await Promise.all([
  propertyService.getPropertyAbout(propertyNumber).catch(err => {
    console.error(`[PropertyListingSyncService] Failed to get property_about for ${propertyNumber}:`, err);
    return undefined; // ← undefined を返す（既存値を保持）
  }),
  // ...
]);

// upsertPropertyDetailsに渡す前に、undefinedのフィールドを除外
const detailsToUpdate: any = {};
if (propertyAbout !== undefined) detailsToUpdate.property_about = propertyAbout;
if (recommendedComment !== undefined && recommendedComment.comments !== undefined) {
  detailsToUpdate.recommended_comments = recommendedComment.comments;
}
if (athomeData !== undefined && athomeData.data !== undefined) {
  detailsToUpdate.athome_data = athomeData.data;
}
if (favoriteComment !== undefined && favoriteComment.comment !== undefined) {
  detailsToUpdate.favorite_comment = favoriteComment.comment;
}

// undefinedのフィールドは渡さない（既存値を保持）
if (Object.keys(detailsToUpdate).length > 0) {
  const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, detailsToUpdate);
}
```

**効果**: エラーが発生しても、既存のコメントデータが保持される。

### 方針1: 事前同期（推奨）
コメントデータを事前に`property_details`テーブルに同期しておき、`/complete`エンドポイントでは同期済みのデータを返すだけにする。

**メリット**:
- レスポンス時間が短い（< 3秒）
- Google Sheets APIクォータ制限の影響を受けにくい
- Vercelの実行時間制限に達しない

**デメリット**:
- 事前同期のバッチ処理が必要
- データの更新に遅延が発生する可能性

### 方針2: 自動同期の改善（現在の実装）
`/complete`エンドポイントでの自動同期を改善し、エラーハンドリングを強化する。

**メリット**:
- 常に最新のデータを取得できる
- 追加のバッチ処理が不要

**デメリット**:
- レスポンス時間が長い（5-10秒）
- Google Sheets APIクォータ制限の影響を受けやすい
- Vercelの実行時間制限に達する可能性

### 方針3: ハイブリッド（推奨）
事前同期を基本とし、データが空の場合のみ自動同期を実行する。

**メリット**:
- レスポンス時間が短い（通常は< 3秒）
- データが空の場合でも自動同期で補完できる
- Google Sheets APIクォータ制限の影響を最小限に抑える

**デメリット**:
- 実装が複雑になる

## 📝 実装計画

### Phase 1: 事前同期バッチの実装

#### 1.1 全物件のコメントデータを同期するスクリプト
```typescript
// backend/sync-all-property-comments.ts
import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import { PropertyListingService } from './src/services/PropertyListingService';

async function syncAllPropertyComments() {
  const propertyListingService = new PropertyListingService();
  const athomeSheetSyncService = new AthomeSheetSyncService();
  
  // 全物件を取得
  const properties = await propertyListingService.getAllProperties();
  
  for (const property of properties) {
    // コメントデータが空の物件のみ同期
    const details = await propertyDetailsService.getPropertyDetails(property.property_number);
    
    if (!details.favorite_comment || !details.recommended_comments || details.recommended_comments.length === 0) {
      console.log(`Syncing ${property.property_number}...`);
      await athomeSheetSyncService.syncPropertyComments(
        property.property_number,
        property.property_type
      );
      
      // APIクォータ制限を回避するため、1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

#### 1.2 定期実行の設定
- Vercel Cronを使用して、1日1回実行
- または、ローカル環境で手動実行

### Phase 2: `/complete`エンドポイントの改善

#### 2.1 エラーハンドリングの強化
```typescript
if (needsSync) {
  try {
    const syncSuccess = await athomeSheetSyncService.syncPropertyComments(
      property.property_number,
      englishPropertyType
    );
    
    if (syncSuccess) {
      const updatedDetails = await propertyDetailsService.getPropertyDetails(property.property_number);
      return updatedDetails;
    } else {
      // 同期失敗時は既存のデータを返す
      console.error(`[Complete API] Failed to sync comments for ${property.property_number}`);
      return details;
    }
  } catch (syncError: any) {
    // エラー時は既存のデータを返す
    console.error(`[Complete API] Error syncing comments:`, syncError.message);
    return details;
  }
}
```

#### 2.2 タイムアウト処理の追加
```typescript
// 5秒でタイムアウト
const syncPromise = athomeSheetSyncService.syncPropertyComments(
  property.property_number,
  englishPropertyType
);

const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Sync timeout')), 5000)
);

try {
  await Promise.race([syncPromise, timeoutPromise]);
} catch (error) {
  console.error(`[Complete API] Sync timeout or error:`, error);
  return details; // 既存のデータを返す
}
```

### Phase 3: フロントエンドの改善

#### 3.1 ローディング表示の追加
```typescript
// コメントデータの取得中はローディング表示
{isLoadingComments && <CircularProgress />}
{!isLoadingComments && favoriteComment && (
  <Typography>{favoriteComment}</Typography>
)}
```

#### 3.2 エラーメッセージの表示
```typescript
// コメントデータが取得できない場合はエラーメッセージ
{!isLoadingComments && !favoriteComment && (
  <Typography color="error">
    コメントデータを取得できませんでした
  </Typography>
)}
```

## 🧪 テスト計画

### 1. ローカル環境でのテスト
- [ ] AA5564のコメントデータを手動で同期
- [ ] `/complete`エンドポイントでコメントデータが返されることを確認
- [ ] フロントエンドでコメントが表示されることを確認

### 2. 本番環境でのテスト
- [ ] Vercelにデプロイ
- [ ] AA5564の物件詳細ページでコメントが表示されることを確認
- [ ] 他の物件でもコメントが表示されることを確認

### 3. エラーケースのテスト
- [ ] Google Sheets APIクォータ制限に達した場合の動作確認
- [ ] タイムアウトした場合の動作確認
- [ ] 存在しない物件番号でアクセスした場合の動作確認

## 📊 パフォーマンス目標

- `/complete`エンドポイントのレスポンス時間: < 5秒
- 事前同期済みの場合: < 3秒
- 自動同期が必要な場合: < 10秒（Vercelの制限内）

## 🚨 リスクと対策

### リスク1: Google Sheets APIクォータ制限
**対策**: 事前同期を基本とし、自動同期は最小限に抑える

### リスク2: Vercelの実行時間制限
**対策**: タイムアウト処理を追加し、5秒以内に完了しない場合は既存のデータを返す

### リスク3: データの不整合
**対策**: 定期的に全物件のコメントデータを同期し、データの整合性を保つ

## 📝 実装の優先順位

1. **Phase 1**: 事前同期バッチの実装（最優先）
2. **Phase 2**: `/complete`エンドポイントの改善（高優先度）
3. **Phase 3**: フロントエンドの改善（中優先度）

## 🎓 参考情報

### 関連ドキュメント
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- `.kiro/steering/git-history-first-approach.md` - Git履歴優先アプローチ
- `.kiro/restore-guides/public-property-performance-critical-rules.md` - パフォーマンス重要ルール

### 関連コミット
- `e86aa07`: PanoramaUrlServiceを削除してathome_dataから取得
- `1a6719c`: 動作していたバージョン（静的インポート使用）
- `4f19f9c`: パフォーマンス修正ドキュメント追加（40倍高速化）
