// 買主候補抽出サービス
import { createClient } from '@supabase/supabase-js';
import { BeppuAreaMappingService } from './BeppuAreaMappingService';
import { OitaCityAreaMappingService } from './OitaCityAreaMappingService';
import { GeolocationService } from './GeolocationService';

export interface BuyerCandidate {
  buyer_number: string;
  name: string | null;
  latest_status: string | null;
  desired_area: string | null;
  desired_property_type: string | null;
  reception_date: string | null;
  email: string | null;
  phone_number: string | null;
  inquiry_property_address: string | null;
}

export interface BuyerCandidateResponse {
  candidates: BuyerCandidate[];
  total: number;
  property: {
    property_number: string;
    property_type: string | null;
    sales_price: number | null;
    distribution_areas: string | null;
    address: string | null;
  };
}

export class BuyerCandidateService {
  private supabase;
  private beppuAreaMappingService: BeppuAreaMappingService;
  private oitaCityAreaMappingService: OitaCityAreaMappingService;
  private geolocationService: GeolocationService;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.beppuAreaMappingService = new BeppuAreaMappingService();
    this.oitaCityAreaMappingService = new OitaCityAreaMappingService();
    this.geolocationService = new GeolocationService();
  }

  /**
   * 物件に対する買主候補を取得
   */
  async getCandidatesForProperty(propertyNumber: string): Promise<BuyerCandidateResponse> {
    // 物件情報を取得
    const { data: property, error: propertyError } = await this.supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    // 物件の住所からエリア番号をマッピング
    const propertyAreaNumbers = await this.getAreaNumbersForProperty(property);

    // 物件の座標を取得
    const propertyCoords = await this.getPropertyCoordinates(property);

    // 買主を取得（削除済みを除外、配信種別でフィルタリング）
    // パフォーマンス最適化: シンプルなクエリで高速化
    const { data: buyers, error: buyersError } = await this.supabase
      .from('buyers')
      .select('buyer_number, name, latest_status, desired_area, desired_property_type, reception_date, email, phone_number, property_number, inquiry_source, distribution_type, broker_inquiry, price_range_house, price_range_apartment, price_range_land')
      .is('deleted_at', null)  // 削除済みを除外
      .eq('distribution_type', '要')  // 配信種別が「要」のみ
      .not('latest_status', 'is', null)  // 最新状況が空欄を除外
      .order('reception_date', { ascending: false, nullsFirst: false })
      .limit(1000);  // 最大1000件

    if (buyersError) {
      throw new Error(`Failed to fetch buyers: ${buyersError.message}`);
    }

    // フィルタリング
    const candidates = await this.filterCandidates(
      buyers || [],
      property.property_type,
      property.sales_price,
      propertyAreaNumbers,
      propertyCoords
    );

    // 最大50件に制限
    const limitedCandidates = candidates.slice(0, 50);

    // 全買主の問い合わせ物件番号を収集
    const allPropertyNumbers = new Set<string>();
    limitedCandidates.forEach(b => {
      if (b.property_number) {
        const numbers = b.property_number.split(',').map((n: string) => n.trim()).filter((n: string) => n);
        numbers.forEach(n => allPropertyNumbers.add(n));
      }
    });

    // 一括で物件住所を取得
    const propertyAddressMap = await this.getPropertyAddressesInBatch(Array.from(allPropertyNumbers));

    // 各買主の問い合わせ物件住所を設定
    const candidatesWithAddress = limitedCandidates.map(b => {
      let inquiryPropertyAddress: string | null = null;
      if (b.property_number) {
        const firstPropertyNumber = b.property_number.split(',')[0].trim();
        inquiryPropertyAddress = propertyAddressMap.get(firstPropertyNumber) || null;
      }

      return {
        buyer_number: b.buyer_number,
        name: b.name,
        latest_status: b.latest_status,
        desired_area: b.desired_area,
        desired_property_type: b.desired_property_type,
        reception_date: b.reception_date,
        email: b.email,
        phone_number: b.phone_number,
        inquiry_property_address: inquiryPropertyAddress,
      };
    });

    return {
      candidates: candidatesWithAddress,
      total: limitedCandidates.length,
      property: {
        property_number: property.property_number,
        property_type: property.property_type,
        sales_price: property.sales_price,
        distribution_areas: propertyAreaNumbers.join(''),
        address: property.address,
      },
    };
  }

  /**
   * 複数の物件番号に対して住所を一括取得
   */
  private async getPropertyAddressesInBatch(propertyNumbers: string[]): Promise<Map<string, string>> {
    const addressMap = new Map<string, string>();

    if (propertyNumbers.length === 0) {
      return addressMap;
    }

    try {
      const { data: properties, error } = await this.supabase
        .from('property_listings')
        .select('property_number, address')
        .in('property_number', propertyNumbers);

      if (error) {
        console.error(`[BuyerCandidateService] Error getting property addresses in batch:`, error);
        return addressMap;
      }

      if (properties) {
        properties.forEach(p => {
          if (p.property_number && p.address) {
            addressMap.set(p.property_number, p.address);
          }
        });
      }

      return addressMap;
    } catch (error) {
      console.error(`[BuyerCandidateService] Error in getPropertyAddressesInBatch:`, error);
      return addressMap;
    }
  }

  /**
   * 買主が問い合わせた物件の住所を取得
   */
  private async getInquiryPropertyAddress(propertyNumber: string | null): Promise<string | null> {
    if (!propertyNumber) {
      return null;
    }

    try {
      // カンマ区切りで複数の物件番号がある場合は最初の1件のみ
      const firstPropertyNumber = propertyNumber.split(',')[0].trim();
      
      if (!firstPropertyNumber) {
        return null;
      }

      const { data: property, error } = await this.supabase
        .from('property_listings')
        .select('address')
        .eq('property_number', firstPropertyNumber)
        .single();

      if (error || !property) {
        return null;
      }

      return property.address;
    } catch (error) {
      console.error(`[BuyerCandidateService] Error getting inquiry property address:`, error);
      return null;
    }
  }

  /**
   * 買主候補をフィルタリング
   */
  private async filterCandidates(
    buyers: any[],
    propertyType: string | null,
    salesPrice: number | null,
    propertyAreaNumbers: string[],
    propertyCoords: { lat: number; lng: number } | null
  ): Promise<any[]> {
    const filteredBuyers: any[] = [];

    for (const buyer of buyers) {
      // 1. 除外条件の評価（早期リターン）
      if (this.shouldExcludeBuyer(buyer)) {
        continue;
      }

      // 2. 最新状況/問合せ時確度フィルタ
      if (!this.matchesStatus(buyer)) {
        continue;
      }

      // 3. エリアフィルタ（距離ベースも含む）
      const matchesArea = await this.matchesAreaCriteriaWithDistance(
        buyer,
        propertyAreaNumbers,
        propertyCoords
      );
      if (!matchesArea) {
        continue;
      }

      // 4. 種別フィルタ
      if (!this.matchesPropertyTypeCriteria(buyer, propertyType)) {
        continue;
      }

      // 5. 価格帯フィルタ
      if (!this.matchesPriceCriteria(buyer, salesPrice, propertyType)) {
        continue;
      }

      filteredBuyers.push(buyer);
    }

    return filteredBuyers;
  }

  /**
   * 買主を除外すべきかどうかを判定
   * 以下のいずれかに該当する場合、除外する:
   * 1. 業者問合せである
   * 2. 希望エリアと希望種別が両方空欄である
   * 3. 配信種別が「要」でない
   */
  private shouldExcludeBuyer(buyer: any): boolean {
    // 1. 業者問合せは除外
    if (this.isBusinessInquiry(buyer)) {
      return true;
    }

    // 2. 希望エリアと希望種別が両方空欄の場合は除外
    if (!this.hasMinimumCriteria(buyer)) {
      return true;
    }

    // 3. 配信種別が「要」でない場合は除外
    if (!this.hasDistributionRequired(buyer)) {
      return true;
    }

    return false;
  }

  /**
   * 業者問合せかどうかを判定
   * broker_inquiry フィールドをチェック
   */
  private isBusinessInquiry(buyer: any): boolean {
    // 既存の isGyoshaInquiry メソッドを活用
    return this.isGyoshaInquiry(buyer);
  }

  /**
   * 最低限の希望条件を持っているかを判定
   * 希望エリアまたは希望種別のいずれかが入力されている必要がある
   */
  private hasMinimumCriteria(buyer: any): boolean {
    const desiredArea = (buyer.desired_area || '').trim();
    const desiredPropertyType = (buyer.desired_property_type || '').trim();

    // 希望エリアまたは希望種別のいずれかが入力されていればtrue
    return desiredArea !== '' || desiredPropertyType !== '';
  }

  /**
   * 配信種別が「要」かどうかを判定
   */
  private hasDistributionRequired(buyer: any): boolean {
    // データベース側で既にフィルタリング済み
    return true;
  }

  /**
   * 最新状況によるフィルタリング
   * - A、B、C、不明を含む場合: 条件を満たす
   * - それ以外（買付、D、その他）: 除外
   */
  private matchesStatus(buyer: any): boolean {
    const latestStatus = (buyer.latest_status || '').trim();

    // 空欄の場合は除外（データベース側で既に除外済み）
    if (!latestStatus) {
      return false;
    }

    // A、B、C、不明を含む場合は条件を満たす
    if (latestStatus.includes('A') || 
        latestStatus.includes('B') || 
        latestStatus.includes('C') || 
        latestStatus.includes('不明')) {
      return true;
    }

    // それ以外は除外
    return false;
  }

  /**
   * 業者問合せかどうかを判定
   * - inquiry_source（問合せ元）が「業者問合せ」の場合: true
   * - distribution_type（配信種別）が「業者問合せ」の場合: true
   * - broker_inquiry（業者問合せフラグ）に値がある場合: true
   */
  private isGyoshaInquiry(buyer: any): boolean {
    const inquirySource = (buyer.inquiry_source || '').trim();
    const distributionType = (buyer.distribution_type || '').trim();
    const brokerInquiry = (buyer.broker_inquiry || '').trim();

    // 問合せ元が「業者問合せ」
    if (inquirySource === '業者問合せ' || inquirySource.includes('業者')) {
      return true;
    }

    // 配信種別が「業者問合せ」
    if (distributionType === '業者問合せ' || distributionType.includes('業者')) {
      return true;
    }

    // 業者問合せフラグに値がある場合（チェックが入っている場合）
    if (brokerInquiry && brokerInquiry !== '' && brokerInquiry !== '0' && brokerInquiry.toLowerCase() !== 'false') {
      return true;
    }

    return false;
  }

  /**
   * エリア条件によるフィルタリング（距離ベースも含む）
   * - 買主の希望エリアが空欄の場合: 条件を満たす
   * - 物件の配信エリアと買主の希望エリアが1つでも合致: 条件を満たす
   * - 買主が問い合わせた物件が半径3km以内: 条件を満たす（一時的に無効化）
   */
  private async matchesAreaCriteriaWithDistance(
    buyer: any,
    propertyAreaNumbers: string[],
    propertyCoords: { lat: number; lng: number } | null
  ): Promise<boolean> {
    const desiredArea = (buyer.desired_area || '').trim();

    // 希望エリアが空欄の場合は条件を満たす
    if (!desiredArea) {
      return true;
    }

    // 1. エリア番号でのマッチング
    if (propertyAreaNumbers.length > 0) {
      const buyerAreaNumbers = this.extractAreaNumbers(desiredArea);
      const areaMatch = propertyAreaNumbers.some(area => buyerAreaNumbers.includes(area));
      if (areaMatch) {
        return true;
      }
    }

    // 2. 距離ベースのマッチング（一時的に無効化 - パフォーマンス問題のため）
    // if (propertyCoords) {
    //   const distanceMatch = await this.matchesByInquiryDistance(buyer, propertyCoords);
    //   if (distanceMatch) {
    //     console.log(`[BuyerCandidateService] Distance match for buyer ${buyer.buyer_number}`);
    //     return true;
    //   }
    // }

    return false;
  }

  /**
   * 買主が問い合わせた物件との距離でマッチング
   * 買主が過去に問い合わせた物件の座標から3km以内であれば条件を満たす
   */
  private async matchesByInquiryDistance(
    buyer: any,
    propertyCoords: { lat: number; lng: number }
  ): Promise<boolean> {
    try {
      // 買主が問い合わせた物件番号を取得
      const inquiryPropertyNumber = (buyer.property_number || '').trim();
      if (!inquiryPropertyNumber) {
        return false;
      }

      // カンマ区切りで複数の物件番号がある場合は分割（最初の1件のみチェック）
      const firstPropertyNumber = inquiryPropertyNumber.split(',')[0].trim();
      if (!firstPropertyNumber) {
        return false;
      }
      
      // 問い合わせ物件の情報を取得
      const { data: inquiryProperty, error } = await this.supabase
        .from('property_listings')
        .select('google_map_url')
        .eq('property_number', firstPropertyNumber)
        .single();

      if (error || !inquiryProperty || !inquiryProperty.google_map_url) {
        return false;
      }

      // 問い合わせ物件の座標を取得
      const inquiryCoords = await this.geolocationService.extractCoordinatesFromUrl(
        inquiryProperty.google_map_url
      );

      if (!inquiryCoords) {
        return false;
      }

      // 距離を計算
      const distance = this.geolocationService.calculateDistance(
        propertyCoords,
        inquiryCoords
      );

      console.log(`[BuyerCandidateService] Distance from inquiry property ${firstPropertyNumber}: ${distance.toFixed(2)}km`);

      // 3km以内であれば条件を満たす
      return distance <= 3.0;
    } catch (error) {
      console.error(`[BuyerCandidateService] Error in distance matching:`, error);
      return false;
    }
  }

  /**
   * 種別条件によるフィルタリング
   * - 買主の希望種別が「指定なし」の場合: 条件を満たす
   * - 買主の希望種別が空欄の場合: 条件を満たさない（除外）
   * - 物件種別と買主の希望種別が合致: 条件を満たす
   */
  private matchesPropertyTypeCriteria(buyer: any, propertyType: string | null): boolean {
    const desiredType = (buyer.desired_property_type || '').trim();

    // 希望種別が「指定なし」の場合は条件を満たす
    if (desiredType === '指定なし') {
      return true;
    }

    // 希望種別が空欄の場合は条件を満たさない（除外）
    if (!desiredType) {
      return false;
    }

    // 物件種別が空欄の場合は条件を満たさない
    if (!propertyType) {
      return false;
    }

    // 種別の正規化と比較
    const normalizedPropertyType = this.normalizePropertyType(propertyType);
    const normalizedDesiredTypes = desiredType.split(/[,、\s]+/).map((t: string) => this.normalizePropertyType(t));

    // いずれかの希望種別が物件種別と合致すれば条件を満たす
    return normalizedDesiredTypes.some((dt: string) => 
      dt === normalizedPropertyType || 
      normalizedPropertyType.includes(dt) ||
      dt.includes(normalizedPropertyType)
    );
  }

  /**
   * 価格帯条件によるフィルタリング
   * - 買主の希望価格帯が空欄の場合: 条件を満たす
   * - 物件価格が買主の希望価格帯内: 条件を満たす
   */
  private matchesPriceCriteria(
    buyer: any,
    salesPrice: number | null,
    propertyType: string | null
  ): boolean {
    // 物件価格が空欄の場合は条件を満たす
    if (!salesPrice) {
      return true;
    }

    // 物件種別に応じた価格帯フィールドを選択
    let priceRange: string | null = null;
    const normalizedType = this.normalizePropertyType(propertyType || '');

    if (normalizedType === '戸建' || normalizedType.includes('戸建')) {
      priceRange = buyer.price_range_house;
    } else if (normalizedType === 'マンション' || normalizedType.includes('マンション')) {
      priceRange = buyer.price_range_apartment;
    } else if (normalizedType === '土地' || normalizedType.includes('土地')) {
      priceRange = buyer.price_range_land;
    }

    // 価格帯が空欄の場合は条件を満たす
    if (!priceRange || !priceRange.trim()) {
      return true;
    }

    // 価格帯をパースして範囲チェック
    const { min, max } = this.parsePriceRange(priceRange);
    return salesPrice >= min && salesPrice <= max;
  }

  /**
   * エリア番号を抽出（①②③...の形式）
   */
  private extractAreaNumbers(areaString: string): string[] {
    // 丸数字を抽出
    const circledNumbers = areaString.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]/g) || [];
    return circledNumbers;
  }

  /**
   * 物件の住所からエリア番号を取得
   * 1. distribution_areasフィールドから丸数字を抽出
   * 2. 住所から詳細エリアマッピング（BeppuAreaMappingService、OitaCityAreaMappingService）
   * 3. 市全体マッピング（大分市→㊵、別府市→㊶）
   */
  private async getAreaNumbersForProperty(property: any): Promise<string[]> {
    const areaNumbers = new Set<string>();

    // 1. distribution_areasフィールドから丸数字を抽出
    const distributionAreas = property.distribution_areas || property.distribution_area || '';
    if (distributionAreas) {
      const extracted = this.extractAreaNumbers(distributionAreas);
      extracted.forEach(num => areaNumbers.add(num));
    }

    // 2. 住所から詳細エリアマッピング
    const address = (property.address || '').trim();
    if (address) {
      // 大分市の場合
      if (address.includes('大分市')) {
        // 市全体エリアを追加
        areaNumbers.add('㊵');
        
        // 詳細エリアを取得（例: 萩原 → ②）
        try {
          const oitaAreas = await this.oitaCityAreaMappingService.getDistributionAreasForAddress(address);
          if (oitaAreas) {
            const detailedAreas = this.extractAreaNumbers(oitaAreas);
            detailedAreas.forEach(num => areaNumbers.add(num));
            console.log(`[BuyerCandidateService] Oita detailed areas for ${address}:`, detailedAreas);
          }
        } catch (error) {
          console.error(`[BuyerCandidateService] Error getting Oita areas:`, error);
        }
      }
      
      // 別府市の場合
      if (address.includes('別府市')) {
        try {
          const beppuAreas = await this.beppuAreaMappingService.getDistributionAreasForAddress(address);
          if (beppuAreas) {
            const detailedAreas = this.extractAreaNumbers(beppuAreas);
            detailedAreas.forEach(num => areaNumbers.add(num));
            console.log(`[BuyerCandidateService] Beppu detailed areas for ${address}:`, detailedAreas);
          } else {
            // マッピングが見つからない場合は別府市全体にフォールバック
            areaNumbers.add('㊶');
            console.log(`[BuyerCandidateService] No detailed mapping for ${address}, using ㊶`);
          }
        } catch (error) {
          console.error(`[BuyerCandidateService] Error getting Beppu areas:`, error);
          areaNumbers.add('㊶');
        }
      }
    }

    const result = Array.from(areaNumbers);
    console.log(`[BuyerCandidateService] Final area numbers for property:`, result);
    return result;
  }

  /**
   * 物件の座標を取得
   */
  private async getPropertyCoordinates(property: any): Promise<{ lat: number; lng: number } | null> {
    try {
      const googleMapUrl = property.google_map_url;
      if (!googleMapUrl) {
        return null;
      }

      const coords = await this.geolocationService.extractCoordinatesFromUrl(googleMapUrl);
      return coords;
    } catch (error) {
      console.error(`[BuyerCandidateService] Error extracting coordinates:`, error);
      return null;
    }
  }

  /**
   * 種別を正規化
   */
  private normalizePropertyType(type: string): string {
    const normalized = type.trim()
      .replace(/中古/g, '')
      .replace(/新築/g, '')
      .replace(/一戸建て/g, '戸建')
      .replace(/一戸建/g, '戸建')
      .replace(/戸建て/g, '戸建')
      .replace(/分譲/g, '')
      .trim();
    return normalized;
  }

  /**
   * 価格帯をパース（例: "1000万円〜2000万円" → { min: 10000000, max: 20000000 }）
   */
  private parsePriceRange(priceRange: string): { min: number; max: number } {
    // デフォルト値（全範囲）
    let min = 0;
    let max = Number.MAX_SAFE_INTEGER;

    // 価格帯のパターンを解析
    // パターン1: "1000万円〜2000万円" or "1000〜2000万円"
    // パターン2: "〜2000万円" or "2000万円以下"
    // パターン3: "1000万円〜" or "1000万円以上"
    // パターン4: "1000万円"（単一値）

    const cleanedRange = priceRange
      .replace(/,/g, '')
      .replace(/円/g, '')
      .replace(/万/g, '0000')
      .replace(/億/g, '00000000')
      .trim();

    // 範囲パターン（〜、～、-、~）
    const rangeMatch = cleanedRange.match(/(\d+)?\s*[〜～\-~]\s*(\d+)?/);
    if (rangeMatch) {
      if (rangeMatch[1]) {
        min = parseInt(rangeMatch[1], 10);
      }
      if (rangeMatch[2]) {
        max = parseInt(rangeMatch[2], 10);
      }
      return { min, max };
    }

    // 以上/以下パターン
    const aboveMatch = cleanedRange.match(/(\d+)\s*以上/);
    if (aboveMatch) {
      min = parseInt(aboveMatch[1], 10);
      return { min, max };
    }

    const belowMatch = cleanedRange.match(/(\d+)\s*以下/);
    if (belowMatch) {
      max = parseInt(belowMatch[1], 10);
      return { min, max };
    }

    // 単一値パターン
    const singleMatch = cleanedRange.match(/^(\d+)$/);
    if (singleMatch) {
      const value = parseInt(singleMatch[1], 10);
      // 単一値の場合は±20%の範囲とする
      min = value * 0.8;
      max = value * 1.2;
      return { min, max };
    }

    return { min, max };
  }
}
