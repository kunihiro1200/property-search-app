// Google Geocoding APIを使用して住所から座標を取得するサービス
import axios from 'axios';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class GeocodingService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[GeocodingService] GOOGLE_MAPS_API_KEY is not set');
    }
  }

  /**
   * 住所から座標を取得
   * @param address 住所
   * @returns 座標（緯度・経度）
   */
  async geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!this.apiKey) {
      console.error('[GeocodingService] API key is not configured');
      return null;
    }

    if (!address || address.trim() === '') {
      console.warn('[GeocodingService] Address is empty');
      return null;
    }

    try {
      console.log(`[GeocodingService] Geocoding address: ${address}`);

      const response = await axios.get(this.baseUrl, {
        params: {
          address: address,
          key: this.apiKey,
          language: 'ja', // 日本語
        },
        timeout: 10000, // 10秒タイムアウト
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        const coordinates: Coordinates = {
          latitude: location.lat,
          longitude: location.lng,
        };

        console.log(`[GeocodingService] Successfully geocoded: ${address} -> (${coordinates.latitude}, ${coordinates.longitude})`);
        return coordinates;
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.warn(`[GeocodingService] No results found for address: ${address}`);
        return null;
      } else if (response.data.status === 'OVER_QUERY_LIMIT') {
        console.error('[GeocodingService] API quota exceeded');
        throw new Error('Geocoding API quota exceeded');
      } else {
        console.error(`[GeocodingService] Geocoding failed with status: ${response.data.status}`);
        return null;
      }
    } catch (error: any) {
      if (error.response) {
        console.error(`[GeocodingService] API error: ${error.response.status} - ${error.response.data}`);
      } else if (error.request) {
        console.error('[GeocodingService] No response from API');
      } else {
        console.error(`[GeocodingService] Error: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * 複数の住所を一括でジオコーディング（レート制限対策付き）
   * @param addresses 住所の配列
   * @param delayMs リクエスト間の遅延（ミリ秒）
   * @returns 座標の配列
   */
  async geocodeAddressesBatch(
    addresses: string[],
    delayMs: number = 200
  ): Promise<Array<{ address: string; coordinates: Coordinates | null }>> {
    const results: Array<{ address: string; coordinates: Coordinates | null }> = [];

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      console.log(`[GeocodingService] Processing ${i + 1}/${addresses.length}: ${address}`);

      const coordinates = await this.geocodeAddress(address);
      results.push({ address, coordinates });

      // レート制限対策：次のリクエストまで待機
      if (i < addresses.length - 1) {
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * 指定時間待機
   * @param ms ミリ秒
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
