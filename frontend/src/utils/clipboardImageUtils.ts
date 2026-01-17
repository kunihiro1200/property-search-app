import { PastedImage, MAX_SINGLE_IMAGE_SIZE, MAX_TOTAL_IMAGE_SIZE } from '../types';

/**
 * クリップボードから画像を抽出してPastedImage形式に変換
 */
export const extractImageFromClipboard = async (
  event: ClipboardEvent
): Promise<PastedImage | null> => {
  const items = event.clipboardData?.items;
  if (!items) {
    return null;
  }

  // クリップボードから画像アイテムを探す
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        return await convertFileToPastedImage(file);
      }
    }
  }

  return null;
};

/**
 * FileをPastedImage形式に変換
 */
const convertFileToPastedImage = async (file: File): Promise<PastedImage> => {
  // ファイルをBase64 Data URLに変換
  const dataUrl = await readFileAsDataURL(file);

  // 画像の寸法を取得
  const dimensions = await getImageDimensions(dataUrl);

  // ファイル拡張子を取得
  const extension = file.type.split('/')[1] || 'png';

  // PastedImageオブジェクトを作成
  const pastedImage: PastedImage = {
    id: `pasted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `pasted-image-${Date.now()}.${extension}`,
    dataUrl,
    size: file.size,
    mimeType: file.type,
    width: dimensions.width,
    height: dimensions.height,
    timestamp: Date.now(),
  };

  return pastedImage;
};

/**
 * FileをBase64 Data URLとして読み込む
 */
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader error'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Data URLから画像の寸法を取得
 */
const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
};

/**
 * 画像サイズを検証
 */
export const validateImageSize = (
  image: PastedImage,
  existingImages: PastedImage[]
): { valid: boolean; error?: string } => {
  // 単一画像サイズチェック
  if (image.size > MAX_SINGLE_IMAGE_SIZE) {
    return {
      valid: false,
      error: '画像サイズが5MBを超えています',
    };
  }

  // 合計サイズチェック
  const currentTotalSize = existingImages.reduce((sum, img) => sum + img.size, 0);
  if (currentTotalSize + image.size > MAX_TOTAL_IMAGE_SIZE) {
    return {
      valid: false,
      error: '合計画像サイズが10MBを超えています',
    };
  }

  return { valid: true };
};

/**
 * ファイルサイズを人間が読める形式にフォーマット
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
