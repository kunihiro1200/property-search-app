// 買主配信フィルタリングサービス
import { createClient } from '@supabase/supabase-js';
import { GeolocationService } from './GeolocationService';

export interface QualifiedBuyer {
  buyer_number: string;
  email: string;
  desired_area: string | null;
  distribution_type: string | null;
  latest_status: string | null;
}

export interface BuyerFilterCriteria {
  propertyNumber: string;
  includeRadiusFilter: boolean;
}

export interface BuyerFilterResult {
  emails: string[];
  count: number;
  appliedFilters: {
    areaFilter: boolean;
    distributionFilter: boolean;
    statusFilter: boolean;
    radiusFilter: boolean;
  };
}

export class BuyerDistributionService {
  private supabase;
  private geolocationService: GeolocationService;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.geolocationService = new GeolocationService();
  }

  /**
   * 条件に合致する買主を取得してメールアドレスリストを返す
   * @param criteria フィルタリング条件
   * @returns メールアドレスリストと適用されたフィルター情報
   */
  async getQualifiedBuyers(criteria: BuyerFilterCriteria): Promise<BuyerFilterResult> {
    try {
      // 物件情報を取得
      const { data: property, error: propertyError } = await this.supabase
        .from('property_listings')
        .select('google_map_url, address')
        .eq('property_number', criteria.propertyNumber)
        .single();

      if (propertyError || !property) {
        throw new Error(`Property not found: ${criteria.propertyNumber}`);
      }

      // 基本フィルター: ★エリアに「①」を含み、配信が「要」の買主を取得
      // ページネーションを使用して全ての買主を取得（Supabaseのデフォルト1000行制限を回避）
      const buyers = await this.fetchAllBuyers();

      let qualifiedBuyers = buyers || [];

      // フィルタリング
      qualifiedBuyers = qualifiedBuyers.filter(buyer => 
        this.hasCircleOneInArea(buyer.desired_area) &&
        this.isDistributionRequired(buyer.distribution_type) &&
        this.isStatusValid(buyer.latest_status)
      );

      // 半径フィルターの適用
      let radiusFilterApplied = false;
      if (criteria.includeRadiusFilter && property.google_map_url) {
        const propertyCoords = await this.geolocationService.extractCoordinatesFromUrl(property.google_map_url);
        if (propertyCoords) {
          const isWithinRadius = this.geolocationService.isWithinRadius(propertyCoords);
          if (isWithinRadius) {
            // 半径内の場合、既にフィルタリングされた買主をそのまま使用
            radiusFilterApplied = true;
            console.log(`Property ${criteria.propertyNumber} is within 10km radius of reference location`);
          } else {
            console.log(`Property ${criteria.propertyNumber} is outside 10km radius of reference location`);
          }
        } else {
          console.warn(`Could not extract coordinates from property ${criteria.propertyNumber}`);
        }
      }

      // メールアドレスを抽出（重複排除）
      const emails = Array.from(new Set(
        qualifiedBuyers
          .map(buyer => buyer.email)
          .filter(email => email && email.trim() !== '')
      )) as string[];

      return {
        emails,
        count: emails.length,
        appliedFilters: {
          areaFilter: true,
          distributionFilter: true,
          statusFilter: true,
          radiusFilter: radiusFilterApplied
        }
      };
    } catch (error) {
      console.error('Error in getQualifiedBuyers:', error);
      throw error;
    }
  }

  /**
   * ★エリアに「①」を含むかチェック
   * @param desiredArea ★エリアフィールドの値
   * @returns 「①」を含む場合true
   */
  private hasCircleOneInArea(desiredArea: string | null | undefined): boolean {
    if (!desiredArea) {
      return false;
    }
    return desiredArea.includes('①');
  }

  /**
   * 配信が「要」かチェック
   * @param distributionType 配信種別フィールドの値
   * @returns 「要」または「配信希望」の場合true
   */
  private isDistributionRequired(distributionType: string | null | undefined): boolean {
    if (!distributionType) {
      return false;
    }
    const trimmed = distributionType.trim();
    return trimmed === '要' || trimmed === '配信希望';
  }

  /**
   * ★最新状況が有効かチェック（"買"または"他決"を含まない）
   * @param latestStatus ★最新状況フィールドの値
   * @returns "買"または"他決"を含まない場合true
   */
  private isStatusValid(latestStatus: string | null | undefined): boolean {
    if (!latestStatus) {
      return true; // ステータスが空の場合は有効とみなす
    }
    const trimmed = latestStatus.trim();
    // "買"または"他決"が含まれている場合は除外
    return !trimmed.includes('買') && !trimmed.includes('他決');
  }

  /**
   * すべての買主を取得（ページネーション対応）
   * Supabaseのデフォルト1000行制限を回避するため、ページネーションを使用
   */
  private async fetchAllBuyers(): Promise<QualifiedBuyer[]> {
    let allBuyers: QualifiedBuyer[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log('[BuyerDistributionService] Starting to fetch all buyers with pagination...');

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('buyers')
        .select('buyer_number, email, desired_area, distribution_type, latest_status')
        .not('email', 'is', null)
        .neq('email', '')
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch buyers: ${error.message}`);
      }

      if (data && data.length > 0) {
        allBuyers = allBuyers.concat(data);
        console.log(`[BuyerDistributionService] Fetched ${data.length} buyers (total: ${allBuyers.length})`);
        from += pageSize;
        hasMore = data.length === pageSize; // Continue if we got a full page
      } else {
        hasMore = false;
      }
    }

    console.log(`[BuyerDistributionService] Retrieved ${allBuyers.length} total buyers`);
    return allBuyers;
  }
}
