/**
 * データ整合性サービス
 * 売主と物件の整合性を監視・修復する
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface IntegrityCheckResult {
  timestamp: string;
  totalSellers: number;
  totalProperties: number;
  sellersWithoutProperty: number;
  orphanedProperties: number;
  duplicateProperties: number;
  issues: string[];
  isHealthy: boolean;
}

export class DataIntegrityService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * データ整合性チェックを実行
   */
  async checkIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      timestamp: new Date().toISOString(),
      totalSellers: 0,
      totalProperties: 0,
      sellersWithoutProperty: 0,
      orphanedProperties: 0,
      duplicateProperties: 0,
      issues: [],
      isHealthy: true,
    };

    try {
      // 全売主IDを取得
      const sellerIds = await this.getAllIds('sellers');
      result.totalSellers = sellerIds.length;

      // 全物件のseller_idを取得
      const propertySellerIds = await this.getAllPropertySellerIds();
      result.totalProperties = propertySellerIds.length;

      // 物件なし売主をチェック
      const sellerIdSet = new Set(sellerIds);
      const propertySellerIdSet = new Set(propertySellerIds);
      
      const sellersWithoutProperty = sellerIds.filter(id => !propertySellerIdSet.has(id));
      result.sellersWithoutProperty = sellersWithoutProperty.length;
      
      if (sellersWithoutProperty.length > 0) {
        result.issues.push(`物件なし売主: ${sellersWithoutProperty.length}件`);
        result.isHealthy = false;
      }

      // 孤立物件をチェック
      const orphanedProperties = propertySellerIds.filter(id => !sellerIdSet.has(id));
      result.orphanedProperties = orphanedProperties.length;
      
      if (orphanedProperties.length > 0) {
        result.issues.push(`孤立物件: ${orphanedProperties.length}件`);
        result.isHealthy = false;
      }

      // 重複物件をチェック
      const propertyCountMap = new Map<string, number>();
      propertySellerIds.forEach(id => {
        propertyCountMap.set(id, (propertyCountMap.get(id) || 0) + 1);
      });
      
      const duplicates = Array.from(propertyCountMap.values()).filter(count => count > 1).length;
      result.duplicateProperties = duplicates;
      
      if (duplicates > 0) {
        result.issues.push(`重複物件を持つ売主: ${duplicates}件`);
      }

    } catch (error: any) {
      result.issues.push(`チェックエラー: ${error.message}`);
      result.isHealthy = false;
    }

    return result;
  }

  /**
   * 物件なし売主に物件を作成して修復
   */
  async repairMissingProperties(): Promise<{ created: number; errors: number }> {
    const sellerIds = await this.getAllIds('sellers');
    const propertySellerIds = await this.getAllPropertySellerIds();
    const propertySellerIdSet = new Set(propertySellerIds);

    const sellersWithoutProperty = sellerIds.filter(id => !propertySellerIdSet.has(id));

    let created = 0;
    let errors = 0;

    for (const sellerId of sellersWithoutProperty) {
      const { error } = await this.supabase
        .from('properties')
        .insert({
          seller_id: sellerId,
          address: '未入力',
        });

      if (error) {
        errors++;
      } else {
        created++;
      }
    }

    return { created, errors };
  }

  /**
   * 孤立物件を削除して修復
   */
  async repairOrphanedProperties(): Promise<{ deleted: number; errors: number }> {
    const sellerIds = await this.getAllIds('sellers');
    const sellerIdSet = new Set(sellerIds);

    const properties = await this.getAllProperties();
    const orphanedPropertyIds = properties
      .filter(p => !sellerIdSet.has(p.seller_id))
      .map(p => p.id);

    let deleted = 0;
    let errors = 0;

    const batchSize = 100;
    for (let i = 0; i < orphanedPropertyIds.length; i += batchSize) {
      const batch = orphanedPropertyIds.slice(i, i + batchSize);
      
      const { error } = await this.supabase
        .from('properties')
        .delete()
        .in('id', batch);

      if (error) {
        errors += batch.length;
      } else {
        deleted += batch.length;
      }
    }

    return { deleted, errors };
  }

  /**
   * 売主作成時に物件も同時に作成（トランザクション的な処理）
   */
  async createSellerWithProperty(sellerData: any, propertyData?: any): Promise<{ seller: any; property: any } | null> {
    // 売主を作成
    const { data: seller, error: sellerError } = await this.supabase
      .from('sellers')
      .insert(sellerData)
      .select()
      .single();

    if (sellerError || !seller) {
      console.error('売主作成エラー:', sellerError?.message);
      return null;
    }

    // 物件を作成
    const { data: property, error: propertyError } = await this.supabase
      .from('properties')
      .insert({
        seller_id: seller.id,
        address: propertyData?.address || '未入力',
        property_type: propertyData?.property_type || null,
        land_area: propertyData?.land_area || null,
        building_area: propertyData?.building_area || null,
        build_year: propertyData?.build_year || null,
        structure: propertyData?.structure || null,
        floor_plan: propertyData?.floor_plan || null,
      })
      .select()
      .single();

    if (propertyError) {
      console.error('物件作成エラー:', propertyError.message);
      // 売主を削除してロールバック
      await this.supabase.from('sellers').delete().eq('id', seller.id);
      return null;
    }

    return { seller, property };
  }

  private async getAllIds(table: string): Promise<string[]> {
    const pageSize = 1000;
    let page = 0;
    let allIds: string[] = [];

    while (true) {
      const { data } = await this.supabase
        .from(table)
        .select('id')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!data || data.length === 0) break;
      allIds = allIds.concat(data.map(d => d.id));
      page++;
    }

    return allIds;
  }

  private async getAllPropertySellerIds(): Promise<string[]> {
    const pageSize = 1000;
    let page = 0;
    let allIds: string[] = [];

    while (true) {
      const { data } = await this.supabase
        .from('properties')
        .select('seller_id')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!data || data.length === 0) break;
      allIds = allIds.concat(data.map(d => d.seller_id));
      page++;
    }

    return allIds;
  }

  private async getAllProperties(): Promise<{ id: string; seller_id: string }[]> {
    const pageSize = 1000;
    let page = 0;
    let allData: { id: string; seller_id: string }[] = [];

    while (true) {
      const { data } = await this.supabase
        .from('properties')
        .select('id, seller_id')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      page++;
    }

    return allData;
  }
}
