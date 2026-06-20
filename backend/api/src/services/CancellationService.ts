import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CancellationInfo {
  cancelNoticeAssignee?: string;
  exclusiveScript?: string;
  priceLossListEntered?: boolean;
  companyIntroduction?: string;
  propertyIntroduction?: string;
}

/**
 * Service for managing cancellation notices and related information
 * Handles cancellation assignees, exclusive scripts, and introductions
 */
export class CancellationService {
  /**
   * Record cancellation notice assignee
   * 
   * @param sellerId - Seller ID
   * @param assignee - Assignee name or initials
   * @returns Updated cancellation information
   */
  async recordCancelNoticeAssignee(
    sellerId: string,
    assignee: string
  ): Promise<CancellationInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ cancel_notice_assignee: assignee })
        .eq('id', sellerId)
        .select(
          `cancel_notice_assignee, exclusive_script, price_loss_list_entered,
           company_introduction, property_introduction`
        )
        .single();

      if (error) {
        console.error('Error recording cancel notice assignee:', error);
        throw new Error(`Failed to record cancel notice assignee: ${error.message}`);
      }

      return this.mapToCancellationInfo(data);
    } catch (error) {
      console.error('Record cancel notice assignee error:', error);
      throw error;
    }
  }

  /**
   * Record exclusive script (専任とれた文言)
   * 
   * @param sellerId - Seller ID
   * @param script - Exclusive script text
   * @returns Updated cancellation information
   */
  async recordExclusiveScript(
    sellerId: string,
    script: string
  ): Promise<CancellationInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ exclusive_script: script })
        .eq('id', sellerId)
        .select(
          `cancel_notice_assignee, exclusive_script, price_loss_list_entered,
           company_introduction, property_introduction`
        )
        .single();

      if (error) {
        console.error('Error recording exclusive script:', error);
        throw new Error(`Failed to record exclusive script: ${error.message}`);
      }

      return this.mapToCancellationInfo(data);
    } catch (error) {
      console.error('Record exclusive script error:', error);
      throw error;
    }
  }

  /**
   * Mark price loss list as entered
   * 
   * @param sellerId - Seller ID
   * @param entered - Whether price loss list is entered
   * @returns Updated cancellation information
   */
  async markPriceLossListEntered(
    sellerId: string,
    entered: boolean
  ): Promise<CancellationInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ price_loss_list_entered: entered })
        .eq('id', sellerId)
        .select(
          `cancel_notice_assignee, exclusive_script, price_loss_list_entered,
           company_introduction, property_introduction`
        )
        .single();

      if (error) {
        console.error('Error marking price loss list:', error);
        throw new Error(`Failed to mark price loss list: ${error.message}`);
      }

      return this.mapToCancellationInfo(data);
    } catch (error) {
      console.error('Mark price loss list error:', error);
      throw error;
    }
  }

  /**
   * Record company introduction
   * 
   * @param sellerId - Seller ID
   * @param introduction - Company introduction text
   * @returns Updated cancellation information
   */
  async recordCompanyIntroduction(
    sellerId: string,
    introduction: string
  ): Promise<CancellationInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ company_introduction: introduction })
        .eq('id', sellerId)
        .select(
          `cancel_notice_assignee, exclusive_script, price_loss_list_entered,
           company_introduction, property_introduction`
        )
        .single();

      if (error) {
        console.error('Error recording company introduction:', error);
        throw new Error(`Failed to record company introduction: ${error.message}`);
      }

      return this.mapToCancellationInfo(data);
    } catch (error) {
      console.error('Record company introduction error:', error);
      throw error;
    }
  }

  /**
   * Record property introduction
   * 
   * @param sellerId - Seller ID
   * @param introduction - Property introduction text
   * @returns Updated cancellation information
   */
  async recordPropertyIntroduction(
    sellerId: string,
    introduction: string
  ): Promise<CancellationInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ property_introduction: introduction })
        .eq('id', sellerId)
        .select(
          `cancel_notice_assignee, exclusive_script, price_loss_list_entered,
           company_introduction, property_introduction`
        )
        .single();

      if (error) {
        console.error('Error recording property introduction:', error);
        throw new Error(`Failed to record property introduction: ${error.message}`);
      }

      return this.mapToCancellationInfo(data);
    } catch (error) {
      console.error('Record property introduction error:', error);
      throw error;
    }
  }

  /**
   * Get cancellation information for a seller
   * 
   * @param sellerId - Seller ID
   * @returns Cancellation information or null if not found
   */
  async getCancellationInfo(sellerId: string): Promise<CancellationInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select(
          `cancel_notice_assignee, exclusive_script, price_loss_list_entered,
           company_introduction, property_introduction`
        )
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting cancellation info:', error);
        throw new Error(`Failed to get cancellation info: ${error.message}`);
      }

      return this.mapToCancellationInfo(data);
    } catch (error) {
      console.error('Get cancellation info error:', error);
      throw error;
    }
  }

  /**
   * Update cancellation information in bulk
   * 
   * @param sellerId - Seller ID
   * @param updates - Cancellation information updates
   * @returns Updated cancellation information
   */
  async updateCancellationInfo(
    sellerId: string,
    updates: CancellationInfo
  ): Promise<CancellationInfo> {
    try {
      const updateData: any = {};

      if (updates.cancelNoticeAssignee !== undefined) {
        updateData.cancel_notice_assignee = updates.cancelNoticeAssignee;
      }
      if (updates.exclusiveScript !== undefined) {
        updateData.exclusive_script = updates.exclusiveScript;
      }
      if (updates.priceLossListEntered !== undefined) {
        updateData.price_loss_list_entered = updates.priceLossListEntered;
      }
      if (updates.companyIntroduction !== undefined) {
        updateData.company_introduction = updates.companyIntroduction;
      }
      if (updates.propertyIntroduction !== undefined) {
        updateData.property_introduction = updates.propertyIntroduction;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('No fields to update');
      }

      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select(
          `cancel_notice_assignee, exclusive_script, price_loss_list_entered,
           company_introduction, property_introduction`
        )
        .single();

      if (error) {
        console.error('Error updating cancellation info:', error);
        throw new Error(`Failed to update cancellation info: ${error.message}`);
      }

      return this.mapToCancellationInfo(data);
    } catch (error) {
      console.error('Update cancellation info error:', error);
      throw error;
    }
  }

  /**
   * Get sellers with price loss list not entered
   * 
   * @returns List of sellers
   */
  async getSellersWithoutPriceLossEntry(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select(
          `id, seller_number, name, phone_number, status,
           price_loss_list_entered, cancel_notice_assignee`
        )
        .eq('status', 'other_decision')
        .or('price_loss_list_entered.is.null,price_loss_list_entered.eq.false')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting sellers without price loss entry:', error);
        throw new Error(`Failed to get sellers without price loss entry: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get sellers without price loss entry error:', error);
      throw error;
    }
  }

  /**
   * Get common exclusive scripts for reference
   * 
   * @returns List of common exclusive scripts
   */
  async getCommonExclusiveScripts(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('exclusive_script')
        .not('exclusive_script', 'is', null)
        .not('exclusive_script', 'eq', '');

      if (error) {
        console.error('Error getting common exclusive scripts:', error);
        return [];
      }

      // Count occurrences
      const scriptCounts: Record<string, number> = {};
      data?.forEach((seller) => {
        const script = seller.exclusive_script?.trim();
        if (script) {
          scriptCounts[script] = (scriptCounts[script] || 0) + 1;
        }
      });

      return Object.entries(scriptCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([script]) => script);
    } catch (error) {
      console.error('Get common exclusive scripts error:', error);
      return [];
    }
  }

  /**
   * Map database record to CancellationInfo type
   */
  private mapToCancellationInfo(data: any): CancellationInfo {
    return {
      cancelNoticeAssignee: data.cancel_notice_assignee,
      exclusiveScript: data.exclusive_script,
      priceLossListEntered: data.price_loss_list_entered,
      companyIntroduction: data.company_introduction,
      propertyIntroduction: data.property_introduction,
    };
  }
}

// Export singleton instance
export const cancellationService = new CancellationService();
