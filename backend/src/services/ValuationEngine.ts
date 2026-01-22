import { Property, ValuationCalculationResult } from '../types';

/**
 * Phase 2: ValuationEngine
 * 
 * Calculates automatic valuations for properties:
 * - 戸建て (Detached House): Land + Building value
 * - 土地 (Land): Land value only
 * - マンション (Apartment): Manual input required
 * 
 * Calculation method:
 * - Land value: Fixed asset tax road price × land area (or base price × land area)
 * - Building value: Base price × building area × structure multiplier × depreciation
 * - Three valuation amounts: 85%, 100%, 115% of total value
 */
export class ValuationEngine {
  // Calculation constants
  private readonly LAND_PRICE_PER_SQM = 150000; // Base land price per square meter (円/㎡)
  private readonly BUILDING_PRICE_PER_SQM = 200000; // Base building price per square meter (円/㎡)
  private readonly DEPRECIATION_RATE = 0.015; // 1.5% per year
  private readonly MIN_VALUATION_MULTIPLIER = 0.85; // 85% for minimum
  private readonly MAX_VALUATION_MULTIPLIER = 1.15; // 115% for maximum

  /**
   * Calculate valuation for a property
   * 
   * @param property - Property to calculate valuation for
   * @returns Valuation result with three amounts
   */
  async calculateValuation(property: Property): Promise<ValuationCalculationResult> {
    // マンション requires manual input
    if (property.property_type === 'マンション') {
      throw new Error('Manual valuation input required for apartments (マンション)');
    }

    // 1. Calculate land value
    const landValue = this.calculateLandValue(property);

    // 2. Calculate building value (if applicable)
    const buildingValue = property.property_type === '戸建て'
      ? this.calculateBuildingValue(property)
      : 0;

    // 3. Calculate total value
    const totalValue = landValue + buildingValue;

    // 4. Calculate three valuation amounts
    const amount1 = Math.round(totalValue * this.MIN_VALUATION_MULTIPLIER);
    const amount2 = Math.round(totalValue);
    const amount3 = Math.round(totalValue * this.MAX_VALUATION_MULTIPLIER);

    // 5. Validate order
    if (!this.validateValuationOrder([amount1, amount2, amount3])) {
      throw new Error('Valuation amounts are not in ascending order');
    }

    // 6. Check for abnormal values
    if (amount1 < 1000000 || amount3 > 1000000000) {
      console.warn('Abnormal valuation detected:', { amount1, amount2, amount3 });
    }

    return {
      amount1,
      amount2,
      amount3,
      method: property.property_type === '戸建て' ? 'land_building_method' : 'land_method',
      parameters: {
        landArea: property.land_area,
        buildingArea: property.building_area,
        constructionYear: property.construction_year,
        structure: property.structure,
        landValue,
        buildingValue,
        totalValue,
      },
    };
  }

  /**
   * Calculate land value
   * 
   * @param property - Property
   * @returns Land value in yen
   */
  private calculateLandValue(property: Property): number {
    const landArea = property.land_area_verified || property.land_area || 0;

    // Use fixed asset tax road price if available
    if (property.fixed_asset_tax_road_price) {
      return property.fixed_asset_tax_road_price * landArea;
    }

    // Otherwise use base price
    return this.LAND_PRICE_PER_SQM * landArea;
  }

  /**
   * Calculate building value (for 戸建て)
   * 
   * @param property - Property
   * @returns Building value in yen
   */
  private calculateBuildingValue(property: Property): number {
    const buildingArea = property.building_area_verified || property.building_area || 0;
    const currentYear = new Date().getFullYear();
    const age = property.construction_year ? currentYear - property.construction_year : 0;

    // Calculate base building value
    let baseValue = this.BUILDING_PRICE_PER_SQM * buildingArea;

    // Apply structure multiplier
    const structureMultiplier = this.getStructureMultiplier(property.structure);
    baseValue *= structureMultiplier;

    // Apply depreciation
    const depreciatedValue = this.applyDepreciation(baseValue, age);

    return depreciatedValue;
  }

  /**
   * Get structure multiplier
   * 
   * @param structure - Structure type
   * @returns Multiplier
   */
  private getStructureMultiplier(structure: string | null): number {
    switch (structure) {
      case '木造':
        return 0.9;
      case '軽量鉄骨':
        return 1.0;
      case '鉄骨':
        return 1.1;
      case '他':
        return 1.0;
      default:
        return 1.0;
    }
  }

  /**
   * Apply depreciation
   * 
   * @param value - Base value
   * @param years - Age in years
   * @returns Depreciated value
   */
  private applyDepreciation(value: number, years: number): number {
    // Simple straight-line depreciation
    const depreciationAmount = value * this.DEPRECIATION_RATE * years;
    const depreciatedValue = value - depreciationAmount;

    // Minimum value is 10% of original
    return Math.max(depreciatedValue, value * 0.1);
  }

  /**
   * Validate valuation order
   * 
   * @param amounts - Three valuation amounts
   * @returns true if valid (ascending order)
   */
  validateValuationOrder(amounts: [number, number, number]): boolean {
    return amounts[0] <= amounts[1] && amounts[1] <= amounts[2];
  }

  /**
   * Generate valuation report URL
   * 
   * @param valuationId - Valuation ID
   * @returns Report URL
   */
  async generateValuationReport(valuationId: string): Promise<string> {
    // Placeholder - in real implementation, this would call an external service
    return `https://tsunagaru-online.example.com/reports/${valuationId}`;
  }
}

// Export singleton instance
export const valuationEngine = new ValuationEngine();
