// 物件追加詳細情報サービス（property_detailsテーブル専用）
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PropertyDetails {
  property_number: string;
  property_about: string | null;
  recommended_comments: any[] | null;
  athome_data: any[] | null;
  favorite_comment: string | null;
}

export class PropertyDetailsService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    // SUPABASE_SERVICE_ROLE_KEY または SUPABASE_SERVICE_KEY を使用
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
    
    console.log(`[PropertyDetailsService] Initializing with URL: ${supabaseUrl}`);
    console.log(`[PropertyDetailsService] Service key exists: ${!!supabaseKey}`);
    console.log(`[PropertyDetailsService] Using key from: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_SERVICE_KEY'}`);
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * 物件の追加詳細情報を取得
   */
  async getPropertyDetails(propertyNumber: string): Promise<PropertyDetails> {
    try {
      console.log(`[PropertyDetailsService] Fetching details for ${propertyNumber}`);
      console.log(`[PropertyDetailsService] Supabase URL: ${process.env.SUPABASE_URL}`);
      console.log(`[PropertyDetailsService] Service role key exists: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
      
      const { data, error } = await this.supabase
        .from('property_details')
        .select('property_number, property_about, recommended_comments, athome_data, favorite_comment')
        .eq('property_number', propertyNumber)
        .single();
      
      console.log(`[PropertyDetailsService] Query result for ${propertyNumber}:`, {
        hasData: !!data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message
      });
      
      if (error) {
        if (error.code === 'PGRST116') {
          // 複数行が存在する場合 - 最初の行を取得
          console.log(`[PropertyDetailsService] Multiple rows found for ${propertyNumber}, fetching first row`);
          const { data: multipleData, error: multipleError } = await this.supabase
            .from('property_details')
            .select('property_number, property_about, recommended_comments, athome_data, favorite_comment')
            .eq('property_number', propertyNumber)
            .limit(1);
          
          if (multipleError || !multipleData || multipleData.length === 0) {
            console.error(`[PropertyDetailsService] Error fetching multiple rows for ${propertyNumber}:`, multipleError);
            return {
              property_number: propertyNumber,
              property_about: null,
              recommended_comments: null,
              athome_data: null,
              favorite_comment: null
            };
          }
          
          const firstRow = multipleData[0];
          console.log(`[PropertyDetailsService] Found details for ${propertyNumber} (first row):`, {
            has_property_about: !!firstRow.property_about,
            has_recommended_comments: !!firstRow.recommended_comments,
            recommended_comments_length: Array.isArray(firstRow.recommended_comments) ? firstRow.recommended_comments.length : 0,
            has_athome_data: !!firstRow.athome_data,
            athome_data_length: Array.isArray(firstRow.athome_data) ? firstRow.athome_data.length : 0,
            has_favorite_comment: !!firstRow.favorite_comment
          });
          
          return {
            property_number: firstRow.property_number,
            property_about: firstRow.property_about || null,
            recommended_comments: firstRow.recommended_comments || null,
            athome_data: firstRow.athome_data || null,
            favorite_comment: firstRow.favorite_comment || null
          };
        }
        console.error(`[PropertyDetailsService] Error fetching details for ${propertyNumber}:`, error);
        throw error;
      }
      
      console.log(`[PropertyDetailsService] Found details for ${propertyNumber}:`, {
        has_property_about: !!data.property_about,
        has_recommended_comments: !!data.recommended_comments,
        recommended_comments_length: Array.isArray(data.recommended_comments) ? data.recommended_comments.length : 0,
        has_athome_data: !!data.athome_data,
        athome_data_length: Array.isArray(data.athome_data) ? data.athome_data.length : 0,
        has_favorite_comment: !!data.favorite_comment
      });
      
      return {
        property_number: data.property_number,
        property_about: data.property_about || null,
        recommended_comments: data.recommended_comments || null,
        athome_data: data.athome_data || null,
        favorite_comment: data.favorite_comment || null
      };
    } catch (error: any) {
      console.error(`[PropertyDetailsService] Error in getPropertyDetails for ${propertyNumber}:`, error);
      return {
        property_number: propertyNumber,
        property_about: null,
        recommended_comments: null,
        athome_data: null,
        favorite_comment: null
      };
    }
  }

  /**
   * 物件の追加詳細情報を更新（存在しない場合は挿入）
   * 
   * ⚠️ 重要: このメソッドは提供されたフィールドのみを更新します。
   * 提供されていないフィールド（undefined）は既存の値を保持します。
   * nullを明示的に渡した場合のみ、そのフィールドをnullに設定します。
   */
  async upsertPropertyDetails(
    propertyNumber: string,
    details: Partial<Omit<PropertyDetails, 'property_number'>>
  ): Promise<boolean> {
    try {
      // 既存のデータを取得
      const existing = await this.getPropertyDetails(propertyNumber);
      
      // 提供されたフィールドのみをマージ（undefinedは既存値を保持）
      const mergedData = {
        property_number: propertyNumber,
        property_about: details.property_about !== undefined ? details.property_about : existing.property_about,
        recommended_comments: details.recommended_comments !== undefined ? details.recommended_comments : existing.recommended_comments,
        athome_data: details.athome_data !== undefined ? details.athome_data : existing.athome_data,
        favorite_comment: details.favorite_comment !== undefined ? details.favorite_comment : existing.favorite_comment
      };
      
      const { error } = await this.supabase
        .from('property_details')
        .upsert(mergedData, {
          onConflict: 'property_number'
        });
      
      if (error) {
        console.error(`[PropertyDetailsService] Failed to upsert property details for ${propertyNumber}`);
        console.error(`[PropertyDetailsService] Error:`, error);
        return false;
      }
      
      console.log(`[PropertyDetailsService] Successfully upserted property details for ${propertyNumber}`);
      return true;
    } catch (error: any) {
      console.error(`[PropertyDetailsService] Error in upsertPropertyDetails:`, error);
      return false;
    }
  }

  /**
   * 物件の追加詳細情報を削除
   */
  async deletePropertyDetails(propertyNumber: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('property_details')
        .delete()
        .eq('property_number', propertyNumber);
      
      if (error) {
        console.error(`[PropertyDetailsService] Error in deletePropertyDetails:`, error);
        return false;
      }
      
      console.log(`[PropertyDetailsService] Successfully deleted property details for ${propertyNumber}`);
      return true;
    } catch (error: any) {
      console.error(`[PropertyDetailsService] Error in deletePropertyDetails:`, error);
      return false;
    }
  }
}
