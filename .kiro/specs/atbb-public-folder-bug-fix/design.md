# 公開フォルダ機能拡張 - athome公開フォルダ対応 - 設計

## 問題の分析

### 現在の実装フロー

```
getImagesFromStorageUrl(storageUrl)
  ↓
extractFolderIdFromUrl(storageUrl) → parentFolderId
  ↓
getPublicFolderIdIfExists(parentFolderId) → targetFolderId
  ↓
  ├─ findFolderByName(parentFolderId, 'atbb公開')
  │   ↓
  │   ├─ 見つかった → publicFolderId を返す
  │   └─ 見つからない → parentFolderId を返す
  ↓
listImagesWithThumbnails(targetFolderId) → images
  ↓
return images
```

### 新しい実装フロー（athome公開対応）

```
getImagesFromStorageUrl(storageUrl)
  ↓
extractFolderIdFromUrl(storageUrl) → parentFolderId
  ↓
getPublicFolderIdIfExists(parentFolderId) → targetFolderId
  ↓
  ├─ findFolderByName(parentFolderId, 'athome公開')
  │   ↓
  │   ├─ 見つかった → athomeFolderId を返す ✅
  │   └─ 見つからない → 次へ
  ↓
  ├─ findFolderByName(parentFolderId, 'atbb公開')
  │   ↓
  │   ├─ 見つかった → atbbFolderId を返す（後方互換性）
  │   └─ 見つからない → parentFolderId を返す
  ↓
listImagesWithThumbnails(targetFolderId) → images
  ↓
return images
```

### 期待される動作

**AA13129の場合**:
```
親フォルダ: 30枚の画像
  └── athome公開フォルダ: 1枚の画像

期待される結果: 1枚の画像のみ表示（athome公開フォルダから）
```

**後方互換性（atbb公開フォルダがある物件）**:
```
親フォルダ: X枚の画像
  └── atbb公開フォルダ: Y枚の画像

期待される結果: Y枚の画像のみ表示（atbb公開フォルダから）
```

### 実際の動作（推測）

**パターンA: フォルダが見つからない**
```
getPublicFolderIdIfExists(parentFolderId)
  ↓
findFolderByName(parentFolderId, 'atbb公開')
  ↓
見つからない（フォルダ名の不一致、検索ロジックの問題）
  ↓
parentFolderId を返す
  ↓
親フォルダから5枚の画像を取得
```

**パターンB: キャッシュの問題**
```
getImagesFromStorageUrl(storageUrl)
  ↓
キャッシュをチェック
  ↓
古いキャッシュが存在（親フォルダの5枚の画像）
  ↓
キャッシュから5枚の画像を返す
```

**パターンC: 実装の問題**
```
getPublicFolderIdIfExists(parentFolderId)
  ↓
findFolderByName() でエラー発生
  ↓
catch ブロックで parentFolderId を返す
  ↓
親フォルダから5枚の画像を取得
```

## 調査方法

### 1. ログ分析

**確認すべきログ**:
```typescript
// PropertyImageService.ts
console.log(`✅ Found "atbb公開" subfolder: ${publicFolderId} in parent: ${parentFolderId}`);
console.log(`📁 No "atbb公開" subfolder found in parent: ${parentFolderId}, using parent folder`);
console.error(`Error checking for "atbb公開" subfolder:`, error.message);

// GoogleDriveService.ts
console.log(`🔍 Searching for folder starting with "${name}" in parent: ${parentId}`);
console.log(`✅ Found folder: ${matchingFolder.name} (${matchingFolder.id})`);
console.log(`📁 Folder starting with "${name}" not found, will create new`);
```

### 2. テストスクリプト

**テストスクリプトの出力**:
```
親フォルダの画像数: X枚
"atbb公開"フォルダの画像数: Y枚
PropertyImageServiceが返した画像数: Z枚
使用されたフォルダID: [folder-id]
```

**判定ロジック**:
```typescript
if (result.folderId === publicFolderId) {
  // ✅ 正しく動作している
  if (result.images.length === publicImages.length) {
    // ✅ 画像数も一致
  } else {
    // ⚠️ キャッシュまたは取得ロジックに問題
  }
} else if (result.folderId === parentFolderId) {
  // ❌ 親フォルダが使用されている（問題）
} else {
  // ⚠️ 予期しないフォルダID
}
```

## 実装方針

### 優先順位付きフォルダ検索

**検索順序**:
1. "athome公開"フォルダ（最優先）
2. "atbb公開"フォルダ（後方互換性）
3. 親フォルダ（フォールバック）

**実装コード**:
```typescript
private async getPublicFolderIdIfExists(parentFolderId: string): Promise<string> {
  try {
    console.log(`🔍 Checking for public subfolders in parent: ${parentFolderId}`);
    
    // 1. "athome公開"フォルダを検索（最優先）
    const athomeFolderId = await this.driveService.findFolderByName(parentFolderId, 'athome公開');
    if (athomeFolderId) {
      console.log(`✅ Found "athome公開" subfolder: ${athomeFolderId} in parent: ${parentFolderId}`);
      return athomeFolderId;
    }
    
    // 2. "atbb公開"フォルダを検索（後方互換性）
    const atbbFolderId = await this.driveService.findFolderByName(parentFolderId, 'atbb公開');
    if (atbbFolderId) {
      console.log(`✅ Found "atbb公開" subfolder: ${atbbFolderId} in parent: ${parentFolderId}`);
      return atbbFolderId;
    }
    
    // 3. 親フォルダを使用（フォールバック）
    console.log(`📁 No public subfolder found in parent: ${parentFolderId}, using parent folder`);
    return parentFolderId;
  } catch (error: any) {
    console.error(`⚠️ Error checking for public subfolders in parent: ${parentFolderId}:`, error.message);
    console.error(`⚠️ Falling back to parent folder`);
    return parentFolderId;
  }
}
```

### パフォーマンス最適化

**並列検索の検討**:
```typescript
// オプション: 並列検索で高速化
const [athomeFolderId, atbbFolderId] = await Promise.all([
  this.driveService.findFolderByName(parentFolderId, 'athome公開'),
  this.driveService.findFolderByName(parentFolderId, 'atbb公開'),
]);

if (athomeFolderId) return athomeFolderId;
if (atbbFolderId) return atbbFolderId;
return parentFolderId;
```

**注意**: 並列検索は高速だが、Google Drive APIのレート制限に注意が必要

## 追加の考慮事項

### ケースA: フォルダ検索の失敗

**原因**:
- フォルダ名が"atbb公開"ではない（全角/半角、スペースなど）
- `findFolderByName()`の検索ロジックに問題

**修正案1: フォルダ名の正規化**
```typescript
async findFolderByName(parentId: string, name: string): Promise<string | null> {
  // 全角・半角を正規化
  const normalizedName = name.normalize('NFKC');
  
  // 複数のパターンで検索
  const searchPatterns = [
    name,
    normalizedName,
    name.replace(/\s/g, ''),  // スペースなし
  ];
  
  for (const pattern of searchPatterns) {
    const result = await this.searchFolder(parentId, pattern);
    if (result) return result;
  }
  
  return null;
}
```

**修正案2: 完全一致検索**
```typescript
async findFolderByName(parentId: string, name: string): Promise<string | null> {
  const response = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: this.parentFolderId,
  });

  const files = response.data.files;
  if (files && files.length > 0) {
    // 完全一致で検索
    const matchingFolder = files.find(f => f.name === name);
    if (matchingFolder) {
      return matchingFolder.id || null;
    }
  }
  
  return null;
}
```

### ケースB: キャッシュの問題

**原因**:
- キャッシュキーが親フォルダIDで設定されている
- "atbb公開"フォルダに切り替わってもキャッシュが残る

**修正案: キャッシュキーの改善**
```typescript
async getImagesFromStorageUrl(storageUrl: string | null | undefined): Promise<PropertyImagesResult> {
  const parentFolderId = this.extractFolderIdFromUrl(storageUrl);
  const targetFolderId = await this.getPublicFolderIdIfExists(parentFolderId);
  
  // キャッシュキーを実際に使用するフォルダIDで設定
  const cacheKey = targetFolderId;  // ← これが重要
  
  const cachedResult = this.getFromCache(cacheKey);
  if (cachedResult) {
    return {
      images: cachedResult.images,
      folderId: cachedResult.folderId,
      cached: true,
    };
  }
  
  // ... 画像取得 ...
  
  this.saveToCache(cacheKey, images);  // ← targetFolderIdでキャッシュ
}
```

### ケースC: エラーハンドリングの問題

**原因**:
- `getPublicFolderIdIfExists()`でエラーが発生
- catch ブロックで親フォルダにフォールバック

**修正案: エラーログの改善**
```typescript
private async getPublicFolderIdIfExists(parentFolderId: string): Promise<string> {
  try {
    console.log(`🔍 Checking for "atbb公開" subfolder in parent: ${parentFolderId}`);
    
    const publicFolderId = await this.driveService.findFolderByName(parentFolderId, 'atbb公開');
    
    if (publicFolderId) {
      console.log(`✅ Found "atbb公開" subfolder: ${publicFolderId} in parent: ${parentFolderId}`);
      return publicFolderId;
    }
    
    console.log(`📁 No "atbb公開" subfolder found in parent: ${parentFolderId}, using parent folder`);
    return parentFolderId;
  } catch (error: any) {
    console.error(`⚠️ Error checking for "atbb公開" subfolder in parent: ${parentFolderId}:`, error.message);
    console.error(`⚠️ Error details:`, error);
    console.error(`⚠️ Falling back to parent folder`);
    return parentFolderId;
  }
}
```

## テスト戦略

### 1. ユニットテスト

```typescript
describe('PropertyImageService - atbb公開 folder', () => {
  describe('getPublicFolderIdIfExists', () => {
    it('should return public folder ID when atbb公開 folder exists', async () => {
      // モックで"atbb公開"フォルダが存在する状態を作る
      // getPublicFolderIdIfExists()を呼ぶ
      // publicFolderIdが返されることを確認
    });
    
    it('should return parent folder ID when atbb公開 folder does not exist', async () => {
      // モックで"atbb公開"フォルダが存在しない状態を作る
      // getPublicFolderIdIfExists()を呼ぶ
      // parentFolderIdが返されることを確認
    });
    
    it('should handle errors gracefully', async () => {
      // モックでエラーを発生させる
      // getPublicFolderIdIfExists()を呼ぶ
      // parentFolderIdが返されることを確認（フォールバック）
    });
  });
  
  describe('getImagesFromStorageUrl', () => {
    it('should use atbb公開 folder when it exists', async () => {
      // モックで"atbb公開"フォルダが存在する状態を作る
      // getImagesFromStorageUrl()を呼ぶ
      // publicFolderIdから画像が取得されることを確認
    });
    
    it('should use parent folder when atbb公開 folder does not exist', async () => {
      // モックで"atbb公開"フォルダが存在しない状態を作る
      // getImagesFromStorageUrl()を呼ぶ
      // parentFolderIdから画像が取得されることを確認
    });
  });
});
```

### 2. 統合テスト

```typescript
describe('PropertyImageService - Integration', () => {
  it('should return only images from atbb公開 folder for AA13129', async () => {
    const service = new PropertyImageService();
    const storageUrl = 'https://drive.google.com/drive/folders/[AA13129-folder-id]';
    
    const result = await service.getImagesFromStorageUrl(storageUrl);
    
    expect(result.images.length).toBe(1);  // 1枚のみ
    expect(result.folderId).toBe('[atbb公開-folder-id]');
  });
});
```

## 成功基準

### 機能要件
- [ ] AA13129で"athome公開"フォルダが正しく検出される
- [ ] AA13129で1枚の画像のみが返される（athome公開フォルダから）
- [ ] "atbb公開"フォルダを持つ物件で既存機能が正常に動作する
- [ ] 公開フォルダがない物件で親フォルダの画像が返される

### 非機能要件
- [ ] パフォーマンスに影響がない（キャッシュが正しく動作）
- [ ] エラーハンドリングが適切（フォールバックが機能）
- [ ] ログが適切に出力される（デバッグが容易）
- [ ] 後方互換性が維持される

### テスト要件
- [ ] ユニットテストが追加される
- [ ] 統合テストが追加される
- [ ] 回帰テストが実行される
- [ ] AA13129での動作確認が完了する

## 実装の優先順位

1. **調査** (最優先)
   - テストスクリプトの実行
   - 原因の特定

2. **修正** (高)
   - 原因に応じたコード修正
   - ログの改善

3. **テスト** (高)
   - ユニットテストの追加
   - 統合テストの実行

4. **ドキュメント** (中)
   - 修正内容の記録
   - トラブルシューティングガイドの更新
