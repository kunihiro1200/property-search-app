import { supabase } from '../config/supabase';
import { relatedBuyerCache } from '../cache/RelatedBuyerCache';

/**
 * UUID v4 validation regex pattern
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Buyer number format validation regex pattern
 */
const BUYER_NUMBER_REGEX = /^\d+$/;

export enum RelationType {
  MULTIPLE_INQUIRY = 'multiple_inquiry',  // 複数問合せ
  POSSIBLE_DUPLICATE = 'possible_duplicate'  // 重複の可能性
}

export enum MatchReason {
  PHONE = 'phone',
  EMAIL = 'email',
  BOTH = 'both'
}

export interface Buyer {
  id: string;
  buyer_number: string;
  name: string | null;
  phone_number: string | null;
  email: string | null;
  property_number: string | null;
  reception_date: Date | null;
}

export interface RelatedBuyer extends Buyer {
  relation_type: RelationType;
  match_reason: MatchReason;
}

export interface InquiryHistory {
  buyer_id: string;
  buyer_number: string;
  property_id: string | null;
  property_number: string;
  reception_date: Date;
  property_address: string | null;
  status: string | null;
}

export class RelatedBuyerService {
  /**
   * Validates if a string is a valid UUID v4
   */
  private isValidUUID(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    return UUID_V4_REGEX.test(value.trim());
  }

  /**
   * Validates if a string is a valid buyer number
   */
  private isValidBuyerNumber(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    return BUYER_NUMBER_REGEX.test(value.trim());
  }

  /**
   * Validates buyer ID (UUID or buyer number)
   * @throws Error if invalid format
   */
  private validateBuyerId(buyerId: string, context: string = 'buyer ID'): void {
    if (!buyerId) {
      throw new Error(`Missing ${context}`);
    }

    if (!this.isValidUUID(buyerId) && !this.isValidBuyerNumber(buyerId)) {
      throw new Error(`Invalid ${context} format: ${buyerId}. Expected UUID or buyer number.`);
    }
  }

  /**
   * 関連買主を検索
   * @param buyerId - 現在の買主ID
   * @returns 関連買主のリスト
   */
  async findRelatedBuyers(buyerId: string): Promise<RelatedBuyer[]> {
    try {
      // Validate buyer ID
      this.validateBuyerId(buyerId, 'buyer ID');

      // Check cache first
      const cached = relatedBuyerCache.get(buyerId);
      if (cached !== null) {
        return cached;
      }

      // 現在の買主を取得
      const { data: currentBuyer, error: buyerError } = await supabase
        .from('buyers')
        .select('*')
        .eq('id', buyerId)
        .single();

      if (buyerError) {
        console.error(`Error fetching buyer ${buyerId}:`, buyerError);
        // Return empty array instead of throwing for missing buyers
        return [];
      }

      if (!currentBuyer) {
        console.warn(`Buyer not found: ${buyerId}`);
        return [];
      }

      // 電話番号もメールアドレスもない場合は空配列を返す
      if (!currentBuyer.phone_number && !currentBuyer.email) {
        console.info(`Buyer ${buyerId} has no phone or email for matching`);
        return [];
      }

      // 関連買主を検索
      const relatedBuyers = await this.searchRelatedBuyers(currentBuyer);

      // 関係を分類
      const result = relatedBuyers.map(rb => ({
        ...rb,
        relation_type: this.classifyRelation(currentBuyer, rb),
        match_reason: this.determineMatchReason(currentBuyer, rb)
      }));

      // Cache the result
      relatedBuyerCache.set(buyerId, result);

      return result;
    } catch (error) {
      console.error(`Error in findRelatedBuyers for ${buyerId}:`, error);
      // Return empty array on error to prevent UI breaking
      return [];
    }
  }

  /**
   * 関連買主を検索（データベースクエリ）
   */
  private async searchRelatedBuyers(currentBuyer: Buyer): Promise<Buyer[]> {
    const conditions = [];
    
    if (currentBuyer.phone_number) {
      conditions.push(`phone_number.eq.${currentBuyer.phone_number}`);
    }
    
    if (currentBuyer.email) {
      conditions.push(`email.eq.${currentBuyer.email}`);
    }

    if (conditions.length === 0) {
      return [];
    }

    // OR条件で検索
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .neq('id', currentBuyer.id)  // 自分自身を除外
      .or(conditions.join(','))
      .order('reception_date', { ascending: false, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to search related buyers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 関連買主を分類
   * @param currentBuyer - 現在の買主
   * @param relatedBuyer - 関連買主
   * @returns 関係の種類
   */
  classifyRelation(currentBuyer: Buyer, relatedBuyer: Buyer): RelationType {
    // 物件番号が異なる場合は複数問合せ
    if (currentBuyer.property_number !== relatedBuyer.property_number) {
      return RelationType.MULTIPLE_INQUIRY;
    }
    
    // 物件番号が同じ場合は重複の可能性
    return RelationType.POSSIBLE_DUPLICATE;
  }

  /**
   * マッチ理由を判定
   */
  private determineMatchReason(currentBuyer: Buyer, relatedBuyer: Buyer): MatchReason {
    const phoneMatch = currentBuyer.phone_number && 
                      currentBuyer.phone_number === relatedBuyer.phone_number;
    const emailMatch = currentBuyer.email && 
                      currentBuyer.email === relatedBuyer.email;

    if (phoneMatch && emailMatch) {
      return MatchReason.BOTH;
    } else if (phoneMatch) {
      return MatchReason.PHONE;
    } else if (emailMatch) {
      return MatchReason.EMAIL;
    }

    // このケースは通常発生しないはず
    return MatchReason.PHONE;
  }

  /**
   * 統合問合せ履歴を取得
   * @param buyerIds - 買主IDのリスト
   * @returns 統合された問合せ履歴
   */
  async getUnifiedInquiryHistory(buyerIds: string[]): Promise<InquiryHistory[]> {
    try {
      if (buyerIds.length === 0) {
        return [];
      }

      // Validate all buyer IDs
      for (const buyerId of buyerIds) {
        this.validateBuyerId(buyerId, 'buyer ID in list');
      }

      // 買主情報を取得
      const { data: buyers, error: buyersError } = await supabase
        .from('buyers')
        .select('id, buyer_number, property_number, reception_date')
        .in('id', buyerIds);

      if (buyersError) {
        console.error('Error fetching buyers for inquiry history:', buyersError);
        return [];
      }

      if (!buyers || buyers.length === 0) {
        console.warn('No buyers found for inquiry history');
        return [];
      }

      // 物件番号のリストを取得
      const propertyNumbers = buyers
        .map(b => b.property_number)
        .filter((pn): pn is string => pn !== null);

      if (propertyNumbers.length === 0) {
        return buyers.map(b => ({
          buyer_id: b.id,
          buyer_number: b.buyer_number,
          property_id: null,
          property_number: b.property_number || '',
          reception_date: b.reception_date ? new Date(b.reception_date) : new Date(),
          property_address: null,
          status: null
        }));
      }

      // 物件情報を取得
      const { data: properties, error: propertiesError } = await supabase
        .from('property_listings')
        .select('id, property_number, address, status')
        .in('property_number', propertyNumbers);

      if (propertiesError) {
        console.error('Failed to fetch properties:', propertiesError);
      }

      // 物件情報をマップに変換
      const propertyMap = new Map(
        (properties || []).map(p => [p.property_number, p])
      );

      // 統合履歴を作成
      const history: InquiryHistory[] = buyers.map(b => {
        const property = b.property_number ? propertyMap.get(b.property_number) : null;
        return {
          buyer_id: b.id,
          buyer_number: b.buyer_number,
          property_id: property?.id || null,
          property_number: b.property_number || '',
          reception_date: b.reception_date ? new Date(b.reception_date) : new Date(),
          property_address: property?.address || null,
          status: property?.status || null
        };
      });

      // 日付順にソート（新しい順）
      return history.sort((a, b) => b.reception_date.getTime() - a.reception_date.getTime());
    } catch (error) {
      console.error('Error in getUnifiedInquiryHistory:', error);
      // Return empty array on error to prevent UI breaking
      return [];
    }
  }
}

export const relatedBuyerService = new RelatedBuyerService();
