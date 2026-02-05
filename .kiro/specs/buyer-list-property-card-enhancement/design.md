# 買主リスト - 物件情報カード改善 設計書

## 📋 設計概要

買主詳細ページの物件情報カードに以下の機能を追加：
1. 物件番号のコピー機能
2. atbb_statusの表示（物件番号の隣）
3. ステアリングドキュメントの最適化

---

## 🏗️ アーキテクチャ

### コンポーネント構成

```
PropertyInfoCard.tsx
├── Header（ヘッダー）
├── Property Details（物件詳細）
│   ├── 物件番号セクション ← ★ 改修対象
│   │   ├── 物件番号テキスト
│   │   ├── コピーボタン（新規）
│   │   └── atbb_status（新規）
│   ├── ステータス
│   ├── 配信日
│   └── その他フィールド...
└── Footer（フッター）
```

---

## 🎨 UI設計

### 物件番号セクションのレイアウト

**現在**:
```tsx
<Grid item xs={12}>
  <Typography variant="caption">物件番号</Typography>
  <Typography variant="body1">{property.property_number}</Typography>
</Grid>
```

**改善後**:
```tsx
<Grid item xs={12}>
  <Typography variant="caption">物件番号</Typography>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {/* 物件番号 */}
    <Typography variant="body1" fontWeight="bold" color="primary.main">
      {property.property_number}
    </Typography>
    
    {/* コピーボタン */}
    <IconButton 
      size="small" 
      onClick={handleCopyPropertyNumber}
      aria-label="物件番号をコピー"
    >
      <ContentCopyIcon fontSize="small" />
    </IconButton>
    
    {/* atbb_status */}
    {property.atbb_status && (
      <Typography variant="body2" color="text.secondary">
        {property.atbb_status}
      </Typography>
    )}
  </Box>
</Grid>
```

### スナックバー（コピー通知）

```tsx
<Snackbar
  open={snackbarOpen}
  autoHideDuration={2000}
  onClose={handleSnackbarClose}
  message="物件番号をコピーしました"
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
/>
```

---

## 💾 データ設計

### PropertyFullDetails型の拡張

```typescript
interface PropertyFullDetails {
  id: number;
  property_number: string;
  atbb_status?: string; // ← 新規追加
  status?: string;
  distribution_date?: string;
  address?: string;
  // ... 既存フィールド
}
```

### APIレスポンスの確認

**エンドポイント**: `GET /api/property-listings/${propertyId}`

**期待されるレスポンス**:
```json
{
  "id": 123,
  "property_number": "AA13501",
  "atbb_status": "専任・公開中",
  "status": "公開中",
  "address": "大分市中央町1-1-1",
  ...
}
```

**確認事項**:
- [ ] `atbb_status`フィールドがAPIレスポンスに含まれているか
- [ ] `atbb_status`が空の場合の挙動（null, undefined, ""）

---

## 🔧 実装詳細

### 1. PropertyInfoCard.tsxの修正

#### 1-1. 型定義の更新

```typescript
interface PropertyFullDetails {
  id: number;
  property_number: string;
  atbb_status?: string; // 追加
  status?: string;
  // ... 既存フィールド
}
```

#### 1-2. Stateの追加

```typescript
const [snackbarOpen, setSnackbarOpen] = useState(false);
const [snackbarMessage, setSnackbarMessage] = useState('');
```

#### 1-3. コピー機能の実装

```typescript
const handleCopyPropertyNumber = async () => {
  if (!property?.property_number) return;
  
  try {
    await navigator.clipboard.writeText(property.property_number);
    setSnackbarMessage('物件番号をコピーしました');
    setSnackbarOpen(true);
  } catch (err) {
    console.error('Failed to copy property number:', err);
    setSnackbarMessage('コピーに失敗しました');
    setSnackbarOpen(true);
  }
};

const handleSnackbarClose = () => {
  setSnackbarOpen(false);
};
```

#### 1-4. 物件番号セクションの修正

```typescript
{/* 物件番号 */}
<Grid item xs={12}>
  <Typography variant="caption" color="text.secondary">
    物件番号
  </Typography>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
    {/* 物件番号テキスト */}
    <Typography variant="body1" fontWeight="bold" color="primary.main">
      {property.property_number}
    </Typography>
    
    {/* コピーボタン */}
    <IconButton 
      size="small" 
      onClick={handleCopyPropertyNumber}
      aria-label="物件番号をコピー"
      sx={{ 
        padding: '4px',
        '&:hover': { bgcolor: 'action.hover' }
      }}
    >
      <ContentCopyIcon fontSize="small" />
    </IconButton>
    
    {/* atbb_status */}
    {property.atbb_status && (
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ ml: 1 }}
      >
        {property.atbb_status}
      </Typography>
    )}
  </Box>
</Grid>
```

#### 1-5. スナックバーの追加

```typescript
{/* Snackbar for copy notification */}
<Snackbar
  open={snackbarOpen}
  autoHideDuration={2000}
  onClose={handleSnackbarClose}
  message={snackbarMessage}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
/>
```

#### 1-6. Importの追加

```typescript
import {
  // ... 既存のimport
  Snackbar,
} from '@mui/material';
import {
  // ... 既存のimport
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
```

---

### 2. ステアリングドキュメントの最適化

#### 2-1. README.mdの更新

**ファイル**: `.kiro/steering/README.md`

**変更内容**:

```markdown
### 買主（Buyer）関連（常に読み込み）
- `buyer-table-column-definition.md` - 買主テーブルのカラム定義
- `buyer-property-card-sync-rule.md` - 物件詳細カード同期ルール

### 売主（Seller）関連（手動読み込み - `inclusion: manual`）
以下のファイルは売主関連の作業時のみ手動で参照してください：

- `seller-table-column-definition.md` - 売主テーブルのカラム定義
- `seller-spreadsheet-column-mapping.md` - 売主スプレッドシートのカラムマッピング
- `sidebar-status-definition.md` - サイドバーステータス定義
- `sidebar-api-response-validation.md` - サイドバーAPIレスポンス検証ルール
- `seller-nearby-buyers-rule.md` - 売主リストの近隣買主リスト機能ルール
- `staff-spreadsheet-definition.md` - スタッフ管理スプレッドシート定義

### 物件（Property）関連（手動読み込み - `inclusion: manual`）
以下のファイルは物件関連の作業時のみ手動で参照してください：

- `public-property-definition.md` - 公開物件の定義
- `property-listing-sync-rules.md` - 物件リスト同期ルール
- `property-listing-column-mapping.md` - 物件リストカラムマッピング
- `property-coordinates-sync-rules.md` - 物件座標同期ルール
- `property-comments-auto-sync-rule.md` - 物件コメント自動同期ルール

### エリアマッピング関連（手動読み込み - `inclusion: manual`）
以下のファイルはエリアマッピング関連の作業時のみ手動で参照してください：

- `beppu-city-address-based-area-mapping.md` - 別府市の住所ベースエリアマッピング
- `oita-city-address-based-area-mapping.md` - 大分市の住所ベースエリアマッピング
```

#### 2-2. 各ステアリングドキュメントにfront-matterを追加

**対象ファイル**:
- `seller-table-column-definition.md`
- `seller-spreadsheet-column-mapping.md`
- `sidebar-status-definition.md`
- `sidebar-api-response-validation.md`
- `seller-nearby-buyers-rule.md`
- `staff-spreadsheet-definition.md`
- `beppu-city-address-based-area-mapping.md`
- `oita-city-address-based-area-mapping.md`

**追加するfront-matter**:
```markdown
---
inclusion: manual
---

# [ドキュメントタイトル]
```

---

## 🧪 テストケース

### 1. 物件番号のコピー機能

#### TC-1.1: 正常系 - コピー成功
**前提条件**: 
- 物件情報カードが表示されている
- 物件番号が存在する（例: AA13501）

**手順**:
1. 物件番号の横のコピーボタンをクリック

**期待結果**:
- クリップボードに物件番号がコピーされる
- スナックバーに「物件番号をコピーしました」と表示される
- スナックバーは2秒後に自動的に閉じる

#### TC-1.2: 異常系 - クリップボードAPI未対応
**前提条件**: 
- クリップボードAPIが使用できないブラウザ

**手順**:
1. 物件番号の横のコピーボタンをクリック

**期待結果**:
- スナックバーに「コピーに失敗しました」と表示される
- コンソールにエラーログが出力される

#### TC-1.3: エッジケース - 物件番号が空
**前提条件**: 
- 物件番号が空（null, undefined, ""）

**手順**:
1. コピーボタンをクリック

**期待結果**:
- 何も起こらない（早期リターン）

---

### 2. atbb_statusの表示

#### TC-2.1: 正常系 - atbb_statusが存在
**前提条件**: 
- 物件情報カードが表示されている
- atbb_statusが存在する（例: 「専任・公開中」）

**期待結果**:
- 物件番号の右側にatbb_statusが表示される
- テキストのみで表示される（色分けなし）

#### TC-2.2: エッジケース - atbb_statusが空
**前提条件**: 
- atbb_statusが空（null, undefined, ""）

**期待結果**:
- atbb_statusは表示されない
- 物件番号とコピーボタンのみが表示される

#### TC-2.3: エッジケース - atbb_statusが長い
**前提条件**: 
- atbb_statusが長い文字列（例: 「専任・公開中・値下げあり」）

**期待結果**:
- テキストが折り返されずに表示される
- レイアウトが崩れない

---

### 3. ステアリングドキュメントの最適化

#### TC-3.1: 買主リストセッション
**前提条件**: 
- 買主リスト関連の作業を開始

**期待結果**:
- 以下のドキュメントのみが自動読み込みされる:
  - `japanese-language.md`
  - `project-isolation-rule.md`
  - `system-isolation-rule.md`
  - `buyer-table-column-definition.md`
  - `buyer-property-card-sync-rule.md`
- 売主、物件、エリアマッピング関連は読み込まれない

#### TC-3.2: 物件リストセッション
**前提条件**: 
- 物件リスト関連の作業を開始
- `#property-listing-sync-rules`を手動で参照

**期待結果**:
- 物件リスト関連のドキュメントが読み込まれる
- 買主リスト関連は読み込まれない

---

## 🔒 セキュリティ考慮事項

### クリップボードAPI
- **権限**: クリップボードAPIは`navigator.clipboard.writeText()`を使用
- **HTTPS必須**: HTTPSまたはlocalhostでのみ動作
- **フォールバック**: クリップボードAPIが使用できない場合はエラーメッセージを表示

### XSS対策
- **atbb_status**: データベースから取得した値をそのまま表示
- **エスケープ**: Reactが自動的にエスケープするため、追加対策は不要

---

## 📊 パフォーマンス考慮事項

### コピー機能
- **処理時間**: 100ms以内（クリップボードAPIは非同期だが高速）
- **メモリ**: 追加のStateは最小限（snackbarOpen, snackbarMessage）

### atbb_statusの表示
- **追加API呼び出し**: なし（既存のAPIレスポンスを使用）
- **レンダリング**: 条件付きレンダリングで不要な場合は非表示

### ステアリングドキュメント
- **コンテキスト削減**: 約50%削減（売主、物件、エリアマッピング関連を除外）
- **応答速度**: AIの応答速度が向上

---

## 🚀 デプロイ計画

### Phase 1: PropertyInfoCard.tsxの修正
1. 型定義の更新
2. コピー機能の実装
3. atbb_statusの表示
4. スナックバーの追加
5. ローカルでテスト

### Phase 2: ステアリングドキュメントの最適化
1. README.mdの更新
2. 各ドキュメントにfront-matterを追加
3. 動作確認

### Phase 3: 本番デプロイ
1. フロントエンドのビルド
2. Vercelへのデプロイ
3. 本番環境でテスト

---

## 📝 実装チェックリスト

### PropertyInfoCard.tsx
- [ ] `PropertyFullDetails`型に`atbb_status`を追加
- [ ] `snackbarOpen`, `snackbarMessage`のStateを追加
- [ ] `handleCopyPropertyNumber`関数を実装
- [ ] `handleSnackbarClose`関数を実装
- [ ] 物件番号セクションを修正（コピーボタン、atbb_status追加）
- [ ] スナックバーコンポーネントを追加
- [ ] `ContentCopyIcon`, `Snackbar`をimport

### ステアリングドキュメント
- [ ] `.kiro/steering/README.md`を更新
- [ ] 売主関連ドキュメントに`inclusion: manual`を追加
- [ ] 物件関連ドキュメントに`inclusion: manual`を追加（既存）
- [ ] エリアマッピング関連ドキュメントに`inclusion: manual`を追加

### テスト
- [ ] 物件番号のコピー機能をテスト
- [ ] atbb_statusの表示をテスト
- [ ] スナックバーの表示をテスト
- [ ] ステアリングドキュメントの読み込みをテスト

---

## 🔄 ロールバック計画

### 問題が発生した場合
1. Gitで前のコミットに戻す
2. Vercelで前のデプロイメントにロールバック

### 影響範囲
- **フロントエンド**: `PropertyInfoCard.tsx`のみ
- **バックエンド**: 変更なし
- **データベース**: 変更なし

---

## 📚 関連ドキュメント

- `.kiro/specs/buyer-list-property-card-enhancement/requirements.md` - 要件定義書
- `.kiro/steering/buyer-table-column-definition.md` - 買主テーブルのカラム定義
- `.kiro/steering/buyer-property-card-sync-rule.md` - 物件詳細カード同期ルール
- `frontend/src/components/PropertyInfoCard.tsx` - 物件情報カードコンポーネント

---

**作成日**: 2026年2月6日  
**作成理由**: 買主リストの物件情報カード改善の詳細設計を定義するため
