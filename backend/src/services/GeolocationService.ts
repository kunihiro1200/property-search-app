// 地理位置計算サービス

export interface Coordinates {
  lat: number;
  lng: number;
}

export class GeolocationService {
  // 基準地点の座標（https://maps.app.goo.gl/6SUp2oApoATE4R336）
  private readonly REFERENCE_LOCATION: Coordinates = {
    lat: 33.2382,  // 大分市の座標
    lng: 131.6126
  };

  /**
   * Google Maps URLから座標を抽出
   * @param googleMapsUrl Google Maps URL
   * @returns 座標オブジェクト、または抽出失敗時はnull
   */
  async extractCoordinatesFromUrl(googleMapsUrl: string | null | undefined): Promise<Coordinates | null> {
    if (!googleMapsUrl) {
      return null;
    }

    try {
      let urlToProcess = googleMapsUrl;

      // 短縮URLの場合は展開する
      if (googleMapsUrl.includes('goo.gl') || googleMapsUrl.includes('maps.app.goo.gl')) {
        const expandedUrl = await this.expandShortenedUrl(googleMapsUrl);
        if (expandedUrl) {
          urlToProcess = expandedUrl;
        } else {
          console.warn(`Could not expand shortened URL: ${googleMapsUrl}`);
          return null;
        }
      }

      // パターン1: /@lat,lng,zoom 形式
      const pattern1 = /@(-?\d+\.\d+),(-?\d+\.\d+),/;
      const match1 = urlToProcess.match(pattern1);
      if (match1) {
        return {
          lat: parseFloat(match1[1]),
          lng: parseFloat(match1[2])
        };
      }

      // パターン2: ?q=lat,lng 形式
      const pattern2 = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match2 = urlToProcess.match(pattern2);
      if (match2) {
        return {
          lat: parseFloat(match2[1]),
          lng: parseFloat(match2[2])
        };
      }

      // パターン3: /place/ 形式（座標が含まれている場合）
      const pattern3 = /\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match3 = urlToProcess.match(pattern3);
      if (match3) {
        return {
          lat: parseFloat(match3[1]),
          lng: parseFloat(match3[2])
        };
      }

      console.warn(`Could not extract coordinates from URL: ${urlToProcess}`);
      return null;
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      return null;
    }
  }

  /**
   * 短縮URLを展開
   * @param shortenedUrl 短縮URL
   * @returns 展開されたURL、または展開失敗時はnull
   */
  private async expandShortenedUrl(shortenedUrl: string): Promise<string | null> {
    try {
      const https = await import('https');
      const { URL } = await import('url');

      return new Promise((resolve) => {
        const parsedUrl = new URL(shortenedUrl);
        
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        };

        const req = https.request(options, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const location = res.headers.location;
            if (location) {
              console.log(`Expanded URL: ${location}`);
              resolve(location);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });

        req.on('error', (error) => {
          console.error('Error expanding URL:', error);
          resolve(null);
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolve(null);
        });

        req.end();
      });
    } catch (error) {
      console.error('Error in expandShortenedUrl:', error);
      return null;
    }
  }

  /**
   * Haversine公式を使用して2点間の距離を計算
   * @param point1 地点1の座標
   * @param point2 地点2の座標
   * @returns 距離（km）
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // 地球の半径 (km)
    
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * 物件が基準地点から指定半径内にあるかチェック
   * @param propertyCoords 物件の座標
   * @param radiusKm 半径（km）デフォルト10km
   * @returns 半径内ならtrue
   */
  isWithinRadius(propertyCoords: Coordinates, radiusKm: number = 10): boolean {
    const distance = this.calculateDistance(this.REFERENCE_LOCATION, propertyCoords);
    return distance <= radiusKm;
  }

  /**
   * 基準地点の座標を取得
   * @returns 基準地点の座標
   */
  getReferenceLocation(): Coordinates {
    return { ...this.REFERENCE_LOCATION };
  }

  /**
   * 度をラジアンに変換
   * @param degrees 度
   * @returns ラジアン
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
