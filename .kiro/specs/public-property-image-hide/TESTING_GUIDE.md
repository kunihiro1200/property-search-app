# 画像非表示機能 - テストガイド

## 🎯 目的
画像の非表示/復元機能が正しく動作することを確認する

## ✅ 事前確認

### 1. エンドポイント修正の確認
フロントエンドのAPIクライアントが正しいエンドポイントを呼び出しているか確認:

**ファイル**: `frontend/src/services/api.ts`

```typescript
// ✅ 正しい実装
restoreImage: async (propertyId: string, fileId: string) => {
  const response = await api.post(`/api/property-listings/${propertyId}/unhide-image`, { fileId });
  return response.data;
}

// ❌ 間違った実装（修正済み）
// const response = await api.post(`/api/property-listings/${propertyId}/restore-image`, { fileId });
```

### 2. データベーススキーマの確認

Supabase ダッシュボード → SQL Editor で実行:

```sql
-- hidden_images カラムの存在確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';
```

**期待される結果**:
```
column_name   | data_type | is_nullable | column_default      | udt_name
--------------+-----------+-------------+---------------------+----------
hidden_images | ARRAY     | YES         | ARRAY[]::text[]     | _text
```

カラムが存在しない場合は、Migration 077 を実行:
```sql
-- backend/migrations/077_add_hidden_images_MANUAL_EXECUTION.sql の内容を実行
```

### 3. PostgREST スキーマキャッシュのリロード

カラムを追加した後、スキーマキャッシュをリロード:

```sql
NOTIFY pgrst, 'reload schema';
```

または Supabase ダッシュボード → Settings → API → Restart server

## 🧪 テスト手順

### テスト 1: 画像の非表示機能

1. **ブラウザで公開物件ページを開く**
   ```
   http://localhost:5173/public/properties/[物件ID]
   ```

2. **開発者ツールを開く**
   - Chrome: F12 または Ctrl+Shift+I
   - Console タブを開く
   - Network タブも開いておく

3. **画像の非表示ボタンをクリック**
   - 画像にマウスオーバーすると表示される目のアイコン（VisibilityOff）をクリック

4. **確認項目**
   - [ ] ブラウザコンソールにエラーが表示されない
   - [ ] Network タブで `hide-image` リクエストが成功（200 OK）
   - [ ] 画像が即座に非表示になる
   - [ ] 「画像を非表示にしました」というスナックバーが表示される
   - [ ] 非表示画像カウンターが更新される（例: "非表示: 1枚"）

5. **Network タブで確認**
   ```
   Request URL: http://localhost:3000/api/property-listings/[id]/hide-image
   Request Method: POST
   Status Code: 200 OK
   
   Request Payload:
   {
     "fileId": "1abc..."
   }
   
   Response:
   {
     "success": true,
     "message": "Image 1abc... has been hidden"
   }
   ```

### テスト 2: 画像の復元機能

1. **非表示にした画像の復元ボタンをクリック**
   - 管理者モードの場合、緑色の目のアイコン（Visibility）をクリック

2. **確認項目**
   - [ ] ブラウザコンソールにエラーが表示されない
   - [ ] Network タブで `unhide-image` リクエストが成功（200 OK）
   - [ ] 画像が即座に再表示される
   - [ ] 「画像を復元しました」というスナックバーが表示される
   - [ ] 非表示画像カウンターが更新される

3. **Network タブで確認**
   ```
   Request URL: http://localhost:3000/api/property-listings/[id]/unhide-image
   Request Method: POST
   Status Code: 200 OK
   
   Request Payload:
   {
     "fileId": "1abc..."
   }
   
   Response:
   {
     "success": true,
     "message": "Image 1abc... has been unhidden"
   }
   ```

### テスト 3: 永続性の確認

1. **画像を非表示にする**

2. **ページをリロード（F5）**

3. **確認項目**
   - [ ] 非表示にした画像が引き続き非表示のまま
   - [ ] 非表示画像カウンターが正しい値を表示

4. **データベースで確認**
   ```sql
   SELECT id, property_number, hidden_images
   FROM property_listings
   WHERE id = '[物件ID]';
   ```
   
   **期待される結果**:
   ```
   hidden_images: ["1abc...", "2def..."]
   ```

### テスト 4: エラーハンドリング

1. **存在しない画像IDで非表示を試みる**
   - ブラウザコンソールで実行:
   ```javascript
   await propertyImageApi.hideImage('[物件ID]', 'invalid-file-id');
   ```

2. **確認項目**
   - [ ] エラーメッセージが表示される
   - [ ] アプリケーションがクラッシュしない

## 🐛 トラブルシューティング

### 問題: 500 Internal Server Error

**原因**: `hidden_images` カラムが存在しない

**解決策**:
1. Supabase ダッシュボードで Migration 077 を実行
2. スキーマキャッシュをリロード
3. 必要に応じて Supabase プロジェクトを再起動

### 問題: エンドポイントが見つからない (404)

**原因**: エンドポイント名が間違っている

**解決策**:
1. `frontend/src/services/api.ts` を確認
2. `restore-image` → `unhide-image` に修正されているか確認
3. フロントエンドを再起動

### 問題: 権限エラー (403)

**原因**: データベース権限が不足

**解決策**:
```sql
GRANT SELECT, UPDATE ON property_listings TO authenticated;
GRANT SELECT, UPDATE ON property_listings TO anon;
```

### 問題: 画像が非表示にならない

**原因**: フロントエンドのキャッシュ

**解決策**:
1. ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）
2. ハードリロード（Ctrl+Shift+R）
3. 開発者ツールで Network タブの "Disable cache" をチェック

## 📊 テスト結果の記録

### テスト実行日時
- 日時: _______________
- 実行者: _______________

### テスト結果
- [ ] テスト 1: 画像の非表示機能 - 合格/不合格
- [ ] テスト 2: 画像の復元機能 - 合格/不合格
- [ ] テスト 3: 永続性の確認 - 合格/不合格
- [ ] テスト 4: エラーハンドリング - 合格/不合格

### 発見された問題
1. _______________
2. _______________
3. _______________

### 備考
_______________
_______________
_______________

## ✨ 成功時の動作

すべてのテストが合格した場合:
- ✅ 画像の非表示ボタンをクリックすると即座に画像が非表示になる
- ✅ 画像の復元ボタンをクリックすると即座に画像が再表示される
- ✅ ブラウザコンソールにエラーが表示されない
- ✅ ページをリロードしても非表示状態が保持される
- ✅ 非表示画像カウンターが正しく更新される

これで画像非表示機能は正常に動作しています！🎉
