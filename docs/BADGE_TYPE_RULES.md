# バッジタイプ判定ルール

## 概要

公開物件サイトで表示される物件のバッジタイプは、`atbb_status`（atbb成約済み/非公開）の値に基づいて判定されます。

## 判定ロジック

### バックエンド実装

`PropertyListingService.ts`の`getBadgeType`メソッドで判定されます。

```typescript
private getBadgeType(atbbStatus: string | null): string {
  // 空欄（null、空文字列）の場合は'sold'（成約済み、グレーマーカー）
  if (!atbbStatus || atbbStatus === '') return 'sold';
  // "ステータスなし"の場合も'sold'（成約済み、グレーマーカー）
  if (atbbStatus === 'ステータスなし') return 'sold';
  if (atbbStatus.includes('公開中')) return 'none';
  if (atbbStatus.includes('公開前')) return 'pre_release';
  if (atbbStatus.includes('非公開（配信メールのみ）')) return 'email_only';
  // "非公開案件"、"成約済み" and all other cases return 'sold'
  return 'sold';
}
```

## 判定ルール一覧

| atbb_statusの値 | badge_type | マーカー色 | バッジ表示 | 説明 |
|----------------|-----------|----------|----------|------|
| `null`（空欄） | `sold` | グレー (#9e9e9e) | 成約済み | データベースでnull |
| 空文字列 `""` | `sold` | グレー (#9e9e9e) | 成約済み | 空の文字列 |
| `"ステータスなし"` | `sold` | グレー (#9e9e9e) | 成約済み | 成約済み物件として扱う |
| `"公開中"` | `none` | 青 (#2196F3) | バッジなし | 販売中物件 |
| `"公開前"` | `pre_release` | オレンジ (#ff9800) | 公開前情報 | 準備中の物件 |
| `"非公開（配信メールのみ）"` | `email_only` | 赤 (#f44336) | 非公開物件 | メール配信のみ |
| `"成約済み"` | `sold` | グレー (#9e9e9e) | 成約済み | 成約済み物件 |
| `"非公開案件"` | `sold` | グレー (#9e9e9e) | 成約済み | 非公開案件 |
| その他 | `sold` | グレー (#9e9e9e) | 成約済み | デフォルト |

## バッジタイプの意味

### `none` - バッジなし（青マーカー）
- 販売中の物件
- 通常の公開物件
- クリック可能
- 詳細ページ表示可能

### `pre_release` - 公開前情報（オレンジマーカー）
- 準備中の物件
- 近日公開予定
- クリック可能
- 詳細ページ表示可能

### `email_only` - 非公開物件（赤マーカー）
- メール配信のみの物件
- 一般公開されていない
- クリック可能
- 詳細ページ表示可能

### `sold` - 成約済み（グレーマーカー）
- 成約済みの物件
- 非公開案件
- atbb_statusが空欄の物件
- クリック可能
- 詳細ページ表示可能

## クリック可能性

現在の実装では、**すべての物件がクリック可能**です（`isPropertyClickable`メソッドは常に`true`を返す）。

```typescript
private isPropertyClickable(atbbStatus: string | null): boolean {
  // すべての物件をクリック可能にする
  return true;
}
```

## フロントエンド表示

### 地図ビュー
- マーカーの色は`badge_type`に基づいて決定
- `PropertyMapView.tsx`の`getMarkerColor`関数で色を取得

### リストビュー
- バッジは`badge_type`が`'none'`以外の場合に表示
- `StatusBadge`コンポーネントで表示

## 注意事項

### 空欄とステータスなしの違い

- **空欄（null、空文字列）**: 成約済みとして扱う（グレーマーカー）
- **"ステータスなし"**: 成約済みとして扱う（グレーマーカー）

**重要**: 空欄と「ステータスなし」は同じ扱いになります。どちらも成約済み物件として表示されます。

### 変更履歴

- **2025-01-21**: 空欄の物件を成約済み扱いに変更（以前は販売中扱い）
- **2025-01-21**: "ステータスなし"を成約済み扱いに変更（以前は販売中扱い）
- **重要**: 空欄と「ステータスなし」は同じ扱い（どちらもグレーマーカー）

## 関連ファイル

- `backend/src/services/PropertyListingService.ts` - バッジタイプ判定ロジック
- `frontend/src/components/PropertyMapView.tsx` - 地図マーカー色の決定
- `frontend/src/components/StatusBadge.tsx` - バッジ表示コンポーネント
- `frontend/src/utils/atbbStatusDisplayMapper.ts` - atbb_status表示マッピング
