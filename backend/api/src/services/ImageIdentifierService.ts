import { DriveFile } from './GoogleDriveService';

/**
 * 画像カテゴリ
 */
export enum ImageCategory {
  EXTERIOR = 'exterior',  // 建物外観
  INTERIOR = 'interior'   // メイン室内（リビング・キッチン）
}

/**
 * 分類済み画像
 */
export interface CategorizedImages {
  exterior: DriveFile[];
  interior: DriveFile[];
  uncategorized: DriveFile[];
}

/**
 * 画像識別結果
 */
export interface ImageIdentification {
  category: ImageCategory;
  confidence: number;  // 0.0 - 1.0
}

/**
 * ファイル名パターン定義
 */
interface PatternDefinition {
  high: string[];    // 高優先度パターン（confidence: 1.0）
  medium: string[];  // 中優先度パターン（confidence: 0.7）
  low: string[];     // 低優先度パターン（confidence: 0.5）
}

/**
 * 画像識別サービス
 * ファイル名パターンマッチングによる画像分類を提供
 */
export class ImageIdentifierService {
  /**
   * ファイル名パターン定義
   */
  private readonly PATTERNS: Record<ImageCategory, PatternDefinition> = {
    [ImageCategory.EXTERIOR]: {
      high: ['外観', 'exterior'],
      medium: ['外', 'outside', 'facade'],
      low: []
    },
    [ImageCategory.INTERIOR]: {
      high: ['リビング', 'ldk', 'living'],
      medium: ['キッチン', 'kitchen'],
      low: ['main', 'メイン']
    }
  };

  /**
   * ファイル名から画像カテゴリを識別
   * @param fileName ファイル名
   * @returns 識別結果（カテゴリと信頼度）、識別できない場合はnull
   */
  identifyImageCategory(fileName: string): ImageIdentification | null {
    const lowerFileName = fileName.toLowerCase();

    // 高優先度パターンチェック（外観）
    for (const pattern of this.PATTERNS[ImageCategory.EXTERIOR].high) {
      if (lowerFileName.includes(pattern.toLowerCase())) {
        return {
          category: ImageCategory.EXTERIOR,
          confidence: 1.0
        };
      }
    }

    // 高優先度パターンチェック（室内）
    for (const pattern of this.PATTERNS[ImageCategory.INTERIOR].high) {
      if (lowerFileName.includes(pattern.toLowerCase())) {
        return {
          category: ImageCategory.INTERIOR,
          confidence: 1.0
        };
      }
    }

    // 中優先度パターンチェック（外観）
    for (const pattern of this.PATTERNS[ImageCategory.EXTERIOR].medium) {
      if (lowerFileName.includes(pattern.toLowerCase())) {
        return {
          category: ImageCategory.EXTERIOR,
          confidence: 0.7
        };
      }
    }

    // 中優先度パターンチェック（室内）
    for (const pattern of this.PATTERNS[ImageCategory.INTERIOR].medium) {
      if (lowerFileName.includes(pattern.toLowerCase())) {
        return {
          category: ImageCategory.INTERIOR,
          confidence: 0.7
        };
      }
    }

    // 低優先度パターンチェック（外観）
    for (const pattern of this.PATTERNS[ImageCategory.EXTERIOR].low) {
      if (lowerFileName.includes(pattern.toLowerCase())) {
        return {
          category: ImageCategory.EXTERIOR,
          confidence: 0.5
        };
      }
    }

    // 低優先度パターンチェック（室内）
    for (const pattern of this.PATTERNS[ImageCategory.INTERIOR].low) {
      if (lowerFileName.includes(pattern.toLowerCase())) {
        return {
          category: ImageCategory.INTERIOR,
          confidence: 0.5
        };
      }
    }

    // パターンに一致しない
    return null;
  }

  /**
   * フォルダ内の画像を分類
   * @param images 画像ファイル一覧
   * @returns 分類済み画像
   */
  categorizeImages(images: DriveFile[]): CategorizedImages {
    const categorized: CategorizedImages = {
      exterior: [],
      interior: [],
      uncategorized: []
    };

    for (const image of images) {
      const identification = this.identifyImageCategory(image.name);
      
      if (identification) {
        if (identification.category === ImageCategory.EXTERIOR) {
          categorized.exterior.push(image);
        } else if (identification.category === ImageCategory.INTERIOR) {
          categorized.interior.push(image);
        }
      } else {
        categorized.uncategorized.push(image);
      }
    }

    return categorized;
  }

  /**
   * 最適な画像を選択（最新のファイルを選択）
   * @param images 画像ファイル一覧
   * @param category 画像カテゴリ
   * @returns 選択された画像、見つからない場合はnull
   */
  selectBestImage(images: DriveFile[], category: ImageCategory): DriveFile | null {
    if (images.length === 0) {
      return null;
    }

    // 指定されたカテゴリの画像のみをフィルタリング
    const categoryImages = images.filter(image => {
      const identification = this.identifyImageCategory(image.name);
      return identification && identification.category === category;
    });

    if (categoryImages.length === 0) {
      return null;
    }

    // 更新日時順にソート（最新が先頭）
    const sortedImages = [...categoryImages].sort((a, b) => {
      const dateA = new Date(a.modifiedTime).getTime();
      const dateB = new Date(b.modifiedTime).getTime();
      return dateB - dateA;  // 降順（最新が先頭）
    });

    return sortedImages[0];
  }

  /**
   * 画像ファイル形式かどうかを判定
   * @param mimeType MIMEタイプ
   * @returns 画像ファイルの場合true
   */
  isImageFile(mimeType: string): boolean {
    const imageMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    return imageMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * 画像ファイルのみをフィルタリング
   * @param files ファイル一覧
   * @returns 画像ファイルのみの一覧
   */
  filterImageFiles(files: DriveFile[]): DriveFile[] {
    return files.filter(file => this.isImageFile(file.mimeType));
  }
}
