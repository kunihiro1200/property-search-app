import { PastedImage } from '../types';

/**
 * メール本文と貼り付けた画像からHTMLメールを生成
 * 
 * 画像は本文内の[画像1]、[画像2]などのプレースホルダーに置き換えられます。
 * プレースホルダーがない場合は、署名の前に追加されます。
 */
export const generateEmailHtmlWithImages = (
  bodyText: string,
  pastedImages: PastedImage[]
): string => {
  let processedBody = bodyText;

  // 画像のプレースホルダー（[画像1]、[画像2]など）を実際の画像タグに置き換える
  const usedImages = new Set<number>();
  
  pastedImages.forEach((image, index) => {
    const placeholder = `[画像${index + 1}]`;
    const imageHtml = `<div style="margin: 15px 0;">
  <img 
    src="${image.dataUrl}" 
    alt="${image.name}"
    style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; display: block;"
  />
</div>`;
    
    if (processedBody.includes(placeholder)) {
      processedBody = processedBody.replace(placeholder, imageHtml);
      usedImages.add(index);
    }
  });

  // プレースホルダーで使用されなかった画像を署名の前に挿入
  const unusedImages = pastedImages.filter((_, index) => !usedImages.has(index));
  
  if (unusedImages.length > 0) {
    // 署名を検出（一般的な署名パターン）
    const signaturePatterns = [
      /\n--\s*\n/,  // -- で始まる署名
      /\n━+\s*\n/,  // 罫線で始まる署名
      /\n─+\s*\n/,  // 罫線で始まる署名
      /\n＿+\s*\n/,  // アンダーバーで始まる署名
      /\n\s*よろしくお願い(?:いたし|し)ます[。\s]*\n/,  // 「よろしくお願いします」の後
    ];
    
    let signatureIndex = -1;
    for (const pattern of signaturePatterns) {
      const match = processedBody.match(pattern);
      if (match && match.index !== undefined) {
        signatureIndex = match.index;
        break;
      }
    }
    
    // 画像HTMLを生成
    const imagesHtml = unusedImages.map((image) => {
      return `<div style="margin: 15px 0;">
  <img 
    src="${image.dataUrl}" 
    alt="${image.name}"
    style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; display: block;"
  />
</div>`;
    }).join('\n');
    
    if (signatureIndex !== -1) {
      // 署名の前に画像を挿入
      processedBody = 
        processedBody.substring(0, signatureIndex) + 
        '\n\n' + imagesHtml + '\n' +
        processedBody.substring(signatureIndex);
    } else {
      // 署名が見つからない場合は本文の最後に追加
      processedBody += '\n\n' + imagesHtml;
    }
  }

  // 本文をHTMLに変換（改行を<br>に変換）
  // 画像HTMLブロックを一時的に保護
  const imageBlocks: string[] = [];
  const imageBlockPlaceholder = '___IMAGE_BLOCK___';
  
  let protectedBody = processedBody.replace(
    /<div style="margin: 15px 0;">[\s\S]*?<\/div>/g,
    (match) => {
      imageBlocks.push(match);
      return `${imageBlockPlaceholder}${imageBlocks.length - 1}${imageBlockPlaceholder}`;
    }
  );

  // 改行を<br>に変換
  const htmlBody = protectedBody
    .split('\n')
    .map(line => line || '&nbsp;') // 空行を保持
    .join('<br>\n');

  // 画像ブロックを復元
  let finalHtml = htmlBody;
  imageBlocks.forEach((block, index) => {
    finalHtml = finalHtml.replace(
      `${imageBlockPlaceholder}${index}${imageBlockPlaceholder}`,
      block
    );
  });
  
  // <br>タグの直前直後の画像ブロックを整形
  finalHtml = finalHtml.replace(/<br>\s*(<div style="margin: 15px 0;">)/g, '$1');
  finalHtml = finalHtml.replace(/(<\/div>)\s*<br>/g, '$1');

  // 基本的なHTMLメール構造
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  ${finalHtml}
</body>
</html>`;

  return html;
};

/**
 * プレーンテキストメール本文を生成（HTMLメールが表示できない場合のフォールバック）
 */
export const generatePlainTextEmail = (
  bodyText: string,
  pastedImages: PastedImage[]
): string => {
  let plainText = bodyText;

  if (pastedImages.length > 0) {
    plainText += '\n\n---\n';
    plainText += `添付画像: ${pastedImages.length}枚\n`;
    pastedImages.forEach((image, index) => {
      plainText += `${index + 1}. ${image.name} (${image.width}×${image.height})\n`;
    });
  }

  return plainText;
};

/**
 * RichTextEmailEditorから取得したHTMLコンテンツをメール用HTMLに変換
 * 
 * @param editorHtml - contentEditableから取得したHTML
 * @returns メール送信用の完全なHTML
 */
export const generateEmailHtmlFromEditor = (editorHtml: string): string => {
  // 基本的なHTMLメール構造でラップ
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${editorHtml}
</body>
</html>`;

  return html;
};

/**
 * HTMLからプレーンテキストを抽出（フォールバック用）
 * 
 * @param html - HTML文字列
 * @returns プレーンテキスト
 */
export const extractPlainTextFromHtml = (html: string): string => {
  // HTMLタグを削除
  let text = html.replace(/<[^>]*>/g, '');
  
  // HTML エンティティをデコード
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // 改行を整理
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
};
