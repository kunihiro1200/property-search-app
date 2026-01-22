import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface FollowUpProgressInfo {
  unreachable?: boolean;
  secondCallAfterUnreachable?: boolean;
  nextCallDate?: Date;
  confidence?: string;
  contactMethod?: string;
  preferredContactTime?: string;
  firstCallInitials?: string;
  firstCallPerson?: string;
}

/**
 * Service for managing follow-up progress (追客進捗管理)
 * Handles unreachable flags, next call dates, confidence levels, and contact preferences
 */
export class FollowUpProgressService {
  /**
   * Mark seller as unreachable
   * 
   * @param sellerId - Seller ID
   * @param reason - Optional reason for being unreachable
   * @returns Updated follow-up information
   */
  async markUnreachable(
    sellerId: string,
    reason?: string
  ): Promise<FollowUpProgressInfo> {
    try {
      const updateData: any = {
        unreachable: true,
        confidence: '低', // Set confidence to low when unreachable
      };

      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error marking unreachable:', error);
        throw new Error(`Failed to mark unreachable: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Mark unreachable error:', error);
      throw error;
    }
  }

  /**
   * Mark seller as reachable (clear unreachable flag)
   * 
   * @param sellerId - Seller ID
   * @returns Updated follow-up information
   */
  async markReachable(sellerId: string): Promise<FollowUpProgressInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({
          unreachable: false,
          second_call_after_unreachable: false,
        })
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error marking reachable:', error);
        throw new Error(`Failed to mark reachable: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Mark reachable error:', error);
      throw error;
    }
  }

  /**
   * Set second call after unreachable flag
   * 
   * @param sellerId - Seller ID
   * @param value - Flag value
   * @returns Updated follow-up information
   */
  async setSecondCallAfterUnreachable(
    sellerId: string,
    value: boolean
  ): Promise<FollowUpProgressInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ second_call_after_unreachable: value })
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error setting second call flag:', error);
        throw new Error(`Failed to set second call flag: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Set second call flag error:', error);
      throw error;
    }
  }

  /**
   * Schedule next call
   * 
   * @param sellerId - Seller ID
   * @param nextCallDate - Next call date
   * @param notes - Optional notes
   * @returns Updated follow-up information
   */
  async scheduleNextCall(
    sellerId: string,
    nextCallDate: Date,
    notes?: string
  ): Promise<FollowUpProgressInfo> {
    try {
      const updateData: any = {
        next_call_date: nextCallDate,
      };


      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error scheduling next call:', error);
        throw new Error(`Failed to schedule next call: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Schedule next call error:', error);
      throw error;
    }
  }

  /**
   * Update confidence level
   * 
   * @param sellerId - Seller ID
   * @param confidence - Confidence level (高, 中, 低)
   * @returns Updated follow-up information
   */
  async updateConfidence(
    sellerId: string,
    confidence: string
  ): Promise<FollowUpProgressInfo> {
    try {
      // Validate confidence level
      if (!this.validateConfidence(confidence)) {
        throw new Error(`Invalid confidence level: ${confidence}`);
      }

      const { data, error } = await supabase
        .from('sellers')
        .update({ confidence })
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error updating confidence:', error);
        throw new Error(`Failed to update confidence: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Update confidence error:', error);
      throw error;
    }
  }

  /**
   * Update contact method
   * 
   * @param sellerId - Seller ID
   * @param method - Contact method (Email, Smail, 電話)
   * @returns Updated follow-up information
   */
  async updateContactMethod(
    sellerId: string,
    method: string
  ): Promise<FollowUpProgressInfo> {
    try {
      // Validate contact method
      if (!this.validateContactMethod(method)) {
        throw new Error(`Invalid contact method: ${method}`);
      }

      const { data, error } = await supabase
        .from('sellers')
        .update({ contact_method: method })
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error updating contact method:', error);
        throw new Error(`Failed to update contact method: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Update contact method error:', error);
      throw error;
    }
  }

  /**
   * Update preferred contact time
   * 
   * @param sellerId - Seller ID
   * @param time - Preferred contact time
   * @returns Updated follow-up information
   */
  async updatePreferredContactTime(
    sellerId: string,
    time: string
  ): Promise<FollowUpProgressInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ preferred_contact_time: time })
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error updating preferred contact time:', error);
        throw new Error(`Failed to update preferred contact time: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Update preferred contact time error:', error);
      throw error;
    }
  }

  /**
   * Record first call information
   * 
   * @param sellerId - Seller ID
   * @param initials - Caller initials
   * @param person - Person who answered
   * @returns Updated follow-up information
   */
  async recordFirstCall(
    sellerId: string,
    initials: string,
    person?: string
  ): Promise<FollowUpProgressInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({
          first_call_initials: initials,
          first_call_person: person,
        })
        .eq('id', sellerId)
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .single();

      if (error) {
        console.error('Error recording first call:', error);
        throw new Error(`Failed to record first call: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Record first call error:', error);
      throw error;
    }
  }

  /**
   * Get follow-up progress information for a seller
   * 
   * @param sellerId - Seller ID
   * @returns Follow-up progress information or null if not found
   */
  async getFollowUpProgress(sellerId: string): Promise<FollowUpProgressInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select(
          `unreachable, second_call_after_unreachable, next_call_date, confidence,
           contact_method, preferred_contact_time, first_call_initials, first_call_person`
        )
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting follow-up progress:', error);
        throw new Error(`Failed to get follow-up progress: ${error.message}`);
      }

      return this.mapToFollowUpProgressInfo(data);
    } catch (error) {
      console.error('Get follow-up progress error:', error);
      throw error;
    }
  }

  /**
   * Get sellers requiring follow-up calls
   * 
   * @param assigneeId - Optional assignee filter
   * @param date - Date to check (default: today)
   * @returns List of sellers requiring follow-up
   */
  async getSellersRequiringFollowUp(
    assigneeId?: string,
    date: Date = new Date()
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('sellers')
        .select(
          `id, seller_number, name, phone_number, next_call_date, confidence,
           assigned_to, unreachable, preferred_contact_time, contact_method`
        )
        .lte('next_call_date', date.toISOString())
        .eq('unreachable', false)
        .order('next_call_date', { ascending: true });

      if (assigneeId) {
        query = query.eq('assigned_to', assigneeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting follow-up sellers:', error);
        throw new Error(`Failed to get follow-up sellers: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get sellers requiring follow-up error:', error);
      throw error;
    }
  }

  /**
   * Get unreachable sellers
   * 
   * @param assigneeId - Optional assignee filter
   * @returns List of unreachable sellers
   */
  async getUnreachableSellers(assigneeId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('sellers')
        .select(
          `id, seller_number, name, phone_number, unreachable, 
           second_call_after_unreachable, assigned_to, confidence`
        )
        .eq('unreachable', true)
        .order('updated_at', { ascending: false });

      if (assigneeId) {
        query = query.eq('assigned_to', assigneeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting unreachable sellers:', error);
        throw new Error(`Failed to get unreachable sellers: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get unreachable sellers error:', error);
      throw error;
    }
  }

  /**
   * Validate confidence level
   * 
   * @param confidence - Confidence level to validate
   * @returns true if valid
   */
  validateConfidence(confidence: string): boolean {
    const validConfidences = ['高', '中', '低'];
    return validConfidences.includes(confidence);
  }

  /**
   * Validate contact method
   * 
   * @param method - Contact method to validate
   * @returns true if valid
   */
  validateContactMethod(method: string): boolean {
    const validMethods = ['Email', 'Smail', '電話'];
    return validMethods.includes(method);
  }

  /**
   * Map database record to FollowUpProgressInfo type
   */
  private mapToFollowUpProgressInfo(data: any): FollowUpProgressInfo {
    return {
      unreachable: data.unreachable,
      secondCallAfterUnreachable: data.second_call_after_unreachable,
      nextCallDate: data.next_call_date ? new Date(data.next_call_date) : undefined,
      confidence: data.confidence,
      contactMethod: data.contact_method,
      preferredContactTime: data.preferred_contact_time,
      firstCallInitials: data.first_call_initials,
      firstCallPerson: data.first_call_person,
    };
  }
}

// Export singleton instance
export const followUpProgressService = new FollowUpProgressService();
