---
inclusion: always
---

# atbb_status（atbb成約済み/非公開）の判定ルール

## ⚠️ 重要：このルールを必ず守ってください

このファイルは、`atbb_status`カラムの値に基づくバッジタイプとマーカー色の判定ルールを定義しています。
**このルールを変更する場合は、必ずユーザーに確認してください。**

## 判定ルール

### バッジタイプとマーカー色の対応

| atbb_statusの値 | badge_type | マーカー色 | 説明 |
|----------------|-----------|----------|------|
| `null`（空欄） | `sold` | グレー (#9e9e9e) | 成約済み物件 |
| 空文字列 `""` | `sold` | グレー (#9e9e9e) | 成約済み物件 |
| `"ステータスなし"` | `sold` | グレー (#9e9e9e) | **成約済み物件として扱う** |
| `"公開中"` | `none` | 青 (#2196F3) | 販売中物件 |
| `"公開前"` | `pre_release` | オレンジ (#ff9800) | 準備中の物件 |
| `"非公開（配信メールのみ）"` | `email_only` | 赤 (#f44336) | メール配信のみ |
| `"成約済み"` | `sold` | グレー (#9e9e9e) | 成約済み物件 |
| `"非公開案件"` | `sold` | グレー (#9e9e9e) | 非公開案件 |
| その他 | `sold` | グレー (#9e9e9e) | デフォルト |

## 重要なポイント

### 1. 「ステータスなし」は成約済み扱い

**「ステータスなし」は成約済み物件として扱います（グレーマーカー）。**

これは、ユーザーの明示的な要求に基づく仕様です。

### 2. 空欄と「ステータスなし」は同じ扱い

- **空欄（null、空文字列）**: 成約済み（グレーマーカー）
- **"ステータスなし"**: 成約済み（グレーマーカー）

どちらも同じ扱いになります。

### 3. 販売中物件は「公開中」のみ

販売中物件（青マーカー）として表示されるのは、`atbb_status`が「公開中」の場合のみです。

## 実装箇所

### バックエンド

`backend/src/services/PropertyListingService.ts`の`getBadgeType`メソッド:

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

### フロントエンド

`frontend/src/components/PropertyMapView.tsx`の`getMarkerColor`関数で、`badge_type`に基づいてマーカーの色を決定します。

## テスト方法

```bash
cd backend
npx tsx test-ee2-badge-type.ts
```

このテストスクリプトは、EE2物件（`atbb_status`が「ステータスなし」）が正しくグレーマーカーになることを確認します。

## 変更履歴

- **2025-01-21**: 「ステータスなし」を成約済み扱いに変更（ユーザー要求）
- **2025-01-21**: 空欄の物件を成約済み扱いに変更
- **重要**: 空欄と「ステータスなし」は同じ扱い（どちらもグレーマーカー）

## 関連ドキュメント

- `docs/BADGE_TYPE_RULES.md` - 詳細なバッジタイプ判定ルール
- `backend/test-ee2-badge-type.ts` - テストスクリプト

## 注意事項

**このルールを変更する場合は、必ずユーザーに確認してください。**

特に「ステータスなし」の扱いは、ユーザーの明示的な要求に基づいているため、勝手に変更しないでください。
