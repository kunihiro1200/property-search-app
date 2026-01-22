import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * 別府市の住所から配信エリア番号を取得するサービス
 */
export class BeppuAreaMappingService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * 別府市の住所から配信エリア番号を取得
   * @param address 物件の住所
   * @returns 配信エリア番号 (例: "⑨㊷") または null
   */
  async getDistributionAreasForAddress(
    address: string
  ): Promise<string | null> {
    // 1. 住所から地域名を抽出
    const regionName = this.extractRegionName(address);

    if (!regionName) {
      console.warn(
        `[BeppuAreaMapping] No region name found in address: ${address}`
      );
      return null;
    }

    console.log(
      `[BeppuAreaMapping] Extracted region: ${regionName} from ${address}`
    );

    // 2. データベースから配信エリアを検索
    const areas = await this.lookupDistributionAreas(regionName);

    if (areas) {
      console.log(
        `[BeppuAreaMapping] Found areas: ${areas} for region: ${regionName}`
      );
      return areas;
    }

    console.warn(
      `[BeppuAreaMapping] No mapping found for region: ${regionName}`
    );
    return null;
  }

  /**
   * 住所から地域名を抽出
   * 優先順位: 丁目付き > 区付き > 町付き > その他
   * @param address 住所
   * @returns 地域名 または null
   */
  private extractRegionName(address: string): string | null {
    // 大分県と別府市を除去
    let cleanAddress = address.replace(/大分県/g, '').replace(/別府市/g, '');

    // 丁目がある地域のリスト（これらの地域のみ丁目番号を含めて抽出）
    const regionsWithChome = ['石垣東', '北浜', '東荘園', '石垣西', '朝見', '浜脇'];

    // 地域名のパターン
    // 優先順位: より具体的なパターンから試す
    const patterns = [
      // 丁目付き (例: 東荘園4丁目, 石垣東7丁目, 朝見1丁目)
      // 丁目がある地域のみ、丁目番号も含めて抽出
      {
        pattern: /([^\s\d]+?)([\d０-９]+丁目)/,
        handler: (match: RegExpMatchArray) => {
          const baseName = match[1];
          const chome = match[2];
          // 丁目がある地域リストに含まれている場合のみ、丁目付きで返す
          if (regionsWithChome.includes(baseName)) {
            return baseName + chome;
          }
          // それ以外は地域名のみ返す
          return baseName;
        },
      },
      // 区付き (例: 南立石一区, 亀川四の湯町１区)
      {
        pattern: /([^\s]+?[一二三四五六七八九十１２３４５６７８９０]+区)/,
        handler: (match: RegExpMatchArray) => match[1],
      },
      // 町付き (例: 荘園北町, 亀川中央町)
      {
        pattern: /([^\s]+?町)/,
        handler: (match: RegExpMatchArray) => match[1],
      },
      // その他の地域名 (例: 荘園, 鶴見, 観海寺)
      {
        pattern: /^([^\s\d]+)/,
        handler: (match: RegExpMatchArray) => match[1],
      },
    ];

    for (const { pattern, handler } of patterns) {
      const match = cleanAddress.match(pattern);
      if (match) {
        return handler(match);
      }
    }

    return null;
  }

  /**
   * データベースから配信エリアを検索
   * @param regionName 地域名（丁目付きの場合もあり）
   * @returns 配信エリア番号 または null
   */
  private async lookupDistributionAreas(
    regionName: string
  ): Promise<string | null> {
    try {
      // 丁目がある地域のリスト
      const regionsWithChome = ['石垣東', '北浜', '東荘園', '石垣西', '朝見', '浜脇'];

      // 完全一致検索（複数のマッピングがある場合は全て取得）
      const { data, error } = await this.supabase
        .from('beppu_area_mapping')
        .select('distribution_areas')
        .eq('region_name', regionName);

      if (error) {
        console.error('[BeppuAreaMapping] Database error:', error);
        return null;
      }

      // 丁目付きで見つからない場合、地域名のみでフォールバック
      // ただし、丁目がある地域リストに含まれている場合のみ
      if (!data || data.length === 0) {
        const baseRegionName = regionName.replace(/[\d０-９]+丁目$/, '');
        
        // 丁目を除去した結果が元と異なり、かつ丁目がある地域の場合のみフォールバック
        if (baseRegionName !== regionName && regionsWithChome.includes(baseRegionName)) {
          console.log(
            `[BeppuAreaMapping] Trying fallback with base region: ${baseRegionName}`
          );
          const { data: fallbackData, error: fallbackError } =
            await this.supabase
              .from('beppu_area_mapping')
              .select('distribution_areas')
              .eq('region_name', baseRegionName);

          if (fallbackError) {
            console.error(
              '[BeppuAreaMapping] Fallback database error:',
              fallbackError
            );
            return null;
          }

          if (fallbackData && fallbackData.length > 0) {
            return this.mergeDistributionAreas(fallbackData);
          }
        }
        return null;
      }

      return this.mergeDistributionAreas(data);
    } catch (error) {
      console.error('[BeppuAreaMapping] Unexpected error:', error);
      return null;
    }
  }

  /**
   * 複数のマッピングデータから配信エリアを統合
   */
  private mergeDistributionAreas(data: any[]): string {
    const allAreas = new Set<string>();
    data.forEach((row: any) => {
      const areas = row.distribution_areas;
      if (areas) {
        // 各文字を個別に追加（㊶㊸⑫のような文字列を分解）
        for (const char of areas) {
          allAreas.add(char);
        }
      }
    });

    // セットを配列に変換してソート（㊶、㊷、㊸、⑨、⑩...の順）
    const sortedAreas = Array.from(allAreas).sort();
    return sortedAreas.join('');
  }

  /**
   * 全てのマッピングデータを取得 (デバッグ用)
   */
  async getAllMappings(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('beppu_area_mapping')
        .select('*')
        .order('school_district', { ascending: true })
        .order('region_name', { ascending: true });

      if (error) {
        console.error(
          '[BeppuAreaMapping] Error fetching all mappings:',
          error
        );
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[BeppuAreaMapping] Unexpected error:', error);
      return [];
    }
  }

  /**
   * 学校区ごとのマッピング数を取得 (統計用)
   */
  async getMappingStatistics(): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('beppu_area_mapping')
        .select('school_district');

      if (error) {
        console.error('[BeppuAreaMapping] Error fetching statistics:', error);
        return {};
      }

      const stats: Record<string, number> = {};
      data?.forEach((row: any) => {
        stats[row.school_district] = (stats[row.school_district] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('[BeppuAreaMapping] Unexpected error:', error);
      return {};
    }
  }
}
