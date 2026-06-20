/**
 * InlineImageProcessor
 * 
 * Processes inline images in HTML content for email sending.
 * Handles conversion between Data URLs and CID references.
 */

export interface InlineImage {
  id: string;              // Unique identifier for CID reference
  dataUrl: string;         // Original data URL from editor
  mimeType: string;        // Image MIME type (image/jpeg, image/png, etc.)
  data: Buffer;            // Binary image data
  size: number;            // Size in bytes
  position: number;        // Position in HTML (for ordering)
}

export interface ProcessedHtml {
  html: string;                    // HTML with CID references or Data URLs
  inlineImages: InlineImage[];     // Array of inline images to embed
  totalSize: number;               // Total size of all images
  useDataUrls: boolean;            // Whether to use Data URLs vs CID
}

export class InlineImageProcessor {
  private static readonly DATAURL_SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB
  private static readonly MAX_INDIVIDUAL_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_TOTAL_EMAIL_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly BASE64_OVERHEAD = 1.33; // Base64 is ~33% larger

  /**
   * Process HTML content and extract inline images
   */
  processHtmlWithImages(html: string): ProcessedHtml {
    const inlineImages: InlineImage[] = [];
    let totalSize = 0;
    let position = 0;

    // Regular expression to find img tags with data URLs
    const imgRegex = /<img[^>]+src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const dataUrl = match[1];
      
      try {
        // Convert data URL to buffer
        const { buffer, mimeType } = this.dataUrlToBuffer(dataUrl);
        const size = buffer.length;

        // Validate individual image size
        if (size > InlineImageProcessor.MAX_INDIVIDUAL_IMAGE_SIZE) {
          throw new Error(`画像サイズが5MBを超えています: ${(size / 1024 / 1024).toFixed(2)}MB`);
        }

        // Generate unique Content-ID
        const id = this.generateContentId();

        inlineImages.push({
          id,
          dataUrl,
          mimeType,
          data: buffer,
          size,
          position: match.index,
        });

        totalSize += size;
      } catch (error) {
        console.error('Failed to process inline image:', error);
        // Continue processing other images
      }

      position++;
    }

    // Validate total email size (accounting for base64 overhead)
    const estimatedTotalSize = totalSize * InlineImageProcessor.BASE64_OVERHEAD;
    if (estimatedTotalSize > InlineImageProcessor.MAX_TOTAL_EMAIL_SIZE) {
      throw new Error(
        `合計画像サイズが10MBを超えています: ${(estimatedTotalSize / 1024 / 1024).toFixed(2)}MB / 10MB`
      );
    }

    // Determine whether to use Data URLs or CID references
    const useDataUrls = this.shouldUseDataUrls(totalSize);

    // Replace data URLs with CID references if needed
    let processedHtml = html;
    if (!useDataUrls && inlineImages.length > 0) {
      processedHtml = this.replaceDataUrlsWithCids(html, inlineImages);
    }

    return {
      html: processedHtml,
      inlineImages,
      totalSize,
      useDataUrls,
    };
  }

  /**
   * Convert data URL to binary data
   */
  dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
    // Validate data URL format
    const dataUrlPattern = /^data:(image\/[a-zA-Z]+);base64,(.+)$/;
    const match = dataUrl.match(dataUrlPattern);

    if (!match) {
      throw new Error('Invalid data URL format');
    }

    const mimeType = match[1];
    const base64Data = match[2];

    // Validate image MIME type
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validMimeTypes.includes(mimeType.toLowerCase())) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    return { buffer, mimeType };
  }

  /**
   * Generate unique Content-ID for image
   */
  generateContentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `image-${timestamp}-${random}@seller-management.local`;
  }

  /**
   * Replace data URLs with CID references in HTML
   */
  replaceDataUrlsWithCids(html: string, images: InlineImage[]): string {
    let processedHtml = html;

    // Sort images by position (descending) to avoid index shifting
    const sortedImages = [...images].sort((a, b) => b.position - a.position);

    for (const image of sortedImages) {
      // Replace data URL with CID reference
      const cidReference = `cid:${image.id}`;
      processedHtml = processedHtml.replace(image.dataUrl, cidReference);
    }

    return processedHtml;
  }

  /**
   * Determine whether to use Data URLs or CID based on size
   */
  shouldUseDataUrls(totalSize: number): boolean {
    return totalSize < InlineImageProcessor.DATAURL_SIZE_THRESHOLD;
  }

  /**
   * Validate image data URL
   */
  isValidImageDataUrl(dataUrl: string): boolean {
    const pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i;
    return pattern.test(dataUrl);
  }

  /**
   * HTMLボディに画像を挿入してメール用のHTMLを生成
   * bodyに既に画像が埋め込まれている場合は、その位置を保持してCID参照に置き換える
   */
  generateHtmlWithInlineImages(body: string, images: Array<{ filename: string; mimeType: string; data: Buffer; cid: string }>): string {
    // bodyにdata:image/...形式の画像が含まれているかチェック
    const hasEmbeddedImages = /<img[^>]+src="data:image\/[^"]+"/i.test(body);
    
    if (hasEmbeddedImages) {
      // 埋め込み画像がある場合は、それをCID参照に置き換える
      let processedBody = body;
      let imageIndex = 0;
      
      // data:image/... 形式の画像を検出してCID参照に置き換え
      processedBody = processedBody.replace(
        /<img([^>]*)src="data:image\/[^"]+"([^>]*)>/gi,
        (match, before, after) => {
          if (imageIndex < images.length) {
            const cid = images[imageIndex].cid;
            imageIndex++;
            return `<img${before}src="cid:${cid}"${after}>`;
          }
          return match;
        }
      );
      
      // HTMLメールボディを作成（画像は既に本文に埋め込まれている）
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; }
    img { max-width: 600px; height: auto; display: block; margin: 10px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      ${processedBody}
    </div>
  </div>
</body>
</html>
      `;
    }
    
    // 埋め込み画像がない場合は、従来の動作（署名の前に画像を挿入）
    if (images.length === 0) {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      ${body}
    </div>
  </div>
</body>
</html>
      `;
    }

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
      const match = body.match(pattern);
      if (match && match.index !== undefined) {
        signatureIndex = match.index;
        break;
      }
    }
    
    // 画像HTMLを生成
    const imagesHtml = images.map((image) => {
      return `<div class="image-section">
        <img src="cid:${image.cid}" alt="${image.filename}" />
      </div>`;
    }).join('\n');
    
    let processedBody = body;
    
    if (signatureIndex !== -1) {
      // 署名の前に画像を挿入
      processedBody = 
        body.substring(0, signatureIndex) + 
        '\n\n' + imagesHtml + '\n' +
        body.substring(signatureIndex);
    } else {
      // 署名が見つからない場合は本文の最後に追加
      processedBody += '\n\n' + imagesHtml;
    }

    // HTMLメールボディを作成
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; white-space: pre-wrap; }
    .image-section { margin: 20px 0; }
    img { max-width: 600px; height: auto; display: block; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      ${processedBody}
    </div>
  </div>
</body>
</html>
    `;
  }
}
