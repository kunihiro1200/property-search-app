// 内覧結果のCRUDサービス
import { createClient } from '@supabase/supabase-js';
import { ViewingResult, CreateViewingResultRequest, ViewingResultsByBuyerNumber } from '../types';

export class ViewingService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * Create a new viewing result
   * @param data - Viewing result data including buyer_number
   * @returns Created viewing result
   */
  async create(data: CreateViewingResultRequest): Promise<ViewingResult> {
    const { error, data: result } = await this.supabase
      .from('viewings')
      .insert({
        buyer_id: data.buyer_id,
        buyer_number: data.buyer_number,
        property_number: data.property_number,
        viewing_date: data.viewing_date,
        assignee: data.assignee,
        status: data.status || 'scheduled',
        result: data.result,
        feedback: data.feedback
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create viewing result: ${error.message}`);
    }

    return result;
  }

  /**
   * Get all viewing results for a buyer
   * @param buyerId - The buyer ID
   * @returns Array of viewing results
   */
  async getByBuyerId(buyerId: string): Promise<ViewingResult[]> {
    const { data, error } = await this.supabase
      .from('viewings')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('viewing_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch viewing results: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get viewing results grouped by buyer number
   * @param buyerId - The buyer ID
   * @returns Array of viewing results grouped by buyer number
   */
  async getByBuyerIdGroupedByBuyerNumber(buyerId: string): Promise<ViewingResultsByBuyerNumber[]> {
    const viewingResults = await this.getByBuyerId(buyerId);

    // Group by buyer_number
    const grouped = viewingResults.reduce((acc, result) => {
      const buyerNumber = result.buyer_number || 'unknown';
      if (!acc[buyerNumber]) {
        acc[buyerNumber] = [];
      }
      acc[buyerNumber].push(result);
      return acc;
    }, {} as Record<string, ViewingResult[]>);

    // Convert to array format
    return Object.entries(grouped).map(([buyerNumber, results]) => ({
      buyerNumber,
      viewingResults: results
    }));
  }

  /**
   * Get viewing results for a specific buyer number
   * @param buyerId - The buyer ID
   * @param buyerNumber - The buyer number (current or past)
   * @returns Array of viewing results for that buyer number
   */
  async getByBuyerIdAndBuyerNumber(buyerId: string, buyerNumber: string): Promise<ViewingResult[]> {
    const { data, error } = await this.supabase
      .from('viewings')
      .select('*')
      .eq('buyer_id', buyerId)
      .eq('buyer_number', buyerNumber)
      .order('viewing_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch viewing results: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update a viewing result
   * @param id - Viewing result ID
   * @param data - Updated data
   * @returns Updated viewing result
   */
  async update(id: string, data: Partial<CreateViewingResultRequest>): Promise<ViewingResult> {
    const { error, data: result } = await this.supabase
      .from('viewings')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update viewing result: ${error.message}`);
    }

    return result;
  }

  /**
   * Delete a viewing result
   * @param id - Viewing result ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('viewings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete viewing result: ${error.message}`);
    }
  }

  /**
   * Validate that a buyer number belongs to a buyer (current or past)
   * @param buyerId - The buyer ID
   * @param buyerNumber - The buyer number to validate
   * @returns True if valid, false otherwise
   */
  async validateBuyerNumber(buyerId: string, buyerNumber: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('buyer_number, past_buyer_list')
      .eq('buyer_id', buyerId)
      .single();

    if (error || !data) {
      return false;
    }

    // Check if it's the current buyer number
    if (data.buyer_number === buyerNumber) {
      return true;
    }

    // Check if it's in the past buyer list
    if (data.past_buyer_list) {
      const pastNumbers = data.past_buyer_list
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => n.length > 0);
      
      return pastNumbers.includes(buyerNumber);
    }

    return false;
  }
}
