import { SupabaseClient } from '@supabase/supabase-js';

export interface PropertyData {
  address?: string;
  property_type?: string;
  land_area?: number;
  building_area?: number;
  build_year?: number;
  structure?: string;
  seller_situation?: string;
  floor_plan?: string;
  land_rights?: string;
  current_status?: string;
}

export interface SyncResult {
  success: boolean;
  propertyId?: string;
  operation?: 'create' | 'update';
  error?: string;
}

/**
 * Property Sync Handler
 * 
 * Handles synchronization of property information from spreadsheet to database.
 * Manages property creation and updates linked to sellers.
 */
export class PropertySyncHandler {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Sync property data for a seller
   * Creates new property if doesn't exist, updates if exists
   * 
   * @param sellerId - 売主ID
   * @param propertyData - 物件データ
   * @param propertyNumber - 物件番号（オプショナル）
   */
  async syncProperty(
    sellerId: string, 
    propertyData: PropertyData,
    propertyNumber?: string
  ): Promise<SyncResult> {
    try {
      // Find or create property
      const propertyId = await this.findOrCreateProperty(sellerId, propertyNumber);

      // Update property fields
      await this.updatePropertyFields(propertyId, propertyData, propertyNumber);

      return {
        success: true,
        propertyId,
        operation: 'update',
      };
    } catch (error: any) {
      console.error(`❌ Failed to sync property for seller ${sellerId}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Find existing property or create new one
   * Returns property ID
   * 
   * @param sellerId - 売主ID
   * @param propertyNumber - 物件番号（オプショナル、現在は使用しない）
   */
  async findOrCreateProperty(sellerId: string, propertyNumber?: string): Promise<string> {
    // seller_idで検索
    const { data: existingBySeller, error: findBySellerError } = await this.supabase
      .from('properties')
      .select('id, created_at, property_address, land_area, building_area')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (findBySellerError) {
      throw new Error(`Error finding property by seller: ${findBySellerError.message}`);
    }

    // If multiple properties exist, warn and use the latest one
    if (existingBySeller && existingBySeller.length > 1) {
      console.warn(
        `⚠️  Seller ${sellerId} has ${existingBySeller.length} properties. Using the latest one (${existingBySeller[0].id}).`
      );
      console.warn(`   This indicates a data quality issue that should be cleaned up.`);
    }

    // If at least one property exists, return the latest one
    if (existingBySeller && existingBySeller.length > 0) {
      return existingBySeller[0].id;
    }

    // Create new property only if none exists
    // Note: property_address column has NOT NULL constraint, so we use '未入力' as default
    // Note: property_type column has NOT NULL constraint, so we use 'その他' as default
    const insertData: any = {
      seller_id: sellerId,
      property_address: '未入力',
      property_type: 'その他',
    };

    const { data: newProperty, error: createError } = await this.supabase
      .from('properties')
      .insert(insertData)
      .select('id')
      .single();

    if (createError || !newProperty) {
      throw new Error(`Error creating property: ${createError?.message}`);
    }

    console.log(`✅ Created new property ${newProperty.id} for seller ${sellerId}`);
    return newProperty.id;
  }

  /**
   * Update property fields with data from spreadsheet
   * Handles numeric conversions and null values
   * 
   * @param propertyId - 物件ID
   * @param data - 物件データ
   * @param propertyNumber - 物件番号（オプショナル、現在は使用しない）
   */
  async updatePropertyFields(
    propertyId: string, 
    data: PropertyData,
    propertyNumber?: string
  ): Promise<void> {
    // Prepare update data
    const updateData: any = {};

    // Add fields if they exist
    if (data.address !== undefined) {
      updateData.property_address = data.address || null;
    }

    if (data.property_type !== undefined) {
      updateData.property_type = data.property_type || null;
    }

    if (data.land_area !== undefined) {
      updateData.land_area = this.parseNumeric(data.land_area);
    }

    if (data.building_area !== undefined) {
      updateData.building_area = this.parseNumeric(data.building_area);
    }

    if (data.build_year !== undefined) {
      updateData.construction_year = this.parseNumeric(data.build_year);
    }

    if (data.structure !== undefined) {
      updateData.structure = data.structure || null;
    }

    if (data.seller_situation !== undefined) {
      updateData.seller_situation = data.seller_situation || null;
    }

    if (data.floor_plan !== undefined) {
      updateData.floor_plan = data.floor_plan || null;
    }

    if (data.land_rights !== undefined) {
      updateData.land_rights = data.land_rights || null;
    }

    if (data.current_status !== undefined) {
      updateData.current_status = data.current_status || null;
    }

    // Update property
    const { error } = await this.supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId);

    if (error) {
      throw new Error(`Error updating property: ${error.message}`);
    }
  }

  /**
   * Parse numeric value, handling commas and empty values
   */
  private parseNumeric(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    // Remove commas and parse
    const str = String(value).replace(/,/g, '');
    const num = parseFloat(str);

    return isNaN(num) ? null : num;
  }
}
