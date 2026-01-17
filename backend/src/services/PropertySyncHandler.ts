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
   */
  async syncProperty(sellerId: string, propertyData: PropertyData): Promise<SyncResult> {
    try {
      // Find or create property
      const propertyId = await this.findOrCreateProperty(sellerId);

      // Update property fields
      await this.updatePropertyFields(propertyId, propertyData);

      return {
        success: true,
        propertyId,
        operation: 'update',
      };
    } catch (error: any) {
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
   * FIXED: Now properly handles multiple properties by using the latest one
   * and warning about duplicates instead of creating more duplicates.
   */
  async findOrCreateProperty(sellerId: string): Promise<string> {
    // Check if property exists - get ALL properties for this seller
    const { data: existing, error: findError } = await this.supabase
      .from('properties')
      .select('id, created_at, address, land_area, building_area')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (findError) {
      throw new Error(`Error finding property: ${findError.message}`);
    }

    // If multiple properties exist, warn and use the latest one
    if (existing && existing.length > 1) {
      console.warn(
        `⚠️  Seller ${sellerId} has ${existing.length} properties. Using the latest one (${existing[0].id}).`
      );
      console.warn(`   This indicates a data quality issue that should be cleaned up.`);
    }

    // If at least one property exists, return the latest one
    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // Create new property only if none exists
    // Note: address column has NOT NULL constraint, so we use '未入力' as default
    const { data: newProperty, error: createError } = await this.supabase
      .from('properties')
      .insert({
        seller_id: sellerId,
        address: '未入力',
      })
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
   */
  async updatePropertyFields(propertyId: string, data: PropertyData): Promise<void> {
    // Prepare update data
    const updateData: any = {};

    // Add fields if they exist
    if (data.address !== undefined) {
      updateData.address = data.address || null;
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
      updateData.build_year = this.parseNumeric(data.build_year);
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
