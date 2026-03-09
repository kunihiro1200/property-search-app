/**
 * PropertyImageService
 * 物件の格納先URL（storage_url）からGoogleドライブの画像を取得するサービス
 * 画像の削除機能も提供
 */

import { GoogleDriveService, DriveFile } from './GoogleDriveService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface PropertyImage {
  id: string;
  name: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}

export interface PropertyImagesResult {
  images: PropertyImage[];
  folderId: string | null;
  cached: boolean;
}

export interface ImageDeletionResult {
  success: boolean;
  message: string;
  imageId?: string;
  imageName?: string;
}

export interface DeletionLogEntry {
  propertyId: string;
  imageFileId: string;
  imageName?: string;
  deletedBy: string;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

interface CacheEntry {
  images: PropertyImage[];
  folderId: string;
  cachedAt: number;
  expiresAt: number;
}

interface FolderIdCacheEntry {
  targetFolderId: string;
  cachedAt: number;
  expiresAt: number;
}

export class PropertyImageService {
  private driveService: GoogleDriveService;
  private cache: Map<string, CacheEntry> = new Map();
  private folderIdCache: Map<string, FolderIdCacheEntry> = new Map();
  private cacheTTL: number; // milliseconds
  private folderIdCacheTTL: number; // milliseconds
  private searchTimeoutMs: number; // milliseconds
  private maxSubfoldersToSearch: number;

  constructor(
    driveService: GoogleDriveService, // GoogleDriveServiceを外部から注入
    cacheTTLMinutes: number = 60,
    folderIdCacheTTLMinutes: number = 60,
    searchTimeoutSeconds: number = 2,
    maxSubfoldersToSearch: number = 3
  ) {
    this.driveService = driveService; // 注入されたインスタンスを使用
    this.cacheTTL = cacheTTLMinutes * 60 * 1000;
    this.folderIdCacheTTL = folderIdCacheTTLMinutes * 60 * 1000;
    this.searchTimeoutMs = searchTimeoutSeconds * 1000;
    this.maxSubfoldersToSearch = maxSubfoldersToSearch;
  }

  /**
   * GoogleドライブURLからフォルダIDを抽出
   * 対応形式:
   * - https://drive.google.com/drive/folders/FOLDER_ID
   * - https://drive.google.com/drive/u/0/folders/FOLDER_ID
   * - https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
   */
  extractFolderIdFromUrl(url: string): string | null {
    if (!url) return null;

    try {
      // フォルダIDを抽出する正規表現
      const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
      const match = url.match(folderIdRegex);
      
      if (match && match[1]) {
        return match[1];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting folder ID from URL:', error);
      return null;
    }
  }

  /**
   * "athome公開"または"atbb公開"サブフォルダが存在する場合はそのフォルダIDを返す
   * 検索順序: athome公開 → atbb公開 → 親フォルダ
   * 2階層まで再帰的に検索（中間フォルダがある場合に対応）
   * 存在しない場合は元のフォルダIDを返す
   */
  private async getPublicFolderIdIfExists(parentFolderId: string): Promise<string> {
    const startTime = Date.now();
    
    // キャッシュをチェック
    const cacheKey = `folder_id_${parentFolderId}`;
    const cachedEntry = this.folderIdCache.get(cacheKey);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      const elapsedMs = Date.now() - startTime;
      console.log(`✅ Folder ID cache hit for parent: ${parentFolderId} -> ${cachedEntry.targetFolderId} (${elapsedMs}ms)`);
      return cachedEntry.targetFolderId;
    }

    console.log(`⚠️ Folder ID cache miss for parent: ${parentFolderId}`);

    try {
      console.log(`🔍 Checking for public subfolders in parent: ${parentFolderId}`);
      
      // 1. 直下の"athome公開"フォルダを検索（最優先）
      const athomeFolderId = await this.driveService.findFolderByName(parentFolderId, 'athome公開');
      if (athomeFolderId) {
        const elapsedMs = Date.now() - startTime;
        console.log(`✅ Found "athome公開" subfolder: ${athomeFolderId} in parent: ${parentFolderId} (${elapsedMs}ms)`);
        this.cacheFolderId(cacheKey, athomeFolderId);
        return athomeFolderId;
      }
      
      // 2. 直下の"atbb公開"フォルダを検索（後方互換性）
      const atbbFolderId = await this.driveService.findFolderByName(parentFolderId, 'atbb公開');
      if (atbbFolderId) {
        const elapsedMs = Date.now() - startTime;
        console.log(`✅ Found "atbb公開" subfolder: ${atbbFolderId} in parent: ${parentFolderId} (${elapsedMs}ms)`);
        this.cacheFolderId(cacheKey, atbbFolderId);
        return atbbFolderId;
      }
      
      // 3. 中間フォルダがある場合に対応（2階層目まで検索）
      console.log(`🔍 Searching for public folders in subfolders (2nd level)...`);
      const publicFolderId = await this.searchPublicFolderInSubfolders(parentFolderId);
      if (publicFolderId) {
        const elapsedMs = Date.now() - startTime;
        console.log(`✅ Found public folder in subfolder: ${publicFolderId} (${elapsedMs}ms)`);
        this.cacheFolderId(cacheKey, publicFolderId);
        return publicFolderId;
      }
      
      // 4. 親フォルダを使用（フォールバック）
      const elapsedMs = Date.now() - startTime;
      console.log(`📁 No public subfolder found in parent: ${parentFolderId}, using parent folder (${elapsedMs}ms)`);
      this.cacheFolderId(cacheKey, parentFolderId);
      return parentFolderId;
    } catch (error: any) {
      const elapsedMs = Date.now() - startTime;
      console.error(`⚠️ Error checking for public subfolders in parent: ${parentFolderId} (${elapsedMs}ms):`, error.message);
      console.error(`⚠️ Falling back to parent folder`);
      this.cacheFolderId(cacheKey, parentFolderId);
      return parentFolderId;
    }
  }

  /**
   * フォルダIDをキャッシュに保存
   */
  private cacheFolderId(cacheKey: string, targetFolderId: string): void {
    const now = Date.now();
    this.folderIdCache.set(cacheKey, {
      targetFolderId,
      cachedAt: now,
      expiresAt: now + this.folderIdCacheTTL, // 設定可能なTTL（デフォルト60分）
    });
  }

  /**
   * タイムアウト付きでPromiseを実行
   * タイムアウト時はフォールバック値を返す
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    fallbackValue: T,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`⏱️ Timeout (${timeoutMs}ms) reached for ${operationName}, using fallback`);
        resolve(fallbackValue);
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * サブフォルダ内の"athome公開"または"atbb公開"フォルダを検索（2階層目）
   * 例: 親フォルダ → 中間フォルダ → athome公開
   * 並列処理で高速化、タイムアウト付き
   */
  private async searchPublicFolderInSubfolders(parentFolderId: string): Promise<string | null> {
    try {
      // 親フォルダ内のすべてのサブフォルダを取得
      const subfolders = await this.driveService.listSubfolders(parentFolderId);
      
      if (subfolders.length === 0) {
        return null;
      }
      
      // サブフォルダ数を制限
      const limitedSubfolders = subfolders.slice(0, this.maxSubfoldersToSearch);
      console.log(`  📂 Found ${subfolders.length} subfolders, checking first ${limitedSubfolders.length}...`);
      
      // 各サブフォルダの検索を並列実行
      const searchPromises = limitedSubfolders.map(async (subfolder) => {
        console.log(`  🔍 Checking subfolder: ${subfolder.name} (${subfolder.id})`);
        
        // athome公開を優先検索
        const athomeFolderId = await this.driveService.findFolderByName(subfolder.id, 'athome公開');
        if (athomeFolderId) {
          console.log(`  ✅ Found "athome公開" in subfolder: ${subfolder.name}`);
          return { type: 'athome', folderId: athomeFolderId };
        }
        
        // atbb公開を次に検索
        const atbbFolderId = await this.driveService.findFolderByName(subfolder.id, 'atbb公開');
        if (atbbFolderId) {
          console.log(`  ✅ Found "atbb公開" in subfolder: ${subfolder.name}`);
          return { type: 'atbb', folderId: atbbFolderId };
        }
        
        return null;
      });
      
      // タイムアウト付きで並列実行、最初に見つかった結果を使用
      const searchWithTimeout = this.withTimeout(
        Promise.race(
          searchPromises.map(async (promise) => {
            const result = await promise;
            if (result) return result.folderId;
            throw new Error('Not found');
          })
        ),
        this.searchTimeoutMs,
        null,
        'subfolder search'
      );
      
      const result = await searchWithTimeout;
      return result;
    } catch (error: any) {
      if (error.message !== 'Not found') {
        console.error(`⚠️ Error searching public folders in subfolders:`, error.message);
      }
      return null;
    }
  }

  /**
   * 格納先URLから画像を取得
   * "athome公開"または"atbb公開"サブフォルダが存在する場合は優先的にそこから取得
   * 検索順序: athome公開 → atbb公開 → 親フォルダ
   */
  async getImagesFromStorageUrl(storageUrl: string | null | undefined): Promise<PropertyImagesResult> {
    console.log(`🔍 [getImagesFromStorageUrl] Starting with URL: ${storageUrl}`);
    
    // 格納先URLが設定されていない場合
    if (!storageUrl) {
      console.log(`⚠️ [getImagesFromStorageUrl] No storage URL provided`);
      return {
        images: [],
        folderId: null,
        cached: false,
      };
    }

    // フォルダIDを抽出
    const parentFolderId = this.extractFolderIdFromUrl(storageUrl);
    console.log(`📋 [getImagesFromStorageUrl] Extracted parent folder ID: ${parentFolderId}`);
    
    if (!parentFolderId) {
      console.warn(`❌ [getImagesFromStorageUrl] Invalid storage URL format: ${storageUrl}`);
      return {
        images: [],
        folderId: null,
        cached: false,
      };
    }

    try {
      // "athome公開"または"atbb公開"サブフォルダが存在するか確認し、存在する場合はそのフォルダIDを使用
      // 検索順序: athome公開 → atbb公開 → 親フォルダ
      console.log(`🔍 [getImagesFromStorageUrl] Checking for public subfolder...`);
      const targetFolderId = await this.getPublicFolderIdIfExists(parentFolderId);
      console.log(`✅ [getImagesFromStorageUrl] Target folder ID: ${targetFolderId}`);

      // キャッシュを確認
      const cachedResult = this.getFromCache(targetFolderId);
      if (cachedResult) {
        console.log(`✅ [getImagesFromStorageUrl] Cache hit for folder: ${targetFolderId}`);
        return {
          images: cachedResult.images,
          folderId: cachedResult.folderId,
          cached: true,
        };
      }

      console.log(`⚠️ [getImagesFromStorageUrl] Cache miss, fetching from Google Drive...`);
      
      // Googleドライブから画像を取得
      const driveFiles = await this.driveService.listImagesWithThumbnails(targetFolderId);
      console.log(`📊 [getImagesFromStorageUrl] Retrieved ${driveFiles.length} images from Google Drive`);
      
      // PropertyImage形式に変換
      const images = this.convertToPropertyImages(driveFiles);
      console.log(`✅ [getImagesFromStorageUrl] Converted to ${images.length} PropertyImages`);
      
      // キャッシュに保存
      this.saveToCache(targetFolderId, images);
      console.log(`✅ [getImagesFromStorageUrl] Saved to cache`);
      
      return {
        images,
        folderId: targetFolderId,
        cached: false,
      };
    } catch (error: any) {
      console.error(`❌ [getImagesFromStorageUrl] Error fetching images from folder ${parentFolderId}:`, error.message);
      console.error(`❌ [getImagesFromStorageUrl] Error stack:`, error.stack);
      
      // エラー時は空の配列を返す（ユーザー体験を損なわない）
      console.warn(`⚠️ [getImagesFromStorageUrl] Returning empty array due to error`);
      return {
        images: [],
        folderId: parentFolderId,
        cached: false,
      };
    }
  }

  /**
   * DriveFileをPropertyImage形式に変換
   */
  private convertToPropertyImages(driveFiles: DriveFile[]): PropertyImage[] {
    // Vercel環境ではフロントエンドとバックエンドが同一オリジンのため相対URLを使用
    // BACKEND_URL環境変数への依存を排除し、環境に関わらず正しいURLを生成する
    return driveFiles.map(file => ({
      id: file.id,
      name: file.name,
      // サムネイルURLはプロキシ経由で提供（CORS対策）
      // 注意: Google DriveのファイルIDをそのまま使用
      thumbnailUrl: `/api/public/images/${file.id}/thumbnail`,
      // フル画像URLもプロキシ経由で提供
      fullImageUrl: `/api/public/images/${file.id}`,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
    }));
  }

  /**
   * キャッシュから取得
   */
  private getFromCache(folderId: string): CacheEntry | null {
    const entry = this.cache.get(folderId);
    
    if (!entry) return null;
    
    // 有効期限を確認
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(folderId);
      return null;
    }
    
    return entry;
  }

  /**
   * キャッシュに保存
   */
  private saveToCache(folderId: string, images: PropertyImage[]): void {
    const now = Date.now();
    this.cache.set(folderId, {
      images,
      folderId,
      cachedAt: now,
      expiresAt: now + this.cacheTTL,
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache(folderId?: string): void {
    if (folderId) {
      this.cache.delete(folderId);
      // フォルダIDキャッシュもクリア
      const folderIdCacheKey = `folder_id_${folderId}`;
      this.folderIdCache.delete(folderIdCacheKey);
    } else {
      this.cache.clear();
      this.folderIdCache.clear();
    }
  }

  /**
   * 一覧表示用に最初の1枚の画像URLのみを取得
   * パフォーマンス最適化のため、サムネイル用に使用
   * "athome公開"または"atbb公開"サブフォルダが存在する場合は優先的にそこから取得
   * 検索順序: athome公開 → atbb公開 → 親フォルダ
   * @param propertyId 物件ID（ログ用）
   * @param storageUrl 物件の格納先URL
   * @returns 画像URLの配列（最大1件）
   */
  async getFirstImage(propertyId: string, storageUrl: string | null | undefined): Promise<string[]> {
    // 格納先URLが設定されていない場合
    if (!storageUrl) {
      console.log(`[PropertyImageService] No storage_location for property ${propertyId}`);
      return [];
    }

    // フォルダIDを抽出
    const parentFolderId = this.extractFolderIdFromUrl(storageUrl);
    if (!parentFolderId) {
      console.warn(`[PropertyImageService] Invalid storage URL format for property ${propertyId}: ${storageUrl}`);
      return [];
    }

    // "athome公開"または"atbb公開"サブフォルダが存在するか確認し、存在する場合はそのフォルダIDを使用
    // 検索順序: athome公開 → atbb公開 → 親フォルダ
    const targetFolderId = await this.getPublicFolderIdIfExists(parentFolderId);

    // キャッシュキーをfolderIdベースに変更（同じフォルダを複数の物件で共有する可能性があるため）
    const cacheKey = `first_image_folder_${targetFolderId}`;
    
    // キャッシュをチェック（5分間のTTL）
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      console.log(`[PropertyImageService] Cache hit for property ${propertyId}, folder ${targetFolderId}`);
      // 相対URLを使用（Vercel環境ではフロントエンドとバックエンドが同一オリジン）
      return cachedEntry.images.length > 0 
        ? [`/api/public/images/${cachedEntry.images[0].id}/thumbnail`] 
        : [];
    }

    try {
      console.log(`[PropertyImageService] Fetching images for property ${propertyId} from folder ${targetFolderId}`);
      
      // Googleドライブから画像を取得
      const driveFiles = await this.driveService.listImagesWithThumbnails(targetFolderId);
      
      // 画像がない場合
      if (driveFiles.length === 0) {
        console.log(`[PropertyImageService] No images found in folder ${targetFolderId} for property ${propertyId}`);
        
        // 画像がない場合は短時間キャッシュ（1分）
        const now = Date.now();
        this.cache.set(cacheKey, {
          images: [],
          folderId: targetFolderId,
          cachedAt: now,
          expiresAt: now + (1 * 60 * 1000), // 1分間
        });
        
        return [];
      }

      // PropertyImage形式に変換
      const images = this.convertToPropertyImages(driveFiles);
      
      console.log(`[PropertyImageService] Found ${images.length} images in folder ${targetFolderId} for property ${propertyId}`);
      
      // キャッシュに保存（5分間）
      const now = Date.now();
      this.cache.set(cacheKey, {
        images,
        folderId: targetFolderId,
        cachedAt: now,
        expiresAt: now + (5 * 60 * 1000), // 5分間
      });
      
      // ✅ 相対URLを使用（Vercel環境ではフロントエンドとバックエンドが同一オリジン）
      return [`/api/public/images/${images[0].id}/thumbnail`];
    } catch (error: any) {
      console.error(`[PropertyImageService] Error fetching first image for property ${propertyId} from folder ${targetFolderId}:`, error.message);
      console.error(`[PropertyImageService] Error details:`, error);
      
      // エラー時はキャッシュしない（次回リトライ可能にする）
      return [];
    }
  }

  /**
   * 画像データを取得（プロキシ用）
   */
  async getImageData(fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const result = await this.driveService.getImageData(fileId);
      return {
        buffer: result.buffer,
        mimeType: result.mimeType,
      };
    } catch (error: any) {
      console.error(`Error fetching image data for ${fileId}:`, error.message);
      return null;
    }
  }

  /**
   * 画像がプロパティのフォルダに属しているか検証
   * @param _propertyId 物件ID（将来の拡張用、現在は未使用）
   * @param fileId Google DriveファイルID
   * @param storageUrl 物件の格納先URL
   * @returns 画像がフォルダに属している場合はtrue
   */
  async validateImageBelongsToProperty(
    _propertyId: string,
    fileId: string,
    storageUrl: string | null | undefined
  ): Promise<boolean> {
    if (!storageUrl) {
      return false;
    }

    const folderId = this.extractFolderIdFromUrl(storageUrl);
    if (!folderId) {
      return false;
    }

    try {
      // フォルダ内の画像一覧を取得
      const driveFiles = await this.driveService.listImagesWithThumbnails(folderId);
      
      // 指定されたファイルIDがフォルダ内に存在するか確認
      return driveFiles.some(file => file.id === fileId);
    } catch (error: any) {
      console.error(`Error validating image belongs to property:`, error.message);
      return false;
    }
  }

  /**
   * 画像を削除
   * @param fileId Google DriveファイルID
   * @param propertyId 物件ID
   * @param storageUrl 物件の格納先URL
   * @param deletedBy 削除実行ユーザーID
   * @param ipAddress 削除実行元IPアドレス
   * @returns 削除結果
   */
  async deleteImage(
    fileId: string,
    propertyId: string,
    storageUrl: string | null | undefined,
    deletedBy: string,
    ipAddress?: string
  ): Promise<ImageDeletionResult> {
    let imageName: string | undefined;

    try {
      // 画像がプロパティに属しているか検証
      const isValid = await this.validateImageBelongsToProperty(propertyId, fileId, storageUrl);
      if (!isValid) {
        await this.logDeletion({
          propertyId,
          imageFileId: fileId,
          deletedBy,
          ipAddress,
          success: false,
          errorMessage: '画像が見つからないか、この物件に属していません',
        });
        return {
          success: false,
          message: '画像が見つからないか、この物件に属していません',
          imageId: fileId,
        };
      }

      // 画像のメタデータを取得（ログ用）
      try {
        const metadata = await this.driveService.getFileMetadata(fileId);
        imageName = metadata?.name;
      } catch (e) {
        // メタデータ取得に失敗しても削除は続行
      }

      // Google Driveから画像を削除
      await this.driveService.deleteFile(fileId);

      // キャッシュをクリア
      const folderId = this.extractFolderIdFromUrl(storageUrl!);
      if (folderId) {
        this.clearCache(folderId);
      }

      // 削除ログを記録
      await this.logDeletion({
        propertyId,
        imageFileId: fileId,
        imageName,
        deletedBy,
        ipAddress,
        success: true,
      });

      return {
        success: true,
        message: '画像を削除しました',
        imageId: fileId,
        imageName,
      };
    } catch (error: any) {
      console.error(`Error deleting image ${fileId}:`, error.message);

      // 削除失敗ログを記録
      await this.logDeletion({
        propertyId,
        imageFileId: fileId,
        imageName,
        deletedBy,
        ipAddress,
        success: false,
        errorMessage: error.message,
      });

      return {
        success: false,
        message: `画像の削除に失敗しました: ${error.message}`,
        imageId: fileId,
        imageName,
      };
    }
  }

  /**
   * 削除ログを記録
   */
  private async logDeletion(entry: DeletionLogEntry): Promise<void> {
    try {
      await supabase.from('property_image_deletion_logs').insert({
        property_id: entry.propertyId,
        image_file_id: entry.imageFileId,
        image_name: entry.imageName,
        deleted_by: entry.deletedBy,
        ip_address: entry.ipAddress,
        success: entry.success,
        error_message: entry.errorMessage,
      });
    } catch (error: any) {
      console.error('Error logging deletion:', error.message);
      // ログ記録の失敗は無視（メイン処理に影響させない）
    }
  }

  /**
   * 物件番号からGoogle Driveの画像フォルダURLを取得
   * 
   * @param propertyNumber 物件番号（例: AA13069）
   * @returns Google DriveフォルダのURL、見つからない場合はnull
   */
  async getImageFolderUrl(propertyNumber: string): Promise<string | null> {
    try {
      console.log(`[PropertyImageService] Searching for folder with property number: ${propertyNumber}`);
      
      // Google Driveで物件番号のフォルダを検索
      const folderId = await this.driveService.searchFolderByName(propertyNumber);
      
      if (!folderId) {
        console.log(`[PropertyImageService] No folder found for property number: ${propertyNumber}`);
        return null;
      }
      
      console.log(`[PropertyImageService] Found folder ID: ${folderId}`);
      
      // 親フォルダのURLを返す（getPublicFolderIdIfExistsは呼び出さない）
      // これにより、storage_locationには親フォルダのURLが保存され、
      // 画像取得時にgetPublicFolderIdIfExists()で「athome公開」サブフォルダを探せる
      const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      
      console.log(`[PropertyImageService] Generated parent folder URL: ${folderUrl}`);
      
      return folderUrl;
      
    } catch (error: any) {
      console.error(`[PropertyImageService] Error getting image folder URL for ${propertyNumber}:`, error);
      return null;
    }
  }
}
