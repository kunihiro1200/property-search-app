# Implementation Plan

## Overview

画像が本文の最後に配置されてしまう問題を解決するため、バックエンドの画像処理ロジックをリファクタリングします。主な変更点は、画像のdata:image URLをCID参照に変換する際に、その場で置換することで位置を保持することです。

## Tasks

- [x] 1. バックエンド: EmailService.supabase.tsのリファクタリング


  - sendEmailWithImages()メソッドを修正して、in-place replacementを実装
  - 画像を抽出しながら、同時にCID参照に置き換える
  - 処理済みHTMLをシンプルなテンプレートでラップ
  - _Requirements: 2.2, 2.3, 2.4_



- [ ] 1.1 wrapInEmailTemplate()ヘルパーメソッドを追加
  - 処理済みHTMLを最小限のHTMLテンプレートでラップ
  - 構造を変更せず、スタイルのみを追加


  - _Requirements: 2.4, 3.3_

- [x] 1.2 generateHtmlBodyWithImages()メソッドを削除


  - 署名検出や画像再配置のロジックを含む古いメソッドを削除
  - このメソッドへの参照をすべて削除
  - _Requirements: 3.1, 3.2_



- [ ] 1.3 sendTemplateEmail()メソッドを更新
  - sendEmailWithImages()と同じin-place replacementロジックを使用
  - コードの重複を避けるため、共通ロジックを抽出することを検討


  - _Requirements: 2.2, 2.3_

- [ ] 1.4 詳細なログ出力を追加
  - 画像検出時のログ
  - 各画像の抽出・置換時のログ
  - 処理済みHTMLのプレビューログ
  - エラー時の詳細なログ
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 2. エラーハンドリングの改善
  - 画像サイズ超過時の適切な処理
  - Base64デコードエラー時の処理
  - 処理失敗時も他の画像の処理を継続
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 3. テストの実装
  - In-place replacementのロジックをテスト
  - 複数画像の順序保持をテスト
  - テキストと画像の位置関係をテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x]* 3.1 単体テストの作成


  - 単一画像の位置保持テスト
  - 複数画像の順序保持テスト
  - テキスト周辺の画像位置テスト
  - エラー時の処理継続テスト




- [ ]* 3.2 統合テストの作成
  - 先頭に画像がある場合のE2Eテスト
  - 中間に画像がある場合のE2Eテスト
  - 末尾に画像がある場合のE2Eテスト
  - 複数画像の位置保持E2Eテスト

- [ ] 4. 手動テストとデバッグ
  - 実際のメールクライアントで画像位置を確認
  - 様々な位置に画像を配置してテスト
  - エッジケースのテスト（大きな画像、多数の画像など）
  - _Requirements: 1.5, 5.4_

- [ ] 5. ドキュメントの更新
  - IMPLEMENTATION_COMPLETE.mdを更新
  - コード内のコメントを追加
  - 実装完了の記録

## Implementation Notes

### Key Implementation Details

1. **In-place Replacement Pattern**:
```typescript
processedBody = processedBody.replace(
  /<img([^>]*)src="data:image\/([^;]+);base64,([^"]+)"([^>]*)>/gi,
  (fullMatch, beforeSrc, mimeType, base64Data, afterSrc) => {
    // Extract image data
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const cid = `image-${imageIndex}`;
    
    // Store for attachment
    inlineImages.push({ filename, mimeType, data: imageBuffer, cid });
    
    // Replace with CID reference at exact same position
    return `<img${beforeSrc}src="cid:${cid}"${afterSrc}>`;
  }
);
```

2. **Simple HTML Wrapping**:
```typescript
const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.6; color: #333; }
    img { max-width: 100%; height: auto; display: block; margin: 10px 0; }
  </style>
</head>
<body>
  ${processedBody}
</body>
</html>`;
```

3. **Error Handling**:
```typescript
try {
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  if (imageBuffer.length > MAX_SIZE) {
    console.warn(`Skipping image: too large`);
    return fullMatch; // Keep original tag
  }
  
  // Process image...
} catch (error) {
  console.error(`Error processing image:`, error);
  return fullMatch; // Keep original tag on error
}
```

### Testing Checklist

- [ ] 画像を本文の先頭に配置してテスト
- [ ] 画像を本文の中間に配置してテスト
- [ ] 画像を本文の末尾に配置してテスト
- [ ] 複数の画像を異なる位置に配置してテスト
- [ ] 画像の前後にテキストがある場合をテスト
- [ ] 大きな画像（5MB超）をテスト
- [ ] 多数の画像（10枚以上）をテスト
- [ ] Gmail、Outlook、モバイルクライアントで確認

