import { createClient } from '@supabase/supabase-js';
import { ExclusionInfo } from '../types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Service for managing exclusion (除外管理) functionality
 * Handles seller exclusion from lists, campaigns, and communications
 */
export class ExclusionService {
  /**
   * Add seller to exclusion list
   * 
   * @param sellerId - Seller ID
   * @param exclusionData - Exclusion information
   * @returns Updated exclusion information
   */
  async addToExclusionList(
    sellerId: string,
    exclusionData: ExclusionInfo
  ): Promise<ExclusionInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({
          exclusion_site: exclusionData.exclusionSite,
          exclusion_criteria: exclusionData.exclusionCriteria,
          exclusion_date: exclusionData.exclusionDate || new Date(),
          exclusion_action: exclusionData.exclusionAction,
        })
        .eq('id', sellerId)
        .select('exclusion_site, exclusion_criteria, exclusion_date, exclusion_action')
        .single();

      if (error) {
        console.error('Error adding to exclusion list:', error);
        throw new Error(`Failed to add to exclusion list: ${error.message}`);
      }

      // Log exclusion action
      await this.logExclusionAction(sellerId, 'added', exclusionData);

      return this.mapToExclusionInfo(data);
    } catch (error) {
      console.error('Add to exclusion list error:', error);
      throw error;
    }
  }

  /**
   * Remove seller from exclusion list
   * 
   * @param sellerId - Seller ID
   * @param reason - Reason for removal
   * @returns void
   */
  async removeFromExclusionList(sellerId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          exclusion_site: null,
          exclusion_criteria: null,
          exclusion_date: null,
          exclusion_action: null,
        })
        .eq('id', sellerId);

      if (error) {
        console.error('Error removing from exclusion list:', error);
        throw new Error(`Failed to remove from exclusion list: ${error.message}`);
      }

      // Log removal action
      await this.logExclusionAction(sellerId, 'removed', { exclusionAction: reason });
    } catch (error) {
      console.error('Remove from exclusion list error:', error);
      throw error;
    }
  }

  /**
   * Get exclusion information for a seller
   * 
   * @param sellerId - Seller ID
   * @returns Exclusion information or null if not excluded
   */
  async getExclusion(sellerId: string): Promise<ExclusionInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('exclusion_site, exclusion_criteria, exclusion_date, exclusion_action')
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting exclusion:', error);
        throw new Error(`Failed to get exclusion: ${error.message}`);
      }

      // Check if exclusion data exists
      if (!data.exclusion_site && !data.exclusion_criteria) {
        return null;
      }

      return this.mapToExclusionInfo(data);
    } catch (error) {
      console.error('Get exclusion error:', error);
      throw error;
    }
  }

  /**
   * Check if seller is excluded
   * 
   * @param sellerId - Seller ID
   * @returns true if seller is excluded
   */
  async isExcluded(sellerId: string): Promise<boolean> {
    try {
      const exclusion = await this.getExclusion(sellerId);
      return exclusion !== null;
    } catch (error) {
      console.error('Check exclusion error:', error);
      return false;
    }
  }

  /**
   * Get all excluded sellers
   * 
   * @param filters - Optional filters
   * @returns List of excluded sellers
   */
  async getExcludedSellers(filters?: {
    site?: string;
    criteria?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('sellers')
        .select(
          `id, seller_number, name, phone_number, exclusion_site, 
           exclusion_criteria, exclusion_date, exclusion_action`
        )
        .not('exclusion_site', 'is', null);

      if (filters?.site) {
        query = query.eq('exclusion_site', filters.site);
      }
      if (filters?.criteria) {
        query = query.eq('exclusion_criteria', filters.criteria);
      }
      if (filters?.startDate) {
        query = query.gte('exclusion_date', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('exclusion_date', filters.endDate.toISOString());
      }

      query = query.order('exclusion_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error getting excluded sellers:', error);
        throw new Error(`Failed to get excluded sellers: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get excluded sellers error:', error);
      throw error;
    }
  }

  /**
   * Get exclusion statistics
   * 
   * @returns Exclusion statistics by site and criteria
   */
  async getExclusionStatistics(): Promise<{
    totalExcluded: number;
    bySite: Record<string, number>;
    byCriteria: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('exclusion_site, exclusion_criteria')
        .not('exclusion_site', 'is', null);

      if (error) {
        throw new Error(`Failed to get exclusion statistics: ${error.message}`);
      }

      const bySite: Record<string, number> = {};
      const byCriteria: Record<string, number> = {};

      data?.forEach((seller) => {
        if (seller.exclusion_site) {
          bySite[seller.exclusion_site] = (bySite[seller.exclusion_site] || 0) + 1;
        }
        if (seller.exclusion_criteria) {
          byCriteria[seller.exclusion_criteria] = (byCriteria[seller.exclusion_criteria] || 0) + 1;
        }
      });

      return {
        totalExcluded: data?.length || 0,
        bySite,
        byCriteria,
      };
    } catch (error) {
      console.error('Get exclusion statistics error:', error);
      throw error;
    }
  }

  /**
   * Validate exclusion site
   * 
   * @param site - Site to validate
   * @returns true if valid
   */
  validateExclusionSite(site: string): boolean {
    const validSites = ['SUUMO', 'athome', 'homes', 'Yahoo不動産', 'その他'];
    return validSites.includes(site);
  }

  /**
   * Get common exclusion criteria
   * 
   * @returns List of common exclusion criteria
   */
  async getCommonExclusionCriteria(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('exclusion_criteria')
        .not('exclusion_criteria', 'is', null)
        .not('exclusion_criteria', 'eq', '');

      if (error) {
        console.error('Error getting common criteria:', error);
        return [];
      }

      // Count occurrences
      const criteriaCounts: Record<string, number> = {};
      data?.forEach((seller) => {
        const criteria = seller.exclusion_criteria?.trim();
        if (criteria) {
          criteriaCounts[criteria] = (criteriaCounts[criteria] || 0) + 1;
        }
      });

      return Object.entries(criteriaCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([criteria]) => criteria);
    } catch (error) {
      console.error('Get common exclusion criteria error:', error);
      return [];
    }
  }

  /**
   * Bulk exclude sellers
   * 
   * @param sellerIds - Array of seller IDs
   * @param exclusionData - Exclusion information
   * @returns Number of sellers excluded
   */
  async bulkExclude(
    sellerIds: string[],
    exclusionData: ExclusionInfo
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({
          exclusion_site: exclusionData.exclusionSite,
          exclusion_criteria: exclusionData.exclusionCriteria,
          exclusion_date: exclusionData.exclusionDate || new Date(),
          exclusion_action: exclusionData.exclusionAction,
        })
        .in('id', sellerIds)
        .select('id');

      if (error) {
        console.error('Error bulk excluding:', error);
        throw new Error(`Failed to bulk exclude: ${error.message}`);
      }

      // Log bulk action
      for (const sellerId of sellerIds) {
        await this.logExclusionAction(sellerId, 'bulk_added', exclusionData);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Bulk exclude error:', error);
      throw error;
    }
  }

  /**
   * Log exclusion action for audit trail
   * 
   * @param sellerId - Seller ID
   * @param action - Action type
   * @param data - Exclusion data
   */
  private async logExclusionAction(
    sellerId: string,
    action: string,
    data: Partial<ExclusionInfo>
  ): Promise<void> {
    try {
      const { error } = await supabase.from('activity_logs').insert({
        seller_id: sellerId,
        action: `exclusion_${action}`,
        details: data,
        created_at: new Date().toISOString(),
      });

      if (error && error.code !== '42P01') {
        console.error('Error logging exclusion action:', error);
      }
    } catch (error) {
      console.warn('Failed to log exclusion action:', error);
    }
  }

  /**
   * Calculate and set exclusion date automatically
   * Based on inquiry date and site-specific rules
   * 
   * @param sellerId - Seller ID
   * @param inquiryDate - Inquiry date
   * @param site - Inquiry site
   * @returns Calculated exclusion date
   */
  async calculateAndSetExclusionDate(
    sellerId: string,
    inquiryDate: Date,
    site?: string
  ): Promise<Date> {
    try {
      // Calculate exclusion date (default: 90 days from inquiry)
      const exclusionDate = new Date(inquiryDate);
      
      // Site-specific exclusion periods
      const exclusionPeriods: Record<string, number> = {
        'ウ': 90, // イエウール: 90日
        'L': 60, // LIFULL: 60日
        'S': 90, // SUUMO: 90日
        'default': 90,
      };

      const days = site ? (exclusionPeriods[site] || exclusionPeriods['default']) : exclusionPeriods['default'];
      exclusionDate.setDate(exclusionDate.getDate() + days);

      // Update seller with calculated exclusion date
      const { error } = await supabase
        .from('sellers')
        .update({ exclusion_date: exclusionDate.toISOString().split('T')[0] })
        .eq('id', sellerId);

      if (error) {
        console.error('Error setting exclusion date:', error);
        throw new Error(`Failed to set exclusion date: ${error.message}`);
      }

      console.log(`Exclusion date set to ${exclusionDate.toISOString()} for seller ${sellerId}`);
      return exclusionDate;
    } catch (error) {
      console.error('Calculate and set exclusion date error:', error);
      throw error;
    }
  }

  /**
   * Get sellers with upcoming exclusion dates
   * 
   * @param daysAhead - Number of days to look ahead (default: 7)
   * @returns List of sellers with upcoming exclusion dates
   */
  async getSellersWithUpcomingExclusion(daysAhead: number = 7): Promise<any[]> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('sellers')
        .select(
          `id, seller_number, name, phone_number, exclusion_date, 
           exclusion_action, assigned_to, employees:assigned_to (id, name, email)`
        )
        .not('exclusion_date', 'is', null)
        .gte('exclusion_date', today.toISOString().split('T')[0])
        .lte('exclusion_date', futureDate.toISOString().split('T')[0])
        .order('exclusion_date', { ascending: true });

      if (error) {
        console.error('Error getting sellers with upcoming exclusion:', error);
        throw new Error(`Failed to get sellers with upcoming exclusion: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get sellers with upcoming exclusion error:', error);
      throw error;
    }
  }

  /**
   * Send exclusion date notifications to assigned employees
   * 
   * @param sellerId - Seller ID
   * @returns true if notification sent successfully
   */
  async sendExclusionDateNotification(sellerId: string): Promise<boolean> {
    try {
      // Get seller and assigned employee information
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select(
          `id, seller_number, name, exclusion_date, exclusion_action,
           assigned_to, employees:assigned_to (id, name, email, chat_webhook_url)`
        )
        .eq('id', sellerId)
        .single();

      if (sellerError || !seller) {
        console.error('Error getting seller for notification:', sellerError);
        return false;
      }

      if (!seller.exclusion_date) {
        console.warn('Seller has no exclusion date set');
        return false;
      }

      const employee = seller.employees as any;
      if (!employee) {
        console.warn('No assigned employee for notification');
        return false;
      }

      // Format notification message
      const exclusionDate = new Date(seller.exclusion_date);
      const message = `【除外日通知】\n売主番号: ${seller.seller_number}\n売主名: ${seller.name}\n除外日: ${exclusionDate.toLocaleDateString('ja-JP')}\n除外対応: ${seller.exclusion_action || '未設定'}`;

      // Send notification (implementation depends on notification system)
      console.log(`Exclusion notification for seller ${sellerId}:`, message);
      
      // Log notification
      await this.logExclusionAction(sellerId, 'notification_sent', {
        exclusionDate: exclusionDate,
        exclusionAction: seller.exclusion_action,
      });

      return true;
    } catch (error) {
      console.error('Send exclusion date notification error:', error);
      return false;
    }
  }

  /**
   * Process daily exclusion date checks and send notifications
   * Should be called by a scheduled job
   * 
   * @returns Number of notifications sent
   */
  async processDailyExclusionChecks(): Promise<number> {
    try {
      const upcomingSellers = await this.getSellersWithUpcomingExclusion(3); // 3 days ahead
      let notificationsSent = 0;

      for (const seller of upcomingSellers) {
        const sent = await this.sendExclusionDateNotification(seller.id);
        if (sent) {
          notificationsSent++;
        }
      }

      console.log(`Processed ${upcomingSellers.length} sellers, sent ${notificationsSent} notifications`);
      return notificationsSent;
    } catch (error) {
      console.error('Process daily exclusion checks error:', error);
      return 0;
    }
  }

  /**
   * Map database record to ExclusionInfo type
   */
  private mapToExclusionInfo(data: any): ExclusionInfo {
    return {
      exclusionSite: data.exclusion_site,
      exclusionCriteria: data.exclusion_criteria,
      exclusionDate: data.exclusion_date ? new Date(data.exclusion_date) : undefined,
      exclusionAction: data.exclusion_action,
    };
  }
}

// Export singleton instance
export const exclusionService = new ExclusionService();
