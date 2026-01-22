import { createClient } from '@supabase/supabase-js';
import {
  Valuation,
  CreateValuationRequest,
  ValuationComparison,
} from '../types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Phase 2: ValuationService
 * 
 * Manages valuation records:
 * - Create valuations (automatic, manual, post_visit)
 * - Get valuation history
 * - Compare valuations
 * - Validate valuation amounts (ascending order)
 */
export class ValuationServicePhase2 {
  /**
   * Create a new valuation
   * 
   * @param data - Valuation data
   * @param employeeId - Employee creating the valuation
   * @returns Created valuation
   */
  async createValuation(
    data: CreateValuationRequest,
    employeeId: string
  ): Promise<Valuation> {
    // 1. Validate valuation order
    if (
      data.valuation_amount_1 > data.valuation_amount_2 ||
      data.valuation_amount_2 > data.valuation_amount_3
    ) {
      throw new Error('Valuation amounts must be in ascending order');
    }

    // 2. Check if property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', data.property_id)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    // 3. Insert valuation
    const { data: valuation, error } = await supabase
      .from('valuations')
      .insert({
        property_id: data.property_id,
        valuation_type: data.valuation_type,
        valuation_amount_1: data.valuation_amount_1,
        valuation_amount_2: data.valuation_amount_2,
        valuation_amount_3: data.valuation_amount_3,
        calculation_method: data.calculation_method,
        calculation_parameters: data.calculation_parameters,
        valuation_report_url: data.valuation_report_url,
        created_by: employeeId,
        notes: data.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating valuation:', error);
      throw new Error(`Failed to create valuation: ${error.message}`);
    }

    return this.mapToValuation(valuation);
  }

  /**
   * Get valuation history for a property
   * 
   * @param propertyId - Property ID
   * @returns Array of valuations (newest first)
   */
  async getValuationHistory(propertyId: string): Promise<Valuation[]> {
    const { data, error } = await supabase
      .from('valuations')
      .select(`
        *,
        employees:created_by (
          id,
          name
        )
      `)
      .eq('property_id', propertyId)
      .order('valuation_date', { ascending: false });

    if (error) {
      console.error('Error getting valuation history:', error);
      throw new Error(`Failed to get valuation history: ${error.message}`);
    }

    return data.map(this.mapToValuation);
  }

  /**
   * Get latest valuation for a property
   * 
   * @param propertyId - Property ID
   * @returns Latest valuation or null if none exists
   */
  async getLatestValuation(propertyId: string): Promise<Valuation | null> {
    const { data, error } = await supabase
      .from('valuations')
      .select(`
        *,
        employees:created_by (
          id,
          name
        )
      `)
      .eq('property_id', propertyId)
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error getting latest valuation:', error);
      throw new Error(`Failed to get latest valuation: ${error.message}`);
    }

    return this.mapToValuation(data);
  }

  /**
   * Compare two valuations
   * 
   * @param id1 - First valuation ID
   * @param id2 - Second valuation ID
   * @returns Comparison result
   */
  async compareValuations(id1: string, id2: string): Promise<ValuationComparison> {
    const [val1Result, val2Result] = await Promise.all([
      supabase.from('valuations').select('*').eq('id', id1).single(),
      supabase.from('valuations').select('*').eq('id', id2).single(),
    ]);

    if (val1Result.error || !val1Result.data) {
      throw new Error('First valuation not found');
    }
    if (val2Result.error || !val2Result.data) {
      throw new Error('Second valuation not found');
    }

    const v1 = this.mapToValuation(val1Result.data);
    const v2 = this.mapToValuation(val2Result.data);

    return {
      valuation1: v1,
      valuation2: v2,
      differences: {
        amount1: v2.valuation_amount_1 - v1.valuation_amount_1,
        amount2: v2.valuation_amount_2 - v1.valuation_amount_2,
        amount3: v2.valuation_amount_3 - v1.valuation_amount_3,
      },
      percentageChanges: {
        amount1: ((v2.valuation_amount_1 - v1.valuation_amount_1) / v1.valuation_amount_1) * 100,
        amount2: ((v2.valuation_amount_2 - v1.valuation_amount_2) / v1.valuation_amount_2) * 100,
        amount3: ((v2.valuation_amount_3 - v1.valuation_amount_3) / v1.valuation_amount_3) * 100,
      },
    };
  }

  /**
   * Map database record to Valuation type
   */
  private mapToValuation(data: any): Valuation {
    return {
      id: data.id,
      property_id: data.property_id,
      valuation_type: data.valuation_type,
      valuation_amount_1: data.valuation_amount_1,
      valuation_amount_2: data.valuation_amount_2,
      valuation_amount_3: data.valuation_amount_3,
      calculation_method: data.calculation_method,
      calculation_parameters: data.calculation_parameters,
      valuation_report_url: data.valuation_report_url,
      valuation_date: new Date(data.valuation_date),
      created_by: data.created_by,
      notes: data.notes,
      created_at: new Date(data.created_at),
    };
  }
}

// Export singleton instance
export const valuationServicePhase2 = new ValuationServicePhase2();
