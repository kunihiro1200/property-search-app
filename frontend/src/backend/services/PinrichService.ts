import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface PinrichInfo {
  pinrichStatus?: string;
  numberOfCompanies?: number;
}

/**
 * Service for managing Pinrich distribution (Pinrich配信管理)
 * Handles Pinrich status and company count tracking
 */
export class PinrichService {
  /**
   * Update Pinrich status
   * 
   * @param sellerId - Seller ID
   * @param status - Pinrich status (配信中, クローズ)
   * @returns Updated Pinrich information
   */
  async updatePinrichStatus(
    sellerId: string,
    status: string
  ): Promise<PinrichInfo> {
    try {
      // Validate Pinrich status
      if (!this.validatePinrichStatus(status)) {
        throw new Error(`Invalid Pinrich status: ${status}`);
      }

      const { data, error } = await supabase
        .from('sellers')
        .update({ pinrich_status: status })
        .eq('id', sellerId)
        .select('pinrich_status, number_of_companies')
        .single();

      if (error) {
        console.error('Error updating Pinrich status:', error);
        throw new Error(`Failed to update Pinrich status: ${error.message}`);
      }

      // Log status change
      await this.logPinrichStatusChange(sellerId, status);

      return this.mapToPinrichInfo(data);
    } catch (error) {
      console.error('Update Pinrich status error:', error);
      throw error;
    }
  }

  /**
   * Update number of companies (送信社数)
   * 
   * @param sellerId - Seller ID
   * @param count - Number of companies
   * @returns Updated Pinrich information
   */
  async updateNumberOfCompanies(
    sellerId: string,
    count: number
  ): Promise<PinrichInfo> {
    try {
      if (count < 0) {
        throw new Error('Number of companies must be non-negative');
      }

      const { data, error } = await supabase
        .from('sellers')
        .update({ number_of_companies: count })
        .eq('id', sellerId)
        .select('pinrich_status, number_of_companies')
        .single();

      if (error) {
        console.error('Error updating number of companies:', error);
        throw new Error(`Failed to update number of companies: ${error.message}`);
      }

      return this.mapToPinrichInfo(data);
    } catch (error) {
      console.error('Update number of companies error:', error);
      throw error;
    }
  }

  /**
   * Get Pinrich information for a seller
   * 
   * @param sellerId - Seller ID
   * @returns Pinrich information or null if not found
   */
  async getPinrichInfo(sellerId: string): Promise<PinrichInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('pinrich_status, number_of_companies')
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting Pinrich info:', error);
        throw new Error(`Failed to get Pinrich info: ${error.message}`);
      }

      return this.mapToPinrichInfo(data);
    } catch (error) {
      console.error('Get Pinrich info error:', error);
      throw error;
    }
  }

  /**
   * Get sellers by Pinrich status
   * 
   * @param status - Pinrich status to filter by
   * @returns List of sellers with specified Pinrich status
   */
  async getSellersByPinrichStatus(status: string): Promise<any[]> {
    try {
      // Validate Pinrich status
      if (!this.validatePinrichStatus(status)) {
        throw new Error(`Invalid Pinrich status: ${status}`);
      }

      const { data, error } = await supabase
        .from('sellers')
        .select(
          `id, seller_number, name, phone_number, pinrich_status, 
           number_of_companies, inquiry_site, inquiry_date`
        )
        .eq('pinrich_status', status)
        .order('inquiry_date', { ascending: false });

      if (error) {
        console.error('Error getting sellers by Pinrich status:', error);
        throw new Error(`Failed to get sellers by Pinrich status: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get sellers by Pinrich status error:', error);
      throw error;
    }
  }

  /**
   * Get Pinrich statistics
   * 
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @returns Pinrich statistics
   */
  async getPinrichStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalDistributing: number;
    totalClosed: number;
    averageCompanies: number;
    byStatus: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('sellers')
        .select('pinrich_status, number_of_companies')
        .not('pinrich_status', 'is', null);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get Pinrich statistics: ${error.message}`);
      }

      const stats = {
        totalDistributing: 0,
        totalClosed: 0,
        averageCompanies: 0,
        byStatus: {} as Record<string, number>,
      };

      let totalCompanies = 0;
      let companiesCount = 0;

      data?.forEach((seller) => {
        const status = seller.pinrich_status;
        if (status) {
          stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

          if (status === '配信中') {
            stats.totalDistributing++;
          } else if (status === 'クローズ') {
            stats.totalClosed++;
          }
        }

        if (seller.number_of_companies) {
          totalCompanies += seller.number_of_companies;
          companiesCount++;
        }
      });

      stats.averageCompanies =
        companiesCount > 0 ? Math.round(totalCompanies / companiesCount) : 0;

      return stats;
    } catch (error) {
      console.error('Get Pinrich statistics error:', error);
      throw error;
    }
  }

  /**
   * Close Pinrich distribution
   * 
   * @param sellerId - Seller ID
   * @param reason - Optional reason for closing
   * @returns Updated Pinrich information
   */
  async closePinrichDistribution(
    sellerId: string,
    reason?: string
  ): Promise<PinrichInfo> {
    try {
      const updateData: any = {
        pinrich_status: 'クローズ',
      };

      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select('pinrich_status, number_of_companies')
        .single();

      if (error) {
        console.error('Error closing Pinrich distribution:', error);
        throw new Error(`Failed to close Pinrich distribution: ${error.message}`);
      }

      // Log status change
      await this.logPinrichStatusChange(sellerId, 'クローズ', reason);

      return this.mapToPinrichInfo(data);
    } catch (error) {
      console.error('Close Pinrich distribution error:', error);
      throw error;
    }
  }

  /**
   * Start Pinrich distribution
   * 
   * @param sellerId - Seller ID
   * @param numberOfCompanies - Number of companies to distribute to
   * @returns Updated Pinrich information
   */
  async startPinrichDistribution(
    sellerId: string,
    numberOfCompanies?: number
  ): Promise<PinrichInfo> {
    try {
      const updateData: any = {
        pinrich_status: '配信中',
      };

      if (numberOfCompanies !== undefined) {
        updateData.number_of_companies = numberOfCompanies;
      }

      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select('pinrich_status, number_of_companies')
        .single();

      if (error) {
        console.error('Error starting Pinrich distribution:', error);
        throw new Error(`Failed to start Pinrich distribution: ${error.message}`);
      }

      // Log status change
      await this.logPinrichStatusChange(sellerId, '配信中');

      return this.mapToPinrichInfo(data);
    } catch (error) {
      console.error('Start Pinrich distribution error:', error);
      throw error;
    }
  }

  /**
   * Validate Pinrich status
   * 
   * @param status - Pinrich status to validate
   * @returns true if valid
   */
  validatePinrichStatus(status: string): boolean {
    const validStatuses = ['配信中', 'クローズ'];
    return validStatuses.includes(status);
  }

  /**
   * Log Pinrich status change for audit trail
   * 
   * @param sellerId - Seller ID
   * @param status - New status
   * @param reason - Optional reason
   */
  private async logPinrichStatusChange(
    sellerId: string,
    status: string,
    reason?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from('activity_logs').insert({
        seller_id: sellerId,
        action: 'pinrich_status_change',
        details: {
          new_status: status,
          reason: reason,
        },
        created_at: new Date().toISOString(),
      });

      if (error && error.code !== '42P01') {
        console.error('Error logging Pinrich status change:', error);
      }
    } catch (error) {
      console.warn('Failed to log Pinrich status change:', error);
    }
  }

  /**
   * Map database record to PinrichInfo type
   */
  private mapToPinrichInfo(data: any): PinrichInfo {
    return {
      pinrichStatus: data.pinrich_status,
      numberOfCompanies: data.number_of_companies,
    };
  }
}

// Export singleton instance
export const pinrichService = new PinrichService();
