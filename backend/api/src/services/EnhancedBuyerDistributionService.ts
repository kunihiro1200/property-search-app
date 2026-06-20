// 拡張買主配信フィルタリングサービス - 複数条件対応
import { createClient } from '@supabase/supabase-js';
import { EnhancedGeolocationService, GeographicMatchResult } from './EnhancedGeolocationService';
import { Coordinates } from './GeolocationService';

export interface EnhancedFilterCriteria {
  propertyNumber: string;
  propertyType?: string;
  propertyPrice?: number;
  propertyCity?: string;
}

export interface FilteredBuyer {
  buyer_number: string;
  email: string;
  desired_area: string | null;
  distribution_type: string | null;
  latest_status: string | null;
  desired_property_type: string | null;
  price_range_apartment: string | null;
  price_range_house: string | null;
  price_range_land: string | null;
  filterResults: {
    geography: boolean;
    distribution: boolean;
    status: boolean;
    priceRange: boolean;
  };
  geographicMatch?: GeographicMatchResult;
}

export interface EnhancedBuyerFilterResult {
  emails: string[];
  count: number;
  totalBuyers: number;
  filteredBuyers: FilteredBuyer[];
  appliedFilters: {
    geographyFilter: boolean;
    distributionFilter: boolean;
    statusFilter: boolean;
    priceRangeFilter: boolean;
  };
}

interface InquiryProperty {
  propertyNumber: string;
  address: string | null;
  googleMapUrl: string | null;
}

interface ConsolidatedBuyer {
  email: string;
  buyerNumbers: string[];
  id: string; // Use first buyer's ID for database queries
  allDesiredAreas: string;
  mostPermissiveStatus: string;
  propertyTypes: string[];
  priceRanges: {
    apartment: string[];
    house: string[];
    land: string[];
  };
  distributionType: string;
  originalRecords: any[];
}

export class EnhancedBuyerDistributionService {
  private supabase;
  private geolocationService: EnhancedGeolocationService;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.geolocationService = new EnhancedGeolocationService();
  }

  /**
   * すべての条件に合致する買主を取得
   * @param criteria フィルタリング条件
   * @returns フィルタリング結果
   */
  async getQualifiedBuyersWithAllCriteria(
    criteria: EnhancedFilterCriteria
  ): Promise<EnhancedBuyerFilterResult> {
    try {
      console.log(`[EnhancedBuyerDistributionService] Starting buyer filtering for property ${criteria.propertyNumber}`);

      // 1. 物件情報を取得
      const property = await this.fetchProperty(criteria.propertyNumber);

      console.log(`[EnhancedBuyerDistributionService] Property details:`, {
        propertyNumber: criteria.propertyNumber,
        city: property.city,
        price: property.price,
        propertyType: property.property_type,
        distributionAreas: property.distribution_areas
      });

      // Check if distribution_areas is set
      if (!property.distribution_areas || property.distribution_areas.trim() === '') {
        console.warn(`[EnhancedBuyerDistributionService] Property ${criteria.propertyNumber} has no distribution areas set`);
        return {
          emails: [],
          count: 0,
          totalBuyers: 0,
          filteredBuyers: [],
          appliedFilters: {
            geographyFilter: true,
            distributionFilter: true,
            statusFilter: true,
            priceRangeFilter: true
          }
        };
      }

      // 2. 物件の座標を取得
      const propertyCoords = await this.geolocationService.getCoordinates(
        property.google_map_url,
        property.address
      );

      if (!propertyCoords) {
        console.warn(`[EnhancedBuyerDistributionService] No coordinates for property ${criteria.propertyNumber}`);
      }

      // 3. すべての買主を取得
      const allBuyers = await this.fetchAllBuyers();
      console.log(`[EnhancedBuyerDistributionService] Total buyers in database: ${allBuyers.length}`);

      // 4. メールアドレスごとに買主を統合
      const consolidatedBuyersMap = this.consolidateBuyersByEmail(allBuyers);
      const consolidatedBuyers = Array.from(consolidatedBuyersMap.values());
      console.log(`[EnhancedBuyerDistributionService] Consolidated into ${consolidatedBuyers.length} unique emails`);

      // 5. 全買主の問い合わせ履歴を一括取得
      const inquiryMap = await this.fetchAllBuyerInquiries();
      console.log(`[EnhancedBuyerDistributionService] Inquiry history for ${inquiryMap.size} buyers`);

      // 6. 各統合買主にフィルターを適用
      const filteredBuyers: FilteredBuyer[] = [];

      for (const consolidatedBuyer of consolidatedBuyers) {
        // Get inquiries for all buyer records with this email
        const allInquiries: InquiryProperty[] = [];
        for (const originalRecord of consolidatedBuyer.originalRecords) {
          const buyerInquiries = inquiryMap.get(originalRecord.id) || [];
          allInquiries.push(...buyerInquiries);
        }
        
        // 地理的フィルター（問い合わせ + エリア）- 統合されたエリアを使用
        const geoMatch = await this.filterByGeographyConsolidated(
          propertyCoords,
          property.distribution_areas,
          consolidatedBuyer,
          allInquiries
        );

        // ログ出力
        this.logGeographicMatch(consolidatedBuyer.buyerNumbers.join(','), geoMatch);

        // 配信フラグフィルター - 統合された配信タイプを使用
        const distMatch = this.filterByDistributionFlagConsolidated(consolidatedBuyer);

        // ステータスフィルター - 統合されたステータスを使用
        const statusMatch = this.filterByLatestStatusConsolidated(consolidatedBuyer);

        // 価格帯フィルター - 統合された価格帯を使用
        const priceMatch = this.filterByPriceRangeConsolidated(
          property.price,
          property.property_type,
          consolidatedBuyer
        );

        // Use the consolidated buyer's email and data
        filteredBuyers.push({
          buyer_number: consolidatedBuyer.buyerNumbers.join(','), // Show all buyer numbers
          email: consolidatedBuyer.email,
          desired_area: consolidatedBuyer.allDesiredAreas,
          distribution_type: consolidatedBuyer.distributionType,
          latest_status: consolidatedBuyer.mostPermissiveStatus,
          desired_property_type: consolidatedBuyer.propertyTypes.join('、'),
          price_range_apartment: consolidatedBuyer.priceRanges.apartment.join(' / '),
          price_range_house: consolidatedBuyer.priceRanges.house.join(' / '),
          price_range_land: consolidatedBuyer.priceRanges.land.join(' / '),
          filterResults: {
            geography: geoMatch.matched,
            distribution: distMatch,
            status: statusMatch,
            priceRange: priceMatch
          },
          geographicMatch: geoMatch
        });
      }

      // 7. 合格した買主を抽出
      const qualifiedBuyers = filteredBuyers.filter(b => 
        b.filterResults.geography &&
        b.filterResults.distribution &&
        b.filterResults.status &&
        b.filterResults.priceRange
      );

      // Since we already consolidated by email, each qualified buyer represents one unique email
      const emails = qualifiedBuyers
        .map(b => b.email)
        .filter(e => e && e.trim() !== '') as string[];

      console.log(`[EnhancedBuyerDistributionService] Filtering complete:`, {
        totalBuyerRecords: allBuyers.length,
        consolidatedEmails: consolidatedBuyers.length,
        qualifiedBuyers: qualifiedBuyers.length,
        uniqueEmails: emails.length
      });

      return {
        emails,
        count: emails.length,
        totalBuyers: allBuyers.length,
        filteredBuyers,
        appliedFilters: {
          geographyFilter: true,
          distributionFilter: true,
          statusFilter: true,
          priceRangeFilter: true
        }
      };
    } catch (error) {
      console.error('[EnhancedBuyerDistributionService] Error in getQualifiedBuyersWithAllCriteria:', error);
      throw error;
    }
  }

  /**
   * 物件情報を取得
   * Note: property_listingsテーブルから物件情報を取得する
   * sellersテーブルには物件詳細情報（google_map_url, price, property_typeなど）が含まれていないため
   */
  private async fetchProperty(propertyNumber: string): Promise<any> {
    console.log(`[fetchProperty] Looking for property: ${propertyNumber}`);
    
    // Query property_listings table (primary source for property details)
    const { data: propertyData, error: propertyError } = await this.supabase
      .from('property_listings')
      .select('property_number, google_map_url, address, price, property_type, distribution_areas')
      .eq('property_number', propertyNumber)
      .single();

    console.log(`[fetchProperty] Property_listings table query result:`, {
      found: !!propertyData,
      error: propertyError?.message || 'none',
      errorCode: propertyError?.code || 'none'
    });

    if (!propertyError && propertyData) {
      console.log(`[fetchProperty] ✓ Found in property_listings table`);
      // Extract city from address if needed
      const city = this.extractCityFromAddress(propertyData.address);
      return {
        property_number: propertyData.property_number,
        google_map_url: propertyData.google_map_url,
        address: propertyData.address,
        city: city,
        price: propertyData.price,
        property_type: propertyData.property_type,
        distribution_areas: propertyData.distribution_areas
      };
    }

    // Property not found
    console.log(`[fetchProperty] ✗ Property not found in property_listings table`);
    const diagnosticError: any = new Error(`Property not found: ${propertyNumber}`);
    diagnosticError.code = 'PROPERTY_NOT_FOUND';
    diagnosticError.propertyNumber = propertyNumber;
    diagnosticError.statusCode = 404;
    throw diagnosticError;
  }

  /**
   * 住所から市区町村を抽出
   */
  private extractCityFromAddress(address: string | null | undefined): string | null {
    if (!address) return null;
    
    // 大分市田尻北3-14 → 大分市
    // 東京都渋谷区恵比寿1-2-3 → 渋谷区
    const cityMatch = address.match(/([^\s]+?[都道府県])?([^\s]+?[市区町村])/);
    if (cityMatch) {
      return cityMatch[2] || cityMatch[0];
    }
    
    return null;
  }

  /**
   * すべての買主を取得
   */
  private async fetchAllBuyers(): Promise<any[]> {
    // Fetch all buyers with pagination to avoid Supabase's default 1000 row limit
    let allBuyers: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('buyers')
        .select(`
          id,
          buyer_number,
          email,
          desired_area,
          distribution_type,
          latest_status,
          desired_property_type,
          price_range_apartment,
          price_range_house,
          price_range_land
        `)
        .not('email', 'is', null)
        .neq('email', '')
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch buyers: ${error.message}`);
      }

      if (data && data.length > 0) {
        allBuyers = allBuyers.concat(data);
        from += pageSize;
        hasMore = data.length === pageSize; // Continue if we got a full page
      } else {
        hasMore = false;
      }
    }

    console.log(`[fetchAllBuyers] Retrieved ${allBuyers.length} total buyers`);
    return allBuyers;
  }

  /**
   * メールアドレスごとに買主レコードを統合
   */
  private consolidateBuyersByEmail(buyers: any[]): Map<string, ConsolidatedBuyer> {
    const emailMap = new Map<string, ConsolidatedBuyer>();
    
    for (const buyer of buyers) {
      // Normalize email (lowercase, trim)
      const normalizedEmail = buyer.email?.trim().toLowerCase();
      if (!normalizedEmail) {
        console.warn(`[Email Consolidation] Buyer ${buyer.buyer_number} has no email, skipping`);
        continue;
      }
      
      if (!emailMap.has(normalizedEmail)) {
        // First record for this email - initialize
        emailMap.set(normalizedEmail, {
          email: buyer.email, // Use original casing
          buyerNumbers: [buyer.buyer_number],
          id: buyer.id, // Use first buyer's ID
          allDesiredAreas: buyer.desired_area || '',
          mostPermissiveStatus: buyer.latest_status || '',
          propertyTypes: buyer.desired_property_type ? [buyer.desired_property_type] : [],
          priceRanges: {
            apartment: buyer.price_range_apartment ? [buyer.price_range_apartment] : [],
            house: buyer.price_range_house ? [buyer.price_range_house] : [],
            land: buyer.price_range_land ? [buyer.price_range_land] : []
          },
          distributionType: buyer.distribution_type || '',
          originalRecords: [buyer]
        });
      } else {
        // Additional record for this email - merge
        const consolidated = emailMap.get(normalizedEmail)!;
        
        // Add buyer number
        consolidated.buyerNumbers.push(buyer.buyer_number);
        
        // Merge desired areas (remove duplicates)
        const existingAreas = new Set(consolidated.allDesiredAreas.split(''));
        const newAreas = (buyer.desired_area || '').split('');
        newAreas.forEach((area: string) => {
          if (area.trim()) existingAreas.add(area);
        });
        consolidated.allDesiredAreas = Array.from(existingAreas).join('');
        
        // Use most permissive status
        if (this.isMorePermissiveStatus(buyer.latest_status, consolidated.mostPermissiveStatus)) {
          consolidated.mostPermissiveStatus = buyer.latest_status;
        }
        
        // Merge property types (unique)
        if (buyer.desired_property_type && 
            !consolidated.propertyTypes.includes(buyer.desired_property_type)) {
          consolidated.propertyTypes.push(buyer.desired_property_type);
        }
        
        // Merge price ranges (unique)
        if (buyer.price_range_apartment && 
            !consolidated.priceRanges.apartment.includes(buyer.price_range_apartment)) {
          consolidated.priceRanges.apartment.push(buyer.price_range_apartment);
        }
        if (buyer.price_range_house && 
            !consolidated.priceRanges.house.includes(buyer.price_range_house)) {
          consolidated.priceRanges.house.push(buyer.price_range_house);
        }
        if (buyer.price_range_land && 
            !consolidated.priceRanges.land.includes(buyer.price_range_land)) {
          consolidated.priceRanges.land.push(buyer.price_range_land);
        }
        
        // Use most permissive distribution type (要 > mail > others)
        if (this.isMorePermissiveDistributionType(buyer.distribution_type, consolidated.distributionType)) {
          consolidated.distributionType = buyer.distribution_type;
        }
        
        // Keep original record
        consolidated.originalRecords.push(buyer);
      }
    }
    
    console.log(`[Email Consolidation] Consolidated ${buyers.length} buyer records into ${emailMap.size} unique emails`);
    
    // Log details for emails with multiple records
    for (const consolidated of emailMap.values()) {
      if (consolidated.buyerNumbers.length > 1) {
        console.log(`[Email Consolidation] ${consolidated.email}: ${consolidated.buyerNumbers.length} records (${consolidated.buyerNumbers.join(', ')})`);
        console.log(`  - Merged areas: ${consolidated.allDesiredAreas}`);
        console.log(`  - Status: ${consolidated.mostPermissiveStatus}`);
        console.log(`  - Distribution type: ${consolidated.distributionType}`);
      }
    }
    
    return emailMap;
  }

  /**
   * ステータスの優先順位を比較（より許容的なステータスを選択）
   */
  private isMorePermissiveStatus(status1: string | null, status2: string | null): boolean {
    // Status priority: C (active) > others > D (inactive)
    const priority: { [key: string]: number } = {
      'C': 3,  // Active - highest priority
      'B': 2,  // Medium priority
      'A': 2,  // Medium priority
      'D': 1   // Inactive - lowest priority
    };
    
    const p1 = priority[status1 || ''] || 2;
    const p2 = priority[status2 || ''] || 2;
    
    return p1 > p2;
  }

  /**
   * 配信タイプの優先順位を比較（より許容的なタイプを選択）
   */
  private isMorePermissiveDistributionType(type1: string | null, type2: string | null): boolean {
    // Distribution type priority: 要 > mail > LINE→mail > others
    const priority: { [key: string]: number } = {
      '要': 3,
      'mail': 2,
      'LINE→mail': 1
    };
    
    const p1 = priority[type1 || ''] || 0;
    const p2 = priority[type2 || ''] || 0;
    
    return p1 > p2;
  }

  /**
   * 全買主の問い合わせ履歴を一括取得
   */
  private async fetchAllBuyerInquiries(): Promise<Map<string, InquiryProperty[]>> {
    const { data, error } = await this.supabase
      .from('buyer_inquiries')
      .select(`
        buyer_id,
        property_number,
        property_listings!inner(
          property_number,
          address,
          google_map_url
        )
      `)
      .order('inquiry_date', { ascending: false });

    if (error) {
      console.error('[fetchAllBuyerInquiries] Error:', error);
      return new Map();
    }

    const inquiryMap = new Map<string, InquiryProperty[]>();
    
    data?.forEach((row: any) => {
      if (!inquiryMap.has(row.buyer_id)) {
        inquiryMap.set(row.buyer_id, []);
      }
      inquiryMap.get(row.buyer_id)!.push({
        propertyNumber: row.property_number,
        address: row.property_listings?.address || null,
        googleMapUrl: row.property_listings?.google_map_url || null
      });
    });

    console.log(`[fetchAllBuyerInquiries] Retrieved inquiries for ${inquiryMap.size} buyers`);
    return inquiryMap;
  }

  /**
   * 問い合わせベースマッチング（問い合わせ物件から3km圏内）
   */
  private async checkInquiryBasedMatch(
    propertyCoordinates: Coordinates,
    buyerInquiries: InquiryProperty[]
  ): Promise<{
    matched: boolean;
    matchedInquiries: { propertyNumber: string; distance: number }[];
    minDistance?: number;
  }> {
    
    if (!buyerInquiries || buyerInquiries.length === 0) {
      return { matched: false, matchedInquiries: [] };
    }

    const matchedInquiries: { propertyNumber: string; distance: number }[] = [];
    let minDistance = Infinity;

    for (const inquiry of buyerInquiries) {
      // 問い合わせ物件の座標を取得
      const inquiryCoords = await this.geolocationService.getCoordinates(
        inquiry.googleMapUrl,
        inquiry.address
      );

      if (!inquiryCoords) {
        console.log(`[Inquiry Match] No coordinates for ${inquiry.propertyNumber}`);
        continue;
      }

      // 距離を計算
      const distance = this.geolocationService.calculateDistance(
        propertyCoordinates,
        inquiryCoords
      );

      console.log(`[Inquiry Match] Distance from ${inquiry.propertyNumber}: ${distance.toFixed(2)}km`);

      // 3km以内ならマッチ
      if (distance <= 3.0) {
        matchedInquiries.push({
          propertyNumber: inquiry.propertyNumber,
          distance
        });
        minDistance = Math.min(minDistance, distance);
      }
    }

    return {
      matched: matchedInquiries.length > 0,
      matchedInquiries,
      minDistance: matchedInquiries.length > 0 ? minDistance : undefined
    };
  }

  /**
   * エリアベースマッチング（★エリア番号の比較）
   */
  private checkAreaBasedMatch(
    propertyDistributionAreas: string | null | undefined,
    buyerDesiredArea: string | null | undefined
  ): { matched: boolean; matchedAreas: string[] } {
    // Extract area numbers from buyer's desired area
    const buyerAreas = this.geolocationService.extractAreaNumbers(buyerDesiredArea);

    if (buyerAreas.length === 0) {
      return {
        matched: false,
        matchedAreas: []
      };
    }

    // Extract area numbers from property's distribution areas
    const propertyAreas = this.geolocationService.extractAreaNumbers(propertyDistributionAreas);

    if (propertyAreas.length === 0) {
      return {
        matched: false,
        matchedAreas: []
      };
    }

    // Find matching areas
    const matchedAreas = buyerAreas.filter(buyerArea => 
      propertyAreas.includes(buyerArea)
    );

    return {
      matched: matchedAreas.length > 0,
      matchedAreas
    };
  }



  /**
   * 地理的マッチングの詳細ログ出力
   */
  private logGeographicMatch(
    buyerNumber: string,
    geoMatch: GeographicMatchResult
  ) {
    console.log(`[Geographic Match] Buyer ${buyerNumber}:`);
    console.log(`  Match Type: ${geoMatch.matchType}`);
    
    if (geoMatch.matchType === 'inquiry' || geoMatch.matchType === 'both') {
      console.log(`  Inquiry-Based Match:`);
      geoMatch.matchedInquiries?.forEach(inquiry => {
        console.log(`    - Property ${inquiry.propertyNumber}: ${inquiry.distance.toFixed(2)}km`);
      });
      if (geoMatch.minDistance !== undefined) {
        console.log(`  Min Distance: ${geoMatch.minDistance.toFixed(2)}km`);
      }
    }
    
    if (geoMatch.matchType === 'area' || geoMatch.matchType === 'both') {
      console.log(`  Area-Based Match:`);
      console.log(`    - Matched Areas: ${geoMatch.matchedAreas?.join(', ')}`);
    }
    
    if (geoMatch.matchType === 'none') {
      console.log(`  No match (neither inquiry nor area)`);
    }
  }

  /**
   * 統合地理フィルター（統合買主用）
   */
  private async filterByGeographyConsolidated(
    propertyCoordinates: Coordinates | null,
    propertyDistributionAreas: string | null | undefined,
    consolidatedBuyer: ConsolidatedBuyer,
    allInquiries: InquiryProperty[]
  ): Promise<GeographicMatchResult> {
    
    // 1. 問い合わせベースマッチング
    let inquiryMatch: {
      matched: boolean;
      matchedInquiries: { propertyNumber: string; distance: number }[];
      minDistance?: number;
    } = { matched: false, matchedInquiries: [], minDistance: undefined };
    
    if (propertyCoordinates && allInquiries.length > 0) {
      inquiryMatch = await this.checkInquiryBasedMatch(
        propertyCoordinates,
        allInquiries
      );
    }

    // 2. エリアベースマッチング - 統合されたエリアを使用
    const areaMatch = this.checkAreaBasedMatch(
      propertyDistributionAreas,
      consolidatedBuyer.allDesiredAreas
    );

    // 3. 結果を統合（OR条件）
    if (inquiryMatch.matched && areaMatch.matched) {
      return {
        matched: true,
        matchType: 'both',
        matchedAreas: areaMatch.matchedAreas,
        matchedInquiries: inquiryMatch.matchedInquiries,
        minDistance: inquiryMatch.minDistance
      };
    } else if (inquiryMatch.matched) {
      return {
        matched: true,
        matchType: 'inquiry',
        matchedInquiries: inquiryMatch.matchedInquiries,
        minDistance: inquiryMatch.minDistance
      };
    } else if (areaMatch.matched) {
      return {
        matched: true,
        matchType: 'area',
        matchedAreas: areaMatch.matchedAreas
      };
    } else {
      return {
        matched: false,
        matchType: 'none'
      };
    }
  }

  /**
   * 配信フラグフィルター（統合買主用）
   */
  private filterByDistributionFlagConsolidated(consolidatedBuyer: ConsolidatedBuyer): boolean {
    const distributionType = consolidatedBuyer.distributionType?.trim() || '';
    // Accept "要", "mail", "LINE→mail", and "配信希望" as valid distribution flags
    return distributionType === '要' || 
           distributionType === 'mail' || 
           distributionType === '配信希望' ||
           distributionType.includes('LINE→mail');
  }

  /**
   * 最新ステータスフィルター（統合買主用）
   */
  private filterByLatestStatusConsolidated(consolidatedBuyer: ConsolidatedBuyer): boolean {
    const status = consolidatedBuyer.mostPermissiveStatus || '';
    
    // Exclude if contains "買付" or "D"
    if (status.includes('買付') || status.includes('D')) {
      return false;
    }
    
    return true;
  }

  /**
   * 価格帯フィルター（統合買主用）
   */
  private filterByPriceRangeConsolidated(
    propertyPrice: number | null | undefined,
    propertyType: string | null | undefined,
    consolidatedBuyer: ConsolidatedBuyer
  ): boolean {
    // If property price is not available, include buyer
    if (!propertyPrice) {
      return true;
    }

    // Get the appropriate price ranges based on property type
    let priceRangeTexts: string[] = [];
    if (propertyType === 'マンション' || propertyType === 'アパート') {
      priceRangeTexts = consolidatedBuyer.priceRanges.apartment;
    } else if (propertyType === '戸建' || propertyType === '戸建て') {
      priceRangeTexts = consolidatedBuyer.priceRanges.house;
    } else if (propertyType === '土地') {
      priceRangeTexts = consolidatedBuyer.priceRanges.land;
    }

    // If no price range specified or all are "指定なし", check property type match
    if (priceRangeTexts.length === 0 || 
        priceRangeTexts.every(text => !text || text.includes('指定なし') || text.trim() === '')) {
      // If buyer has specific desired property types, at least one must match
      if (consolidatedBuyer.propertyTypes.length > 0) {
        const actualType = propertyType?.trim() || '';
        const anyTypeMatches = consolidatedBuyer.propertyTypes.some(desiredType => 
          this.checkPropertyTypeMatch(desiredType, actualType)
        );
        
        if (!anyTypeMatches) {
          console.log(`[Price Filter] Property type mismatch: Buyer wants "${consolidatedBuyer.propertyTypes.join('、')}", Property is "${actualType}" - excluding buyer`);
          return false;
        }
      }
      return true;
    }

    // Check if property price matches ANY of the price ranges
    for (const priceRangeText of priceRangeTexts) {
      if (!priceRangeText || priceRangeText.includes('指定なし') || priceRangeText.trim() === '') {
        continue;
      }

      // Parse price range formats:
      // 1. "X万円以上" - minimum only
      const minOnlyMatch = priceRangeText.match(/(\d+)万円以上/);
      if (minOnlyMatch) {
        const minPrice = parseInt(minOnlyMatch[1]) * 10000;
        if (propertyPrice >= minPrice) {
          console.log(`[Price Filter] Match found: ${minPrice.toLocaleString()}円以上, Property: ${propertyPrice.toLocaleString()}円`);
          return true;
        }
        continue;
      }

      // 2. "X万円以下" or "~X万円" - maximum only
      const maxOnlyMatch = priceRangeText.match(/(?:~|～)?(\d+)万円(?:以下)?$/);
      if (maxOnlyMatch && !priceRangeText.includes('以上') && !priceRangeText.includes('～') && !priceRangeText.match(/(\d+)万円～(\d+)万円/)) {
        const maxPrice = parseInt(maxOnlyMatch[1]) * 10000;
        if (propertyPrice <= maxPrice) {
          console.log(`[Price Filter] Match found: ${maxPrice.toLocaleString()}円以下, Property: ${propertyPrice.toLocaleString()}円`);
          return true;
        }
        continue;
      }

      // 3. "X万円～Y万円" or "X～Y万円" - range
      const rangeMatch = priceRangeText.match(/(\d+)(?:万円)?[～~](\d+)万円/);
      if (rangeMatch) {
        const minPrice = parseInt(rangeMatch[1]) * 10000;
        const maxPrice = parseInt(rangeMatch[2]) * 10000;
        if (propertyPrice >= minPrice && propertyPrice <= maxPrice) {
          console.log(`[Price Filter] Match found: ${minPrice.toLocaleString()}円～${maxPrice.toLocaleString()}円, Property: ${propertyPrice.toLocaleString()}円`);
          return true;
        }
        continue;
      }

      console.warn(`[Price Filter] Unable to parse price range format: "${priceRangeText}"`);
    }

    // No price range matched
    console.log(`[Price Filter] No price range matched for property ${propertyPrice.toLocaleString()}円`);
    return false;
  }

  /**
   * 物件種別のマッチングチェック
   */
  private checkPropertyTypeMatch(desiredType: string, actualType: string): boolean {
    // Normalize types for comparison
    const normalizedActual = actualType.toLowerCase().trim();

    // Split desired types by common separators (、, ・, /, etc.)
    const desiredTypes = desiredType.split(/[、・\/,]/).map(t => t.toLowerCase().trim()).filter(t => t);

    // Check if any of the desired types match the actual type
    for (const desired of desiredTypes) {
      // Exact match
      if (desired === normalizedActual) {
        return true;
      }

      // マンション/アパート are considered the same category
      if ((desired === 'マンション' || desired === 'アパート') &&
          (normalizedActual === 'マンション' || normalizedActual === 'アパート')) {
        return true;
      }

      // 戸建/戸建て are considered the same
      if ((desired === '戸建' || desired === '戸建て') &&
          (normalizedActual === '戸建' || normalizedActual === '戸建て')) {
        return true;
      }
    }

    return false;
  }
}
