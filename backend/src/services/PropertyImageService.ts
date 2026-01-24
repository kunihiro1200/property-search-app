/**
 * PropertyImageService
 * 物件の格納先URL（storage_url）からGoogleドライブの画像を取得するサービス
 * 画像の削除機能も提供
 * Last updated: 2026-01-24 - Force rebuild to clear Vercel cache v2
 * PRODUCTION URL ONLY: https://property-site-frontend-kappa.vercel.app
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
  private maxSearchDepth: number; // 最大検索深度

  constructor(
    cacheTTLMinutes: number = 60,
    folderIdCacheTTLMinutes: number = 60,
    searchTimeoutSeconds: number = 2,
    maxSubfoldersToSearch: number = 3,
    maxSearchDepth: number = 5 // デフォルト5階層まで検索
  ) {
    this.driveService = new GoogleDriveService();
    this.cacheTTL = cacheTTLMinutes * 60 * 1000;
    this.folderIdCacheTTL = folderIdCacheTTLMinutes * 60 * 1000;
    this.searchTimeoutMs = searchTimeoutSeconds * 1000;
    this.maxSubfoldersToSearch = maxSubfoldersToSearch;
    this.maxSearchDepth = maxSearchDepth;
  }

  /**
   * GoogleドライブURLからフォルダIDを抽出
   * 対応形式:
   * - https://drive.google.com/drive/folders/FOLDER_ID
   * - https://drive.google.com/drive/u/0/folders/FOLDER_ID
   * - https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
   */
  extractFolderIdFromUrl(url: string): string | null {
    if (!url) {
      console.log('[extractFolderIdFromUrl] URL is empty or null');
      return null;
    }

    try {
      console.log(`[extractFolderIdFromUrl] Input URL: ${url}`);
      
      // フォルダIDを抽出する正規表現
      const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
      const match = url.match(folderIdRegex);
      
      console.log(`[extractFolderIdFromUrl] Regex match result:`, match);
      
      if (match && match[1]) {
        console.log(`[extractFolderIdFromUrl] Extracted folder ID: ${match[1]}`);
        return match[1];
      }
      
      console.log('[extractFolderIdFromUrl] No match found');
      return null;
    } catch (error) {
      console.error('[extractFolderIdFromUrl] Error extracting folder ID from URL:', error);
      return null;
    }
  }

  /**
   * 親フォルダ内で物件番号を含むサブフォルダを検索
   * 例: 業務依頼フォルダ内で「〇〇CC6〇〇」というフォルダを探す
   */
  private async findSubfolderContainingPropertyNumber(
    parentFolderId: string,
    propertyNumber: string
  ): Promise<string | null> {
    try {
      console.log(`🔍 Searching for subfolder containing "${propertyNumber}" in parent: ${parentFolderId}`);
      
      const subfolders = await this.driveService.listSubfolders(parentFolderId);
      
      if (subfolders.length === 0) {
        console.log(`  ⚠️ No subfolders found in parent folder`);
        return null;
      }
      
      console.log(`  📂 Found ${subfolders.length} subfolders, searching for "${propertyNumber}"...`);
      
      // 物件番号を含むフォルダを探す
      const matchingFolder = subfolders.find(folder => 
        folder.name.includes(propertyNumber)
      );
      
      if (matchingFolder) {
        console.log(`  ✅ Found matching folder: "${matchingFolder.name}" (${matchingFolder.id})`);
        return matchingFolder.id;
      }
      
      console.log(`  ⚠️ No folder containing "${propertyNumber}" found`);
      return null;
    } catch (error: any) {
      console.error(`  ❌ Error searching for subfolder:`, error.message);
      return null;
    }
  }

  /**
   * "athome公開"または"atbb公開"サブフォルダが存在する場合はそのフォルダIDを返す
   * 検索順序: athome公開 → atbb公開 → 親フォルダ
   * 任意の深さまで再帰的に検索（デフォルト最大5階層）
   * 存在しない場合は元のフォルダIDを返す
   */
  private async getPublicFolderIdIfExists(parentFolderId: string, propertyNumber?: string): Promise<string> {
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
      
      // 0. 物件番号が指定されている場合、まず物件番号を含むサブフォルダを探す
      // 例: 業務依頼フォルダ内で「〇〇CC6〇〇」というフォルダを探す
      let searchFolderId = parentFolderId;
      if (propertyNumber) {
        const propertyFolder = await this.findSubfolderContainingPropertyNumber(parentFolderId, propertyNumber);
        if (propertyFolder) {
          console.log(`✅ Found property folder, now searching for public folder inside it`);
          searchFolderId = propertyFolder;
        }
      }
      
      // 1. 直下の"athome公開"フォルダを検索（最優先）
      const athomeFolderId = await this.driveService.findFolderByName(searchFolderId, 'athome公開');
      if (athomeFolderId) {
        const elapsedMs = Date.now() - startTime;
        console.log(`✅ Found "athome公開" subfolder: ${athomeFolderId} in parent: ${searchFolderId} (${elapsedMs}ms)`);
        this.cacheFolderId(cacheKey, athomeFolderId);
        return athomeFolderId;
      }
      
      // 2. 直下の"atbb公開"フォルダを検索（後方互換性）
      const atbbFolderId = await this.driveService.findFolderByName(searchFolderId, 'atbb公開');
      if (atbbFolderId) {
        const elapsedMs = Date.now() - startTime;
        console.log(`✅ Found "atbb公開" subfolder: ${atbbFolderId} in parent: ${searchFolderId} (${elapsedMs}ms)`);
        this.cacheFolderId(cacheKey, atbbFolderId);
        return atbbFolderId;
      }
      
      // 3. 中間フォルダがある場合に対応（最大5階層まで再帰的に検索）
      console.log(`🔍 Searching for public folders in subfolders (recursive, max depth: ${this.maxSearchDepth})...`);
      const publicFolderId = await this.searchPublicFolderInSubfolders(searchFolderId, 0, this.maxSearchDepth);
      if (publicFolderId) {
        const elapsedMs = Date.now() - startTime;
        console.log(`✅ Found public folder in subfolder: ${publicFolderId} (${elapsedMs}ms)`);
        this.cacheFolderId(cacheKey, publicFolderId);
        return publicFolderId;
      }
      
      // 4. 親フォルダを使用（フォールバック）
      const elapsedMs = Date.now() - startTime;
      console.log(`📁 No public subfolder found in parent: ${searchFolderId}, using parent folder (${elapsedMs}ms)`);
      this.cacheFolderId(cacheKey, searchFolderId);
      return searchFolderId;
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
   * サブフォルダ内の"athome公開"または"atbb公開"フォルダを再帰的に検索
   * 任意の深さまで検索可能（デフォルト最大5階層）
   * 例: 親フォルダ → 中間フォルダ1 → 中間フォルダ2 → athome公開
   * 並列処理で高速化、タイムアウト付き
   */
  private async searchPublicFolderInSubfolders(
    parentFolderId: string,
    currentDepth: number = 0,
    maxDepth: number = 5
  ): Promise<string | null> {
    try {
      // 最大深度に達したら終了
      if (currentDepth >= maxDepth) {
        console.log(`  ⚠️ Max depth ${maxDepth} reached, stopping search`);
        return null;
      }
      
      // 親フォルダ内のすべてのサブフォルダを取得
      const subfolders = await this.driveService.listSubfolders(parentFolderId);
      
      if (subfolders.length === 0) {
        return null;
      }
      
      // サブフォルダ数を制限（最初の階層のみ）
      const foldersToCheck = currentDepth === 0 
        ? subfolders.slice(0, this.maxSubfoldersToSearch)
        : subfolders;
      
      console.log(`  ${'  '.repeat(currentDepth)}📂 Depth ${currentDepth}: Found ${subfolders.length} subfolders, checking ${foldersToCheck.length}...`);
      
      // 各サブフォルダの検索を並列実行
      const searchPromises = foldersToCheck.map(async (subfolder) => {
        console.log(`  ${'  '.repeat(currentDepth)}🔍 Checking: ${subfolder.name} (${subfolder.id})`);
        
        // athome公開を優先検索（直下）
        const athomeFolderId = await this.driveService.findFolderByName(subfolder.id, 'athome公開');
        if (athomeFolderId) {
          console.log(`  ${'  '.repeat(currentDepth)}✅ Found "athome公開" in: ${subfolder.name} at depth ${currentDepth + 1}`);
          return { type: 'athome', folderId: athomeFolderId, depth: currentDepth + 1 };
        }
        
        // atbb公開を次に検索（直下）
        const atbbFolderId = await this.driveService.findFolderByName(subfolder.id, 'atbb公開');
        if (atbbFolderId) {
          console.log(`  ${'  '.repeat(currentDepth)}✅ Found "atbb公開" in: ${subfolder.name} at depth ${currentDepth + 1}`);
          return { type: 'atbb', folderId: atbbFolderId, depth: currentDepth + 1 };
        }
        
        // 見つからなかった場合、さらに深く再帰的に検索
        console.log(`  ${'  '.repeat(currentDepth)}⬇️ Searching deeper in: ${subfolder.name}`);
        const deeperResult = await this.searchPublicFolderInSubfolders(
          subfolder.id,
          currentDepth + 1,
          maxDepth
        );
        
        if (deeperResult) {
          return { type: 'found-deeper', folderId: deeperResult, depth: currentDepth + 2 };
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
        this.searchTimeoutMs * (maxDepth - currentDepth), // 深さに応じてタイムアウトを調整
        null,
        `subfolder search at depth ${currentDepth}`
      );
      
      const result = await searchWithTimeout;
      return result;
    } catch (error: any) {
      if (error.message !== 'Not found') {
        console.error(`  ${'  '.repeat(currentDepth)}⚠️ Error searching at depth ${currentDepth}:`, error.message);
      }
      return null;
    }
  }

  /**
   * 格納先URLから画像を取得
   * "athome公開"または"atbb公開"サブフォルダが存在する場合は優先的にそこから取得
   * 検索順序: athome公開 → atbb公開 → 親フォルダ
   */
  async getImagesFromStorageUrl(storageUrl: string | null | undefined, propertyNumber?: string): Promise<PropertyImagesResult> {
    // 格納先URLが設定されていない場合
    if (!storageUrl) {
      return {
        images: [],
        folderId: null,
        cached: false,
      };
    }

    // フォルダIDを抽出
    const parentFolderId = this.extractFolderIdFromUrl(storageUrl);
    
    if (!parentFolderId) {
      console.warn(`Invalid storage URL format: ${storageUrl}`);
      return {
        images: [],
        folderId: null,
        cached: false,
      };
    }

    // "athome公開"または"atbb公開"サブフォルダが存在するか確認し、存在する場合はそのフォルダIDを使用
    // 検索順序: athome公開 → atbb公開 → 親フォルダ
    const targetFolderId = await this.getPublicFolderIdIfExists(parentFolderId, propertyNumber);

    // キャッシュを確認
    const cachedResult = this.getFromCache(targetFolderId);
    if (cachedResult) {
      return {
        images: cachedResult.images,
        folderId: cachedResult.folderId,
        cached: true,
      };
    }

    try {
      // Googleドライブから画像を取得
      const driveFiles = await this.driveService.listImagesWithThumbnails(targetFolderId);
      
      // PropertyImage形式に変換
      const images = this.convertToPropertyImages(driveFiles);
      
      // キャッシュに保存
      this.saveToCache(targetFolderId, images);
      
      return {
        images,
        folderId: targetFolderId,
        cached: false,
      };
    } catch (error: any) {
      console.error(`Error fetching images from folder ${targetFolderId}:`, error.message);
      
      // エラー時は空の配列を返す（ユーザー体験を損なわない）
      return {
        images: [],
        folderId: targetFolderId,
        cached: false,
      };
    }
  }

  /**
   * DriveFileをPropertyImage形式に変換
   */
  private convertToPropertyImages(driveFiles: DriveFile[]): PropertyImage[] {
    // 環境変数からベースURLを取得（ローカル開発時はlocalhost、本番はVercel URL）
    const baseUrl = process.env.VITE_API_URL || process.env.API_BASE_URL || 'http://localhost:3000';
    
    console.log(`[PropertyImageService] Using baseUrl: ${baseUrl}`);
    
    return driveFiles.map(file => ({
      id: file.id,
      name: file.name,
      // サムネイルURLはプロキシ経由で提供（CORS対策）
      // 注意: Google DriveのファイルIDをそのまま使用
      thumbnailUrl: `${baseUrl}/api/public/images/${file.id}/thumbnail`,
      // フル画像URLもGoogle Driveから直接取得
      fullImageUrl: `${baseUrl}/api/public/images/${file.id}`,
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
      // 環境変数からベースURLを取得
      const baseUrl = process.env.VITE_API_URL || process.env.API_BASE_URL || 'http://localhost:3000';
      return cachedEntry.images.length > 0 
        ? [`${baseUrl}/api/public/images/${cachedEntry.images[0].id}/thumbnail`] 
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
      
      // 環境変数からベースURLを取得
      const baseUrl = process.env.VITE_API_URL || process.env.API_BASE_URL || 'http://localhost:3000';
      return [`${baseUrl}/api/public/images/${images[0].id}/thumbnail`];
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
