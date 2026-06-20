// 拡張地理位置計算サービス - 複数エリアマップ対応
import { GeolocationService, Coordinates } from './GeolocationService';
import { AreaMapConfigService } from './AreaMapConfigService';

export interface GeographicMatchResult {
  matched: boolean;
  matchedAreas?: string[];
  matchType: 'inquiry' | 'area' | 'both' | 'radius' | 'city-wide' | 'none';
  distances?: Map<string, number>; // エリア番号 -> 距離(km)
  matchedInquiries?: {
    propertyNumber: string;
    distance: number;
  }[];
  minDistance?: number;
}

export class EnhancedGeolocationService {
  private geolocationService: GeolocationService;
  private areaMapConfigService: AreaMapConfigService;
  private readonly DEFAULT_RADIUS_KM = 10.0;

  constructor() {
    this.geolocationService = new GeolocationService();
    this.areaMapConfigService = new AreaMapConfigService();
  }

  /**
   * エリアマップの座標を取得
   * @param areaNumber エリア番号
   * @returns 座標、または取得失敗時はnull
   */
  async getAreaMapCoordinates(areaNumber: string): Promise<Coordinates | null> {
    try {
      return await this.areaMapConfigService.getCoordinatesForArea(areaNumber);
    } catch (error) {
      console.error(`[EnhancedGeolocationService] Error getting coordinates for area ${areaNumber}:`, error);
      return null;
    }
  }

  /**
   * 物件がいずれかのエリアの半径内にあるかチェック
   * @param propertyCoords 物件の座標
   * @param areaNumbers チェックするエリア番号の配列
   * @param radiusKm 半径（km）デフォルト10km
   * @returns マッチ結果
   */
  async isWithinRadiusOfAnyArea(
    propertyCoords: Coordinates,
    areaNumbers: string[],
    radiusKm: number = this.DEFAULT_RADIUS_KM
  ): Promise<GeographicMatchResult> {
    const matchedAreas: string[] = [];
    const distances = new Map<string, number>();

    try {
      const configs = await this.areaMapConfigService.loadAreaMaps();

      for (const areaNumber of areaNumbers) {
        const config = configs.find(c => c.areaNumber === areaNumber);

        if (!config) {
          console.warn(`[EnhancedGeolocationService] Area configuration not found: ${areaNumber}`);
          continue;
        }

        // Skip city-wide areas (they don't have coordinates)
        if (config.cityName) {
          continue;
        }

        // Check radius for areas with coordinates
        if (config.coordinates) {
          const distance = this.geolocationService.calculateDistance(
            propertyCoords,
            config.coordinates
          );
          distances.set(areaNumber, distance);

          if (distance <= radiusKm) {
            matchedAreas.push(areaNumber);
          }
        }
      }

      return {
        matched: matchedAreas.length > 0,
        matchedAreas,
        matchType: matchedAreas.length > 0 ? 'radius' : 'none',
        distances
      };
    } catch (error) {
      console.error('[EnhancedGeolocationService] Error checking radius match:', error);
      return {
        matched: false,
        matchedAreas: [],
        matchType: 'none',
        distances
      };
    }
  }

  /**
   * 市全体のマッチングをチェック
   * @param propertyCity 物件の市名
   * @param areaNumbers チェックするエリア番号の配列
   * @returns マッチ結果
   */
  async isCityWideMatch(
    propertyCity: string | null | undefined,
    areaNumbers: string[]
  ): Promise<GeographicMatchResult> {
    const matchedAreas: string[] = [];

    if (!propertyCity) {
      return {
        matched: false,
        matchedAreas: [],
        matchType: 'none'
      };
    }

    try {
      const configs = await this.areaMapConfigService.getCityWideConfigs();

      for (const areaNumber of areaNumbers) {
        const config = configs.find(c => c.areaNumber === areaNumber);

        if (config && config.cityName) {
          // Normalize city names for comparison
          const normalizedPropertyCity = this.normalizeCityName(propertyCity);
          const normalizedConfigCity = this.normalizeCityName(config.cityName);

          if (normalizedPropertyCity === normalizedConfigCity) {
            matchedAreas.push(areaNumber);
          }
        }
      }

      return {
        matched: matchedAreas.length > 0,
        matchedAreas,
        matchType: matchedAreas.length > 0 ? 'city-wide' : 'none'
      };
    } catch (error) {
      console.error('[EnhancedGeolocationService] Error checking city-wide match:', error);
      return {
        matched: false,
        matchedAreas: [],
        matchType: 'none'
      };
    }
  }

  /**
   * 市名を正規化（比較用）
   * @param cityName 市名
   * @returns 正規化された市名
   */
  private normalizeCityName(cityName: string): string {
    return cityName
      .trim()
      .replace(/\s+/g, '')
      .replace(/市$/, ''); // 「市」を削除して比較
  }

  /**
   * 物件が買主の希望エリアにマッチするかチェック（統合版）
   * @param propertyCoords 物件の座標
   * @param propertyCity 物件の市名
   * @param desiredAreas 買主の希望エリア番号の配列
   * @param radiusKm 半径（km）デフォルト10km
   * @returns マッチ結果
   */
  async checkGeographicMatch(
    propertyCoords: Coordinates | null,
    propertyCity: string | null | undefined,
    desiredAreas: string[],
    radiusKm: number = this.DEFAULT_RADIUS_KM
  ): Promise<GeographicMatchResult> {
    // First check city-wide match
    const cityWideResult = await this.isCityWideMatch(propertyCity, desiredAreas);
    if (cityWideResult.matched) {
      return cityWideResult;
    }

    // Then check radius match if coordinates are available
    if (propertyCoords) {
      const radiusResult = await this.isWithinRadiusOfAnyArea(
        propertyCoords,
        desiredAreas,
        radiusKm
      );
      if (radiusResult.matched) {
        return radiusResult;
      }
    }

    // No match
    return {
      matched: false,
      matchedAreas: [],
      matchType: 'none'
    };
  }

  /**
   * 希望エリア文字列からエリア番号を抽出
   * @param desiredAreaText 希望エリアのテキスト（例: "①②③", "①,②,③", "①　②　③"）
   * @returns エリア番号の配列
   */
  extractAreaNumbers(desiredAreaText: string | null | undefined): string[] {
    if (!desiredAreaText) {
      return [];
    }

    // Extract all area numbers using regex
    // Supports circled numbers: ①-⑳ (1-20) and ㉑-㊿ (21-50)
    const areaPattern = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿]/g;
    const matches = desiredAreaText.match(areaPattern);

    if (!matches) {
      return [];
    }

    // Remove duplicates and return
    return Array.from(new Set(matches));
  }

  /**
   * 座標取得（URLまたは住所から）
   * @param googleMapsUrl Google Maps URL
   * @param _address 住所（現在未使用）
   * @returns 座標、または取得失敗時はnull
   */
  async getCoordinates(
    googleMapsUrl: string | null | undefined,
    _address: string | null | undefined
  ): Promise<Coordinates | null> {
    // まずGoogle Maps URLから座標を取得
    if (googleMapsUrl) {
      const coords = await this.geolocationService.extractCoordinatesFromUrl(googleMapsUrl);
      if (coords) return coords;
    }

    // URLから取得できない場合は住所からのジオコーディングは未実装
    // 現時点ではGoogle Maps URLが必須
    return null;
  }

  /**
   * 座標抽出（GeolocationServiceのラッパー）
   * @param googleMapsUrl Google Maps URL
   * @returns 座標、または抽出失敗時はnull
   */
  async extractCoordinatesFromUrl(googleMapsUrl: string | null | undefined): Promise<Coordinates | null> {
    return await this.geolocationService.extractCoordinatesFromUrl(googleMapsUrl);
  }

  /**
   * 距離計算（GeolocationServiceのラッパー）
   * @param point1 地点1の座標
   * @param point2 地点2の座標
   * @returns 距離（km）
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    return this.geolocationService.calculateDistance(point1, point2);
  }
}
