import { createClient } from '@supabase/supabase-js';
import {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from '../types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Phase 2: PropertyService
 * 
 * Manages property information with Phase 2 schema:
 * - Properties table with seller relationship
 * - Property types: 戸建て, 土地, マンション
 * - Area information (land_area, building_area, verified areas)
 * - Construction information (year, structure)
 * - Current status (居住中, 空き家, etc.)
 * - Optimistic locking support
 */
export class PropertyServicePhase2 {
  /**
   * Create a new property
   * 
   * @param data - Property data
   * @param employeeId - Employee creating the property
   * @returns Created property
   */
  async createProperty(
    data: CreatePropertyRequest,
    employeeId: string
  ): Promise<Property> {
    // 1. Validate property data
    this.validatePropertyData(data);

    // 2. Check if seller exists
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', data.seller_id)
      .single();

    if (sellerError || !seller) {
      throw new Error('Seller not found');
    }

    // 3. Insert property
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        seller_id: data.seller_id,
        property_type: data.property_type,
        land_area: data.land_area,
        building_area: data.building_area,
        land_area_verified: data.land_area_verified,
        building_area_verified: data.building_area_verified,
        construction_year: data.construction_year,
        structure: data.structure,
        property_address: data.property_address,
        property_address_ieul_apartment: data.property_address_ieul_apartment,
        current_status: data.current_status,
        fixed_asset_tax_road_price: data.fixed_asset_tax_road_price,
        floor_plan: data.floor_plan,
        created_by: employeeId,
        updated_by: employeeId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      throw new Error(`Failed to create property: ${error.message}`);
    }

    return this.mapToProperty(property);
  }

  /**
   * Get property by ID
   * 
   * @param id - Property ID
   * @returns Property or null if not found
   */
  async getProperty(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error getting property:', error);
      throw new Error(`Failed to get property: ${error.message}`);
    }

    return this.mapToProperty(data);
  }

  /**
   * Update property
   * 
   * @param id - Property ID
   * @param data - Update data
   * @param employeeId - Employee updating the property
   * @returns Updated property
   */
  async updateProperty(
    id: string,
    data: UpdatePropertyRequest,
    employeeId: string
  ): Promise<Property> {
    // 1. Get current property for optimistic locking
    const currentProperty = await this.getProperty(id);
    if (!currentProperty) {
      throw new Error('Property not found');
    }

    // 2. Check version for optimistic locking
    if (data.version !== currentProperty.version) {
      throw new Error('Version mismatch - property was updated by another user');
    }

    // 3. Validate update data
    if (data.property_type) {
      this.validatePropertyType(data.property_type);
    }
    if (data.structure) {
      this.validateStructure(data.structure);
    }
    if (data.current_status) {
      this.validateCurrentStatus(data.current_status);
    }

    // 4. Build update object
    const updateData: any = {
      updated_by: employeeId,
      version: currentProperty.version + 1,
    };

    if (data.property_type !== undefined) updateData.property_type = data.property_type;
    if (data.land_area !== undefined) updateData.land_area = data.land_area;
    if (data.building_area !== undefined) updateData.building_area = data.building_area;
    if (data.land_area_verified !== undefined) updateData.land_area_verified = data.land_area_verified;
    if (data.building_area_verified !== undefined) updateData.building_area_verified = data.building_area_verified;
    if (data.construction_year !== undefined) updateData.construction_year = data.construction_year;
    if (data.structure !== undefined) updateData.structure = data.structure;
    if (data.property_address !== undefined) updateData.property_address = data.property_address;
    if (data.property_address_ieul_apartment !== undefined) updateData.property_address_ieul_apartment = data.property_address_ieul_apartment;
    if (data.current_status !== undefined) updateData.current_status = data.current_status;
    if (data.fixed_asset_tax_road_price !== undefined) updateData.fixed_asset_tax_road_price = data.fixed_asset_tax_road_price;
    if (data.floor_plan !== undefined) updateData.floor_plan = data.floor_plan;

    // 5. Update property
    const { data: updated, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .eq('version', currentProperty.version) // Optimistic locking
      .select()
      .single();

    if (error) {
      console.error('Error updating property:', error);
      throw new Error(`Failed to update property: ${error.message}`);
    }

    return this.mapToProperty(updated);
  }

  /**
   * Delete property (soft delete)
   * 
   * @param id - Property ID
   */
  async deleteProperty(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting property:', error);
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  /**
   * List properties by seller
   * 
   * @param sellerId - Seller ID
   * @returns Array of properties
   */
  async listPropertiesBySeller(sellerId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing properties:', error);
      throw new Error(`Failed to list properties: ${error.message}`);
    }

    return data.map(this.mapToProperty);
  }

  /**
   * Validate property data
   * 
   * @param data - Property data to validate
   */
  private validatePropertyData(data: CreatePropertyRequest): void {
    // Property type validation
    this.validatePropertyType(data.property_type);

    // Area validation
    if (data.land_area !== undefined && data.land_area <= 0) {
      throw new Error('Land area must be positive');
    }
    if (data.building_area !== undefined && data.building_area <= 0) {
      throw new Error('Building area must be positive');
    }

    // Construction year validation
    if (data.construction_year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (data.construction_year < 1900 || data.construction_year > currentYear + 1) {
        throw new Error(`Construction year must be between 1900 and ${currentYear + 1}`);
      }
    }

    // Structure validation
    if (data.structure) {
      this.validateStructure(data.structure);
    }

    // Address validation
    if (!data.property_address || data.property_address.trim() === '') {
      throw new Error('Property address is required');
    }

    // Current status validation
    if (data.current_status) {
      this.validateCurrentStatus(data.current_status);
    }
  }

  /**
   * Validate property type
   */
  private validatePropertyType(propertyType: string): void {
    const validTypes = ['戸建て', '土地', 'マンション'];
    if (!validTypes.includes(propertyType)) {
      throw new Error(`Property type must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate structure
   */
  private validateStructure(structure: string): void {
    const validStructures = ['木造', '軽量鉄骨', '鉄骨', '他'];
    if (!validStructures.includes(structure)) {
      throw new Error(`Structure must be one of: ${validStructures.join(', ')}`);
    }
  }

  /**
   * Validate current status
   */
  private validateCurrentStatus(status: string): void {
    const validStatuses = ['居住中', '空き家', '賃貸中', '古屋あり', '更地'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Current status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  /**
   * Map database record to Property type
   */
  private mapToProperty(data: any): Property {
    return {
      id: data.id,
      seller_id: data.seller_id,
      property_type: data.property_type,
      land_area: data.land_area,
      building_area: data.building_area,
      land_area_verified: data.land_area_verified,
      building_area_verified: data.building_area_verified,
      construction_year: data.construction_year,
      structure: data.structure,
      property_address: data.property_address,
      property_address_ieul_apartment: data.property_address_ieul_apartment,
      current_status: data.current_status,
      fixed_asset_tax_road_price: data.fixed_asset_tax_road_price,
      floor_plan: data.floor_plan,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      created_by: data.created_by,
      updated_by: data.updated_by,
      version: data.version,
    };
  }
}

// Export singleton instance
export const propertyServicePhase2 = new PropertyServicePhase2();
