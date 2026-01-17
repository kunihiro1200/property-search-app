# Gmail Template Selection Implementation Summary

## 実装完了

買主詳細ページのGmail送信機能を改善し、テンプレート選択、物件選択、プレースホルダー置換、送信履歴記録の機能を実装しました。

## 完了したタスク

### 1. データベーススキーマの拡張 ✅
- `email_history`テーブルに`template_id`と`template_name`カラムを追加
- マイグレーションファイル作成: `061_add_template_fields_to_email_history.sql`

### 2. バックエンド実装 ✅

#### 型定義
- `backend/src/types/emailTemplate.ts` - EmailTemplate, PropertyData, BuyerData, MergedEmailContent等の型定義

#### サービス
- `EmailTemplateService` - テンプレート管理とプレースホルダー置換
  - `getTemplates()` - 全テンプレート取得
  - `getTemplateById()` - 特定テンプレート取得
  - `mergePlaceholders()` - プレースホルダー置換
  - `validatePlaceholders()` - プレースホルダー検証
  - `getTemplatePreview()` - サンプルデータでプレビュー生成

- `EmailHistoryService` - 拡張完了
  - `template_id`と`template_name`のサポート追加

#### テンプレートデータ
- `backend/src/config/emailTemplates.ts` - 3つの初期テンプレート
  - 問合せ返信テンプレート
  - 内覧案内テンプレート
  - フォローアップテンプレート

#### API エンドポイント
- `GET /api/email-templates` - 全テンプレート取得
- `GET /api/email-templates/:templateId` - 特定テンプレート取得
- `GET /api/email-templates/:templateId/preview` - プレビュー取得
- `POST /api/email-templates/:templateId/merge` - テンプレートとデータのマージ

### 3. フロントエンド実装 ✅

#### 型定義
- `frontend/src/types/emailTemplate.ts` - フロントエンド用の型定義

#### コンポーネント

1. **BuyerGmailSendButton** (`frontend/src/components/BuyerGmailSendButton.tsx`)
   - 問合せ履歴が1件以上ある場合に表示
   - 単一問合せ: 自動で物件選択 → テンプレート選択
   - 複数問合せ: 物件選択 → テンプレート選択
   - 完全なフロー統合

2. **TemplateSelectionModal** (`frontend/src/components/TemplateSelectionModal.tsx`)
   - テンプレート一覧表示
   - サンプルデータでのプレビュー表示
   - エラーハンドリングとリトライ機能

3. **PropertySelectionModal** (`frontend/src/components/PropertySelectionModal.tsx`)
   - 複数物件からの選択
   - デフォルト物件の自動選択
   - 物件情報の詳細表示

4. **BuyerEmailCompositionModal** (`frontend/src/components/BuyerEmailCompositionModal.tsx`)
   - マージされたテンプレートの表示
   - 送信前の編集機能
   - 送信処理とエラーハンドリング

### 4. 実装された機能

#### 単一問合せフロー ✅
1. Gmail送信ボタンクリック
2. 自動的に物件を選択
3. テンプレート選択モーダル表示
4. テンプレート選択
5. プレースホルダー置換
6. メール作成モーダル表示
7. 送信

#### 複数問合せフロー ✅
1. Gmail送信ボタンクリック
2. 物件選択モーダル表示
3. 物件選択
4. テンプレート選択モーダル表示
5. テンプレート選択
6. プレースホルダー置換
7. メール作成モーダル表示
8. 送信

#### プレースホルダー置換 ✅
- `{{buyerName}}` - 買主名
- `{{email}}` - メールアドレス
- `{{propertyNumber}}` - 物件番号
- `{{propertyAddress}}` - 物件住所
- `{{price}}` - 価格（カンマ区切り）
- `{{landArea}}` - 土地面積
- `{{buildingArea}}` - 建物面積
- `{{propertyType}}` - 物件種別

#### エラーハンドリング ✅
- テンプレート読み込みエラー → リトライボタン表示
- プレースホルダー検証エラー → エラーメッセージ表示
- メール送信エラー → エラーメッセージとリトライ
- ローディング状態の表示
- 成功通知の表示

## 次のステップ

### 統合作業
1. BuyerDetailPageにBuyerGmailSendButtonを追加
2. Gmail API経由での実際のメール送信実装
3. 送信者アドレスの選択機能統合

### テスト（オプション）
- プロパティベーステスト
- 統合テスト
- E2Eテスト

### UI調整（オプション）
- レスポンシブデザインの確認
- アクセシビリティの確認
- ユーザビリティの改善

## 使用方法

### BuyerDetailPageへの統合例

```tsx
import BuyerGmailSendButton from '../components/BuyerGmailSendButton';

// In BuyerDetailPage component:
<BuyerGmailSendButton
  buyerId={buyer.id}
  buyerEmail={buyer.email}
  buyerName={buyer.name}
  inquiryHistory={inquiryHistoryTable}
  defaultPropertyId={propertyIdFromRoute} // Optional
  variant="contained"
  size="medium"
/>
```

### テンプレートの追加方法

`backend/src/config/emailTemplates.ts`に新しいテンプレートを追加:

```typescript
{
  id: 'new-template',
  name: '新しいテンプレート',
  description: 'テンプレートの説明',
  subject: '件名 {{propertyNumber}}',
  body: `本文...`,
  placeholders: ['{{buyerName}}', '{{propertyNumber}}']
}
```

## 技術的な詳細

### プレースホルダー置換ロジック
- 正規表現を使用して全てのプレースホルダーを検索
- データマップから対応する値を取得
- 数値は自動的にカンマ区切りでフォーマット
- 日付は日本語形式でフォーマット
- 欠損値は空文字列に置換

### エラーハンドリング戦略
- 各モーダルで独立したエラー状態管理
- リトライ機能の提供
- ユーザーフレンドリーなエラーメッセージ
- 非同期処理の適切な処理

### 状態管理
- React hooksを使用したローカル状態管理
- モーダルの開閉状態
- 選択されたテンプレートと物件
- マージされたコンテンツ
- ローディングとエラー状態

## 注意事項

1. **Gmail API統合**: 現在はメール履歴への保存のみ実装。実際のGmail送信は別途実装が必要。

2. **送信者アドレス**: 現在はハードコードされた値を使用。認証コンテキストから取得する必要がある。

3. **マイグレーション実行**: データベーススキーマ変更のため、マイグレーション061を実行する必要がある。

```bash
cd backend
npx ts-node migrations/run-061-migration.ts
```

4. **テンプレートのカスタマイズ**: プレースホルダーを追加する場合は、EmailTemplateServiceのcreateDat aMap()メソッドも更新が必要。
