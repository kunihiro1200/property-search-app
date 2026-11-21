/**
 * PropertyImageService
 * 物件の格納先URL（storage_url）からGoogleドライブの画像を取得するサービス
 * 画像の削除機能も提供
 */

import { GoogleDriveService, DriveFile } from './GoogleDriveService';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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
   * 存在しない場合はnullを返す（親フォルダは使用しない）
   */
  private async getPublicFolderIdIfExists(parentFolderId: string): Promise<string | null> {
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
      
      // 4. 親フォルダを遡って検索（業務リストのURLがサブフォルダを指している場合に対応）
      console.log(`🔍 Searching for public folders in parent folder (going up one level)...`);
      try {
        const grandParentFolderId = await this.driveService.getParentFolderId(parentFolderId);
        if (grandParentFolderId) {
          console.log(`🔍 Checking grandparent folder: ${grandParentFolderId}`);
          const athomeInParent = await this.driveService.findFolderByName(grandParentFolderId, 'athome公開');
          if (athomeInParent) {
            const elapsedMs = Date.now() - startTime;
            console.log(`✅ Found "athome公開" in grandparent folder: ${athomeInParent} (${elapsedMs}ms)`);
            this.cacheFolderId(cacheKey, athomeInParent);
            return athomeInParent;
          }
          const atbbInParent = await this.driveService.findFolderByName(grandParentFolderId, 'atbb公開');
          if (atbbInParent) {
            const elapsedMs = Date.now() - startTime;
            console.log(`✅ Found "atbb公開" in grandparent folder: ${atbbInParent} (${elapsedMs}ms)`);
            this.cacheFolderId(cacheKey, atbbInParent);
            return atbbInParent;
          }
        }
      } catch (parentError: any) {
        console.warn(`⚠️ Error searching grandparent folder:`, parentError.message);
      }
      
      // 5. 公開用サブフォルダが見つからない場合はnullを返す（親フォルダは使用しない）
      const elapsedMs = Date.now() - startTime;
      console.log(`📁 No public subfolder found in parent: ${parentFolderId}, returning null (no fallback to parent) (${elapsedMs}ms)`);
      return null;
    } catch (error: any) {
      const elapsedMs = Date.now() - startTime;
      console.error(`⚠️ Error checking for public subfolders in parent: ${parentFolderId} (${elapsedMs}ms):`, error.message);
      console.error(`⚠️ No public subfolder found, returning null`);
      return null;
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
      // 検索順序: athome公開 → athome作成 → atbb公開（見つからない場合は画像なし）
      console.log(`🔍 [getImagesFromStorageUrl] Checking for public subfolder...`);
      const targetFolderId = await this.getPublicFolderIdIfExists(parentFolderId);
      console.log(`✅ [getImagesFromStorageUrl] Target folder ID: ${targetFolderId}`);

      // 公開用サブフォルダが見つからない場合は画像なしを返す
      if (!targetFolderId) {
        console.log(`[PropertyImageService] No public subfolder found in folder ${parentFolderId}, returning empty`);
        return {
          images: [],
          folderId: null,
          cached: false,
        };
      }

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
   * Visual photo selection is opt-in by availability of a server-side OpenAI key.
   * All photos originate from a verified athome公開/atbb公開 folder.
   * A durable DB claim and an atomic daily budget prevent public page refreshes
   * from causing repeated or unbounded paid API calls.
   * On any error, the existing filename-based image order is preserved.
   */
  async rankByOpenAIVision(folderId: string, images: PropertyImage[]): Promise<PropertyImage[]> {
    if (!process.env.OPENAI_API_KEY || images.length < 2) return images;

    const signature = createHash('sha256')
      .update(JSON.stringify(images.map(image => [image.id, image.modifiedTime])))
      .digest('hex');
    const reorder = (ids: string[]): PropertyImage[] => {
      const selected: PropertyImage[] = [];
      const used = new Set<string>();
      // The file explicitly named メイン always wins over the AI.
      const namedMain = images.find(image => /^メイン(?:\.[^.]+)?$/i.test(image.name.trim().normalize('NFKC')));
      if (namedMain) {
        selected.push(namedMain);
        used.add(namedMain.id);
      }
      for (const id of ids.slice(0, 3)) {
        const image = images.find(item => item.id === id);
        if (image && !used.has(id) && selected.length < 3) {
          selected.push(image);
          used.add(id);
        }
      }
      return [...selected, ...images.filter(image => !used.has(image.id))];
    };

    try {
      const { data: saved, error: readError } = await supabase
        .from('property_photo_ai_rankings')
        .select('fingerprint,status,top_image_ids')
        .eq('folder_id', folderId)
        .maybeSingle();
      if (readError) throw new Error('photo_ai_cache_read');
      if (saved && saved.fingerprint === signature) {
        return saved.status === 'ready' && Array.isArray(saved.top_image_ids)
          ? reorder(saved.top_image_ids)
          : images;
      }

      // RPC uses a transaction lock per folder and caps new paid calls at
      // five properties per Japan day, regardless of public GET traffic.
      const { data: reserved, error: reservationError } = await supabase.rpc(
        'reserve_property_photo_ai',
        { p_folder_id: folderId, p_fingerprint: signature, p_daily_limit: 5 }
      );
      if (reservationError || reserved !== true) return images;

      try {
        const candidates = images.slice(0, 36);
        const prepared: Array<{ index: number; dataUrl: string }> = [];
        let next = 0;
        // Bound Google Drive load; failed individual images are simply omitted.
        await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, async () => {
          while (next < candidates.length) {
            const index = next++;
            try {
              const image = await this.driveService.getImageData(candidates[index].id);
              if (image.buffer.length > 16 * 1024 * 1024) continue;
              const sharp = require('sharp') as typeof import('sharp');
              const thumbnail = await sharp(image.buffer)
                .rotate()
                .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 60 })
                .toBuffer();
              prepared.push({ index, dataUrl: 'data:image/jpeg;base64,' + thumbnail.toString('base64') });
            } catch {
              // Do not abort the full analysis because of one unreadable image.
            }
          }
        }));
        prepared.sort((a, b) => a.index - b.index);
        if (prepared.length < 2) throw new Error('photo_ai_insufficient_images');

        const parts: any[] = [{
          type: 'input_text',
          text: 'You select the best first THREE photos for a Japanese real estate listing. '
            + 'Inspect the ACTUAL PIXELS of the numbered images, not filenames. '
            + 'Prefer a clear exterior or land overview, then spacious living room, then a representative bedroom or other wide room. '
            + 'If a category does not exist, select the best diverse overview alternatives. '
            + 'Avoid remotes, switches, appliances close-ups, bathroom fixtures, details, floor plans, blurred images, watermarks, and duplicates. '
            + 'Return JSON ONLY in the exact shape {"top":[0,1,2]}, with three distinct zero-based indices from the images provided. '
            + 'Only the numbered photos in this request are valid choices.'
        }];
        for (const photo of prepared) {
          parts.push({ type: 'input_text', text: 'Photo ' + photo.index });
          parts.push({ type: 'input_image', image_url: photo.dataUrl, detail: 'low' });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 18000);
        let response: Response;
        try {
          response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4.1-mini',
              store: false,
              max_output_tokens: 180,
              input: [{ role: 'user', content: parts }]
            }),
            signal: controller.signal
          });
        } finally {
          clearTimeout(timer);
        }
        if (!response.ok) {
          // Record only the documented API error code, never the response body or credential.
          let reason = 'unknown';
          try {
            const problem: any = await response.json();
            const code = problem?.error?.code || problem?.error?.type;
            if (typeof code === 'string' && /^[a-z0-9_]{1,48}$/i.test(code)) reason = code;
          } catch {
            // Ignore malformed provider error payload.
          }
          throw new Error('photo_ai_openai_http_' + response.status + '_' + reason);
        }
        const payload: any = await response.json();
        const answer = (payload.output || []).flatMap((entry: any) => entry.content || [])
          .filter((part: any) => part.type === 'output_text')
          .map((part: any) => part.text || '').join('');
        const jsonMatch = answer.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('photo_ai_invalid_response');
        const parsed = JSON.parse(jsonMatch[0]);
        const available = new Set(prepared.map(item => item.index));
        if (!Array.isArray(parsed.top)) throw new Error('photo_ai_invalid_choices');
        const topIndices = [...new Set<number>(parsed.top)]
          .filter(index => Number.isInteger(index) && available.has(index)).slice(0, 3);
        if (topIndices.length !== 3) throw new Error('photo_ai_invalid_choices');
        const selectedIds = topIndices.map(index => candidates[index].id);
        const { error: writeError } = await supabase.from('property_photo_ai_rankings')
          .update({
            status: 'ready',
            top_image_ids: selectedIds,
            model: 'gpt-4.1-mini',
            error_code: null,
            updated_at: new Date().toISOString()
          })
          .eq('folder_id', folderId).eq('fingerprint', signature);
        if (writeError) throw new Error('photo_ai_cache_write');
        return reorder(selectedIds);
      } catch (error: any) {
        // Never expose secret keys, customer content, image data, or provider bodies.
        const code = String(error?.message || 'photo_ai_failure').slice(0, 75);
        console.warn('[PhotoAI] Classification unavailable, using filename fallback:', code);
        await supabase.from('property_photo_ai_rankings')
          .update({ status: 'failed', error_code: code, updated_at: new Date().toISOString() })
          .eq('folder_id', folderId).eq('fingerprint', signature);
        return images;
      }
    } catch {
      return images;
    }
  }

  /**
   * DriveFileをPropertyImage形式に変換
   */
  private convertToPropertyImages(driveFiles: DriveFile[]): PropertyImage[] {
    // Explicit file-name "メイン.jpg" continues to take precedence over automatic ordering.
    // Choose up to three representative photos; preserve relative order of every remaining file.
    const ordered = [...driveFiles].sort((a, b) =>
      Number(/^メイン(?:\.[^.]+)?$/i.test(b.name.trim().normalize('NFKC'))) -
      Number(/^メイン(?:\.[^.]+)?$/i.test(a.name.trim().normalize('NFKC')))
    );
    const isMain = (name: string) => /^メイン(?:\.[^.]+)?$/i.test(name.trim().normalize('NFKC'));
    const category = (name: string): number => {
      const value = name.normalize('NFKC').toLowerCase();
      // Equipment close-ups, floor plans and utility images must not displace a representative photo.
      if (/リモコン|スイッチ|給湯|コンセント|操作盤|設備|メーター|換気扇|レンジフード|コンロ|間取り|図面|panorama|remote|switch|control|floor.?plan/.test(value)) return 99;
      if (/外観|建物全景|住宅外観|戸建て外観|exterior|facade/.test(value)) return 0;
      if (/リビング|ldk|living|居間/.test(value)) return 1;
      if (/居室|洋室|和室|寝室|空室|bedroom|room/.test(value)) return 2;
      if (/キッチン|玄関|浴室|洗面|bath|kitchen/.test(value)) return 3;
      return 50;
    };
    const selected: DriveFile[] = [];
    const remaining = [...ordered];
    const mainIndex = remaining.findIndex(file => isMain(file.name));
    if (mainIndex >= 0) selected.push(...remaining.splice(mainIndex, 1));

    // Prefer diversity (exterior, living, room) rather than three near-identical photos.
    for (const rank of [0, 1, 2, 3]) {
      if (selected.length >= 3) break;
      const index = remaining.findIndex(file => category(file.name) === rank);
      if (index >= 0) selected.push(...remaining.splice(index, 1));
    }
    while (selected.length < 3 && remaining.length > 0) {
      const index = remaining.findIndex(file => category(file.name) < 99);
      selected.push(...remaining.splice(index >= 0 ? index : 0, 1));
    }
    return [...selected, ...remaining].map(file => ({
      id: file.id,
      name: file.name,
      thumbnailUrl: `/api/public/images/${file.id}/thumbnail`,
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
    // 検索順序: athome公開 → athome作成 → atbb公開（見つからない場合は画像なし）
    const targetFolderId = await this.getPublicFolderIdIfExists(parentFolderId);

    // 公開用サブフォルダが見つからない場合は画像なしを返す
    if (!targetFolderId) {
      console.log(`[PropertyImageService] No public subfolder found for property ${propertyId}, returning empty`);
      return [];
    }

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
