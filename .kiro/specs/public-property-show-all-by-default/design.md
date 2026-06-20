# 公開物件サイト「公開中のみ表示」デフォルト設定変更 - 設計書

## 設計概要

`PublicPropertiesPage.tsx`の`showPublicOnly`ステートの初期値を`true`から`false`に変更します。

## アーキテクチャ

### 変更箇所

```
frontend/
└── src/
    └── pages/
        └── PublicPropertiesPage.tsx  ← 1行のみ変更
```

### 影響を受けるコンポーネント

**なし** - この変更は`PublicPropertiesPage`コンポーネント内で完結します。

## 詳細設計

### 1. ステート初期値の変更

#### 変更前（69行目）
```typescript
// 公開中のみ表示フィルター状態（デフォルトで公開物件のみ表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(true);
```

#### 変更後（69行目）
```typescript
// 公開中のみ表示フィルター状態（デフォルトで全物件を表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

### 2. 動作フロー

#### 2.1 初期表示フロー

```
ページ読み込み
  ↓
showPublicOnly = false（新しいデフォルト）
  ↓
URLパラメータに showPublicOnly が含まれない
  ↓
APIリクエスト（showPublicOnly パラメータなし）
  ↓
全ての物件を取得
  ↓
画面に表示
```

#### 2.2 フィルター有効化フロー

```
「公開中のみ表示」ボタンをクリック
  ↓
setShowPublicOnly(true)
  ↓
URLパラメータに showPublicOnly=true を追加
  ↓
APIリクエスト（showPublicOnly=true）
  ↓
公開中の物件のみを取得
  ↓
画面に表示
```

#### 2.3 フィルター無効化フロー

```
「公開中のみ表示」ボタンをクリック（ON状態から）
  ↓
setShowPublicOnly(false)
  ↓
URLパラメータから showPublicOnly を削除
  ↓
APIリクエスト（showPublicOnly パラメータなし）
  ↓
全ての物件を取得
  ↓
画面に表示
```

### 3. URLパラメータの扱い

#### 3.1 URLパラメータへの反映（341-343行目）

**変更不要** - 既存のロジックで正しく動作します。

```typescript
// 公開中のみ表示フィルターをURLに反映
if (showPublicOnly) {
  newParams.set('showPublicOnly', 'true');
}
```

**動作**:
- `showPublicOnly`が`false`の場合、URLパラメータに追加されない
- `showPublicOnly`が`true`の場合、`showPublicOnly=true`が追加される

#### 3.2 URLパラメータからの復元（298-300行目）

**変更不要** - 既存のロジックで正しく動作します。

```typescript
// 公開中のみ表示パラメータも復元
const showPublicOnlyParam = searchParams.get('showPublicOnly');
if (showPublicOnlyParam === 'true') {
  setShowPublicOnly(true);
}
```

**動作**:
- URLに`showPublicOnly=true`がある場合のみ、`showPublicOnly`を`true`に設定
- URLに`showPublicOnly`パラメータがない場合、デフォルト値（`false`）のまま

### 4. ボタン表示（866行目）

**変更不要** - 既存のロジックで正しく動作します。

```typescript
{showPublicOnly ? '✓ 公開中のみ表示' : '公開中のみ表示'}
```

**動作**:
- `showPublicOnly`が`false`の場合: 「公開中のみ表示」（チェックマークなし）
- `showPublicOnly`が`true`の場合: 「✓ 公開中のみ表示」（チェックマークあり）

### 5. APIリクエスト（468-472行目）

**変更不要** - 既存のロジックで正しく動作します。

```typescript
if (showPublicOnlyParam === 'true') {
  params.set('showPublicOnly', 'true');
}
```

**動作**:
- `showPublicOnly`が`false`の場合、APIリクエストに`showPublicOnly`パラメータが含まれない
- `showPublicOnly`が`true`の場合、APIリクエストに`showPublicOnly=true`が含まれる

### 6. 「すべての条件をクリア」ボタン（627行目）

**変更不要** - 既存のロジックで正しく動作します。

```typescript
// 公開中のみ表示フィルターをクリア
setShowPublicOnly(false);
```

**動作**: クリア時に`showPublicOnly`を`false`に設定（新しいデフォルト値と一致）

## データフロー

### 1. 初期表示時

```
PublicPropertiesPage
  ↓
showPublicOnly = false
  ↓
fetchProperties()
  ↓
API: GET /api/public/properties
  （showPublicOnly パラメータなし）
  ↓
全ての物件を返す
  ↓
setProperties(data.properties)
  ↓
画面に表示
```

### 2. フィルター変更時

```
ユーザーがボタンをクリック
  ↓
setShowPublicOnly(!showPublicOnly)
  ↓
useEffect（showPublicOnly の変更を検知）
  ↓
URLパラメータを更新
  ↓
fetchProperties()
  ↓
API: GET /api/public/properties
  （showPublicOnly=true または パラメータなし）
  ↓
フィルター済みの物件を返す
  ↓
setProperties(data.properties)
  ↓
画面に表示
```

## エラーハンドリング

**変更不要** - 既存のエラーハンドリングで対応可能です。

## パフォーマンス考慮事項

### 1. 初期表示時のデータ量

**変更前**: 公開中の物件のみ（例: 50件）  
**変更後**: 全ての物件（例: 100件）

**影響**:
- データ量が増加する可能性がある
- ただし、ページネーション（20件/ページ）により、1回のリクエストで取得する件数は変わらない

**結論**: パフォーマンスへの影響は最小限

### 2. APIレスポンス時間

**変更前**: `showPublicOnly=true`でフィルタリング  
**変更後**: フィルタリングなし

**影響**:
- データベースクエリが若干シンプルになる
- レスポンス時間は同等またはわずかに改善

**結論**: パフォーマンスへの悪影響なし

## セキュリティ考慮事項

**影響なし** - この変更はフロントエンドのデフォルト値の変更のみです。

- バックエンドAPIは既に全ての物件を返す機能を持っている
- 認証・認可の仕組みは変更しない
- 非公開物件も既に公開物件サイトで表示可能（`atbb_status`で区別）

## テスト戦略

### 1. 単体テスト

**不要** - ステートの初期値変更のみのため、既存のテストで十分

### 2. 統合テスト

#### テストケース1: 初期表示
```
Given: ユーザーが公開物件サイトを開く
When: ページが読み込まれる
Then: showPublicOnly が false である
And: 全ての物件が表示される
And: 「公開中のみ表示」ボタンがOFF状態
```

#### テストケース2: フィルター有効化
```
Given: 初期表示状態（showPublicOnly = false）
When: 「公開中のみ表示」ボタンをクリック
Then: showPublicOnly が true になる
And: 公開中の物件のみが表示される
And: URLに showPublicOnly=true が追加される
```

#### テストケース3: フィルター無効化
```
Given: フィルター有効状態（showPublicOnly = true）
When: 「公開中のみ表示」ボタンをクリック
Then: showPublicOnly が false になる
And: 全ての物件が表示される
And: URLから showPublicOnly パラメータが削除される
```

#### テストケース4: URLパラメータからの復元
```
Given: URLに showPublicOnly=true が含まれている
When: ページが読み込まれる
Then: showPublicOnly が true になる
And: 公開中の物件のみが表示される
```

### 3. E2Eテスト

#### シナリオ1: 初期表示から詳細画面への遷移
```
1. 公開物件サイトを開く
2. 全ての物件が表示されることを確認
3. 物件をクリックして詳細画面へ
4. ブラウザの戻るボタンで一覧に戻る
5. フィルター状態が維持されていることを確認（showPublicOnly = false）
```

#### シナリオ2: フィルター変更後の詳細画面への遷移
```
1. 公開物件サイトを開く
2. 「公開中のみ表示」をON
3. 公開中の物件のみが表示されることを確認
4. 物件をクリックして詳細画面へ
5. ブラウザの戻るボタンで一覧に戻る
6. フィルター状態が維持されていることを確認（showPublicOnly = true）
```

## デプロイ戦略

### 1. デプロイ手順

```bash
# 1. コードを変更
# frontend/src/pages/PublicPropertiesPage.tsx の69行目を変更

# 2. ローカルで動作確認
cd frontend
npm run dev

# 3. コミット
git add frontend/src/pages/PublicPropertiesPage.tsx
git commit -m "Fix: Change default value of showPublicOnly to false"

# 4. プッシュ
git push

# 5. Vercelで自動デプロイ（2-3分）
```

### 2. ロールバック手順

問題が発生した場合、即座にロールバック可能です。

```bash
# 1. 前のコミットに戻す
git revert HEAD

# 2. プッシュ
git push

# 3. Vercelで自動デプロイ（2-3分）
```

### 3. デプロイ後の確認

1. 本番環境を開く: `https://property-site-frontend-kappa.vercel.app/public/properties`
2. 全ての物件が表示されることを確認
3. 「公開中のみ表示」ボタンがOFF状態であることを確認
4. ボタンをクリックして、公開中の物件のみが表示されることを確認
5. もう一度クリックして、全ての物件が表示されることを確認

## モニタリング

### 1. 監視項目

- **エラー率**: Vercelログでエラーが増加していないか
- **ページ読み込み時間**: 初期表示が遅くなっていないか
- **APIレスポンス時間**: `/api/public/properties`のレスポンスが遅くなっていないか

### 2. アラート条件

- エラー率が5%を超えた場合
- ページ読み込み時間が3秒を超えた場合
- APIレスポンス時間が2秒を超えた場合

## ドキュメント更新

### 更新が必要なドキュメント

**なし** - この変更はユーザー向けドキュメントに影響しません。

### 更新が推奨されるドキュメント

- `.kiro/steering/public-property-site-usage.md`（存在する場合）
  - 「公開中のみ表示」フィルターのデフォルト動作を記載

## まとめ

### 変更内容
- `PublicPropertiesPage.tsx`の69行目を変更
- `useState<boolean>(true)` → `useState<boolean>(false)`

### 影響範囲
- **最小限**: 1行のみの変更
- **既存機能への影響**: なし

### リスク
- **低リスク**: ロールバックが容易
- **パフォーマンス**: 影響なし
- **セキュリティ**: 影響なし

### 期待される効果
- ユーザビリティの向上
- ユーザーが全ての物件を簡単に閲覧できる
- 必要に応じて「公開中のみ表示」を有効化できる

## 承認

- [ ] 設計レビュー完了
- [ ] 実装準備完了
- [ ] デプロイ準備完了
