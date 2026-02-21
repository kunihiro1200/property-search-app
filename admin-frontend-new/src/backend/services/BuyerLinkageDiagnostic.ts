// 買主と物件の紐づけ診断サービス
import { createClient } from '@supabase/supabase-js';

export interface BuyerSample {
  buyer_number: string;
  name: string;
  property_number: string | null;
  synced_at: string;
}

export interface DiagnosticResult {
  totalBuyers: number;
  buyersWithProperty: number;
  buyersWithoutProperty: number;
  sampleMissingBuyers: BuyerSample[];
  propertyNumberDistribution: Record<string, number>;
}

export class BuyerLinkageDiagnostic {
  private supabase;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * 買主と物件の紐づけ状況を分析
   */
  async analyzeLinkageStatus(): Promise<DiagnosticResult> {
    console.log('=== 買主と物件の紐づけ診断を開始 ===\n');

    // 総買主数を取得
    const totalBuyers = await this.getTotalBuyerCount();
    console.log(`総買主数: ${totalBuyers}件`);

    // property_numberが設定されている買主数
    const buyersWithProperty = await this.getBuyersWithPropertyCount();
    console.log(`property_number設定済み: ${buyersWithProperty}件`);

    // property_numberが未設定の買主数
    const buyersWithoutProperty = totalBuyers - buyersWithProperty;
    console.log(`property_number未設定: ${buyersWithoutProperty}件`);
    console.log(`未設定率: ${((buyersWithoutProperty / totalBuyers) * 100).toFixed(2)}%\n`);

    // 未設定の買主サンプルを取得
    const sampleMissingBuyers = await this.findBuyersWithoutProperty(10);
    console.log('property_number未設定の買主サンプル（10件）:');
    sampleMissingBuyers.forEach(b => {
      console.log(`  ${b.buyer_number} - ${b.name} - 同期日時: ${b.synced_at}`);
    });

    // 物件番号の分布を取得
    const propertyNumberDistribution = await this.getPropertyDistribution();
    console.log(`\n物件番号の分布（上位10件）:`);
    const sortedDistribution = Object.entries(propertyNumberDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sortedDistribution.forEach(([propertyNumber, count]) => {
      console.log(`  ${propertyNumber}: ${count}件`);
    });

    return {
      totalBuyers,
      buyersWithProperty,
      buyersWithoutProperty,
      sampleMissingBuyers,
      propertyNumberDistribution
    };
  }

  /**
   * 総買主数を取得
   */
  private async getTotalBuyerCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to get total buyer count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * property_numberが設定されている買主数を取得
   */
  private async getBuyersWithPropertyCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true })
      .not('property_number', 'is', null)
      .neq('property_number', '');

    if (error) {
      throw new Error(`Failed to get buyers with property count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * property_numberが未設定の買主を取得
   */
  async findBuyersWithoutProperty(limit: number = 10): Promise<BuyerSample[]> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('buyer_number, name, property_number, synced_at')
      .or('property_number.is.null,property_number.eq.')
      .order('synced_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to find buyers without property: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 物件番号の分布を取得
   */
  async getPropertyDistribution(): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('property_number')
      .not('property_number', 'is', null)
      .neq('property_number', '');

    if (error) {
      throw new Error(`Failed to get property distribution: ${error.message}`);
    }

    const distribution: Record<string, number> = {};
    data?.forEach((row: any) => {
      const propertyNumber = row.property_number;
      if (propertyNumber) {
        distribution[propertyNumber] = (distribution[propertyNumber] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * 特定の物件番号に紐づく買主を取得
   */
  async getBuyersForProperty(propertyNumber: string): Promise<BuyerSample[]> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('buyer_number, name, property_number, synced_at')
      .eq('property_number', propertyNumber)
      .order('synced_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get buyers for property ${propertyNumber}: ${error.message}`);
    }

    return data || [];
  }
}
