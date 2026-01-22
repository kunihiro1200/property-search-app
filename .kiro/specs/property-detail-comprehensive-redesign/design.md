# Design Document

## Overview

物件詳細ページの包括的な再設計を行います。主な変更点は以下の通りです:

1. ヘッダーに重要情報（所在地、種別、現況、担当）を追加
2. 価格情報セクションを現在の67%に縮小
3. 特記・備忘録セクションを拡大し、フォントサイズを増加
4. 所有者の状況セクションを削除
5. セクション順序を最適化
6. 地図・URL情報セクションを改善（GoogleMap、SUUMO、格納先URLを表示）
7. よく聞かれる項目、内覧情報、売主買主情報に編集機能を追加

## Architecture

### Component Structure

```
PropertyListingDetailPage (既存)
├── PropertyHeader (新規)
│   ├── 所在地
│   ├── 種別
│   ├── 現況
│   └── 担当
├── PriceAndNotesRow (新規レイアウト)
│   ├── PriceSection (既存 - 幅を33%に変更)
│   └── NotesSection (新規 - 幅を67%に変更)
├── FrequentlyAskedSection (既存 - 編集機能追加)
├── ViewingInfoSection (既存 - 編集機能追加)
├── BasicInfoSection (既存)
├── MapAndUrlsSection (新規)
│   ├── GoogleMapのURL表示
│   ├── SUUMOのURL表示
│   └── 格納先URL表示
├── PropertyDetailsSection (既存)
├── SellerBuyerInfoSection (既存 - 編集機能追加)
└── CommissionInfoSection (既存)
```

## Components and Interfaces

### 1. PropertyHeader Component

新規コンポーネント。ページ上部に物件の重要情報を表示します。

```typescript
interface PropertyHeaderProps {
  address?: string;
  propertyType?: string;
  currentStatus?: string;
  salesAssignee?: string;
}
```

**実装詳細:**
- Material-UIのBoxとTypographyを使用
- 4つの情報を横並びで表示
- レスポンシブ対応（小画面では2列表示）

### 2. PriceSection Component (既存を修正)

価格情報セクションの幅を33%に変更します。

**変更点:**
- 親コンテナの`flex`プロパティを`0 0 33%`に設定
- `maxWidth`を`400px`に設定
- フォントサイズを若干縮小して情報を収める

### 3. NotesSection Component (新規)

特記・備忘録セクションを独立したコンポーネントとして作成します。

```typescript
interface NotesSectionProps {
  specialNotes?: string;
  memo?: string;
  onFieldChange: (field: string, value: any) => void;
  editedData: Record<string, any>;
}
```

**実装詳細:**
- 幅を67%に設定（`flex: 0 0 67%`、`maxWidth: 800px`）
- フォントサイズを18pxに増加
- 背景色を`#fff9e6`（薄い黄色）に設定
- 特記と備忘録を縦に配置
- 各フィールドに3行のTextFieldを使用

### 4. ViewingInfoSection Component (既存を修正)

内覧情報セクションに編集機能を追加します。

```typescript
interface ViewingInfoSectionProps {
  data: PropertyListing;
  editedData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  isEditMode: boolean;
  onEditToggle: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}
```

**変更点:**
- `EditableSection`コンポーネントでラップ
- 編集モード時のみフィールドを編集可能に
- 空欄の場合は表示モードで非表示、編集モードで表示

### 5. SellerBuyerInfoSection Component (既存を修正)

売主買主情報セクションに編集機能を追加します。

```typescript
interface SellerBuyerInfoSectionProps {
  data: PropertyListing;
  editedData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  isEditMode: boolean;
  onEditToggle: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}
```

**変更点:**
- `EditableSection`コンポーネントでラップ
- 編集モード時のみフィールドを編集可能に
- 空欄の場合は表示モードで非表示、編集モードで表示

### 6. MapAndUrlsSection Component (新規)

地図とURL情報を表示する新しいセクションです。

```typescript
interface MapAndUrlsSectionProps {
  googleMapUrl?: string;
  suumoUrl?: string;
  storageUrl?: string;
}
```

**実装詳細:**
- セクションタイトル: 「地図、サイトURL等」
- GoogleMapのURL: フルURLをテキストとして表示し、リンク化
- SUUMOのURL: フルURLをテキストとして表示し、リンク化
- 格納先URL: フルURLをテキストとして表示し、リンク化
- 各URLは`target="_blank"`で新しいタブで開く
- URLがない場合は該当項目を非表示

## Data Models

### PropertyListing Interface (既存に追加)

```typescript
interface PropertyListing {
  // 既存フィールド...
  
  // 新規追加フィールド
  suumo_url?: string;  // SUUMOのURL
  storage_url?: string; // 格納先URL（物件依頼の中にある）
}
```

## Error Handling

- 編集機能のエラーハンドリングは既存の`EditableSection`パターンに従う
- 保存失敗時はSnackbarでエラーメッセージを表示
- キャンセル時は編集内容を破棄

## Testing Strategy

### Unit Tests

1. **PropertyHeader Component**
   - 全ての情報が正しく表示されることを確認
   - 情報が欠けている場合に「-」が表示されることを確認

2. **NotesSection Component**
   - 特記と備忘録が正しく表示されることを確認
   - フォントサイズが18pxであることを確認
   - 編集時に値が正しく更新されることを確認

3. **MapAndUrlsSection Component**
   - 各URLが正しく表示されることを確認
   - リンクが正しく機能することを確認
   - URLがない場合に非表示になることを確認

4. **ViewingInfoSection & SellerBuyerInfoSection**
   - 編集モードの切り替えが正しく動作することを確認
   - 保存機能が正しく動作することを確認
   - 空欄フィールドの表示/非表示が正しく動作することを確認

## Performance Considerations

- 既存のコンポーネント構造を最大限活用し、新規コンポーネントは最小限に
- レンダリングパフォーマンスへの影響を最小化するため、メモ化を適切に使用
- 編集モードの状態管理は既存パターンに従う

## Accessibility

- 全てのフォームフィールドに適切なラベルを設定
- キーボードナビゲーションをサポート
- スクリーンリーダーに対応したARIA属性を使用

## Browser Compatibility

- Chrome, Firefox, Safari, Edgeの最新版をサポート
- Material-UIのブラウザサポートに準拠

## Security Considerations

- XSS攻撃を防ぐため、URLの表示時にサニタイズを実施
- 編集機能は認証済みユーザーのみ利用可能
- APIリクエストは既存の認証メカニズムを使用
