import { BaseRepository } from '../repositories/BaseRepository';
import { PropertyInfo, ValuationResult, PropertyType } from '../types';
import { CacheHelper, CACHE_TTL } from '../utils/cache';

export class ValuationEngine extends BaseRepository {
  // 基準価格（平方メートルあたり、円）
  private readonly BASE_PRICES = {
    [PropertyType.DETACHED_HOUSE]: 200000,
    [PropertyType.APARTMENT]: 300000,
    [PropertyType.LAND]: 150000,
    [PropertyType.COMMERCIAL]: 400000,
  };

  // 築年数による減価率（年あたり）
  private readonly DEPRECIATION_RATE = 0.015; // 1.5%/年

  // 異常値の閾値（平均からの乖離率）
  private readonly ANOMALY_THRESHOLD = 3.0;

  /**
   * 査定額を計算（査定額1、2、3を算出）
   */
  async calculateValuation(
    sellerId: string,
    property: PropertyInfo
  ): Promise<ValuationResult> {
    // 戸建てまたは土地の場合のみ自動計算
    if (property.propertyType !== PropertyType.DETACHED_HOUSE && 
        property.propertyType !== PropertyType.LAND) {
      throw new Error('自動査定はマンションには対応していません。手入力してください。');
    }

    // 基本査定額を計算
    const basePrice = this.calculateBasePrice(property);

    // 築年数による減価を適用
    const depreciatedPrice = this.applyDepreciation(basePrice, property.buildYear);

    // 立地による補正（都道府県・市区町村）
    const locationAdjusted = this.applyLocationAdjustment(
      depreciatedPrice,
      property.prefecture,
      property.city
    );

    // 設備による補正
    const facilityAdjusted = this.applyFacilityAdjustment(locationAdjusted, property);

    // 査定額1、2、3を計算（最低額、中間額、最高額）
    // 査定額2を基準として、査定額1は-10%、査定額3は+10%
    const valuation2 = Math.round(facilityAdjusted);
    const valuation1 = Math.round(valuation2 * 0.9);
    const valuation3 = Math.round(valuation2 * 1.1);

    // 査定額の順序関係を検証（プロパティ8）
    if (!(valuation1 <= valuation2 && valuation2 <= valuation3)) {
      throw new Error('査定額の順序関係が不正です');
    }

    // 異常値チェック
    const isAnomalous = this.checkAnomalous(valuation2, property);
    const warnings = this.generateWarnings(valuation2, property, isAnomalous);

    // 計算根拠
    const calculationBasis = this.generateCalculationBasis(
      property,
      basePrice,
      depreciatedPrice,
      locationAdjusted,
      valuation1,
      valuation2,
      valuation3
    );

    // データベースに保存
    const valuationData = {
      seller_id: sellerId,
      valuation_1: valuation1,
      valuation_2: valuation2,
      valuation_3: valuation3,
      calculation_basis: calculationBasis,
      is_anomalous: isAnomalous,
      warnings: warnings.length > 0 ? warnings : null,
    };

    console.log('Saving valuation:', valuationData);

    const { data: valuation, error } = await this.table('valuations')
      .insert(valuationData)
      .select()
      .single();

    if (error || !valuation) {
      throw new Error(`Failed to save valuation: ${error?.message}`);
    }

    // キャッシュをクリア
    const cacheKey = CacheHelper.generateKey('valuations', sellerId);
    await CacheHelper.del(cacheKey);

    return valuation;
  }

  /**
   * 査定履歴を取得
   */
  async getValuationHistory(sellerId: string): Promise<ValuationResult[]> {
    // キャッシュをチェック
    const cacheKey = CacheHelper.generateKey('valuations', sellerId);
    const cached = await CacheHelper.get<ValuationResult[]>(cacheKey);
    if (cached) {
      console.log('✅ Cache hit for valuations:', sellerId);
      return cached;
    }

    const { data: valuations, error } = await this.table<ValuationResult>('valuations')
      .select('*')
      .eq('seller_id', sellerId)
      .order('calculated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get valuation history: ${error.message}`);
    }

    const result = valuations || [];

    // キャッシュに保存
    await CacheHelper.set(cacheKey, result, CACHE_TTL.VALUATION);

    return result;
  }

  /**
   * 基本価格を計算
   */
  private calculateBasePrice(property: PropertyInfo): number {
    const basePrice = this.BASE_PRICES[property.propertyType];
    const area = property.buildingArea || property.landArea || 0;
    return basePrice * area;
  }

  /**
   * 築年数による減価を適用
   */
  private applyDepreciation(price: number, buildYear?: number): number {
    if (!buildYear) {
      return price;
    }

    const currentYear = new Date().getFullYear();
    const age = currentYear - buildYear;

    if (age <= 0) {
      return price;
    }

    // 最大50%まで減価
    const depreciationFactor = Math.max(0.5, 1 - age * this.DEPRECIATION_RATE);
    return price * depreciationFactor;
  }

  /**
   * 立地による補正
   */
  private applyLocationAdjustment(
    price: number,
    prefecture: string,
    city: string
  ): number {
    // 簡易的な立地補正（実際は詳細な市場データを使用）
    const premiumPrefectures = ['東京都', '神奈川県', '大阪府', '愛知県'];
    const premiumCities = ['港区', '千代田区', '中央区', '渋谷区'];

    let adjustmentFactor = 1.0;

    if (prefecture && premiumPrefectures.includes(prefecture)) {
      adjustmentFactor *= 1.3;
    }

    if (city && premiumCities.some((c) => city.includes(c))) {
      adjustmentFactor *= 1.2;
    }

    return price * adjustmentFactor;
  }

  /**
   * 設備による補正
   */
  private applyFacilityAdjustment(price: number, property: PropertyInfo): number {
    let adjustmentFactor = 1.0;

    // 駐車場あり
    if (property.parking) {
      adjustmentFactor *= 1.05;
    }

    // 階数による補正
    if (property.floors && property.floors >= 3) {
      adjustmentFactor *= 1.03;
    }

    // 部屋数による補正
    if (property.rooms && property.rooms >= 4) {
      adjustmentFactor *= 1.02;
    }

    return price * adjustmentFactor;
  }

  /**
   * 異常値チェック
   */
  private checkAnomalous(price: number, property: PropertyInfo): boolean {
    const basePrice = this.BASE_PRICES[property.propertyType];
    const area = property.buildingArea || property.landArea || 1;
    const pricePerSqm = price / area;

    // 基準価格から大きく乖離している場合は異常値
    const deviation = Math.abs(pricePerSqm - basePrice) / basePrice;
    return deviation > this.ANOMALY_THRESHOLD;
  }

  /**
   * 警告メッセージを生成
   */
  private generateWarnings(
    price: number,
    property: PropertyInfo,
    isAnomalous: boolean
  ): string[] {
    const warnings: string[] = [];

    if (isAnomalous) {
      warnings.push('査定額が通常の範囲から大きく外れています。物件情報を再確認してください。');
    }

    if (property.buildYear && new Date().getFullYear() - property.buildYear > 30) {
      warnings.push('築30年以上の物件です。リフォーム状況により実際の価値が異なる可能性があります。');
    }

    if (!property.buildingArea && !property.landArea) {
      warnings.push('面積情報が不足しています。より正確な査定のため、詳細情報の入力を推奨します。');
    }

    return warnings;
  }

  /**
   * 計算根拠を生成
   */
  private generateCalculationBasis(
    property: PropertyInfo,
    basePrice: number,
    depreciatedPrice: number,
    locationAdjusted: number,
    valuation1: number,
    valuation2: number,
    valuation3: number
  ): string {
    const lines: string[] = [];

    lines.push(`物件種別: ${this.getPropertyTypeName(property.propertyType)}`);
    lines.push(`面積: ${property.buildingArea || property.landArea || 0}㎡`);
    lines.push(`基本価格: ${basePrice.toLocaleString()}円`);

    if (property.buildYear) {
      const age = new Date().getFullYear() - property.buildYear;
      lines.push(`築年数: ${age}年`);
      lines.push(`減価後価格: ${depreciatedPrice.toLocaleString()}円`);
    }

    lines.push(`立地補正後: ${locationAdjusted.toLocaleString()}円`);
    lines.push(`\n査定額1（最低額）: ${valuation1.toLocaleString()}円`);
    lines.push(`査定額2（中間額）: ${valuation2.toLocaleString()}円`);
    lines.push(`査定額3（最高額）: ${valuation3.toLocaleString()}円`);

    return lines.join('\n');
  }

  /**
   * 物件種別名を取得
   */
  private getPropertyTypeName(type: PropertyType): string {
    const names = {
      [PropertyType.DETACHED_HOUSE]: '戸建て',
      [PropertyType.APARTMENT]: 'マンション',
      [PropertyType.LAND]: '土地',
      [PropertyType.COMMERCIAL]: '商業用',
    };
    return names[type] || type;
  }

  /**
   * 複数査定額を計算（査定額1、査定額2、査定額3）
   * 戸建て・土地の場合は自動計算、マンションの場合は手入力を想定
   * 
   * @param sellerId - Seller ID
   * @param property - Property information
   * @param fixedAssetTaxRoadPrice - 固定資産税路線価（オプション）
   * @returns 3つの査定額
   */
  async calculateMultipleValuations(
    sellerId: string,
    property: PropertyInfo,
    fixedAssetTaxRoadPrice?: number
  ): Promise<{ amount1: number; amount2: number; amount3: number }> {
    // マンションの場合は手入力を想定するため、基本計算のみ提供
    if (property.propertyType === PropertyType.APARTMENT) {
      const basePrice = this.calculateBasePrice(property);
      const depreciatedPrice = this.applyDepreciation(basePrice, property.buildYear);
      const locationAdjusted = this.applyLocationAdjustment(
        depreciatedPrice,
        property.prefecture,
        property.city
      );
      const facilityAdjusted = this.applyFacilityAdjustment(locationAdjusted, property);
      
      const baseAmount = Math.round(facilityAdjusted);
      
      return {
        amount1: Math.round(baseAmount * 0.9), // 最低額（-10%）
        amount2: baseAmount, // 中間額
        amount3: Math.round(baseAmount * 1.1), // 最高額（+10%）
      };
    }

    // 戸建て・土地の場合は自動計算
    const basePrice = this.calculateBasePrice(property);
    const depreciatedPrice = this.applyDepreciation(basePrice, property.buildYear);
    const locationAdjusted = this.applyLocationAdjustment(
      depreciatedPrice,
      property.prefecture,
      property.city
    );
    const facilityAdjusted = this.applyFacilityAdjustment(locationAdjusted, property);

    // 固定資産税路線価を考慮
    let finalBase = facilityAdjusted;
    if (fixedAssetTaxRoadPrice && property.landArea) {
      const roadPriceEstimate = fixedAssetTaxRoadPrice * property.landArea;
      // 路線価ベースの査定額と比較して調整
      finalBase = (finalBase + roadPriceEstimate) / 2;
    }

    const amount2 = Math.round(finalBase);
    const amount1 = Math.round(amount2 * 0.92); // 最低額（-8%）
    const amount3 = Math.round(amount2 * 1.08); // 最高額（+8%）

    return { amount1, amount2, amount3 };
  }

  /**
   * 売主の査定額を更新（sellersテーブルに直接保存）
   * 
   * @param sellerId - Seller ID
   * @param valuations - Valuation amounts
   * @returns Updated seller record
   */
  async updateSellerValuations(
    sellerId: string,
    valuations: {
      valuationAmount1?: number;
      valuationAmount2?: number;
      valuationAmount3?: number;
      postVisitValuationAmount1?: number;
      valuationMethod?: string;
      valuationPdfUrl?: string;
      fixedAssetTaxRoadPrice?: number;
    }
  ): Promise<void> {
    const updateData: any = {};

    if (valuations.valuationAmount1 !== undefined) {
      updateData.valuation_amount_1 = valuations.valuationAmount1;
    }
    if (valuations.valuationAmount2 !== undefined) {
      updateData.valuation_amount_2 = valuations.valuationAmount2;
    }
    if (valuations.valuationAmount3 !== undefined) {
      updateData.valuation_amount_3 = valuations.valuationAmount3;
    }
    if (valuations.postVisitValuationAmount1 !== undefined) {
      updateData.post_visit_valuation_amount_1 = valuations.postVisitValuationAmount1;
    }
    if (valuations.valuationMethod !== undefined) {
      updateData.valuation_method = valuations.valuationMethod;
    }
    if (valuations.valuationPdfUrl !== undefined) {
      updateData.valuation_pdf_url = valuations.valuationPdfUrl;
    }
    if (valuations.fixedAssetTaxRoadPrice !== undefined) {
      updateData.fixed_asset_tax_road_price = valuations.fixedAssetTaxRoadPrice;
    }

    const { error } = await this.table('sellers').update(updateData).eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to update seller valuations: ${error.message}`);
    }

    // キャッシュをクリア
    const cacheKey = CacheHelper.generateKey('seller', sellerId);
    await CacheHelper.del(cacheKey);
  }

  /**
   * 査定額の順序を検証（額1 ≤ 額2 ≤ 額3）
   * 
   * @param amount1 - 査定額1
   * @param amount2 - 査定額2
   * @param amount3 - 査定額3
   * @returns true if valid order
   */
  validateValuationOrder(amount1: number, amount2: number, amount3: number): boolean {
    return amount1 <= amount2 && amount2 <= amount3;
  }

  /**
   * 査定書URLを生成（つながるオンライン）
   * 
   * @param sellerId - Seller ID
   * @param sellerNumber - Seller number
   * @returns Generated PDF URL
   */
  generateValuationPdfUrl(sellerId: string, sellerNumber: string): string {
    // つながるオンラインのURL形式（実際のURLは環境に応じて調整）
    const baseUrl = process.env.VALUATION_PDF_BASE_URL || 'https://tsunagaru-online.jp';
    return `${baseUrl}/valuation/${sellerNumber}/${sellerId}.pdf`;
  }

  /**
   * 固定資産税路線価を使用した査定額計算
   * 
   * @param landArea - 土地面積（㎡）
   * @param roadPrice - 固定資産税路線価（円/㎡）
   * @returns Estimated price based on road price
   */
  calculateFromRoadPrice(landArea: number, roadPrice: number): number {
    // 路線価は公示価格の約70%とされるため、逆算
    const estimatedPublicPrice = roadPrice / 0.7;
    // 実勢価格は公示価格の約110%程度
    const marketPrice = estimatedPublicPrice * 1.1;
    return Math.round(landArea * marketPrice);
  }
}
