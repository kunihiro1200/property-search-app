// 物件配信エリア計算サービス
import { EnhancedGeolocationService } from './EnhancedGeolocationService';
import { AreaMapConfigService } from './AreaMapConfigService';
import { BeppuAreaMappingService } from './BeppuAreaMappingService';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistributionAreaCalculationResult {
  areas: string[];           // ["①", "②", "③", "㊵"]
  formatted: string;         // "①,②,③,㊵"
  radiusAreas: string[];     // Areas matched by 10KM radius
  cityWideAreas: string[];   // Areas matched by city (㊵, ㊶)
  calculatedAt: Date;
}

export interface DistributionAreaDebugInfo {
  propertyCoords: Coordinates | null;
  cityField: string | null;
  areaConfigs: Array<{
    areaNumber: string;
    coordinates: Coordinates | null;
  }>;
  distanceCalculations: Array<{
    areaNumber: string;
    areaCoords: Coordinates;
    distance: number;
    withinRadius: boolean;
  }>;
  cityWideMatches: string[];
  finalAreas: string[];
}

export interface DistributionAreaCalculationWithDebug {
  result: DistributionAreaCalculationResult;
  debugInfo: DistributionAreaDebugInfo;
}

export interface RadiusVerificationResult {
  correct: boolean;
  missing: string[];
  unexpected: string[];
}

export interface LocationTestResult {
  passed: boolean;
  actual: string[];
  expected: string[];
  discrepancies: string[];
}

export class PropertyDistributionAreaCalculator {
  private geolocationService: EnhancedGeolocationService;
  private areaMapConfigService: AreaMapConfigService;
  private beppuAreaMappingService: BeppuAreaMappingService;
  private readonly RADIUS_KM: number;

  constructor() {
    this.geolocationService = new EnhancedGeolocationService();
    this.areaMapConfigService = new AreaMapConfigService();
    this.beppuAreaMappingService = new BeppuAreaMappingService();
    // 環境変数から半径を取得、デフォルトは3km
    this.RADIUS_KM = parseFloat(process.env.DISTRIBUTION_AREA_RADIUS_KM || '3');
  }

  /**
   * 物件の配信エリアを計算（直線距離のみ使用）
   * @param googleMapUrl Google Map URL
   * @param city 市名（オプション）
   * @param address 住所（別府市の詳細エリア判定用、オプション）
   * @returns 計算結果
   */
  async calculateDistributionAreas(
    googleMapUrl: string | null | undefined,
    city?: string | null,
    address?: string | null
  ): Promise<DistributionAreaCalculationResult> {
    const radiusAreas: string[] = [];
    const cityWideAreas: string[] = [];

    // 1. 市名に基づいて市全域エリアを追加
    if (city) {
      const normalizedCity = this.normalizeCityName(city);
      
      if (normalizedCity.includes('大分')) {
        cityWideAreas.push('㊵');
      }
      if (normalizedCity.includes('別府')) {
        // 別府市の場合、住所から詳細エリアを取得
        if (address) {
          const beppuAreas = await this.beppuAreaMappingService.getDistributionAreasForAddress(address);
          
          if (beppuAreas) {
            console.log(`[DistributionArea] Beppu detailed areas: ${beppuAreas}`);
            // 別府市の詳細エリア番号をパースして追加
            const detailedAreas = this.parseAreaNumbers(beppuAreas);
            cityWideAreas.push(...detailedAreas);
          } else {
            // マッピングが見つからない場合は別府市全体にフォールバック
            console.warn(`[DistributionArea] No detailed mapping found for ${address}, falling back to ㊶`);
            cityWideAreas.push('㊶');
          }
        } else {
          // 住所がない場合は別府市全体
          cityWideAreas.push('㊶');
        }
      }
    }

    // 2. URLから座標を抽出
    if (googleMapUrl) {
      const coords = await this.geolocationService.extractCoordinatesFromUrl(googleMapUrl);
      
      if (coords) {
        // 3. エリアマップ設定を読み込み
        const areaConfigs = await this.areaMapConfigService.loadAreaMaps();
        
        // 4. 直線距離で各エリアまでの距離を計算
        for (const config of areaConfigs) {
          // 市全域エリア（座標なし）はスキップ
          if (!config.coordinates) continue;
          
          const distance = this.geolocationService.calculateDistance(
            coords,
            config.coordinates
          );
          
          // 設定された半径内のエリアを追加
          if (distance <= this.RADIUS_KM) {
            radiusAreas.push(config.areaNumber);
          }
        }
      }
    }

    // 5. 結合して重複を削除
    const allAreas = [...cityWideAreas, ...radiusAreas];
    const uniqueAreas = Array.from(new Set(allAreas));
    
    // 6. エリアをソート
    const sortedAreas = this.sortAreaNumbers(uniqueAreas);

    return {
      areas: sortedAreas,
      formatted: this.formatAreaNumbers(sortedAreas),
      radiusAreas,
      cityWideAreas,
      calculatedAt: new Date()
    };
  }

  /**
   * エリア番号を検証
   * @param areaNumbers エリア番号文字列
   * @returns 有効かどうか
   */
  validateAreaNumbers(areaNumbers: string): boolean {
    if (!areaNumbers || areaNumbers.trim() === '') {
      return true; // Empty is valid
    }

    const areas = this.parseAreaNumbers(areaNumbers);
    const validAreaPattern = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]$/;

    return areas.every(area => validAreaPattern.test(area));
  }

  /**
   * エリア番号文字列をパース
   * @param areaNumbers エリア番号文字列（例: "①②③", "①,②,③", "①　②　③"）
   * @returns エリア番号の配列
   */
  parseAreaNumbers(areaNumbers: string): string[] {
    if (!areaNumbers) {
      return [];
    }

    // Extract all area numbers using regex
    const areaPattern = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]/g;
    const matches = areaNumbers.match(areaPattern);

    if (!matches) {
      return [];
    }

    // Remove duplicates
    return Array.from(new Set(matches));
  }

  /**
   * エリア番号をフォーマット
   * @param areas エリア番号の配列
   * @returns フォーマットされた文字列（例: "①,②,③,㊵"）
   */
  formatAreaNumbers(areas: string[]): string {
    if (!areas || areas.length === 0) {
      return '';
    }

    return areas.join(',');
  }

  /**
   * エリア番号をソート
   * @param areas エリア番号の配列
   * @returns ソートされた配列
   */
  private sortAreaNumbers(areas: string[]): string[] {
    // Define sort order
    const order = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', 
                   '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '㊵', '㊶'];
    
    return areas.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      
      // If not found, put at end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  }

  /**
   * 市名を正規化
   * @param cityName 市名
   * @returns 正規化された市名
   */
  private normalizeCityName(cityName: string): string {
    return cityName
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  /**
   * デバッグ情報付きで配信エリアを計算
   * @param googleMapUrl Google Map URL
   * @param city 市名（オプション）
   * @param address 住所（別府市の詳細エリア判定用、オプション）
   * @returns 計算結果とデバッグ情報
   */
  async calculateWithDebugInfo(
    googleMapUrl: string | null | undefined,
    city?: string | null,
    address?: string | null
  ): Promise<DistributionAreaCalculationWithDebug> {
    const debugInfo: DistributionAreaDebugInfo = {
      propertyCoords: null,
      cityField: city || null,
      areaConfigs: [],
      distanceCalculations: [],
      cityWideMatches: [],
      finalAreas: []
    };

    const radiusAreas: string[] = [];
    const cityWideAreas: string[] = [];

    // 1. Add city-wide areas based on city
    if (city) {
      const normalizedCity = this.normalizeCityName(city);
      
      if (normalizedCity.includes('大分')) {
        cityWideAreas.push('㊵');
        debugInfo.cityWideMatches.push('㊵ (大分市)');
      }
      if (normalizedCity.includes('別府')) {
        // 別府市の場合、住所から詳細エリアを取得
        if (address) {
          const beppuAreas = await this.beppuAreaMappingService.getDistributionAreasForAddress(address);
          
          if (beppuAreas) {
            console.log(`[DistributionArea] Beppu detailed areas: ${beppuAreas}`);
            const detailedAreas = this.parseAreaNumbers(beppuAreas);
            cityWideAreas.push(...detailedAreas);
            debugInfo.cityWideMatches.push(`${beppuAreas} (別府市詳細エリア)`);
          } else {
            console.warn(`[DistributionArea] No detailed mapping found for ${address}, falling back to ㊶`);
            cityWideAreas.push('㊶');
            debugInfo.cityWideMatches.push('㊶ (別府市全体 - フォールバック)');
          }
        } else {
          cityWideAreas.push('㊶');
          debugInfo.cityWideMatches.push('㊶ (別府市全体)');
        }
      }
    }

    // 2. Extract coordinates from URL
    if (googleMapUrl) {
      const coords = await this.geolocationService.extractCoordinatesFromUrl(googleMapUrl);
      debugInfo.propertyCoords = coords;
      
      if (coords) {
        // 3. Load area map configurations
        const areaConfigs = await this.areaMapConfigService.loadAreaMaps();
        
        // Store area configs in debug info
        debugInfo.areaConfigs = areaConfigs.map(config => ({
          areaNumber: config.areaNumber,
          coordinates: config.coordinates || null
        }));
        
        // 4. Calculate distance to each area
        for (const config of areaConfigs) {
          // Skip city-wide areas (they don't have coordinates)
          if (!config.coordinates) continue;
          
          const distance = this.geolocationService.calculateDistance(
            coords,
            config.coordinates
          );
          
          const withinRadius = distance <= this.RADIUS_KM;
          
          // Store distance calculation in debug info
          debugInfo.distanceCalculations.push({
            areaNumber: config.areaNumber,
            areaCoords: config.coordinates,
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            withinRadius
          });
          
          if (withinRadius) {
            radiusAreas.push(config.areaNumber);
          }
        }
      }
    }

    // 5. Combine and remove duplicates
    const allAreas = [...cityWideAreas, ...radiusAreas];
    const uniqueAreas = Array.from(new Set(allAreas));
    
    // 6. Sort areas
    const sortedAreas = this.sortAreaNumbers(uniqueAreas);
    debugInfo.finalAreas = sortedAreas;

    const result: DistributionAreaCalculationResult = {
      areas: sortedAreas,
      formatted: this.formatAreaNumbers(sortedAreas),
      radiusAreas,
      cityWideAreas,
      calculatedAt: new Date()
    };

    return { result, debugInfo };
  }

  /**
   * 半径計算の検証
   * @param propertyCoords 物件の座標
   * @param expectedAreas 期待されるエリア番号
   * @returns 検証結果
   */
  async verifyRadiusCalculation(
    propertyCoords: Coordinates,
    expectedAreas: string[]
  ): Promise<RadiusVerificationResult> {
    const areaConfigs = await this.areaMapConfigService.loadAreaMaps();
    const actualAreas: string[] = [];

    for (const config of areaConfigs) {
      if (!config.coordinates) continue;
      
      const distance = this.geolocationService.calculateDistance(
        propertyCoords,
        config.coordinates
      );
      
      if (distance <= this.RADIUS_KM) {
        actualAreas.push(config.areaNumber);
      }
    }

    const missing = expectedAreas.filter(area => !actualAreas.includes(area));
    const unexpected = actualAreas.filter(area => !expectedAreas.includes(area));
    const correct = missing.length === 0 && unexpected.length === 0;

    return { correct, missing, unexpected };
  }

  /**
   * 既知の場所でテスト
   * @param address 住所
   * @param expectedAreas 期待されるエリア番号
   * @returns テスト結果
   */
  async testWithKnownLocation(
    address: string,
    expectedAreas: string[]
  ): Promise<LocationTestResult> {
    // This is a placeholder - in a real implementation, you would:
    // 1. Geocode the address to get coordinates
    // 2. Calculate distribution areas
    // 3. Compare with expected areas
    
    console.log(`Testing location: ${address}`);
    console.log(`Expected areas: ${expectedAreas.join(', ')}`);
    
    // For now, return a placeholder result
    return {
      passed: false,
      actual: [],
      expected: expectedAreas,
      discrepancies: ['Test not yet implemented']
    };
  }
}
