// 買主候補抽出サービス
import { createClient } from '@supabase/supabase-js';

export interface BuyerCandidate {
  id: string;
  buyer_number: string;
  name: string | null;
  latest_status: string | null;
  inquiry_confidence: string | null;
  desired_area: string | null;
  desired_property_type: string | null;
  reception_date: string | null;
  email: string | null;
  phone_number: string | null;
}

export interface BuyerCandidateResponse {
  candidates: BuyerCandidate[];
  total: number;
  property: {
    property_number: string;
    property_type: string | null;
    sales_price: number | null;
    distribution_areas: string | null;
  };
}

export class BuyerCandidateService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * 物件に対する買主候補を取得
   */
  async getCandidatesForProperty(propertyNumber: string): Promise<BuyerCandidateResponse> {
    // 物件情報を取得
    const { data: property, error: propertyError } = await this.supabase
      .from('property_listings')
      .select('property_number, property_type, sales_price, distribution_areas')
      .eq('property_number', propertyNumber)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    // 買主を取得（最新状況/問合せ時確度でフィルタリング）
    const { data: buyers, error: buyersError } = await this.supabase
      .from('buyers')
      .select(`
        id,
        buyer_number,
        name,
        latest_status,
        inquiry_confidence,
        inquiry_source,
        distribution_type,
        broker_inquiry,
        desired_area,
        desired_property_type,
        price_range_house,
        price_range_apartment,
        price_range_land,
        reception_date,
        email,
        phone_number
      `)
      .order('reception_date', { ascending: false, nullsFirst: false });

    if (buyersError) {
      throw new Error(`Failed to fetch buyers: ${buyersError.message}`);
    }

    // フィルタリング
    const candidates = this.filterCandidates(
      buyers || [],
      property.property_type,
      property.sales_price,
      property.distribution_areas
    );

    // 最大50件に制限
    const limitedCandidates = candidates.slice(0, 50);

    return {
      candidates: limitedCandidates.map(b => ({
        id: b.id,
        buyer_number: b.buyer_number,
        name: b.name,
        latest_status: b.latest_status,
        inquiry_confidence: b.inquiry_confidence,
        desired_area: b.desired_area,
        desired_property_type: b.desired_property_type,
        reception_date: b.reception_date,
        email: b.email,
        phone_number: b.phone_number,
      })),
      total: limitedCandidates.length,
      property: {
        property_number: property.property_number,
        property_type: property.property_type,
        sales_price: property.sales_price,
        distribution_areas: property.distribution_areas,
      },
    };
  }

  /**
   * 買主候補をフィルタリング
   */
  private filterCandidates(
    buyers: any[],
    propertyType: string | null,
    salesPrice: number | null,
    distributionAreas: string | null
  ): any[] {
    const propertyAreaNumbers = this.extractAreaNumbers(distributionAreas || '');

    return buyers.filter(buyer => {
      // 1. 除外条件の評価（早期リターン）
      if (this.shouldExcludeBuyer(buyer)) {
        return false;
      }

      // 2. 最新状況/問合せ時確度フィルタ
      if (!this.matchesStatus(buyer)) {
        return false;
      }

      // 3. エリアフィルタ
      if (!this.matchesAreaCriteria(buyer, propertyAreaNumbers)) {
        return false;
      }

      // 4. 種別フィルタ
      if (!this.matchesPropertyTypeCriteria(buyer, propertyType)) {
        return false;
      }

      // 5. 価格帯フィルタ
      if (!this.matchesPriceCriteria(buyer, salesPrice, propertyType)) {
        return false;
      }

      return true;
    });
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
    const distributionType = (buyer.distribution_type || '').trim();
    return distributionType === '要';
  }

  /**
   * 最新状況によるフィルタリング
   * - 買付またはDを含む場合: 除外
   * - それ以外: 条件を満たす
   */
  private matchesStatus(buyer: any): boolean {
    const latestStatus = (buyer.latest_status || '').trim();

    // 買付またはDを含む場合は除外
    if (latestStatus.includes('買付') || latestStatus.includes('D')) {
      return false;
    }

    return true;
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
   * エリア条件によるフィルタリング
   * - 買主の希望エリアが空欄の場合: 条件を満たす
   * - 物件の配信エリアと買主の希望エリアが1つでも合致: 条件を満たす
   */
  private matchesAreaCriteria(buyer: any, propertyAreaNumbers: string[]): boolean {
    const desiredArea = (buyer.desired_area || '').trim();

    // 希望エリアが空欄の場合は条件を満たす
    if (!desiredArea) {
      return true;
    }

    // 物件の配信エリアが空欄の場合は条件を満たさない
    if (propertyAreaNumbers.length === 0) {
      return false;
    }

    // 買主の希望エリアを抽出
    const buyerAreaNumbers = this.extractAreaNumbers(desiredArea);

    // 1つでも合致すれば条件を満たす
    return propertyAreaNumbers.some(area => buyerAreaNumbers.includes(area));
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

    // 範囲パターン（〜、-、～）
    const rangeMatch = cleanedRange.match(/(\d+)?\s*[〜～\-]\s*(\d+)?/);
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
