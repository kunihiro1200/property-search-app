// エリアマップ設定サービス
import { createClient } from '@supabase/supabase-js';
import { GeolocationService, Coordinates } from './GeolocationService';

export interface AreaMapConfig {
  id: string;
  areaNumber: string;
  googleMapUrl: string | null;
  cityName: string | null;
  isActive: boolean;
  coordinates?: Coordinates | null;
}

export class AreaMapConfigService {
  private supabase;
  private geolocationService: GeolocationService;
  private cache: Map<string, AreaMapConfig> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 3600000; // 1 hour
  private validationErrors: Array<{ timestamp: Date; error: any }> = [];
  private readonly MAX_ERROR_LOG_SIZE = 100;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.geolocationService = new GeolocationService();
  }

  /**
   * エラーログを記録
   */
  private logError(message: string, details: any): void {
    const errorLog = {
      timestamp: new Date(),
      level: 'ERROR',
      message,
      details
    };
    
    console.error(`[AreaMapConfigService] ${message}`, details);
    
    // Keep error history for debugging
    this.validationErrors.push({ timestamp: new Date(), error: errorLog });
    
    // Limit error log size
    if (this.validationErrors.length > this.MAX_ERROR_LOG_SIZE) {
      this.validationErrors.shift();
    }
  }

  /**
   * 警告ログを記録
   */
  private logWarning(message: string, details: any): void {
    console.warn(`[AreaMapConfigService] ${message}`, details);
  }

  /**
   * 情報ログを記録
   */
  private logInfo(message: string, details?: any): void {
    if (details) {
      console.log(`[AreaMapConfigService] ${message}`, details);
    } else {
      console.log(`[AreaMapConfigService] ${message}`);
    }
  }

  /**
   * エリアマップ設定を読み込む（キャッシュ付き）
   */
  async loadAreaMaps(): Promise<AreaMapConfig[]> {
    // Check cache validity
    const now = Date.now();
    if (this.cache.size > 0 && (now - this.cacheTimestamp) < this.CACHE_TTL_MS) {
      this.logInfo('Returning cached area map configurations', {
        cacheSize: this.cache.size,
        cacheAge: Math.floor((now - this.cacheTimestamp) / 1000) + 's'
      });
      return Array.from(this.cache.values());
    }

    this.logInfo('Loading area map configurations from database');

    try {
      const { data, error } = await this.supabase
        .from('area_map_config')
        .select('*')
        .eq('is_active', true)
        .order('area_number');

      if (error) {
        this.logError('Database query failed', {
          error: error.message,
          code: error.code,
          details: error.details
        });
        throw new Error(`Failed to load area map configurations: ${error.message}`);
      }

      if (!data || data.length === 0) {
        this.logWarning('No active area map configurations found in database', {});
        return [];
      }

      this.logInfo(`Retrieved ${data.length} area map configurations from database`);

      // Transform and cache data
      const configs: AreaMapConfig[] = [];
      const skippedConfigs: string[] = [];
      this.cache.clear();

      for (const row of data) {
        // Validate configuration
        if (!this.validateConfig(row)) {
          skippedConfigs.push(row.area_number || row.id);
          continue;
        }

        const config: AreaMapConfig = {
          id: row.id,
          areaNumber: row.area_number,
          googleMapUrl: row.google_map_url,
          cityName: row.city_name,
          isActive: row.is_active,
          coordinates: null
        };

        // Extract coordinates if URL exists
        if (config.googleMapUrl) {
          if (!this.isValidGoogleMapsUrl(config.googleMapUrl)) {
            this.logError('Skipping area due to invalid Google Maps URL', {
              areaNumber: config.areaNumber,
              url: config.googleMapUrl
            });
            skippedConfigs.push(config.areaNumber);
            continue;
          }

          try {
            const coords = await this.geolocationService.extractCoordinatesFromUrl(config.googleMapUrl);
            if (coords) {
              config.coordinates = coords;
              this.logInfo(`Extracted coordinates for area ${config.areaNumber}`, {
                lat: coords.lat,
                lng: coords.lng
              });
            } else {
              this.logWarning('Failed to extract coordinates', {
                areaNumber: config.areaNumber,
                url: config.googleMapUrl,
                action: 'Skipping this area'
              });
              skippedConfigs.push(config.areaNumber);
              continue;
            }
          } catch (coordError) {
            this.logError('Exception while extracting coordinates', {
              areaNumber: config.areaNumber,
              url: config.googleMapUrl,
              error: coordError instanceof Error ? coordError.message : String(coordError)
            });
            skippedConfigs.push(config.areaNumber);
            continue;
          }
        }

        configs.push(config);
        this.cache.set(config.areaNumber, config);
      }

      this.cacheTimestamp = now;

      this.logInfo('Area map configurations loaded successfully', {
        totalConfigs: data.length,
        validConfigs: configs.length,
        skippedConfigs: skippedConfigs.length,
        skippedAreas: skippedConfigs
      });

      if (skippedConfigs.length > 0) {
        this.logWarning('Some configurations were skipped due to validation errors', {
          skippedCount: skippedConfigs.length,
          skippedAreas: skippedConfigs
        });
      }

      return configs;
    } catch (error) {
      this.logError('Unexpected error loading area maps', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * 設定の妥当性を検証
   */
  private validateConfig(config: any): boolean {
    // Area number is required
    if (!config.area_number || typeof config.area_number !== 'string') {
      this.logError('Configuration validation failed', {
        reason: 'Invalid or missing area_number',
        areaNumber: config.area_number,
        configId: config.id
      });
      return false;
    }

    // Area number format validation (should be ①-⑯, ㊵, ㊶)
    const validAreaPattern = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]$/;
    if (!validAreaPattern.test(config.area_number)) {
      this.logError('Configuration validation failed', {
        reason: 'Invalid area_number format',
        areaNumber: config.area_number,
        configId: config.id,
        expectedFormat: '①-⑯, ㊵, ㊶'
      });
      return false;
    }

    // Either google_map_url or city_name must be present
    if (!config.google_map_url && !config.city_name) {
      this.logError('Configuration validation failed', {
        reason: 'Neither google_map_url nor city_name provided',
        areaNumber: config.area_number,
        configId: config.id
      });
      return false;
    }

    // City-wide areas (㊵, ㊶) must have city_name
    if (['㊵', '㊶'].includes(config.area_number) && !config.city_name) {
      this.logError('Configuration validation failed', {
        reason: 'City-wide area missing city_name',
        areaNumber: config.area_number,
        configId: config.id
      });
      return false;
    }

    // Regular areas (①-⑯) must have google_map_url
    if (!['㊵', '㊶'].includes(config.area_number) && !config.google_map_url) {
      this.logError('Configuration validation failed', {
        reason: 'Regular area missing google_map_url',
        areaNumber: config.area_number,
        configId: config.id
      });
      return false;
    }

    // City-wide areas should not have google_map_url
    if (config.city_name && config.google_map_url) {
      this.logWarning('Configuration has both city_name and google_map_url', {
        areaNumber: config.area_number,
        configId: config.id,
        action: 'Using city_name, ignoring google_map_url'
      });
    }

    // Validate city_name if present
    if (config.city_name) {
      const validCities = ['大分市', '別府市'];
      if (!validCities.includes(config.city_name)) {
        this.logWarning('Unexpected city_name value', {
          areaNumber: config.area_number,
          cityName: config.city_name,
          expectedCities: validCities
        });
      }
    }

    return true;
  }

  /**
   * Google Maps URLの形式を検証
   */
  private isValidGoogleMapsUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      this.logError('Invalid Google Maps URL', {
        reason: 'URL is null, undefined, or not a string',
        url
      });
      return false;
    }

    // Trim whitespace
    url = url.trim();

    // Check minimum length
    if (url.length < 10) {
      this.logError('Invalid Google Maps URL', {
        reason: 'URL too short',
        url,
        length: url.length
      });
      return false;
    }

    // Check if it's a Google Maps URL
    const validPatterns = [
      /^https?:\/\/(www\.)?google\.(com|co\.jp)\/maps/,
      /^https?:\/\/maps\.google\.(com|co\.jp)/,
      /^https?:\/\/maps\.app\.goo\.gl/,
      /^https?:\/\/goo\.gl\/maps/
    ];

    const isValid = validPatterns.some(pattern => pattern.test(url));

    if (!isValid) {
      this.logError('Invalid Google Maps URL', {
        reason: 'URL does not match any valid Google Maps pattern',
        url,
        validPatterns: validPatterns.map(p => p.toString())
      });
    }

    return isValid;
  }

  /**
   * 特定のエリア番号の座標を取得
   */
  async getCoordinatesForArea(areaNumber: string): Promise<Coordinates | null> {
    try {
      const configs = await this.loadAreaMaps();
      const config = configs.find(c => c.areaNumber === areaNumber);
      
      if (!config) {
        this.logWarning('Area configuration not found', {
          areaNumber,
          availableAreas: configs.map(c => c.areaNumber)
        });
        return null;
      }

      if (!config.coordinates) {
        this.logWarning('Area configuration has no coordinates', {
          areaNumber,
          cityName: config.cityName,
          reason: config.cityName ? 'City-wide area' : 'Coordinates extraction failed'
        });
      }

      return config.coordinates || null;
    } catch (error) {
      this.logError('Error getting coordinates for area', {
        areaNumber,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * エリア番号の設定を取得
   */
  async getAreaConfig(areaNumber: string): Promise<AreaMapConfig | null> {
    try {
      const configs = await this.loadAreaMaps();
      const config = configs.find(c => c.areaNumber === areaNumber);
      
      if (!config) {
        this.logWarning('Area configuration not found', {
          areaNumber,
          availableAreas: configs.map(c => c.areaNumber)
        });
      }
      
      return config || null;
    } catch (error) {
      this.logError('Error getting area configuration', {
        areaNumber,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * すべてのアクティブなエリア設定を取得
   */
  async getAllActiveConfigs(): Promise<AreaMapConfig[]> {
    return this.loadAreaMaps();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * 市全体のエリア設定を取得
   */
  async getCityWideConfigs(): Promise<AreaMapConfig[]> {
    const configs = await this.loadAreaMaps();
    return configs.filter(c => c.cityName !== null);
  }

  /**
   * 半径ベースのエリア設定を取得
   */
  async getRadiusBasedConfigs(): Promise<AreaMapConfig[]> {
    const configs = await this.loadAreaMaps();
    return configs.filter(c => c.coordinates !== null);
  }

  /**
   * 検証エラーの履歴を取得（デバッグ用）
   */
  getValidationErrors(): Array<{ timestamp: Date; error: any }> {
    return [...this.validationErrors];
  }

  /**
   * 検証エラーの履歴をクリア
   */
  clearValidationErrors(): void {
    this.validationErrors = [];
  }

  /**
   * 設定の健全性チェック
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    totalConfigs: number;
    validConfigs: number;
    errors: string[];
  }> {
    try {
      const configs = await this.loadAreaMaps();
      const errors: string[] = [];

      // Check if we have any configurations
      if (configs.length === 0) {
        errors.push('No active area map configurations found');
      }

      // Check for expected areas
      const expectedAreas = ['①', '②', '③', '④', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '㊵', '㊶'];
      const missingAreas = expectedAreas.filter(
        area => !configs.some(c => c.areaNumber === area)
      );

      if (missingAreas.length > 0) {
        errors.push(`Missing configurations for areas: ${missingAreas.join(', ')}`);
      }

      // Check for configurations without coordinates (excluding city-wide)
      const configsWithoutCoords = configs.filter(
        c => !c.cityName && !c.coordinates
      );

      if (configsWithoutCoords.length > 0) {
        errors.push(
          `Configurations without coordinates: ${configsWithoutCoords.map(c => c.areaNumber).join(', ')}`
        );
      }

      return {
        healthy: errors.length === 0,
        totalConfigs: configs.length,
        validConfigs: configs.filter(c => c.coordinates || c.cityName).length,
        errors
      };
    } catch (error) {
      return {
        healthy: false,
        totalConfigs: 0,
        validConfigs: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}
