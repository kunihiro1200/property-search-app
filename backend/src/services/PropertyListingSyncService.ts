// Property Listing Sync Service
// Creates missing property_listings records from sellers table data
// AND syncs updates from spreadsheet to database
import { createClient } from '@supabase/supabase-js';
import { DataIntegrityDiagnosticService } from './DataIntegrityDiagnosticService';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { PropertyListingColumnMapper } from './PropertyListingColumnMapper';

export interface SyncResult {
  propertyNumber: string;
  success: boolean;
  action: 'created' | 'already_exists' | 'failed' | 'no_seller_data';
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  property_number?: string;
  fields_updated?: string[];
  error?: string;
}

export interface PropertyListingUpdate {
  property_number: string;
  changed_fields: Record<string, {
    old: any;
    new: any;
  }>;
  spreadsheet_data: Record<string, any>;
}

export interface UpdateSyncResult {
  total: number;
  updated: number;
  failed: number;
  duration_ms: number;
  errors?: Array<{
    property_number: string;
    error: string;
  }>;
}

export class PropertyListingSyncService {
  private supabase;
  private diagnosticService: DataIntegrityDiagnosticService;
  private sheetsClient?: GoogleSheetsClient;
  private columnMapper: PropertyListingColumnMapper;
  private gyomuListService?: any; // GyomuListServiceのインスタンスをキャッシュ
  private driveService?: any; // GoogleDriveServiceのインスタンスをキャッシュ

  constructor(sheetsClient?: GoogleSheetsClient) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.diagnosticService = new DataIntegrityDiagnosticService();
    this.sheetsClient = sheetsClient;
    this.columnMapper = new PropertyListingColumnMapper();
  }

  /**
   * Sync a single property_listing from seller data
   */
  async syncFromSeller(propertyNumber: string): Promise<SyncResult> {
    try {
      // First, diagnose the property
      const diagnostic = await this.diagnosticService.diagnoseProperty(propertyNumber);

      // If property_listing already exists, no need to sync
      if (diagnostic.existsInPropertyListings) {
        return {
          propertyNumber,
          success: true,
          action: 'already_exists',
        };
      }

      // If seller data doesn't exist, cannot sync
      if (!diagnostic.existsInSellers || !diagnostic.sellerData) {
        return {
          propertyNumber,
          success: false,
          action: 'no_seller_data',
          error: 'No seller data found for this property number',
        };
      }

      // Get full seller data
      const { data: seller, error: sellerError } = await this.supabase
        .from('sellers')
        .select('*')
        .eq('property_number', propertyNumber)
        .single();

      if (sellerError || !seller) {
        return {
          propertyNumber,
          success: false,
          action: 'failed',
          error: `Failed to fetch seller data: ${sellerError?.message || 'Not found'}`,
        };
      }

      // Map seller fields to property_listing fields
      const propertyListingData = await this.mapSellerToPropertyListing(seller);

      // Insert into property_listings
      const { error: insertError } = await this.supabase
        .from('property_listings')
        .insert(propertyListingData)
        .select()
        .single();

      if (insertError) {
        return {
          propertyNumber,
          success: false,
          action: 'failed',
          error: `Failed to create property_listing: ${insertError.message}`,
        };
      }

      return {
        propertyNumber,
        success: true,
        action: 'created',
      };
    } catch (error: any) {
      return {
        propertyNumber,
        success: false,
        action: 'failed',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Sync multiple property_listings in batch
   */
  async syncBatch(propertyNumbers: string[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const propertyNumber of propertyNumbers) {
      const result = await this.syncFromSeller(propertyNumber);
      results.push(result);
      
      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Sync all missing property_listings
   */
  async syncAllMissing(): Promise<SyncResult[]> {
    // Find all missing property_listings
    const missingPropertyNumbers = await this.diagnosticService.findAllMissingPropertyListings();

    if (missingPropertyNumbers.length === 0) {
      return [];
    }

    console.log(`Found ${missingPropertyNumbers.length} missing property_listings. Starting sync...`);

    // Sync in batches
    return await this.syncBatch(missingPropertyNumbers);
  }

  /**
   * 業務リストから格納先URLを取得し、athome公開フォルダのURLを返す
   * 
   * @param propertyNumber 物件番号
   * @returns athome公開フォルダのURL（見つからない場合は親フォルダURL）
   */
  private async getStorageUrlFromGyomuList(propertyNumber: string): Promise<string | null> {
    try {
      // 業務リストサービスのインスタンスを初回のみ作成（キャッシュ）
      if (!this.gyomuListService) {
        const { GyomuListService } = await import('./GyomuListService');
        this.gyomuListService = new GyomuListService();
      }
      
      // Google Driveサービスのインスタンスを初回のみ作成（キャッシュ）
      if (!this.driveService) {
        const { GoogleDriveService } = await import('./GoogleDriveService');
        this.driveService = new GoogleDriveService();
      }
      
      const gyomuData = await this.gyomuListService.getByPropertyNumber(propertyNumber);
      
      if (gyomuData && gyomuData.storageUrl) {
        console.log(`[PropertyListingSyncService] Found storage_url in 業務リスト for ${propertyNumber}: ${gyomuData.storageUrl}`);
        
        // 親フォルダURLからathome公開フォルダのURLを取得
        const athomePublicUrl = await this.findAthomePublicFolderUrl(gyomuData.storageUrl, propertyNumber, this.driveService);
        
        if (athomePublicUrl) {
          console.log(`[PropertyListingSyncService] Found athome公開 folder URL for ${propertyNumber}: ${athomePublicUrl}`);
          return athomePublicUrl;
        }
        
        // athome公開フォルダが見つからない場合は親フォルダURLを返す
        console.log(`[PropertyListingSyncService] athome公開 folder not found, using parent folder URL for ${propertyNumber}`);
        return gyomuData.storageUrl;
      }
      
      console.log(`[PropertyListingSyncService] No storage_url found in 業務リスト for ${propertyNumber}`);
      return null;
      
    } catch (error: any) {
      console.error(`[PropertyListingSyncService] Error getting storage_url from 業務リスト for ${propertyNumber}:`, error.message);
      return null;
    }
  }

  /**
   * 親フォルダURLからathome公開フォルダのURLを取得
   * 
   * @param parentFolderUrl 親フォルダのURL
   * @param propertyNumber 物件番号
   * @param driveService GoogleDriveServiceインスタンス
   * @returns athome公開フォルダのURL、見つからない場合はnull
   */
  private async findAthomePublicFolderUrl(
    parentFolderUrl: string,
    propertyNumber: string,
    driveService: any
  ): Promise<string | null> {
    try {
      // URLからフォルダIDを抽出
      const folderIdMatch = parentFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (!folderIdMatch) {
        console.log(`[PropertyListingSyncService] Invalid folder URL format: ${parentFolderUrl}`);
        return null;
      }
      
      const parentFolderId = folderIdMatch[1];
      console.log(`[PropertyListingSyncService] Searching for athome公開 in parent folder: ${parentFolderId}`);
      
      // 1. 物件番号を含むサブフォルダを検索
      const propertyFolderId = await this.findPropertyFolderInParent(parentFolderId, propertyNumber, driveService);
      
      if (!propertyFolderId) {
        console.log(`[PropertyListingSyncService] Property folder not found for ${propertyNumber} in ${parentFolderId}`);
        return null;
      }
      
      console.log(`[PropertyListingSyncService] Found property folder: ${propertyFolderId}`);
      
      // 2. 物件フォルダ内でathome公開フォルダを検索
      const athomeFolderId = await driveService.findFolderByName(propertyFolderId, 'athome公開', true);
      
      if (!athomeFolderId) {
        console.log(`[PropertyListingSyncService] athome公開 folder not found in property folder: ${propertyFolderId}`);
        return null;
      }
      
      // 3. athome公開フォルダのURLを生成
      const athomePublicUrl = `https://drive.google.com/drive/folders/${athomeFolderId}`;
      return athomePublicUrl;
      
    } catch (error: any) {
      console.error(`[PropertyListingSyncService] Error finding athome公開 folder:`, error.message);
      return null;
    }
  }

  /**
   * 親フォルダ内で物件番号を含むサブフォルダを検索
   * 
   * @param parentFolderId 親フォルダID
   * @param propertyNumber 物件番号
   * @param driveService GoogleDriveServiceインスタンス
   * @returns 物件フォルダID、見つからない場合はnull
   */
  private async findPropertyFolderInParent(
    parentFolderId: string,
    propertyNumber: string,
    driveService: any
  ): Promise<string | null> {
    try {
      // サブフォルダ一覧を取得
      const subfolders = await driveService.listSubfolders(parentFolderId);
      
      console.log(`[PropertyListingSyncService] Found ${subfolders.length} subfolders in parent`);
      
      // 物件番号を含むフォルダを検索
      const propertyFolder = subfolders.find((folder: any) => 
        folder.name && folder.name.includes(propertyNumber)
      );
      
      if (propertyFolder) {
        console.log(`[PropertyListingSyncService] Found property folder: ${propertyFolder.name} (${propertyFolder.id})`);
        return propertyFolder.id;
      }
      
      return null;
      
    } catch (error: any) {
      console.error(`[PropertyListingSyncService] Error finding property folder:`, error.message);
      return null;
    }
  }

  /**
   * Map seller fields to property_listing fields
   * 
   * Maps data from sellers table to property_listings table format.
   * Note: storage_location uses site_url (preferred) with fallback to site
   * 
   * ⚠️ 重要: storage_locationは親フォルダURLのため、
   * 実際の画像取得時にはathome公開フォルダを検索する必要がある
   */
  private async mapSellerToPropertyListing(seller: any): Promise<any> {
    // storage_locationの取得（athome公開フォルダURLを優先）
    let storageLocation = seller.site_url || seller.site;
    
    // 業務リストからathome公開フォルダURLを取得を試みる
    if (storageLocation) {
      try {
        const athomePublicUrl = await this.getStorageUrlFromGyomuList(seller.property_number);
        if (athomePublicUrl) {
          storageLocation = athomePublicUrl;
          console.log(`[PropertyListingSyncService] Using athome公開 URL for ${seller.property_number}: ${storageLocation}`);
        }
      } catch (error: any) {
        console.error(`[PropertyListingSyncService] Error getting athome公開 URL for ${seller.property_number}:`, error.message);
        // エラーの場合は元のURLを使用
      }
    }
    
    return {
      property_number: seller.property_number,
      seller_number: seller.seller_number,
      seller_name: seller.name,
      address: seller.address,
      city: seller.city,
      prefecture: seller.prefecture,
      price: seller.price,
      property_type: seller.property_type,
      land_area: seller.land_area,
      building_area: seller.building_area,
      build_year: seller.build_year,
      structure: seller.structure,
      floors: seller.floors,
      rooms: seller.rooms,
      parking: seller.parking,
      status: seller.status,
      inquiry_date: seller.inquiry_date,
      inquiry_source: seller.inquiry_source,
      sales_assignee: seller.sales_assignee,
      sales_assignee_name: seller.sales_assignee_name,
      valuation_assignee: seller.valuation_assignee,
      valuation_assignee_name: seller.valuation_assignee_name,
      valuation_amount: seller.valuation_amount,
      valuation_date: seller.valuation_date,
      valuation_method: seller.valuation_method,
      confidence: seller.confidence,
      exclusive: seller.exclusive,
      exclusive_date: seller.exclusive_date,
      exclusive_action: seller.exclusive_action,
      visit_date: seller.visit_date,
      visit_time: seller.visit_time,
      visit_assignee: seller.visit_assignee,
      visit_assignee_name: seller.visit_assignee_name,
      visit_department: seller.visit_department,
      document_delivery_date: seller.document_delivery_date,
      follow_up_progress: seller.follow_up_progress,
      competitor: seller.competitor,
      pinrich: seller.pinrich,
      seller_situation: seller.seller_situation,
      site: seller.site,
      google_map_url: seller.google_map_url,
      // Storage location: athome公開フォルダURL（取得できた場合）または親フォルダURL
      storage_location: storageLocation,
      other_section_1: seller.other_section_1,
      other_section_2: seller.other_section_2,
      other_section_3: seller.other_section_3,
      other_section_4: seller.other_section_4,
      other_section_5: seller.other_section_5,
      other_section_6: seller.other_section_6,
      other_section_7: seller.other_section_7,
      other_section_8: seller.other_section_8,
      other_section_9: seller.other_section_9,
      other_section_10: seller.other_section_10,
      other_section_11: seller.other_section_11,
      other_section_12: seller.other_section_12,
      other_section_13: seller.other_section_13,
      other_section_14: seller.other_section_14,
      other_section_15: seller.other_section_15,
      other_section_16: seller.other_section_16,
      other_section_17: seller.other_section_17,
      other_section_18: seller.other_section_18,
      other_section_19: seller.other_section_19,
      other_section_20: seller.other_section_20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // ============================================================================
  // UPDATE SYNC FUNCTIONALITY (NEW)
  // ============================================================================

  /**
   * Detect property listings that have been updated in the spreadsheet
   * 
   * Compares spreadsheet data with database data to find properties with changes.
   * Returns list of properties that need to be updated.
   */
  async detectUpdatedPropertyListings(): Promise<PropertyListingUpdate[]> {
    if (!this.sheetsClient) {
      throw new Error('GoogleSheetsClient not configured for update sync');
    }

    // 1. Read all property listings from spreadsheet
    const spreadsheetData = await this.sheetsClient.readAll();

    // 2. Read all property listings from database (with pagination)
    const dbData: any[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: pageData, error: dbError } = await this.supabase
        .from('property_listings')
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (dbError) {
        throw new Error(`Failed to read database: ${dbError.message}`);
      }

      if (!pageData || pageData.length === 0) {
        hasMore = false;
      } else {
        dbData.push(...pageData);
        offset += pageSize;
        
        // If we got less than pageSize, we're done
        if (pageData.length < pageSize) {
          hasMore = false;
        }
      }
    }

    console.log(`📊 Database properties loaded: ${dbData.length}`);

    // 3. Create lookup map for database properties
    const dbMap = new Map(
      dbData.map(p => [p.property_number, p])
    );

    // 4. Compare and detect changes
    const updates: PropertyListingUpdate[] = [];

    for (const row of spreadsheetData) {
      const propertyNumber = String(row['物件番号'] || '').trim();
      
      if (!propertyNumber) continue;

      const dbProperty = dbMap.get(propertyNumber);

      // Skip if property doesn't exist in database (that's an INSERT, not UPDATE)
      if (!dbProperty) continue;

      // Detect changes between spreadsheet and database
      const changes = this.detectChanges(row, dbProperty);

      if (Object.keys(changes).length > 0) {
        updates.push({
          property_number: propertyNumber,
          changed_fields: changes,
          spreadsheet_data: row
        });
      }
    }

    return updates;
  }

  /**
   * Update a single property listing in the database
   * 
   * @param propertyNumber - Property number to update
   * @param updates - Partial property listing data to update
   * @returns Result indicating success or failure
   */
  async updatePropertyListing(
    propertyNumber: string,
    updates: Partial<any>
  ): Promise<UpdateResult> {
    try {
      // 1. Validate property exists
      const { data: existing, error } = await this.supabase
        .from('property_listings')
        .select('property_number')
        .eq('property_number', propertyNumber)
        .single();

      if (error || !existing) {
        return {
          success: false,
          property_number: propertyNumber,
          error: 'Property not found in database'
        };
      }

      // 2. Add updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // 3. Execute update
      const { error: updateError } = await this.supabase
        .from('property_listings')
        .update(updateData)
        .eq('property_number', propertyNumber);

      if (updateError) {
        return {
          success: false,
          property_number: propertyNumber,
          error: updateError.message
        };
      }

      return {
        success: true,
        property_number: propertyNumber,
        fields_updated: Object.keys(updates)
      };

    } catch (error: any) {
      return {
        success: false,
        property_number: propertyNumber,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Sync all updated property listings from spreadsheet to database
   * 
   * Main entry point for property listing update sync.
   * Detects changes and applies them in batches.
   * 
   * @returns Summary of sync operation
   */
  async syncUpdatedPropertyListings(): Promise<UpdateSyncResult> {
    const startTime = Date.now();

    try {
      console.log('🔄 Starting property listing update sync...');

      // 1. Detect updates
      const updates = await this.detectUpdatedPropertyListings();

      if (updates.length === 0) {
        console.log('✅ No updates detected - all properties are synchronized');
        return {
          total: 0,
          updated: 0,
          failed: 0,
          duration_ms: Date.now() - startTime
        };
      }

      console.log(`📊 Detected ${updates.length} properties with changes`);

      // 1.5. 業務リストのキャッシュを事前にリフレッシュ（Google Sheets APIクォータ対策）
      console.log('📋 Pre-loading 業務リスト cache to avoid API quota issues...');
      try {
        const { GyomuListService } = await import('./GyomuListService');
        const gyomuListService = new GyomuListService();
        // ダミーの物件番号で呼び出してキャッシュをリフレッシュ
        await gyomuListService.getByPropertyNumber('DUMMY');
        console.log('✅ 業務リスト cache pre-loaded');
      } catch (error: any) {
        console.warn('⚠️ Failed to pre-load 業務リスト cache:', error.message);
        // エラーでも続行（業務リスト取得は必須ではない）
      }

      // 2. Process in batches
      const BATCH_SIZE = 10;
      const results: UpdateResult[] = [];

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} properties)...`);

        const batchResults = await Promise.all(
          batch.map(async (update) => {
            try {
              // Map spreadsheet data to database format
              const mappedUpdates = this.columnMapper.mapSpreadsheetToDatabase(
                update.spreadsheet_data
              );

              // Only include changed fields
              const changedFieldsOnly: any = {};
              for (const dbField of Object.keys(update.changed_fields)) {
                if (mappedUpdates.hasOwnProperty(dbField)) {
                  changedFieldsOnly[dbField] = mappedUpdates[dbField];
                }
              }

              // 業務リストから格納先URLを取得（storage_locationが空の場合）
              // キャッシュが事前にロードされているため、API呼び出しは発生しない
              if (!changedFieldsOnly.storage_location || changedFieldsOnly.storage_location === null) {
                const storageUrlFromGyomu = await this.getStorageUrlFromGyomuList(update.property_number);
                if (storageUrlFromGyomu) {
                  changedFieldsOnly.storage_location = storageUrlFromGyomu;
                  console.log(`[PropertyListingSyncService] Added storage_location from 業務リスト for ${update.property_number}`);
                }
              }

              // 追加データも取得して保存（初回から高速表示のため）
              // エラーが発生しても処理を続行（エラーハンドリング済み）
              await this.updatePropertyDetailsFromSheets(update.property_number);

              return await this.updatePropertyListing(
                update.property_number,
                changedFieldsOnly
              );
            } catch (error: any) {
              return {
                success: false,
                property_number: update.property_number,
                error: error.message
              };
            }
          })
        );

        results.push(...batchResults);

        // Log batch results
        const batchSuccess = batchResults.filter(r => r.success).length;
        const batchFailed = batchResults.filter(r => !r.success).length;
        console.log(`  ✅ ${batchSuccess} updated, ❌ ${batchFailed} failed`);
        
        // Google Sheets APIのレート制限を考慮（バッチ間に1秒待機）
        if (i + BATCH_SIZE < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 3. Collect summary
      const summary: UpdateSyncResult = {
        total: updates.length,
        updated: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        duration_ms: Date.now() - startTime,
        errors: results
          .filter(r => !r.success)
          .map(r => ({
            property_number: r.property_number || 'unknown',
            error: r.error || 'Unknown error'
          }))
      };

      // 4. Log to sync_logs
      await this.logSyncResult('property_listing_update', summary);

      // 5. Print summary
      console.log('\n📊 Sync Summary:');
      console.log(`  Total: ${summary.total}`);
      console.log(`  Updated: ${summary.updated}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Duration: ${summary.duration_ms}ms`);

      if (summary.failed > 0) {
        console.log('\n❌ Failed updates:');
        summary.errors?.forEach(err => {
          console.log(`  - ${err.property_number}: ${err.error}`);
        });
      }

      return summary;

    } catch (error: any) {
      console.error('❌ Sync failed:', error.message);
      
      // Log error
      await this.logSyncError('property_listing_update', error);
      
      throw error;
    }
  }

  /**
   * スプレッドシートから追加データを取得してデータベースに保存
   * （おすすめコメント、お気に入り文言、Athome情報、こちらの物件について）
   * property_detailsテーブルに保存（スキーマキャッシュ問題を回避）
   */
  private async updatePropertyDetailsFromSheets(propertyNumber: string): Promise<void> {
    try {
      console.log(`[PropertyListingSyncService] Updating property details for ${propertyNumber}`);
      
      // 必要なサービスを動的にインポート
      const { PropertyService } = await import('./PropertyService');
      const { RecommendedCommentService } = await import('./RecommendedCommentService');
      const { FavoriteCommentService } = await import('./FavoriteCommentService');
      const { AthomeDataService } = await import('./AthomeDataService');
      const { PropertyListingService } = await import('./PropertyListingService');
      const { PropertyDetailsService } = await import('./PropertyDetailsService');
      
      const propertyService = new PropertyService();
      const recommendedCommentService = new RecommendedCommentService();
      const favoriteCommentService = new FavoriteCommentService();
      const athomeDataService = new AthomeDataService();
      const propertyListingService = new PropertyListingService();
      const propertyDetailsService = new PropertyDetailsService();
      
      // 物件情報を取得
      const property = await propertyListingService.getByPropertyNumber(propertyNumber);
      
      if (!property) {
        console.error(`[PropertyListingSyncService] Property not found: ${propertyNumber}`);
        return;
      }
      
      // 並列でデータを取得
      const [propertyAbout, recommendedComment, favoriteComment, athomeData] = await Promise.all([
        propertyService.getPropertyAbout(propertyNumber).catch(err => {
          console.error(`[PropertyListingSyncService] Failed to get property_about for ${propertyNumber}:`, err);
          return null;
        }),
        
        recommendedCommentService.getRecommendedComment(
          propertyNumber,
          property.property_type,
          property.id
        ).catch(err => {
          console.error(`[PropertyListingSyncService] Failed to get recommended_comments for ${propertyNumber}:`, err);
          return { comments: [] };
        }),
        
        favoriteCommentService.getFavoriteComment(property.id).catch(err => {
          console.error(`[PropertyListingSyncService] Failed to get favorite_comment for ${propertyNumber}:`, err);
          return { comment: null };
        }),
        
        athomeDataService.getAthomeData(
          propertyNumber,
          property.property_type,
          property.storage_location
        ).catch(err => {
          console.error(`[PropertyListingSyncService] Failed to get athome_data for ${propertyNumber}:`, err);
          return { data: [] };
        })
      ]);
      
      // property_detailsテーブルにupsert（スキーマキャッシュ問題を回避）
      const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
        property_about: propertyAbout,
        recommended_comments: recommendedComment.comments,
        athome_data: athomeData.data,
        favorite_comment: favoriteComment.comment
      });
      
      if (!success) {
        throw new Error('Failed to upsert property details');
      }
      
      console.log(`[PropertyListingSyncService] Successfully updated property details for ${propertyNumber}`);
      
    } catch (error: any) {
      console.error(`[PropertyListingSyncService] Error updating property details for ${propertyNumber}:`, error);
    }
  }

  /**
   * Detect changes between spreadsheet row and database property
   * 
   * Compares all mapped columns and returns fields that have changed.
   * 
   * @param spreadsheetRow - Raw spreadsheet row data
   * @param dbProperty - Database property record
   * @returns Object with changed fields and their old/new values
   */
  private detectChanges(
    spreadsheetRow: any,
    dbProperty: any
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    // Map spreadsheet row to database format
    const mappedData = this.columnMapper.mapSpreadsheetToDatabase(spreadsheetRow);

    // Compare each field
    for (const [dbField, spreadsheetValue] of Object.entries(mappedData)) {
      // Skip metadata fields
      if (dbField === 'created_at' || dbField === 'updated_at') {
        continue;
      }

      // ⚠️ 重要: image_urlは手動更新ボタンで管理されるため、自動同期から除外
      if (dbField === 'image_url') {
        console.log(`[PropertyListingSyncService] Skipping image_url comparison (managed by manual refresh)`);
        continue;
      }

      // ⚠️ 重要: storage_locationは手動更新ボタンで管理されるため、自動同期から除外
      if (dbField === 'storage_location') {
        console.log(`[PropertyListingSyncService] Skipping storage_location comparison (managed by manual refresh)`);
        continue;
      }

      const dbValue = dbProperty[dbField];
      const normalizedSpreadsheetValue = this.normalizeValue(spreadsheetValue);
      const normalizedDbValue = this.normalizeValue(dbValue);

      if (normalizedSpreadsheetValue !== normalizedDbValue) {
        changes[dbField] = {
          old: normalizedDbValue,
          new: normalizedSpreadsheetValue
        };
      }
    }

    return changes;
  }

  /**
   * Normalize values for comparison
   * 
   * Handles null, undefined, empty strings, and whitespace.
   * 
   * @param value - Value to normalize
   * @returns Normalized value
   */
  private normalizeValue(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  }

  /**
   * Log sync result to sync_logs table
   */
  private async logSyncResult(syncType: string, summary: UpdateSyncResult): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          sync_type: syncType,
          started_at: new Date(Date.now() - summary.duration_ms).toISOString(),
          completed_at: new Date().toISOString(),
          status: summary.failed === 0 ? 'success' : 'partial_success',
          properties_updated: summary.updated,
          properties_failed: summary.failed,
          duration_ms: summary.duration_ms,
          error_details: summary.errors && summary.errors.length > 0 
            ? { errors: summary.errors }
            : null
        });
    } catch (error) {
      console.error('Failed to log sync result:', error);
    }
  }

  /**
   * Log sync error to sync_logs table
   */
  private async logSyncError(syncType: string, error: any): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          sync_type: syncType,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: 'error',
          properties_updated: 0,
          properties_failed: 0,
          duration_ms: 0,
          error_details: {
            error: error.message || 'Unknown error',
            stack: error.stack
          }
        });
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }
  }

  // ============================================================================
  // NEW PROPERTY ADDITION FUNCTIONALITY (Phase 4.6)
  // ============================================================================

  /**
   * Detect new properties that exist in spreadsheet but not in database
   * 
   * @returns Array of property numbers that need to be added
   */
  async detectNewProperties(): Promise<string[]> {
    if (!this.sheetsClient) {
      throw new Error('GoogleSheetsClient not configured');
    }

    console.log('🔍 Detecting new properties...');

    // 1. Read all properties from spreadsheet
    const spreadsheetData = await this.sheetsClient.readAll();
    const spreadsheetPropertyNumbers = new Set<string>();
    
    for (const row of spreadsheetData) {
      const propertyNumber = String(row['物件番号'] || '').trim();
      // 物件番号が空でなければすべて取得（AA, BB, CC, 久原など、すべての形式をサポート）
      if (propertyNumber) {
        spreadsheetPropertyNumbers.add(propertyNumber);
      }
    }

    console.log(`📊 Spreadsheet properties: ${spreadsheetPropertyNumbers.size}`);

    // 2. Read all property numbers from database (with pagination)
    const dbPropertyNumbers = new Set<string>();
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: dbProperties, error } = await this.supabase
        .from('property_listings')
        .select('property_number')
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Failed to read database: ${error.message}`);
      }

      if (!dbProperties || dbProperties.length === 0) {
        hasMore = false;
      } else {
        for (const property of dbProperties) {
          if (property.property_number) {
            dbPropertyNumbers.add(property.property_number);
          }
        }
        offset += pageSize;
        
        // If we got less than pageSize, we're done
        if (dbProperties.length < pageSize) {
          hasMore = false;
        }
      }
    }

    console.log(`📊 Database properties: ${dbPropertyNumbers.size}`);

    // 3. Find properties in spreadsheet but not in database
    const newProperties: string[] = [];
    for (const propertyNumber of spreadsheetPropertyNumbers) {
      if (!dbPropertyNumbers.has(propertyNumber)) {
        newProperties.push(propertyNumber);
      }
    }

    // Sort by property number
    newProperties.sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    console.log(`🆕 New properties detected: ${newProperties.length}`);
    if (newProperties.length > 0) {
      console.log(`   First few: ${newProperties.slice(0, 5).join(', ')}${newProperties.length > 5 ? '...' : ''}`);
    }

    return newProperties;
  }

  /**
   * Add a new property to database
   * 
   * Phase 4.6: 物件リスト(property_listings)のみの同期
   * 売主(sellers)テーブルの操作は行わない
   * 
   * @param spreadsheetRow - Spreadsheet row data
   * @returns Success result
   */
  private async addNewProperty(
    spreadsheetRow: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get property number
      const propertyNumber = String(spreadsheetRow['物件番号'] || '').trim();
      if (!propertyNumber) {
        throw new Error('Property number is required');
      }

      // 2. Map spreadsheet data to property_listings format
      const propertyData = this.columnMapper.mapSpreadsheetToDatabase(spreadsheetRow);

      // 3. 業務リストから格納先URLを取得（storage_locationが空の場合）
      if (!propertyData.storage_location || propertyData.storage_location === null) {
        const storageUrlFromGyomu = await this.getStorageUrlFromGyomuList(propertyNumber);
        if (storageUrlFromGyomu) {
          propertyData.storage_location = storageUrlFromGyomu;
          console.log(`[PropertyListingSyncService] Added storage_location from 業務リスト for ${propertyNumber}`);
        }
      }

      // 4. Add timestamps
      propertyData.created_at = new Date().toISOString();
      propertyData.updated_at = new Date().toISOString();

      // 5. Insert into database (property_listings table only)
      const { error: insertError } = await this.supabase
        .from('property_listings')
        .insert(propertyData);

      if (insertError) {
        throw new Error(insertError.message);
      }

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Sync new properties from spreadsheet to database
   * 
   * Main entry point for new property addition.
   * Detects new properties and adds them in batches.
   * 
   * @returns Summary of sync operation
   */
  async syncNewProperties(): Promise<{
    total: number;
    added: number;
    failed: number;
    duration_ms: number;
    errors?: Array<{ property_number: string; error: string }>;
  }> {
    const startTime = Date.now();

    try {
      console.log('🆕 Starting new property addition sync...');

      // 1. Detect new properties
      const newPropertyNumbers = await this.detectNewProperties();

      if (newPropertyNumbers.length === 0) {
        console.log('✅ No new properties detected');
        return {
          total: 0,
          added: 0,
          failed: 0,
          duration_ms: Date.now() - startTime
        };
      }

      console.log(`📊 Detected ${newPropertyNumbers.length} new properties`);

      // 2. Get spreadsheet data for new properties
      const spreadsheetData = await this.sheetsClient!.readAll();
      const spreadsheetMap = new Map(
        spreadsheetData.map(row => [
          String(row['物件番号'] || '').trim(),
          row
        ])
      );

      // 3. Process in batches
      const BATCH_SIZE = 10;
      let added = 0;
      let failed = 0;
      const errors: Array<{ property_number: string; error: string }> = [];

      for (let i = 0; i < newPropertyNumbers.length; i += BATCH_SIZE) {
        const batch = newPropertyNumbers.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(newPropertyNumbers.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} properties)...`);

        for (const propertyNumber of batch) {
          const spreadsheetRow = spreadsheetMap.get(propertyNumber);
          
          if (!spreadsheetRow) {
            failed++;
            errors.push({
              property_number: propertyNumber,
              error: 'Spreadsheet data not found'
            });
            continue;
          }

          const result = await this.addNewProperty(spreadsheetRow);

          if (result.success) {
            added++;
            console.log(`  ✅ ${propertyNumber}: Added`);
          } else {
            failed++;
            errors.push({
              property_number: propertyNumber,
              error: result.error || 'Unknown error'
            });
            console.log(`  ❌ ${propertyNumber}: ${result.error}`);
          }
        }

        // Delay between batches
        if (i + BATCH_SIZE < newPropertyNumbers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // 4. Log summary
      const summary = {
        total: newPropertyNumbers.length,
        added,
        updated: 0,
        failed,
        duration_ms: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      };

      await this.logSyncResult('new_property_addition', summary);

      console.log('\n📊 Sync Summary:');
      console.log(`  Total: ${summary.total}`);
      console.log(`  Added: ${summary.added}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Duration: ${summary.duration_ms}ms`);

      return summary;

    } catch (error: any) {
      console.error('❌ Sync failed:', error.message);
      await this.logSyncError('new_property_addition', error);
      throw error;
    }
  }
}
