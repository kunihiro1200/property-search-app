import { Pool } from 'pg';
import pool from '../config/database';

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
  errors: string[];
}

interface PropertyValidationReport {
  propertyNumber: string;
  sellerName: string;
  address: string;
  hasGoogleMapUrl: boolean;
  hasCityField: boolean;
  hasPropertyListing: boolean;
  distributionAreas: string[];
  issues: string[];
}

interface Property {
  id: string;
  seller_number: string;
  seller_name: string;
  address: string;
  city: string | null;
  google_map_url: string | null;
}

export class PropertyDataValidator {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  /**
   * Validates a property for distribution area calculation
   */
  validateProperty(property: Property): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      missingFields: [],
      warnings: [],
      errors: []
    };

    // Check Google Map URL
    if (!this.validateGoogleMapUrl(property.google_map_url)) {
      result.isValid = false;
      result.missingFields.push('google_map_url');
      result.warnings.push('Google Map URLが未設定です。距離ベースの配信エリア(①-⑦)を計算できません。');
    }

    // Check city field
    if (!this.validateCityField(property.city)) {
      result.isValid = false;
      result.missingFields.push('city');
      result.warnings.push('市フィールドが未設定です。市全体エリア(㊵大分市、㊶別府市)を計算できません。');
    }

    // Check address
    if (!property.address || property.address.trim() === '') {
      result.isValid = false;
      result.missingFields.push('address');
      result.errors.push('住所が未設定です。');
    }

    return result;
  }

  /**
   * Validates if a Google Map URL is present and non-empty
   */
  validateGoogleMapUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const trimmed = url.trim();
    if (trimmed === '') return false;
    
    // Basic URL validation
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates if a city field is present and non-empty
   */
  validateCityField(city: string | null | undefined): boolean {
    if (!city) return false;
    const trimmed = city.trim();
    return trimmed !== '';
  }

  /**
   * Checks if a property has an associated property listing
   */
  async validatePropertyListing(propertyId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT id FROM property_listings WHERE property_id = $1 LIMIT 1',
        [propertyId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error validating property listing:', error);
      return false;
    }
  }

  /**
   * Generates a comprehensive validation report for multiple properties
   */
  async generateReport(properties: Property[]): Promise<PropertyValidationReport[]> {
    const reports: PropertyValidationReport[] = [];

    for (const property of properties) {
      const validation = this.validateProperty(property);
      const hasPropertyListing = await this.validatePropertyListing(property.id);

      // Get distribution areas if property listing exists
      let distributionAreas: string[] = [];
      if (hasPropertyListing) {
        try {
          const result = await this.pool.query(
            'SELECT distribution_areas FROM property_listings WHERE property_id = $1',
            [property.id]
          );
          if (result.rows.length > 0) {
            distributionAreas = result.rows[0].distribution_areas || [];
          }
        } catch (error) {
          console.error('Error fetching distribution areas:', error);
        }
      }

      const issues: string[] = [...validation.warnings, ...validation.errors];
      if (!hasPropertyListing) {
        issues.push('物件リストが存在しません。配信エリアを保存できません。');
      }

      reports.push({
        propertyNumber: property.seller_number,
        sellerName: property.seller_name,
        address: property.address,
        hasGoogleMapUrl: this.validateGoogleMapUrl(property.google_map_url),
        hasCityField: this.validateCityField(property.city),
        hasPropertyListing,
        distributionAreas,
        issues
      });
    }

    return reports;
  }

  /**
   * Generates a summary of validation issues across all properties
   */
  async generateSummary(): Promise<{
    total: number;
    missingGoogleMapUrl: number;
    missingCity: number;
    missingPropertyListing: number;
    completeData: number;
  }> {
    try {
      // Get all properties with their property listing status
      const result = await this.pool.query(`
        SELECT 
          p.id,
          p.google_map_url,
          p.city,
          CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as has_listing
        FROM properties p
        LEFT JOIN property_listings pl ON p.id = pl.property_id
      `);

      const summary = {
        total: result.rows.length,
        missingGoogleMapUrl: 0,
        missingCity: 0,
        missingPropertyListing: 0,
        completeData: 0
      };

      for (const row of result.rows) {
        const hasGoogleMapUrl = this.validateGoogleMapUrl(row.google_map_url);
        const hasCity = this.validateCityField(row.city);
        const hasListing = row.has_listing;

        if (!hasGoogleMapUrl) summary.missingGoogleMapUrl++;
        if (!hasCity) summary.missingCity++;
        if (!hasListing) summary.missingPropertyListing++;

        if (hasGoogleMapUrl && hasCity && hasListing) {
          summary.completeData++;
        }
      }

      return summary;
    } catch (error) {
      console.error('Error generating validation summary:', error);
      throw error;
    }
  }

  /**
   * Finds all properties with validation issues
   */
  async findPropertiesWithIssues(): Promise<{
    missingGoogleMapUrl: Property[];
    missingCity: Property[];
    missingPropertyListing: Property[];
  }> {
    try {
      // Properties missing Google Map URL
      const missingUrlResult = await this.pool.query(`
        SELECT id, seller_number, seller_name, address, city, google_map_url
        FROM properties
        WHERE google_map_url IS NULL OR google_map_url = ''
        ORDER BY seller_number
      `);

      // Properties missing city
      const missingCityResult = await this.pool.query(`
        SELECT id, seller_number, seller_name, address, city, google_map_url
        FROM properties
        WHERE city IS NULL OR city = ''
        ORDER BY seller_number
      `);

      // Properties missing property listing
      const missingListingResult = await this.pool.query(`
        SELECT p.id, p.seller_number, p.seller_name, p.address, p.city, p.google_map_url
        FROM properties p
        LEFT JOIN property_listings pl ON p.id = pl.property_id
        WHERE pl.id IS NULL
        ORDER BY p.seller_number
      `);

      return {
        missingGoogleMapUrl: missingUrlResult.rows,
        missingCity: missingCityResult.rows,
        missingPropertyListing: missingListingResult.rows
      };
    } catch (error) {
      console.error('Error finding properties with issues:', error);
      throw error;
    }
  }
}

export default PropertyDataValidator;
