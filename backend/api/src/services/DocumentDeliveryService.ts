import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Service for managing document delivery (査定書送付管理)
 * Handles email and mail delivery tracking
 */
export class DocumentDeliveryService {
  /**
   * Record email sent date (E/日付)
   * 
   * @param sellerId - Seller ID
   * @param sentDate - Email sent date
   */
  async recordEmailSentDate(sellerId: string, sentDate: Date): Promise<void> {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ email_sent_date: sentDate.toISOString().split('T')[0] })
        .eq('id', sellerId);

      if (error) {
        console.error('Error recording email sent date:', error);
        throw new Error(`Failed to record email sent date: ${error.message}`);
      }

      console.log(`Email sent date recorded for seller ${sellerId}`);
    } catch (error) {
      console.error('Record email sent date error:', error);
      throw error;
    }
  }

  /**
   * Record mail sent date (郵/日付)
   * 
   * @param sellerId - Seller ID
   * @param sentDate - Mail sent date
   */
  async recordMailSentDate(sellerId: string, sentDate: Date): Promise<void> {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ mail_sent_date: sentDate.toISOString().split('T')[0] })
        .eq('id', sellerId);

      if (error) {
        console.error('Error recording mail sent date:', error);
        throw new Error(`Failed to record mail sent date: ${error.message}`);
      }

      console.log(`Mail sent date recorded for seller ${sellerId}`);
    } catch (error) {
      console.error('Record mail sent date error:', error);
      throw error;
    }
  }

  /**
   * Set mailing status (郵送状況: 未、済)
   * 
   * @param sellerId - Seller ID
   * @param status - Mailing status ('未' or '済')
   */
  async setMailingStatus(sellerId: string, status: '未' | '済'): Promise<void> {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ mailing_status: status })
        .eq('id', sellerId);

      if (error) {
        console.error('Error setting mailing status:', error);
        throw new Error(`Failed to set mailing status: ${error.message}`);
      }

      console.log(`Mailing status set to ${status} for seller ${sellerId}`);
    } catch (error) {
      console.error('Set mailing status error:', error);
      throw error;
    }
  }

  /**
   * Set valuation method (査定方法)
   * 
   * @param sellerId - Seller ID
   * @param method - Valuation method
   */
  async setValuationMethod(
    sellerId: string,
    method: '机上査定（メール）' | '机上査定（郵送）' | '机上査定（不通）'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ valuation_method: method })
        .eq('id', sellerId);

      if (error) {
        console.error('Error setting valuation method:', error);
        throw new Error(`Failed to set valuation method: ${error.message}`);
      }

      console.log(`Valuation method set to ${method} for seller ${sellerId}`);
    } catch (error) {
      console.error('Set valuation method error:', error);
      throw error;
    }
  }

  /**
   * Set alternative mailing address (上記以外の郵送先住所)
   * 
   * @param sellerId - Seller ID
   * @param address - Alternative mailing address
   */
  async setAlternativeMailingAddress(sellerId: string, address: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ alternative_mailing_address: address })
        .eq('id', sellerId);

      if (error) {
        console.error('Error setting alternative mailing address:', error);
        throw new Error(`Failed to set alternative mailing address: ${error.message}`);
      }

      console.log(`Alternative mailing address set for seller ${sellerId}`);
    } catch (error) {
      console.error('Set alternative mailing address error:', error);
      throw error;
    }
  }

  /**
   * Update document delivery information in bulk
   * 
   * @param sellerId - Seller ID
   * @param updates - Document delivery updates
   */
  async updateDocumentDelivery(
    sellerId: string,
    updates: {
      emailSentDate?: Date;
      mailSentDate?: Date;
      mailingStatus?: '未' | '済';
      valuationMethod?: '机上査定（メール）' | '机上査定（郵送）' | '机上査定（不通）';
      alternativeMailingAddress?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (updates.emailSentDate !== undefined) {
        updateData.email_sent_date = updates.emailSentDate.toISOString().split('T')[0];
      }

      if (updates.mailSentDate !== undefined) {
        updateData.mail_sent_date = updates.mailSentDate.toISOString().split('T')[0];
      }

      if (updates.mailingStatus !== undefined) {
        updateData.mailing_status = updates.mailingStatus;
      }

      if (updates.valuationMethod !== undefined) {
        updateData.valuation_method = updates.valuationMethod;
      }

      if (updates.alternativeMailingAddress !== undefined) {
        updateData.alternative_mailing_address = updates.alternativeMailingAddress;
      }

      if (Object.keys(updateData).length === 0) {
        return;
      }

      const { error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId);

      if (error) {
        console.error('Error updating document delivery:', error);
        throw new Error(`Failed to update document delivery: ${error.message}`);
      }

      console.log(`Document delivery updated for seller ${sellerId}`);
    } catch (error) {
      console.error('Update document delivery error:', error);
      throw error;
    }
  }

  /**
   * Get document delivery information
   * 
   * @param sellerId - Seller ID
   * @returns Document delivery information
   */
  async getDocumentDelivery(sellerId: string): Promise<{
    emailSentDate?: Date;
    mailSentDate?: Date;
    mailingStatus?: string;
    valuationMethod?: string;
    alternativeMailingAddress?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('email_sent_date, mail_sent_date, mailing_status, valuation_method, alternative_mailing_address')
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting document delivery:', error);
        throw new Error(`Failed to get document delivery: ${error.message}`);
      }

      return {
        emailSentDate: data.email_sent_date ? new Date(data.email_sent_date) : undefined,
        mailSentDate: data.mail_sent_date ? new Date(data.mail_sent_date) : undefined,
        mailingStatus: data.mailing_status,
        valuationMethod: data.valuation_method,
        alternativeMailingAddress: data.alternative_mailing_address,
      };
    } catch (error) {
      console.error('Get document delivery error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const documentDeliveryService = new DocumentDeliveryService();
