// 物件番号に基づいて買主データを効率的に取得するサービス
import { createClient } from '@supabase/supabase-js';

export interface BuyerSummary {
  id: string;
  buyer_number: string;
  name: string;
  phone_number: string;
  email: string;
  latest_status: string;
  inquiry_confidence: string;
  reception_date: string;
  latest_viewing_date: string | null;
  next_call_date: string | null;
}

export interface BuyerListOptions {
  sortBy?: 'reception_date' | 'inquiry_confidence' | 'latest_viewing_date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export class BuyerLinkageService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * 複数物件の買主カウントを一括取得
   */
  async getBuyerCountsForProperties(propertyNumbers: string[]): Promise<Map<string, number>> {
    if (propertyNumbers.length === 0) {
      return new Map();
    }

    const counts = new Map<string, number>();

    try {
      // 各物件番号に対してカウントを取得
      // property_numberはカンマ区切りで複数の物件番号を含む可能性があるため、LIKEクエリを使用
      for (const propNum of propertyNumbers) {
        const { count, error } = await this.supabase
          .from('buyers')
          .select('*', { count: 'exact', head: true })
          .ilike('property_number', `%${propNum}%`);

        if (error) {
          console.error(`Failed to count buyers for property ${propNum}:`, error);
          counts.set(propNum, 0);
        } else {
          counts.set(propNum, count || 0);
        }
      }

      return counts;
    } catch (error) {
      console.error('Failed to get buyer counts:', error);
      return counts;
    }
  }

  /**
   * 特定物件の買主リストを取得
   */
  async getBuyersForProperty(
    propertyNumber: string,
    options: BuyerListOptions = {}
  ): Promise<BuyerSummary[]> {
    const {
      sortBy = 'reception_date',
      sortOrder = 'desc',
      limit
    } = options;

    try {
      let query = this.supabase
        .from('buyers')
        .select(`
          id,
          buyer_number,
          name,
          phone_number,
          email,
          latest_status,
          inquiry_confidence,
          reception_date,
          latest_viewing_date,
          next_call_date
        `)
        .ilike('property_number', `%${propertyNumber}%`)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch buyers for property: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to get buyers for property ${propertyNumber}:`, error);
      return [];
    }
  }

  /**
   * 高確度買主を持つ物件番号リストを取得
   */
  async getPropertiesWithHighConfidenceBuyers(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('buyers')
        .select('property_number')
        .in('inquiry_confidence', ['A', 'S', 'A+', 'S+'])
        .not('property_number', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch high confidence properties: ${error.message}`);
      }

      // property_numberはカンマ区切りで複数の物件番号を含む可能性があるため、分割して重複を除去
      const propertyNumbers = new Set<string>();
      
      data?.forEach(row => {
        if (row.property_number) {
          const numbers = row.property_number.split(',').map((n: string) => n.trim()).filter((n: string) => n);
          numbers.forEach((num: string) => propertyNumbers.add(num));
        }
      });

      return Array.from(propertyNumbers);
    } catch (error) {
      console.error('Failed to get properties with high confidence buyers:', error);
      return [];
    }
  }

  /**
   * 特定物件の買主カウントを取得（単一物件用）
   */
  async getBuyerCountForProperty(propertyNumber: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('buyers')
        .select('*', { count: 'exact', head: true })
        .ilike('property_number', `%${propertyNumber}%`);

      if (error) {
        throw new Error(`Failed to count buyers: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error(`Failed to get buyer count for property ${propertyNumber}:`, error);
      return 0;
    }
  }

  /**
   * 特定物件に高確度買主がいるかチェック
   */
  async hasHighConfidenceBuyers(propertyNumber: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('buyers')
        .select('*', { count: 'exact', head: true })
        .ilike('property_number', `%${propertyNumber}%`)
        .in('inquiry_confidence', ['A', 'S', 'A+', 'S+']);

      if (error) {
        throw new Error(`Failed to check high confidence buyers: ${error.message}`);
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error(`Failed to check high confidence buyers for property ${propertyNumber}:`, error);
      return false;
    }
  }
}
