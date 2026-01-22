# Email Inline Image Implementation - Complete

## 実装完了サマリー

メール内の画像を任意の位置に配置できるようにする機能の実装が完了しました。

## 実装内容

### 1. InlineImageProcessor サービス
**ファイル**: `backend/src/services/InlineImageProcessor.ts`

HTML内のインライン画像を検出・処理するサービス:
- Data URLからバイナリデータへの変換
- 一意なContent-IDの生成
- Data URLとCID参照の切り替えロジック
- 画像サイズの検証（個別5MB、合計10MB制限）

### 2. EmailService の更新
**ファイル**: `backend/src/services/EmailService.ts`

インライン画像対応のメール送信機能:
- `createMultipartRelatedMessage()`: multipart/related MIME構造でCID参照を使用
- `createHtmlMessageWithDataUrls()`: Data URLを直接埋め込み
- `sendEmailWithImages()`: 画像サイズに応じて最適な方式を選択

**MIME構造**:
```
multipart/related
├── multipart/alternative
│   ├── text/plain (フォールバック)
│   └── text/html (CID参照付き)
└── image/* (Content-ID付きインライン画像)
```

### 3. EmailPreview コンポーネント
**ファイル**: `frontend/src/components/EmailPreview.tsx`

メール送信前のプレビュー機能:
- HTML内容の正確な表示
- CID参照のプレースホルダー表示
- 画像読み込みエラーの処理

### 4. EmailSizeMonitor コンポーネント
**ファイル**: `frontend/src/components/EmailSizeMonitor.tsx`

メールサイズの監視とフィードバック:
- リアルタイムサイズ計算
- 警告表示（80%で警告、95%でエラー）
- 推奨アクションの提示

## 使用方法

### バックエンド

```typescript
import { EmailService } from './services/EmailService';

const emailService = new EmailService();

// インライン画像付きメールを送信
await emailService.sendEmailWithImages({
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'テストメール',
  body: '<p>こんにちは</p><img src="data:image/png;base64,..." />',
  sellerId: 'seller-123',
  sellerNumber: 'AA12345',
});
```

### フロントエンド

```tsx
import EmailPreview from './components/EmailPreview';
import EmailSizeMonitor from './components/EmailSizeMonitor';

// プレビュー表示
<EmailPreview html={emailHtml} />

// サイズ監視
<EmailSizeMonitor html={emailHtml} />
```

## 技術仕様

### 画像埋め込み方式の選択

- **Data URL方式** (合計 < 2MB):
  - 画像をbase64エンコードしてHTML内に直接埋め込み
  - シンプルで互換性が高い
  - 小さい画像に最適

- **CID参照方式** (合計 >= 2MB):
  - multipart/related構造を使用
  - 画像を別パートとして添付し、Content-IDで参照
  - 大きい画像でもパフォーマンスが良い

### サイズ制限

- 個別画像: 最大5MB
- 合計メールサイズ: 最大10MB
- Base64オーバーヘッド: 約33%を考慮

### エラーハンドリング

すべてのエラーメッセージは日本語で表示:
- `画像サイズが5MBを超えています`
- `合計画像サイズが10MBを超えています`
- `画像の読み込みに失敗しました`

## 後方互換性

既存の添付ファイル方式も保持:
- `sendEmailWithAttachments()`: 従来の添付ファイル方式
- `sendEmailWithImages()`: 新しいインライン画像方式

## テスト

### 手動テスト項目

1. **画像位置の保持**
   - 画像を本文の任意の位置に貼り付け
   - メール送信後、同じ位置に表示されることを確認

2. **複数画像**
   - 複数の画像を異なる位置に配置
   - 相対的な位置関係が保持されることを確認

3. **サイズ制限**
   - 5MB超の画像を貼り付け → エラー表示を確認
   - 合計10MB超の画像を貼り付け → エラー表示を確認

4. **メールクライアント互換性**
   - Gmail, Outlook, Apple Mailで表示確認
   - 画像が正しく表示されることを確認

## 既知の制限事項

1. **CID参照のプレビュー**
   - プレビューではCID参照画像はプレースホルダーとして表示
   - 実際のメールでは正しく表示される

2. **メールクライアントの制限**
   - 一部の古いメールクライアントではData URLがサポートされない可能性
   - その場合はプレーンテキスト版が表示される

## 今後の改善案

1. **画像圧縮**
   - 自動的に画像を圧縮してサイズを削減
   - ユーザーが圧縮レベルを選択可能に

2. **プログレッシブ読み込み**
   - 大きい画像を段階的に読み込み
   - ユーザー体験の向上

3. **画像最適化の提案**
   - サイズが大きい画像に対して最適化を提案
   - ワンクリックで最適化を実行

## 関連ファイル

- `backend/src/services/InlineImageProcessor.ts`
- `backend/src/services/EmailService.ts`
- `frontend/src/components/EmailPreview.tsx`
- `frontend/src/components/EmailSizeMonitor.tsx`
- `frontend/src/components/RichTextEmailEditor.tsx`

## 参考資料

- [RFC 2387 - The MIME Multipart/Related Content-type](https://tools.ietf.org/html/rfc2387)
- [RFC 2047 - MIME Part Three: Message Header Extensions](https://tools.ietf.org/html/rfc2047)
- [Data URLs - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs)
