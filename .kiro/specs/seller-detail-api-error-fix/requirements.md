# 売主詳細画面のAPIエラー修正

## 概要
売主詳細画面（通話モードページ）にアクセスすると、「データの取得に失敗しました」というエラーが表示される問題を修正します。

## 問題の詳細

### 現在の状況
- 売主リストから売主詳細画面に遷移すると、エラーが発生する
- ブラウザのコンソールに以下のエラーが表示される：
  ```
  GET http://localhost:3000/employees 404 (Not Found)
  AxiosError {message: 'Request failed with status code 404', name: 'AxiosError', code: 'ERR_BAD_REQUEST', ...}
  ```

### 根本原因
`frontend/src/pages/CallModePage.tsx`の928行目で、従業員データを取得する際に間違ったAPIパスを使用しています：

**現在（間違い）**:
```typescript
api.get('/employees'),
```

**正しいパス**:
```typescript
api.get('/api/employees'),
```

### 影響範囲
- 売主詳細画面（通話モードページ）が表示できない
- 従業員データが取得できないため、訪問予約の担当者選択などができない

## 要件

### 1. APIパスの修正
- `CallModePage.tsx`の928行目を修正
- `/employees`を`/api/employees`に変更

### 2. 動作確認
- 売主詳細画面が正常に表示されること
- 従業員データが正しく取得されること
- 訪問予約セクションで担当者が選択できること

## 受け入れ基準

### AC1: APIパスの修正
- [ ] `CallModePage.tsx`の928行目が`api.get('/api/employees')`に修正されている

### AC2: 売主詳細画面の表示
- [ ] 売主リストから売主詳細画面に遷移できる
- [ ] 「データの取得に失敗しました」エラーが表示されない
- [ ] 売主情報が正しく表示される

### AC3: 従業員データの取得
- [ ] ブラウザのコンソールに404エラーが表示されない
- [ ] 訪問予約セクションで担当者のプルダウンが表示される
- [ ] 担当者のリストに従業員が表示される

## 技術的な詳細

### 修正対象ファイル
- `frontend/src/pages/CallModePage.tsx`

### 修正内容
```typescript
// 修正前（928行目）
const [sellerResponse, activitiesResponse, employeesResponse] = await Promise.all([
  api.get(`/api/sellers/${id}`),
  api.get(`/api/sellers/${id}/activities`),
  api.get('/employees'),  // ← 間違い
]);

// 修正後
const [sellerResponse, activitiesResponse, employeesResponse] = await Promise.all([
  api.get(`/api/sellers/${id}`),
  api.get(`/api/sellers/${id}/activities`),
  api.get('/api/employees'),  // ← 正しい
]);
```

### バックエンドのエンドポイント
- パス: `/api/employees`
- ファイル: `backend/src/routes/employees.ts`
- 認証: 必要（`authenticate`ミドルウェア）
- レスポンス: 従業員の配列

## 注意事項

### システム隔離ルール
- この修正は**売主リスト（Seller Management）システム**のみに影響します
- 他のシステム（物件リスト、買主リスト、業務リスト、物件公開サイト）には影響しません

### テスト方法
1. バックエンドサーバーを起動（`npm run dev`）
2. フロントエンドサーバーを起動（`npm run dev`）
3. 売主リストページにアクセス
4. 任意の売主をクリックして詳細画面に遷移
5. エラーが表示されず、売主情報が正しく表示されることを確認
6. 訪問予約セクションで担当者のプルダウンが表示されることを確認

## 関連ドキュメント
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- `.kiro/steering/seller-table-column-definition.md` - 売主テーブルのカラム定義
