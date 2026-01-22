# 公開フォルダ機能拡張 - athome公開フォルダ対応

## 問題の概要

**調査結果**: 
- AA13129には "atbb公開" フォルダは存在しない
- 実際には **"athome公開"** フォルダが存在し、1枚の画像が格納されている
- 現在のシステムは "atbb公開" フォルダのみを検索しているため、親フォルダの全30枚を返している

**新しい要件**:
1. **"athome公開"** フォルダが存在する場合、そのフォルダ内の画像のみを表示
2. "athome公開" フォルダが存在しない場合、親フォルダの画像を使用
3. 既存の "atbb公開" フォルダ機能は維持（後方互換性）

**期待される動作**:
- AA13129の場合、"athome公開" フォルダの1枚の画像のみが表示されるべき
- フォールバック順序: "athome公開" → 親フォルダ

**現在の動作**:
- "atbb公開" フォルダのみを検索
- 見つからないため、親フォルダの全30枚を返している

## 背景

### 調査で判明した事実
- **親フォルダ**: 30枚の画像が格納されている
- **"athome公開"フォルダ**: 1枚の画像が格納されている
  - ファイル名: `LINE_ALBUM_田尻北　戸建_251204_1.jpg のコピー`
  - サイズ: 0.12 MB
  - ファイルID: `1bAMOx9_LUGgAMwD-iPPFX5EAzBfm5NTP`
  - 公開URL: `https://drive.google.com/uc?export=view&id=1bAMOx9_LUGgAMwD-iPPFX5EAzBfm5NTP`

### 実装済みの機能
`backend/src/services/PropertyImageService.ts`に以下が実装されている:

1. **`getPublicFolderIdIfExists()`** - "atbb公開"サブフォルダの存在確認
2. **`getImagesFromStorageUrl()`** - 画像取得時に"atbb公開"フォルダを優先
3. **`getFirstImage()`** - サムネイル取得時に"atbb公開"フォルダを優先

### 必要な変更
- "atbb公開" だけでなく **"athome公開"** フォルダも検索対象に追加
- フォールバック順序: "athome公開" → 親フォルダ
- "atbb公開" フォルダ機能は後方互換性のため維持

## 実装要件

### 機能要件

#### 1. フォルダ検索の優先順位
システムは以下の順序でフォルダを検索し、最初に見つかったフォルダの画像を使用する:

1. **"athome公開"** フォルダ（新規追加）
2. **親フォルダ**の画像（フォールバック）

**注意**: "atbb公開"フォルダ機能は後方互換性のため維持するが、"athome公開"が優先される

#### 2. フォールバック動作
- "athome公開"フォルダが存在する場合: そのフォルダ内の画像のみを表示
- "athome公開"フォルダが存在しない場合: 親フォルダの画像を表示
- "atbb公開"フォルダが存在する場合: そのフォルダ内の画像のみを表示（既存機能）

#### 3. 検索順序の実装
```typescript
// 疑似コード
async function getPublicFolderIdIfExists(parentFolderId: string): Promise<string> {
  // 1. "athome公開"フォルダを検索
  const athomeFolderId = await findFolderByName(parentFolderId, 'athome公開');
  if (athomeFolderId) {
    return athomeFolderId;
  }
  
  // 2. "atbb公開"フォルダを検索（後方互換性）
  const atbbFolderId = await findFolderByName(parentFolderId, 'atbb公開');
  if (atbbFolderId) {
    return atbbFolderId;
  }
  
  // 3. 親フォルダを使用
  return parentFolderId;
}
```

### 非機能要件

#### 1. パフォーマンス
- フォルダ検索は並列実行して高速化
- キャッシュ機構は既存のまま維持

#### 2. ログ出力
- どのフォルダが使用されたかをログに記録
- デバッグ時に問題を特定しやすくする

#### 3. エラーハンドリング
- フォルダ検索でエラーが発生しても、親フォルダにフォールバック
- ユーザー体験を損なわない

## 修正方針

### 変更対象ファイル
1. **`backend/src/services/PropertyImageService.ts`**
   - `getPublicFolderIdIfExists()` メソッドを修正
   - "athome公開"フォルダの検索を追加
   - 検索順序を実装

### 実装ステップ

#### ステップ1: `getPublicFolderIdIfExists()`の修正
```typescript
private async getPublicFolderIdIfExists(parentFolderId: string): Promise<string> {
  try {
    // 1. "athome公開"フォルダを検索
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
    
    console.log(`📁 No public subfolder found in parent: ${parentFolderId}, using parent folder`);
    return parentFolderId;
  } catch (error: any) {
    console.error(`Error checking for public subfolders:`, error.message);
    return parentFolderId;
  }
}
```

#### ステップ2: テストの作成
- AA13129で"athome公開"フォルダの1枚の画像のみが返されることを確認
- "atbb公開"フォルダを持つ物件で既存機能が正常に動作することを確認
- 公開フォルダがない物件で親フォルダの画像が返されることを確認

## 成功基準

### 機能テスト
- [ ] AA13129で"athome公開"フォルダが正しく検出される
- [ ] AA13129で1枚の画像のみが返される（"athome公開"フォルダ内の画像）
- [ ] ログに`✅ Found "athome公開" subfolder:`が表示される
- [ ] 公開物件サイトで1枚の画像のみが表示される

### 後方互換性テスト
- [ ] "atbb公開"フォルダを持つ物件で既存機能が正常に動作する
- [ ] "atbb公開"フォルダがある場合、そのフォルダの画像が優先される
- [ ] ログに`✅ Found "atbb公開" subfolder:`が表示される

### フォールバックテスト
- [ ] 公開フォルダがない物件で親フォルダの画像が返される
- [ ] ログに`📁 No public subfolder found`が表示される

### エラーハンドリングテスト
- [ ] フォルダ検索でエラーが発生しても親フォルダにフォールバックする
- [ ] エラーログが適切に出力される

## 関連ファイル

### 調査対象
- `backend/src/services/PropertyImageService.ts`
- `backend/src/services/GoogleDriveService.ts`
- `backend/src/routes/publicProperties.ts`
- `backend/src/services/PropertyListingService.ts`

### テストファイル
- `backend/test-aa13129-atbb-public-folder.ts` (新規作成)

## タイムライン

1. **実装フェーズ** (20分)
   - `PropertyImageService.ts`の修正
   - ログ出力の追加

2. **テストフェーズ** (20分)
   - テストスクリプト作成
   - AA13129での動作確認
   - 後方互換性テスト

3. **検証フェーズ** (10分)
   - 公開物件サイトでの表示確認
   - ログの確認

## 優先度
**HIGH** - ユーザーが報告した実際のバグ

## 担当
AI Assistant

## ステータス
🟢 実装完了 - テスト待ち

**実装完了日**: 2026年1月4日

### 完了した作業
- [x] requirements.md の更新
- [x] design.md の更新
- [x] tasks.md の更新
- [x] PropertyImageService.ts の修正
- [x] ログ出力の改善
- [x] テストスクリプトの作成
- [x] 実装完了ドキュメントの作成

### 次のステップ
1. テストスクリプトの実行
2. バックエンドの再起動
3. 公開物件サイトでの動作確認
