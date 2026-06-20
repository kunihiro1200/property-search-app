# searchFolderByName メソッドの改善提案

## 問題

現在の`findMatchingFolder`メソッドは、`startsWith`を使用しているため、以下の問題が発生します：

- `CC10`を検索すると、`CC100`, `CC101`, `CC102`, `CC103`, `CC104`, `CC105`も全てマッチする
- `files.find()`は最初に見つかったフォルダを返すため、間違ったフォルダが選択される可能性がある

## 解決策

### 改善案1: 完全一致を優先

```typescript
private findMatchingFolder(
  files: Array<{ id?: string | null; name?: string | null; parents?: string[] | null }>,
  normalizedSearchTerm: string
): { id?: string | null; name?: string | null } | undefined {
  // 1. 完全一致を優先（例: CC10_xxx）
  let matchingFolder = files.find(f => {
    const normalizedName = this.normalizePropertyNumber(f.name || '');
    // フォルダ名が「物件番号_」または「物件番号.」で始まる場合のみマッチ
    return normalizedName.startsWith(normalizedSearchTerm + '_') ||
           normalizedName.startsWith(normalizedSearchTerm + '.');
  });
  
  if (matchingFolder) {
    return matchingFolder;
  }
  
  // 2. 物件番号で始まるフォルダ（フォールバック）
  matchingFolder = files.find(f => {
    const normalizedName = this.normalizePropertyNumber(f.name || '');
    return normalizedName.startsWith(normalizedSearchTerm);
  });
  
  if (matchingFolder) {
    return matchingFolder;
  }
  
  // 3. プレフィックス付きで物件番号を含むフォルダ（例: U_AA13069_xxx）
  matchingFolder = files.find(f => {
    const normalizedName = this.normalizePropertyNumber(f.name || '');
    return normalizedName.includes('_' + normalizedSearchTerm + '_') ||
           normalizedName.includes('_' + normalizedSearchTerm + '.');
  });
  
  if (matchingFolder) {
    return matchingFolder;
  }
  
  // 4. その他、物件番号を含むフォルダ（最も柔軟なマッチング）
  return files.find(f => {
    const normalizedName = this.normalizePropertyNumber(f.name || '');
    return normalizedName.includes(normalizedSearchTerm);
  });
}
```

### 改善案2: 正規表現を使用

```typescript
private findMatchingFolder(
  files: Array<{ id?: string | null; name?: string | null; parents?: string[] | null }>,
  normalizedSearchTerm: string
): { id?: string | null; name?: string | null } | undefined {
  // 1. 完全一致（物件番号_または物件番号.で始まる）
  const exactMatchRegex = new RegExp(`^${normalizedSearchTerm}[_\\.]`, 'i');
  let matchingFolder = files.find(f => {
    const normalizedName = this.normalizePropertyNumber(f.name || '');
    return exactMatchRegex.test(normalizedName);
  });
  
  if (matchingFolder) {
    return matchingFolder;
  }
  
  // 2. 物件番号で始まるフォルダ（フォールバック）
  matchingFolder = files.find(f => {
    const normalizedName = this.normalizePropertyNumber(f.name || '');
    return normalizedName.startsWith(normalizedSearchTerm);
  });
  
  return matchingFolder;
}
```

## テストケース

### 期待される動作

| 検索キーワード | マッチするフォルダ | マッチしないフォルダ |
|--------------|------------------|-------------------|
| `CC10` | `CC10_小池原1期_よかタウン` | `CC100`, `CC101`, `CC102`, `CC103`, `CC104`, `CC105` |
| `CC100` | `CC100_青葉台2号棟_タマホーム` | `CC10`, `CC101`, `CC102` |
| `AA13069` | `AA13069_xxx` | `AA130690`, `AA13069A` |

## 実装手順

1. `backend/src/services/GoogleDriveService.ts`の`findMatchingFolder`メソッドを修正
2. `backend/api/src/services/GoogleDriveService.ts`の`findMatchingFolder`メソッドを修正
3. `frontend/src/backend/services/GoogleDriveService.ts`の`findMatchingFolder`メソッドを修正
4. テストスクリプトを作成して動作確認
5. 既存の物件の`storage_location`を再検証

## 影響範囲

- 新規物件の`storage_location`自動設定
- 既存物件の`storage_location`再同期

## 注意事項

- この修正は、今後の新規物件に対してのみ有効
- 既存の間違った`storage_location`は手動で修正する必要がある
- CC10以外にも同じ問題が発生している可能性があるため、全物件を再検証することを推奨
