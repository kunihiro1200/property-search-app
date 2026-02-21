// 物件リストのCRUDサービス
import { createClient } from '@supabase/supabase-js';
import { PropertyDistributionAreaCalculator } from './PropertyDistributionAreaCalculator.js';
import { CityNameExtractor } from './CityNameExtractor.js';
import { PropertyImageService } from './PropertyImageService.js';
import { GoogleDriveService } from './GoogleDriveService.js';
import { GeocodingService } from './GeocodingService.js';
import { PropertyDetailsService } from './PropertyDetailsService.js';
import { GoogleSheetsClient } from './GoogleSheetsClient.js';

export class PropertyListingService {
  private supabase;
  private distributionCalculator: PropertyDistributionAreaCalculator;
  private cityExtractor: CityNameExtractor;
  private propertyImageService: PropertyImageService;
  private geocodingService: GeocodingService;

  constructor(driveService?: GoogleDriveService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.distributionCalculator = new PropertyDistributionAreaCalculator();
    this.cityExtractor = new CityNameExtractor();
    
    // PropertyImageServiceの設定を環境変数から読み込む
    const folderIdCacheTTLMinutes = parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10);
    const searchTimeoutSeconds = parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10);
    const maxSubfoldersToSearch = parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10);
    
    // GoogleDriveServiceが渡された場合は注入、なければ新規作成（後方互換性）
    if (driveService) {
      this.propertyImageService = new PropertyImageService(
        driveService, // GoogleDriveServiceシングルトンを注入
        60, // cacheTTLMinutes（画像キャッシュ）
        folderIdCacheTTLMinutes,
        searchTimeoutSeconds,
        maxSubfoldersToSearch
      );
    } else {
      // 後方互換性のため、GoogleDriveServiceが渡されない場合は新規作成
      const newDriveService = new GoogleDriveService();
      this.propertyImageService = new PropertyImageService(
        newDriveService,
        60, // cacheTTLMinutes（画像キャッシュ）
        folderIdCacheTTLMinutes,
        searchTimeoutSeconds,
        maxSubfoldersToSearch
      );
    }
    
    this.geocodingService = new GeocodingService();
  }

  async getAll(options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    search?: string;
    status?: string;
    salesAssignee?: string;
    propertyType?: string;
  } = {}) {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      search,
      status,
      salesAssignee,
      propertyType,
    } = options;

    let query = this.supabase
      .from('property_listings')
      .select(`
        id,
        property_number,
        property_type,
        address,
        price,
        land_area,
        building_area,
        construction_year_month,
        floor_plan,
        image_url,
        google_map_url,
        atbb_status,
        special_notes,
        storage_location,
        seller_name,
        sales_assignee,
        status,
        site_display,
        created_at,
        updated_at
      `, { count: 'exact' });

    // フィルタリング
    if (search) {
      query = query.or(`property_number.ilike.%${search}%,address.ilike.%${search}%,seller_name.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (salesAssignee) {
      query = query.eq('sales_assignee', salesAssignee);
    }
    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    // ソート
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch property listings: ${error.message}`);
    }

    // 軽量化: storage_locationの補完は詳細ページでのみ実行
    // リスト表示では補完をスキップしてパフォーマンスを向上
    return { data: data || [], total: count || 0 };
  }

  async getByPropertyNumber(propertyNumber: string) {
    const { data, error } = await this.supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch property listing: ${error.message}`);
    }

    // storage_locationが空の場合、work_tasksから取得
    if (!data.storage_location && data.property_number) {
      const storageUrl = await this.getStorageUrlFromWorkTasks(data.property_number);
      if (storageUrl) {
        console.log(`[PropertyListingService] Enriched storage_location for ${data.property_number} from work_tasks`);
        return { ...data, storage_location: storageUrl };
      }
    }

    return data;
  }

  async update(propertyNumber: string, updates: Record<string, any>) {
    // 住所またはGoogle Map URLが更新された場合、配信エリアを再計算
    if (updates.address || updates.google_map_url) {
      try {
        // 現在の物件情報を取得
        const currentProperty = await this.getByPropertyNumber(propertyNumber);
        
        if (currentProperty) {
          // 更新後の値を使用（更新がない場合は現在の値を使用）
          const address = updates.address || currentProperty.address;
          const googleMapUrl = updates.google_map_url !== undefined 
            ? updates.google_map_url 
            : currentProperty.google_map_url;
          
          // 市名を抽出
          const city = this.cityExtractor.extractCityFromAddress(address);
          
          // 配信エリアを計算
          const result = await this.distributionCalculator.calculateDistributionAreas(
            googleMapUrl,
            city,
            address
          );
          
          // 配信エリアを更新データに追加（distribution_areasカラムが存在しないため一旦無効化）
          // updates.distribution_areas = result.formatted;
          
          console.log(`[PropertyListingService] Recalculated distribution areas for ${propertyNumber}: ${result.formatted}`);
          
          // 住所が更新された場合、座標もジオコーディング
          if (updates.address) {
            console.log(`[PropertyListingService] Geocoding address for ${propertyNumber}: ${address}`);
            const coordinates = await this.geocodingService.geocodeAddress(address);
            
            if (coordinates) {
              updates.latitude = coordinates.latitude;
              updates.longitude = coordinates.longitude;
              console.log(`[PropertyListingService] Updated coordinates for ${propertyNumber}: (${coordinates.latitude}, ${coordinates.longitude})`);
            } else {
              console.warn(`[PropertyListingService] Failed to geocode address for ${propertyNumber}`);
            }
          }
        }
      } catch (error) {
        console.error(`[PropertyListingService] Failed to recalculate distribution areas:`, error);
        // エラーが発生しても更新は続行
      }
    }

    const { data, error } = await this.supabase
      .from('property_listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('property_number', propertyNumber)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update property listing: ${error.message}`);
    }

    return data;
  }

  async getStats() {
    // 担当者別件数
    const { data: byAssignee } = await this.supabase
      .from('property_listings')
      .select('sales_assignee')
      .not('sales_assignee', 'is', null);

    // 種別別件数
    const { data: byType } = await this.supabase
      .from('property_listings')
      .select('property_type')
      .not('property_type', 'is', null);

    // 状況別件数
    const { data: byStatus } = await this.supabase
      .from('property_listings')
      .select('status')
      .not('status', 'is', null);

    const assigneeCounts: Record<string, number> = {};
    byAssignee?.forEach(row => {
      const key = row.sales_assignee || '未設定';
      assigneeCounts[key] = (assigneeCounts[key] || 0) + 1;
    });

    const typeCounts: Record<string, number> = {};
    byType?.forEach(row => {
      const key = row.property_type || '未設定';
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    });

    const statusCounts: Record<string, number> = {};
    byStatus?.forEach(row => {
      const key = row.status || '未設定';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });

    return {
      byAssignee: assigneeCounts,
      byType: typeCounts,
      byStatus: statusCounts,
    };
  }

  // 物件タイプを日本語から英語に変換（フロントエンド用）
  private convertPropertyTypeToEnglish(japaneseType: string | null | undefined): string {
    const typeMapping: Record<string, string> = {
      '戸建': 'detached_house',
      'マンション': 'apartment',
      '土地': 'land',
      '収益物件': 'other',
      '店舗付住宅': 'other',
      'その他': 'other'
    };
    
    if (!japaneseType) {
      return 'other';
    }
    
    return typeMapping[japaneseType] || 'other';
  }

  // 公開物件一覧取得（すべての物件を表示、atbb_statusに基づいてバッジを表示）- Supabase REST APIを使用
  async getPublicProperties(options: {
    limit?: number;
    offset?: number;
    propertyType?: string | string[];  // 単一または複数の物件タイプをサポート
    priceRange?: { min?: number; max?: number };
    areas?: string[];
    location?: string;  // NEW: 所在地フィルター（部分一致）
    propertyNumber?: string;  // NEW: 物件番号フィルター（部分一致）
    buildingAgeRange?: { min?: number; max?: number };  // NEW: 築年数フィルター
    showPublicOnly?: boolean;  // NEW: 公開中のみ表示フィルター
    withCoordinates?: boolean;  // NEW: 座標がある物件のみ取得
    skipImages?: boolean;  // NEW: 画像取得をスキップ（地図ビュー用）
  } = {}) {
    const {
      limit = 20,
      offset = 0,
      propertyType,
      priceRange,
      areas,
      location,  // NEW
      propertyNumber,  // NEW
      buildingAgeRange,  // NEW
      showPublicOnly = false,  // NEW
      withCoordinates = false,  // NEW
      skipImages = false,  // NEW
    } = options;

    try {
      // Supabase REST APIを使用
      // すべての物件を取得（atbb_statusフィルターを削除）
      let query = this.supabase
        .from('property_listings')
        .select('id, property_number, property_type, address, sales_price, listing_price, land_area, building_area, construction_year_month, image_url, storage_location, atbb_status, google_map_url, latitude, longitude, distribution_date, created_at', { count: 'exact' });
      
      // 複数物件タイプのフィルタリングをサポート
      if (propertyType) {
        if (Array.isArray(propertyType)) {
          // 複数タイプの場合、OR条件で検索
          if (propertyType.length > 0) {
            query = query.in('property_type', propertyType);
          }
        } else {
          // 単一タイプの場合
          query = query.eq('property_type', propertyType);
        }
      }
      
      if (priceRange?.min !== undefined) {
        // sales_priceまたはlisting_priceが最小価格以上
        query = query.or(`sales_price.gte.${priceRange.min},listing_price.gte.${priceRange.min}`);
      }
      
      if (priceRange?.max !== undefined) {
        // sales_priceまたはlisting_priceが最大価格以下
        query = query.or(`sales_price.lte.${priceRange.max},listing_price.lte.${priceRange.max}`);
      }
      
      // エリアフィルターは一旦無効化（distribution_areasカラムが存在しないため）
      // if (areas && areas.length > 0) {
      //   // エリアフィルタ: distribution_areasにいずれかのエリアが含まれる
      //   const areaConditions = areas.map(area => `distribution_areas.ilike.%${area}%`).join(',');
      //   query = query.or(areaConditions);
      // }
      
      // NEW: 所在地フィルター（部分一致、大文字小文字を区別しない）
      if (location) {
        // 入力をサニタイズ（トリムのみ、Supabaseが自動的にエスケープ）
        const sanitizedLocation = location.trim();
        if (sanitizedLocation) {
          query = query.ilike('address', `%${sanitizedLocation}%`);
        }
      }
      
      // NEW: 物件番号フィルター（完全一致、大文字小文字を区別しない）
      if (propertyNumber) {
        // 入力をサニタイズ（トリムのみ、Supabaseが自動的にエスケープ）
        const sanitizedNumber = propertyNumber.trim();
        if (sanitizedNumber) {
          // 完全一致検索（大文字小文字を区別しない）
          query = query.ilike('property_number', sanitizedNumber);
        }
      }
      
      // NEW: 公開中のみ表示フィルター
      if (showPublicOnly) {
        // atbb_statusに「公開中」「公開前」「非公開（配信メールのみ）」のいずれかが含まれる物件を表示
        // 「一般・公開前」も「公開前」に含まれるため、正しく表示される
        query = query
          .not('atbb_status', 'is', null)
          .or(
            'atbb_status.ilike.%公開中%,' +
            'atbb_status.ilike.%公開前%,' +
            'atbb_status.ilike.%非公開（配信メールのみ）%'
          );
      }
      
      // NEW: 座標がある物件のみ取得（地図表示用）
      if (withCoordinates) {
        console.log('[PropertyListingService] Applying withCoordinates filter');
        // 座標がnullでない物件のみを取得
        query = query
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
      }
      
      // NEW: 築年数フィルター
      // 築年数範囲を建築年月範囲に変換してフィルタリング
      if (buildingAgeRange) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 0-indexed, so add 1
        
        // minAge: 最小築年数（例: 5年以上古い）→ 最大建築年月を計算
        if (buildingAgeRange.min !== undefined && buildingAgeRange.min >= 0) {
          const maxConstructionYear = currentYear - buildingAgeRange.min;
          const maxYearMonth = `${maxConstructionYear}-${String(currentMonth).padStart(2, '0')}`;
          // construction_year_month <= maxYearMonth (文字列比較でYYYY-MM形式)
          query = query.lte('construction_year_month', maxYearMonth);
        }
        
        // maxAge: 最大築年数（例: 10年以下）→ 最小建築年月を計算
        if (buildingAgeRange.max !== undefined && buildingAgeRange.max >= 0) {
          const minConstructionYear = currentYear - buildingAgeRange.max;
          const minYearMonth = `${minConstructionYear}-${String(currentMonth).padStart(2, '0')}`;
          // construction_year_month >= minYearMonth (文字列比較でYYYY-MM形式)
          query = query.gte('construction_year_month', minYearMonth);
        }
        
        // construction_year_monthがnullの物件は除外
        query = query.not('construction_year_month', 'is', null);
      }
      
      // ソートとページネーション
      // 配信日（公開）の最新日順に並べ替え
      // distribution_dateがNULLの物件は最後に表示
      query = query
        .order('distribution_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }
      
      // 画像取得：image_url → storage_location
      // skipImages=trueの場合は画像取得をスキップ（地図ビュー用の高速化）
      const propertiesWithImages: any[] = [];
      
      if (skipImages) {
        // 画像取得をスキップ（地図ビュー用）
        console.log('🖼️🖼️🖼️ [PropertyListingService] Skipping image fetching (skipImages=true)');
        console.log('🖼️🖼️🖼️ [PropertyListingService] Processing', (data || []).length, 'properties');
        for (const property of data || []) {
          // デバッグ: atbb_statusの値を確認
          console.log(`🎨🎨🎨 [PropertyListingService] Property ${property.property_number} atbb_status: "${property.atbb_status}"`);
          
          const { price: _price, ...propertyWithoutPrice } = property; // priceカラムを除外
          propertiesWithImages.push({
            ...propertyWithoutPrice,
            price: property.sales_price || property.listing_price || 0,  // sales_priceを優先、なければlisting_price
            property_type: this.convertPropertyTypeToEnglish(property.property_type),
            atbb_status: property.atbb_status,
            badge_type: this.getBadgeType(property.atbb_status),
            is_clickable: this.isPropertyClickable(property.atbb_status),
            google_map_url: property.google_map_url || null,
            images: []
          });
        }
      } else {
        // 通常の画像取得処理（リストビュー用）
        // 全件を並列処理して高速化（ローカル環境と同じ動作）
        const concurrencyLimit = 20; // 5から20に変更
        
        for (let i = 0; i < (data || []).length; i += concurrencyLimit) {
          const batch = (data || []).slice(i, i + concurrencyLimit);
          const batchResults = await Promise.all(
            batch.map(async (property) => {
            const googleMapUrl = property.google_map_url || null;
            
            console.log(`[PropertyListingService] Processing ${property.property_number}:`, {
              has_image_url: !!property.image_url,
              has_storage_location: !!property.storage_location,
              storage_location: property.storage_location
            });
            
            try {
              let images: any[] = [];
              let storageLocation = property.storage_location;
              
              // storage_locationが空の場合、業務リストから取得
              if (!storageLocation && property.property_number) {
                console.log(`[PropertyListingService] storage_location is empty for ${property.property_number}, fetching from 業務リスト（業務依頼）`);
                storageLocation = await this.getStorageUrlFromWorkTasks(property.property_number);
                if (storageLocation) {
                  console.log(`[PropertyListingService] Found storage_url in 業務リスト（業務依頼）: ${storageLocation}`);
                }
              }
              
              // 1. image_urlがある場合はそれを使用
              if (property.image_url) {
                console.log(`[PropertyListingService] Using image_url for ${property.property_number}`);
                
                // image_urlからファイルIDを抽出（プロキシURL形式の場合）
                // 例: https://property-site-frontend-kappa.vercel.app/api/public/images/1pvY-mO6ZfOuK3uwaXcfNfYhv1z5_nmWL/thumbnail
                let fileId = 'legacy';
                const proxyUrlMatch = property.image_url.match(/\/api\/public\/images\/([^\/]+)\/thumbnail/);
                if (proxyUrlMatch) {
                  fileId = proxyUrlMatch[1];
                }
                
                // image_urlをオブジェクト形式に変換
                images = [{
                  id: fileId,
                  name: 'Property Image',
                  thumbnailUrl: property.image_url,
                  fullImageUrl: property.image_url,
                  mimeType: 'image/jpeg',
                  size: 0,
                  modifiedTime: new Date().toISOString()
                }];
              }
              // 2. storage_locationがある場合はGoogle Driveから取得
              else if (storageLocation) {
                console.log(`[PropertyListingService] Fetching images from Google Drive for ${property.property_number}`);
                
                // PropertyImageServiceを使用して画像オブジェクトを取得
                const imageResult = await this.propertyImageService.getImagesFromStorageUrl(storageLocation);
                
                if (imageResult.images.length > 0) {
                  // 最初の画像のみを使用
                  images = [imageResult.images[0]];
                  console.log(`[PropertyListingService] Got image for ${property.property_number}: ${images[0].thumbnailUrl}`);
                } else {
                  console.log(`[PropertyListingService] No images found for ${property.property_number}`);
                }
              } else {
                console.log(`[PropertyListingService] No image source for ${property.property_number}`);
              }
              
              // デバッグ: 価格フィールドを確認
              console.log(`[PropertyListingService] Price fields for ${property.property_number}:`, {
                sales_price: property.sales_price,
                listing_price: property.listing_price,
                price_from_db: property.price,
                calculated_price: property.sales_price || property.listing_price || 0
              });
              
              const { price: _price, ...propertyWithoutPrice } = property; // priceカラムを除外
              
              return {
                ...propertyWithoutPrice,
                price: property.sales_price || property.listing_price || 0,  // sales_priceを優先、なければlisting_price
                property_type: this.convertPropertyTypeToEnglish(property.property_type),
                atbb_status: property.atbb_status,
                badge_type: this.getBadgeType(property.atbb_status),
                is_clickable: this.isPropertyClickable(property.atbb_status),
                google_map_url: googleMapUrl,
                images: images.length > 0 ? images : []
              };
            } catch (error: any) {
              console.error(`[PropertyListingService] Failed to fetch image for ${property.property_number}:`, error.message);
              const { price: _price, ...propertyWithoutPrice } = property; // priceカラムを除外
              return {
                ...propertyWithoutPrice,
                price: property.sales_price || property.listing_price || 0,  // sales_priceを優先、なければlisting_price
                property_type: this.convertPropertyTypeToEnglish(property.property_type),
                atbb_status: property.atbb_status,
                badge_type: this.getBadgeType(property.atbb_status),
                is_clickable: this.isPropertyClickable(property.atbb_status),
                google_map_url: googleMapUrl,
                images: []
              };
            }
          })
          );
          propertiesWithImages.push(...batchResults);
        }
      }
      
      return { 
        properties: propertiesWithImages, 
        pagination: {
          total: count || 0,
          limit,
          offset
        }
      };
    } catch (error: any) {
      console.error('Error in getPublicProperties:', error);
      throw new Error(`Failed to fetch public properties: ${error.message}`);
    }
  }

  // 公開物件詳細取得（クリック可能な物件のみ詳細ページを表示）- Supabase REST APIを使用
  // idはUUIDまたはproperty_numberを受け付ける
  async getPublicPropertyById(id: string) {
    try {
      // UUIDかproperty_numberかを判定（UUIDは36文字でハイフンを含む）
      const isUUID = id.length === 36 && id.includes('-');
      
      // 新しいカラムを除外してSELECT（スキーマキャッシュ問題を回避）
      let query = this.supabase
        .from('property_listings')
        .select('id, property_number, property_type, address, sales_price, listing_price, land_area, building_area, construction_year_month, floor_plan, image_url, google_map_url, latitude, longitude, atbb_status, special_notes, storage_location, created_at, updated_at');
      
      // UUIDまたはproperty_numberで検索
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('property_number', id);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new Error(`Supabase query error: ${error.message}`);
      }
      
      // クリック可能な物件のみ詳細ページを表示
      if (!this.isPropertyClickable(data.atbb_status)) {
        console.log(`[PropertyListingService] Property ${id} is not clickable (atbb_status: ${data.atbb_status})`);
        return null;  // 404を返す
      }
      
      // storage_locationが空の場合、work_tasksテーブルからstorage_urlを取得
      let storageLocation = data.storage_location;
      if (!storageLocation && data.property_number) {
        console.log(`[PropertyListingService] storage_location is empty for ${data.property_number}, fetching from work_tasks`);
        storageLocation = await this.getStorageUrlFromWorkTasks(data.property_number);
        if (storageLocation) {
          console.log(`[PropertyListingService] Found storage_url in work_tasks: ${storageLocation}`);
        }
      }
      
      // property_detailsテーブルから追加データを取得
      const propertyDetailsService = new PropertyDetailsService();
      const details = await propertyDetailsService.getPropertyDetails(data.property_number);
      
      // 物件タイプを英語に変換してフロントエンドに返す
      const { price: _price, ...dataWithoutPrice } = data; // priceカラムを除外
      return {
        ...dataWithoutPrice,
        price: data.sales_price || data.listing_price || 0,  // sales_priceを優先、なければlisting_price
        storage_location: storageLocation,  // work_tasksから取得したstorage_urlで上書き
        property_type: this.convertPropertyTypeToEnglish(data.property_type),
        // property_detailsテーブルからのデータを含める
        property_about: details.property_about,
        recommended_comments: details.recommended_comments,
        athome_data: details.athome_data,
        favorite_comment: details.favorite_comment
      };
    } catch (error: any) {
      console.error('Error in getPublicPropertyById:', error);
      throw new Error(`Failed to fetch public property: ${error.message}`);
    }
  }

  // 公開物件詳細取得（物件番号で検索）
  async getPublicPropertyByNumber(propertyNumber: string) {
    try {
      // 新しいカラムを除外してSELECT（スキーマキャッシュ問題を回避）
      const { data, error } = await this.supabase
        .from('property_listings')
        .select('id, property_number, property_type, address, sales_price, listing_price, land_area, building_area, construction_year_month, floor_plan, image_url, google_map_url, latitude, longitude, atbb_status, special_notes, storage_location, created_at, updated_at')
        .eq('property_number', propertyNumber)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new Error(`Supabase query error: ${error.message}`);
      }
      
      // クリック可能な物件のみ詳細ページを表示
      if (!this.isPropertyClickable(data.atbb_status)) {
        console.log(`[PropertyListingService] Property ${propertyNumber} is not clickable (atbb_status: ${data.atbb_status})`);
        return null;  // 404を返す
      }
      
      // storage_locationが空の場合、work_tasksテーブルからstorage_urlを取得
      let storageLocation = data.storage_location;
      if (!storageLocation) {
        console.log(`[PropertyListingService] storage_location is empty for ${propertyNumber}, fetching from work_tasks`);
        storageLocation = await this.getStorageUrlFromWorkTasks(propertyNumber);
        if (storageLocation) {
          console.log(`[PropertyListingService] Found storage_url in work_tasks: ${storageLocation}`);
        }
      }
      
      // property_detailsテーブルから追加データを取得
      const propertyDetailsService = new PropertyDetailsService();
      const details = await propertyDetailsService.getPropertyDetails(propertyNumber);
      
      // 物件タイプを英語に変換してフロントエンドに返す
      const { price: _price, ...dataWithoutPrice } = data; // priceカラムを除外
      return {
        ...dataWithoutPrice,
        price: data.sales_price || data.listing_price || 0,  // sales_priceを優先、なければlisting_price
        storage_location: storageLocation,  // work_tasksから取得したstorage_urlで上書き
        property_type: this.convertPropertyTypeToEnglish(data.property_type),
        // property_detailsテーブルからのデータを含める
        property_about: details.property_about,
        recommended_comments: details.recommended_comments,
        athome_data: details.athome_data,
        favorite_comment: details.favorite_comment
      };
    } catch (error: any) {
      console.error('Error in getPublicPropertyByNumber:', error);
      throw new Error(`Failed to fetch public property: ${error.message}`);
    }
  }

  // 問い合わせ作成
  async createInquiry(inquiry: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    propertyId?: string;
    ipAddress: string;
  }) {
    const { data, error } = await this.supabase
      .from('property_inquiries')
      .insert({
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        message: inquiry.message,
        property_id: inquiry.propertyId,
        ip_address: inquiry.ipAddress,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create inquiry: ${error.message}`);
    }

    return data;
  }

  // 公開物件のID一覧取得（サイトマップ用）- Supabase REST APIを使用
  // クリック可能な物件（「公開中」「公開前」「非公開（配信メールのみ）」）のみを取得
  async getAllPublicPropertyIds(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('property_listings')
        .select('id, atbb_status')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }
      
      // クリック可能な物件のみをフィルタリング
      return (data || [])
        .filter(row => this.isPropertyClickable(row.atbb_status))
        .map(row => row.id);
    } catch (error: any) {
      console.error('Error in getAllPublicPropertyIds:', error);
      throw new Error(`Failed to fetch public property IDs: ${error.message}`);
    }
  }

  // バッジタイプ判定メソッド
  private getBadgeType(atbbStatus: string | null): string {
    if (!atbbStatus) return 'sold';
    if (atbbStatus.includes('公開中')) return 'none';
    if (atbbStatus.includes('公開前')) return 'pre_release';
    if (atbbStatus.includes('非公開（配信メールのみ）')) return 'email_only';
    // "非公開案件" and all other cases return 'sold'
    return 'sold';
  }

  // クリック可能判定メソッド
  private isPropertyClickable(atbbStatus: string | null): boolean {
    // すべての物件をクリック可能にする
    // 公開中、成約済み、非公開に関わらずURLを表示
    return true;
  }

  // 業務リスト（業務依頼）スプレッドシートからstorage_urlを取得するヘルパーメソッド
  // キャッシュを使用してパフォーマンスを最適化
  private gyomuListCache: Map<string, string> | null = null;
  private gyomuListCacheExpiry: number = 0;
  private readonly GYOMU_LIST_CACHE_TTL = 5 * 60 * 1000; // 5分間キャッシュ
  
  private async getStorageUrlFromWorkTasks(propertyNumber: string): Promise<string | null> {
    try {
      // キャッシュが有効な場合は使用
      const now = Date.now();
      if (this.gyomuListCache && now < this.gyomuListCacheExpiry) {
        const cachedUrl = this.gyomuListCache.get(propertyNumber);
        if (cachedUrl) {
          console.log(`[PropertyListingService] Found storage_url for ${propertyNumber} in cache`);
          return cachedUrl;
        }
        // キャッシュにない場合はnullを返す（業務リストに存在しない）
        return null;
      }
      
      console.log(`[PropertyListingService] Loading 業務リスト（業務依頼） into cache...`);
      
      // 業務リスト（業務依頼）スプレッドシートに接続
      const gyomuListClient = new GoogleSheetsClient({
        spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
        sheetName: '業務依頼',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      });
      
      await gyomuListClient.authenticate();
      
      // すべての行を取得してキャッシュに保存
      const rows = await gyomuListClient.readAll();
      this.gyomuListCache = new Map();
      
      for (const row of rows) {
        const propNumber = row['物件番号'];
        const storageUrl = row['格納先URL'];
        if (propNumber && storageUrl) {
          this.gyomuListCache.set(propNumber as string, storageUrl as string);
        }
      }
      
      this.gyomuListCacheExpiry = now + this.GYOMU_LIST_CACHE_TTL;
      console.log(`[PropertyListingService] Loaded ${this.gyomuListCache.size} entries from 業務リスト（業務依頼）`);
      
      // キャッシュから取得
      const storageUrl = this.gyomuListCache.get(propertyNumber);
      if (storageUrl) {
        console.log(`[PropertyListingService] Found storage_url for ${propertyNumber}: ${storageUrl}`);
        return storageUrl;
      } else {
        // 業務リストに存在しない場合は静かに失敗（ログを減らす）
        return null;
      }
    } catch (error: any) {
      console.error(`[PropertyListingService] Error in getStorageUrlFromWorkTasks:`, error);
      return null;
    }
  }

  /**
   * 物件の追加詳細情報を取得（property_detailsテーブルから）
   */
  async getPropertyDetails(propertyNumber: string): Promise<{
    property_about: string | null;
    recommended_comments: any[] | null;
    athome_data: any[] | null;
    favorite_comment: string | null;
  }> {
    try {
      // property_detailsテーブルから取得（スキーマキャッシュ問題を回避）
      const propertyDetailsService = new PropertyDetailsService();
      
      const details = await propertyDetailsService.getPropertyDetails(propertyNumber);
      
      return {
        property_about: details.property_about,
        recommended_comments: details.recommended_comments,
        athome_data: details.athome_data,
        favorite_comment: details.favorite_comment
      };
    } catch (error: any) {
      console.error(`[PropertyListingService] Error in getPropertyDetails:`, error);
      return {
        property_about: null,
        recommended_comments: null,
        athome_data: null,
        favorite_comment: null
      };
    }
  }



  // 非表示画像リストを取得
  async getHiddenImages(propertyId: string): Promise<string[]> {
    try {
      // UUID形式の検証（36文字でハイフンを含む）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(propertyId)) {
        console.warn(`[PropertyListingService] Invalid UUID format for propertyId: ${propertyId}, returning empty array`);
        return [];
      }

      const { data: property, error } = await this.supabase
        .from('property_listings')
        .select('hidden_images')
        .eq('id', propertyId)
        .single();

      if (error) {
        // hidden_imagesカラムが存在しない場合のエラーを無視
        if (error.message?.includes('column') && error.message?.includes('hidden_images')) {
          console.warn(`[PropertyListingService] hidden_images column does not exist yet, returning empty array`);
          return [];
        }
        console.error(`[PropertyListingService] Failed to fetch hidden images for property ${propertyId}:`, error);
        throw new Error(`Failed to fetch hidden images: ${error.message}`);
      }

      return property?.hidden_images || [];
    } catch (error: any) {
      // hidden_imagesカラムが存在しない場合のエラーを無視
      if (error.message?.includes('column') && error.message?.includes('hidden_images')) {
        console.warn(`[PropertyListingService] hidden_images column does not exist yet, returning empty array`);
        return [];
      }
      console.error(`[PropertyListingService] Error in getHiddenImages:`, error);
      throw error;
    }
  }

  // 画像を非表示にする
  async hideImage(propertyId: string, fileId: string): Promise<void> {
    try {
      // 現在の非表示リストを取得
      const currentHidden = await this.getHiddenImages(propertyId);

      // 既に非表示の場合は何もしない（重複防止）
      if (currentHidden.includes(fileId)) {
        console.log(`[PropertyListingService] Image ${fileId} is already hidden`);
        return;
      }

      // 非表示リストに追加
      const updatedHidden = [...currentHidden, fileId];

      const { error } = await this.supabase
        .from('property_listings')
        .update({ hidden_images: updatedHidden })
        .eq('id', propertyId);

      if (error) {
        console.error(`[PropertyListingService] Failed to hide image ${fileId}:`, error);
        throw new Error(`Failed to hide image: ${error.message}`);
      }

      console.log(`[PropertyListingService] Successfully hid image ${fileId} for property ${propertyId}`);
    } catch (error: any) {
      console.error(`[PropertyListingService] Error in hideImage:`, error);
      throw error;
    }
  }

  // 画像を復元する（非表示を解除）
  async unhideImage(propertyId: string, fileId: string): Promise<void> {
    try {
      // 現在の非表示リストを取得
      const currentHidden = await this.getHiddenImages(propertyId);

      // 非表示リストから削除
      const updatedHidden = currentHidden.filter(id => id !== fileId);

      const { error } = await this.supabase
        .from('property_listings')
        .update({ hidden_images: updatedHidden })
        .eq('id', propertyId);

      if (error) {
        console.error(`[PropertyListingService] Failed to unhide image ${fileId}:`, error);
        throw new Error(`Failed to unhide image: ${error.message}`);
      }

      console.log(`[PropertyListingService] Successfully unhid image ${fileId} for property ${propertyId}`);
    } catch (error: any) {
      console.error(`[PropertyListingService] Error in unhideImage:`, error);
      throw error;
    }
  }

  /**
   * 物件番号で検索（社内用）
   * @param propertyNumber 検索する物件番号
   * @param exactMatch true: 完全一致、false: 部分一致（デフォルト）
   * @returns 検索結果の物件リスト
   * 
   * @example
   * // 完全一致検索
   * const results = await service.searchByPropertyNumber('AA12345', true);
   * 
   * // 部分一致検索
   * const results = await service.searchByPropertyNumber('AA123', false);
   */
  async searchByPropertyNumber(propertyNumber: string, exactMatch: boolean = false): Promise<any[]> {
    try {
      // 入力をサニタイズ（トリムのみ、Supabaseが自動的にエスケープ）
      const sanitizedNumber = propertyNumber.trim();
      
      if (!sanitizedNumber) {
        throw new Error('Property number cannot be empty');
      }

      let query = this.supabase
        .from('property_listings')
        .select('*');
      
      if (exactMatch) {
        // 完全一致検索
        query = query.eq('property_number', sanitizedNumber);
      } else {
        // 部分一致検索（大文字小文字を区別しない）
        query = query.ilike('property_number', `%${sanitizedNumber}%`);
      }
      
      // 作成日時の降順でソート
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }
      
      console.log(`[PropertyListingService] Property number search: "${sanitizedNumber}" (exact: ${exactMatch}) - Found ${data?.length || 0} results`);
      return data || [];
    } catch (error: any) {
      console.error('[PropertyListingService] Error in searchByPropertyNumber:', error);
      throw new Error(`Failed to search properties by number: ${error.message}`);
    }
  }

  // 表示可能な画像一覧を取得（非表示画像を除外）
  async getVisibleImages(propertyIdOrNumber: string): Promise<Array<{ id: string; name: string; url: string }>> {
    try {
      // UUIDかプロパティ番号かを判定
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyIdOrNumber);
      
      let property;
      if (isUuid) {
        // UUIDで検索
        const { data, error } = await this.supabase
          .from('property_listings')
          .select('*')
          .eq('id', propertyIdOrNumber)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error(`Property not found: ${propertyIdOrNumber}`);
          }
          throw new Error(`Failed to fetch property: ${error.message}`);
        }
        property = data;
      } else {
        // プロパティ番号で検索
        property = await this.getByPropertyNumber(propertyIdOrNumber);
        if (!property) {
          throw new Error(`Property not found: ${propertyIdOrNumber}`);
        }
      }

      // 非表示画像リストを取得
      const hiddenImages = await this.getHiddenImages(property.id);

      // storage_locationが空の場合、work_tasksテーブルからstorage_urlを取得
      let storageLocation = property.storage_location;
      if (!storageLocation && property.property_number) {
        console.log(`[PropertyListingService] storage_location is empty for ${property.property_number}, fetching from work_tasks`);
        storageLocation = await this.getStorageUrlFromWorkTasks(property.property_number);
        if (storageLocation) {
          console.log(`[PropertyListingService] Found storage_url in work_tasks: ${storageLocation}`);
        }
      }

      // storage_locationからGoogle Driveのフォルダを取得
      if (!storageLocation) {
        console.log(`[PropertyListingService] No storage_location for property ${propertyIdOrNumber}`);
        return [];
      }

      // Google Drive APIを使用して画像一覧を取得
      const { GoogleDriveService } = await import('./GoogleDriveService.js');
      const driveService = new GoogleDriveService();
      
      // storage_locationからフォルダIDを抽出
      const folderIdMatch = storageLocation.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!folderIdMatch) {
        console.log(`[PropertyListingService] Invalid storage_location format: ${storageLocation}`);
        return [];
      }

      const folderId = folderIdMatch[1];
      const allImages = await driveService.listFiles(folderId);

      // 画像ファイルのみをフィルタリング（画像拡張子を持つファイル）
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const imageFiles = allImages.filter(file => 
        imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      );

      // 非表示画像を除外
      const visibleImages = imageFiles
        .filter(file => !hiddenImages.includes(file.id))
        .map(file => ({
          id: file.id,
          name: file.name,
          url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`
        }));

      console.log(`[PropertyListingService] Found ${visibleImages.length} visible images for property ${propertyIdOrNumber} (${hiddenImages.length} hidden)`);
      return visibleImages;
    } catch (error: any) {
      console.error(`[PropertyListingService] Error in getVisibleImages:`, error);
      throw error;
    }
  }
}
