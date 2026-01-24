# 手動画像キャッシュクリア機能

## 概要

公開物件サイトの画像は60分間キャッシュされます。画像を差し替えた際に、手動でキャッシュをクリアして最新の画像を表示できる機能を追加しました。

**実装日**: 2026年1月24日  
**コミット**: `5588ca0` - "Add: Manual image cache clear button for admin users"

---

## 機能の詳細

### 1. 管理者モード専用

- **表示条件**: `canHide=true`の場合のみボタンが表示されます
- **対象ユーザー**: 管理者のみ
- **公開サイト**: 一般ユーザーには表示されません

### 2. ボタンの配置

**場所**: 画像ギャラリーのヘッダー部分（右上）

```
[非表示: X枚]                    [画像を更新]
```

### 3. 動作フロー

1. **ボタンをクリック**
   - ボタンが「更新中...」に変わる
   - ローディングアイコンが表示される

2. **キャッシュクリア**
   - バックエンドAPIを呼び出し
   - 該当物件の画像キャッシュをクリア

3. **画像再取得**
   - 自動的に最新の画像を取得
   - 画面に反映

4. **完了通知**
   - 成功: 「画像キャッシュをクリアしました。最新の画像が表示されます。」
   - 失敗: エラーメッセージを表示

---

## バックエンドAPI

### エンドポイント1: 特定物件のキャッシュクリア

**URL**: `POST /api/public/properties/:identifier/clear-image-cache`

**パラメータ**:
- `identifier`: 物件ID（UUID）または物件番号

**レスポンス**:
```json
{
  "success": true,
  "message": "物件 CC6 の画像キャッシュをクリアしました",
  "propertyNumber": "CC6",
  "folderId": "1abc..."
}
```

**エラー**:
```json
{
  "success": false,
  "error": "Property not found",
  "message": "物件が見つかりません"
}
```

### エンドポイント2: 全物件のキャッシュクリア

**URL**: `POST /api/public/clear-all-image-cache`

**レスポンス**:
```json
{
  "success": true,
  "message": "全ての画像キャッシュをクリアしました"
}
```

---

## フロントエンド実装

### PropertyImageGallery.tsx

**追加された機能**:

1. **キャッシュクリアボタン**
   ```tsx
   <Button
     variant="outlined"
     size="small"
     onClick={handleClearCache}
     disabled={isClearingCache}
     startIcon={isClearingCache ? <CircularProgress size={16} /> : <RefreshIcon />}
   >
     {isClearingCache ? '更新中...' : '画像を更新'}
   </Button>
   ```

2. **handleClearCache関数**
   - `publicApi.post()`でAPIを呼び出し
   - 成功時: `refetch()`で画像を再取得
   - 成功/失敗メッセージをSnackbarで表示

3. **状態管理**
   - `isClearingCache`: ローディング状態
   - `snackbar`: 通知メッセージ

---

## 使用例

### CC6の画像を差し替えた場合

1. **Google Driveで画像を差し替え**
   - 古い画像を削除
   - 新しい画像をアップロード

2. **公開物件サイトでCC6を開く**
   - 管理者としてログイン
   - CC6の詳細ページを開く

3. **「画像を更新」ボタンをクリック**
   - ボタンが「更新中...」に変わる
   - 数秒後、最新の画像が表示される

4. **完了**
   - 「画像キャッシュをクリアしました。最新の画像が表示されます。」と表示される

---

## パフォーマンスへの影響

### キャッシュあり（通常時）

- **画像取得**: 0秒（キャッシュから即座に取得）
- **ユーザー体験**: 高速

### キャッシュクリア後

- **画像取得**: 1-2秒（Google Driveから再取得）
- **ユーザー体験**: 若干遅くなるが、最新の画像が表示される

### 推奨される使用方法

- **通常時**: キャッシュを有効にして高速表示
- **画像差し替え時**: 手動でキャッシュをクリア
- **頻度**: 画像を差し替えた時のみ

---

## トラブルシューティング

### 問題1: ボタンが表示されない

**原因**: `canHide=false`または管理者としてログインしていない

**解決策**:
- 管理者としてログイン
- `canHide=true`を確認

### 問題2: キャッシュクリアが失敗する

**原因**: 
- 物件が見つからない
- storage_locationが設定されていない
- Google Drive APIエラー

**解決策**:
1. 物件番号を確認
2. storage_locationが設定されているか確認
3. Vercelログでエラーを確認

### 問題3: 画像が更新されない

**原因**: ブラウザのキャッシュ

**解決策**:
1. ブラウザをリロード（Ctrl+F5）
2. ブラウザのキャッシュをクリア

---

## 復元手順（問題が発生した場合）

```bash
# 動作確認済みコミットに戻す
git checkout 5588ca0 -- backend/api/index.ts
git checkout 5588ca0 -- frontend/src/components/PropertyImageGallery.tsx

# コミット
git add backend/api/index.ts frontend/src/components/PropertyImageGallery.tsx
git commit -m "Restore manual image cache clear feature (commit 5588ca0)"
git push
```

---

## まとめ

- **機能**: 管理者が手動で画像キャッシュをクリアできる
- **対象**: 管理者モード（`canHide=true`）のみ
- **用途**: 画像を差し替えた時に最新の画像を表示
- **パフォーマンス**: 通常時は高速（キャッシュ有効）、必要な時だけクリア
- **ユーザー体験**: 画像差し替え時のみ若干遅くなるが、最新の画像が表示される

**この機能により、画像を差し替えた際に最大60分待つ必要がなくなりました。**
