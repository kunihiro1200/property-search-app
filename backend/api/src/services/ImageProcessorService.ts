import sharp from 'sharp';
import { DriveFile } from './GoogleDriveService';
import { ImageIdentifierService, ImageCategory } from './ImageIdentifierService';

/**
 * 選択された画像
 */
export interface SelectedImages {
  exterior: DriveImage | null;  // 建物外観
  interior: DriveImage | null;  // メイン室内
  selectionMethod: 'auto' | 'manual';
}

/**
 * Drive画像（バッファ付き）
 */
export interface DriveImage extends DriveFile {
  buffer?: Buffer;
}

/**
 * 処理済みメール
 */
export interface ProcessedEmail {
  body: string;  // 画像埋め込み済みHTML
  hasImages: boolean;
  images: SelectedImages | null;
  originalBody: string;
}

/**
 * 画像処理サービス
 * 画像のリサイズ、エンコード、HTML埋め込みを提供
 */
export class ImageProcessorService {
  private readonly MAX_SIZE_MB = 5;
  private readonly MAX_WIDTH_PX = 600;
  private readonly IMAGE_ATTACHMENT_KEYWORD = '画像添付';
  
  private imageIdentifier: ImageIdentifierService;

  constructor() {
    this.imageIdentifier = new ImageIdentifierService();
  }

  /**
   * メール本文に「画像添付」キーワードが含まれているかチェック
   * @param emailBody メール本文
   * @returns キーワードが含まれている場合true
   */
  detectImageAttachmentKeyword(emailBody: string): boolean {
    return emailBody.includes(this.IMAGE_ATTACHMENT_KEYWORD);
  }

  /**
   * 画像をリサイズ
   * @param imageBuffer 画像バッファ
   * @param maxSizeMB 最大サイズ（MB）
   * @returns リサイズ後の画像バッファ
   */
  async resizeImage(imageBuffer: Buffer, maxSizeMB: number = this.MAX_SIZE_MB): Promise<Buffer> {
    try {
      // 最初のリサイズ試行（品質85%）
      let resized = await sharp(imageBuffer)
        .resize(this.MAX_WIDTH_PX, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // サイズチェック
      const sizeMB = resized.length / (1024 * 1024);

      if (sizeMB > maxSizeMB) {
        // さらに品質を下げる（品質70%）
        resized = await sharp(imageBuffer)
          .resize(this.MAX_WIDTH_PX, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 70 })
          .toBuffer();
      }

      return resized;
    } catch (error: any) {
      console.error('画像リサイズエラー:', error.message);
      throw new Error(`画像のリサイズに失敗しました: ${error.message}`);
    }
  }

  /**
   * 画像をBase64エンコード
   * @param imageBuffer 画像バッファ
   * @returns Base64エンコードされた文字列
   */
  encodeImageToBase64(imageBuffer: Buffer): string {
    return imageBuffer.toString('base64');
  }

  /**
   * メール本文に画像を埋め込み
   * @param emailBody メール本文
   * @param images 選択された画像
   * @returns 画像埋め込み済みHTML
   */
  async embedImagesInEmail(emailBody: string, images: SelectedImages): Promise<string> {
    // 画像HTMLを生成
    const imageHtml = await this.generateImageHtml(images);

    // 「画像添付」キーワードを探す
    const keywordIndex = emailBody.indexOf(this.IMAGE_ATTACHMENT_KEYWORD);

    if (keywordIndex !== -1) {
      // キーワードがあった位置に画像を挿入
      const before = emailBody.substring(0, keywordIndex);
      const after = emailBody.substring(keywordIndex + this.IMAGE_ATTACHMENT_KEYWORD.length);
      return before + imageHtml + after;
    } else {
      // キーワードがない場合は本文の最後に追加
      return emailBody + '\n\n' + imageHtml;
    }
  }

  /**
   * 画像HTMLを生成
   * @param images 選択された画像
   * @returns 画像HTML
   */
  private async generateImageHtml(images: SelectedImages): Promise<string> {
    let html = '<div style="margin: 20px 0;">';

    // 建物外観
    if (images.exterior && images.exterior.buffer) {
      const resizedBuffer = await this.resizeImage(images.exterior.buffer);
      const base64 = this.encodeImageToBase64(resizedBuffer);
      const mimeType = images.exterior.mimeType || 'image/jpeg';
      
      html += `
        <div style="margin-bottom: 15px;">
          <p style="font-weight: bold; margin-bottom: 5px;">建物外観</p>
          <img src="data:${mimeType};base64,${base64}" 
               style="max-width: 600px; height: auto; display: block;" 
               alt="建物外観" />
        </div>
      `;
    }

    // メイン室内
    if (images.interior && images.interior.buffer) {
      const resizedBuffer = await this.resizeImage(images.interior.buffer);
      const base64 = this.encodeImageToBase64(resizedBuffer);
      const mimeType = images.interior.mimeType || 'image/jpeg';
      
      html += `
        <div style="margin-bottom: 15px;">
          <p style="font-weight: bold; margin-bottom: 5px;">室内（リビング・キッチン）</p>
          <img src="data:${mimeType};base64,${base64}" 
               style="max-width: 600px; height: auto; display: block;" 
               alt="室内" />
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * 売主フォルダから画像を自動選択
   * @param images フォルダ内の全画像
   * @returns 選択された画像
   */
  autoSelectImages(images: DriveFile[]): SelectedImages {
    // 画像ファイルのみをフィルタリング
    const imageFiles = this.imageIdentifier.filterImageFiles(images);

    // 外観画像を選択
    const exteriorImage = this.imageIdentifier.selectBestImage(imageFiles, ImageCategory.EXTERIOR);

    // 室内画像を選択
    const interiorImage = this.imageIdentifier.selectBestImage(imageFiles, ImageCategory.INTERIOR);

    // フォールバック: パターンに一致しない場合は最初の2つの画像を使用
    let finalExterior = exteriorImage;
    let finalInterior = interiorImage;

    if (!finalExterior && !finalInterior && imageFiles.length >= 2) {
      // 最新の2つの画像を使用
      const sortedImages = [...imageFiles].sort((a, b) => {
        const dateA = new Date(a.modifiedTime).getTime();
        const dateB = new Date(b.modifiedTime).getTime();
        return dateB - dateA;
      });
      
      finalExterior = sortedImages[0];
      finalInterior = sortedImages[1];
    } else if (!finalExterior && !finalInterior && imageFiles.length === 1) {
      // 1枚しかない場合は外観として使用
      finalExterior = imageFiles[0];
    }

    return {
      exterior: finalExterior,
      interior: finalInterior,
      selectionMethod: 'auto'
    };
  }

  /**
   * メール本文から「画像添付」キーワードを削除
   * @param emailBody メール本文
   * @returns キーワード削除後のメール本文
   */
  removeImageAttachmentKeyword(emailBody: string): string {
    return emailBody.replace(new RegExp(this.IMAGE_ATTACHMENT_KEYWORD, 'g'), '');
  }

  /**
   * 画像添付処理
   * @param emailBody メール本文
   * @param images フォルダ内の全画像
   * @param selectedImages 手動選択された画像（オプション）
   * @returns 処理済みメール
   */
  async processImageAttachment(
    emailBody: string,
    images: DriveFile[],
    selectedImages?: SelectedImages
  ): Promise<ProcessedEmail> {
    const originalBody = emailBody;

    // キーワード検出
    if (!this.detectImageAttachmentKeyword(emailBody)) {
      return {
        body: emailBody,
        hasImages: false,
        images: null,
        originalBody
      };
    }

    // 画像選択（手動選択がある場合はそれを使用、なければ自動選択）
    const imagesToUse = selectedImages || this.autoSelectImages(images);

    // 画像が選択されていない場合
    if (!imagesToUse.exterior && !imagesToUse.interior) {
      return {
        body: this.removeImageAttachmentKeyword(emailBody),
        hasImages: false,
        images: null,
        originalBody
      };
    }

    // 画像を埋め込み
    const processedBody = await this.embedImagesInEmail(emailBody, imagesToUse);

    return {
      body: processedBody,
      hasImages: true,
      images: imagesToUse,
      originalBody
    };
  }
}
