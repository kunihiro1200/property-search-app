import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DuplicateMatch {
  sellerId: string;
  matchType: 'phone' | 'email' | 'both';
  sellerInfo: {
    name: string;
    phoneNumber: string;
    email?: string;
    inquiryDate?: Date;
    sellerNumber?: string;
  };
  propertyInfo?: {
    address: string;
    propertyType: string;
  };
}

/**
 * Service for detecting duplicate sellers based on phone number and email
 */
export class DuplicateDetectionService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }
  /**
   * Check for duplicate sellers by phone number
   * 
   * @param phoneNumber - Encrypted phone number to check
   * @param excludeId - Optional seller ID to exclude from results (for updates)
   * @returns Array of matching sellers
   */
  async checkDuplicateByPhone(
    phoneNumber: string,
    excludeId?: string
  ): Promise<DuplicateMatch[]> {
    try {
      let query = this.supabase
        .from('sellers')
        .select(`
          id,
          name,
          phone_number,
          email,
          inquiry_date,
          seller_number,
          properties (
            property_address,
            property_type
          )
        `)
        .eq('phone_number', phoneNumber);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking duplicate by phone:', error);
        throw new Error(`Failed to check duplicate by phone: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((seller: any) => ({
        sellerId: seller.id,
        matchType: 'phone' as const,
        sellerInfo: {
          name: seller.name,
          phoneNumber: seller.phone_number,
          email: seller.email,
          inquiryDate: seller.inquiry_date ? new Date(seller.inquiry_date) : undefined,
          sellerNumber: seller.seller_number,
        },
        propertyInfo: seller.properties?.[0]
          ? {
              address: seller.properties[0].property_address || seller.properties[0].address,
              propertyType: seller.properties[0].property_type,
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Check duplicate by phone error:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate sellers by email address
   * 
   * @param email - Encrypted email to check
   * @param excludeId - Optional seller ID to exclude from results (for updates)
   * @returns Array of matching sellers
   */
  async checkDuplicateByEmail(
    email: string,
    excludeId?: string
  ): Promise<DuplicateMatch[]> {
    try {
      if (!email) {
        return [];
      }

      let query = this.supabase
        .from('sellers')
        .select(`
          id,
          name,
          phone_number,
          email,
          inquiry_date,
          seller_number,
          properties (
            property_address,
            property_type
          )
        `)
        .eq('email', email);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking duplicate by email:', error);
        throw new Error(`Failed to check duplicate by email: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((seller: any) => ({
        sellerId: seller.id,
        matchType: 'email' as const,
        sellerInfo: {
          name: seller.name,
          phoneNumber: seller.phone_number,
          email: seller.email,
          inquiryDate: seller.inquiry_date ? new Date(seller.inquiry_date) : undefined,
          sellerNumber: seller.seller_number,
        },
        propertyInfo: seller.properties?.[0]
          ? {
              address: seller.properties[0].property_address || seller.properties[0].address,
              propertyType: seller.properties[0].property_type,
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Check duplicate by email error:', error);
      throw error;
    }
  }

  /**
   * Check for duplicates by both phone and email
   * Combines results and marks matches found by both
   * 
   * @param phoneNumber - Encrypted phone number to check
   * @param email - Optional encrypted email to check
   * @param excludeId - Optional seller ID to exclude from results
   * @returns Array of matching sellers with combined match types
   */
  async checkDuplicates(
    phoneNumber: string,
    email?: string,
    excludeId?: string
  ): Promise<DuplicateMatch[]> {
    try {
      const [phoneMatches, emailMatches] = await Promise.all([
        this.checkDuplicateByPhone(phoneNumber, excludeId),
        email ? this.checkDuplicateByEmail(email, excludeId) : Promise.resolve([]),
      ]);

      // Combine matches and identify those found by both
      const matchMap = new Map<string, DuplicateMatch>();

      // Add phone matches
      phoneMatches.forEach((match) => {
        matchMap.set(match.sellerId, match);
      });

      // Add or update email matches
      emailMatches.forEach((match) => {
        const existing = matchMap.get(match.sellerId);
        if (existing) {
          // Found by both phone and email
          existing.matchType = 'both';
        } else {
          matchMap.set(match.sellerId, match);
        }
      });

      return Array.from(matchMap.values());
    } catch (error) {
      console.error('Check duplicates error:', error);
      throw error;
    }
  }

  /**
   * Record duplicate relationship in history table
   * 
   * @param currentSellerId - ID of the newly created seller
   * @param pastSellerId - ID of the previously existing seller
   * @param matchType - How the duplicate was detected ('phone', 'email', or 'both')
   */
  async recordDuplicateHistory(
    currentSellerId: string,
    pastSellerId: string,
    matchType: 'phone' | 'email' | 'both'
  ): Promise<void> {
    try {
      // Get past seller information
      const { data: pastSeller, error: sellerError } = await this.supabase
        .from('sellers')
        .select(`
          name,
          phone_number,
          email,
          inquiry_date,
          properties (
            address,
            property_type
          )
        `)
        .eq('id', pastSellerId)
        .single();

      if (sellerError) {
        console.error('Error fetching past seller:', sellerError);
        throw new Error(`Failed to fetch past seller: ${sellerError.message}`);
      }

      // Insert history record
      const { error: insertError } = await this.supabase
        .from('seller_history')
        .insert({
          current_seller_id: currentSellerId,
          past_seller_id: pastSellerId,
          match_type: matchType,
          past_owner_name: pastSeller.name,
          past_owner_phone: pastSeller.phone_number,
          past_owner_email: pastSeller.email,
          past_property_address: pastSeller.properties?.[0]?.property_address || pastSeller.properties?.[0]?.address,
          past_property_type: pastSeller.properties?.[0]?.property_type,
          past_inquiry_date: pastSeller.inquiry_date,
        });

      if (insertError) {
        console.error('Error recording duplicate history:', insertError);
        throw new Error(`Failed to record duplicate history: ${insertError.message}`);
      }

      console.log(`Recorded duplicate history: ${currentSellerId} -> ${pastSellerId} (${matchType})`);
    } catch (error) {
      console.error('Record duplicate history error:', error);
      throw error;
    }
  }

  /**
   * Get duplicate history for a seller
   * Returns all past sellers that were identified as duplicates
   * 
   * @param sellerId - ID of the seller to get history for
   * @returns Array of duplicate matches from history
   */
  async getDuplicateHistory(sellerId: string): Promise<DuplicateMatch[]> {
    try {
      const { data, error } = await this.supabase
        .from('seller_history')
        .select('*')
        .eq('current_seller_id', sellerId);

      if (error) {
        console.error('Error getting duplicate history:', error);
        throw new Error(`Failed to get duplicate history: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((history: any) => ({
        sellerId: history.past_seller_id,
        matchType: history.match_type as 'phone' | 'email' | 'both',
        sellerInfo: {
          name: history.past_owner_name,
          phoneNumber: history.past_owner_phone,
          email: history.past_owner_email,
          inquiryDate: history.past_inquiry_date ? new Date(history.past_inquiry_date) : undefined,
        },
        propertyInfo: history.past_property_address
          ? {
              address: history.past_property_address,
              propertyType: history.past_property_type,
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Get duplicate history error:', error);
      throw error;
    }
  }

  /**
   * Copy seller information by seller number
   * Returns the main fields from an existing seller for copying to a new record
   * 
   * @param sellerNumber - Seller number to copy from (e.g., AA00001)
   * @returns Partial seller data for copying
   */
  async copySeller(sellerNumber: string): Promise<Partial<any>> {
    try {
      const { data, error } = await this.supabase
        .from('sellers')
        .select(`
          name,
          phone_number,
          email,
          address,
          requestor_address,
          inquiry_site,
          inquiry_year,
          inquiry_date,
          inquiry_detailed_datetime,
          inquiry_reason,
          site_url,
          number_of_companies,
          preferred_contact_time,
          properties (
            address,
            prefecture,
            city,
            property_type,
            land_area,
            building_area,
            land_area_verified,
            building_area_verified,
            build_year,
            structure,
            floor_plan,
            floors,
            rooms,
            seller_situation,
            parking,
            additional_info
          )
        `)
        .eq('seller_number', sellerNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Seller number ${sellerNumber} not found`);
        }
        console.error('Error copying seller:', error);
        throw new Error(`Failed to copy seller: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Seller number ${sellerNumber} not found`);
      }

      // Return the main fields for copying
      return {
        name: data.name,
        phoneNumber: data.phone_number,
        email: data.email,
        address: data.address,
        requestorAddress: data.requestor_address,
        inquirySite: data.inquiry_site,
        inquiryYear: data.inquiry_year,
        inquiryDate: data.inquiry_date,
        inquiryDetailedDateTime: data.inquiry_detailed_datetime,
        inquiryReason: data.inquiry_reason,
        siteUrl: data.site_url,
        numberOfCompanies: data.number_of_companies,
        preferredContactTime: data.preferred_contact_time,
        property: data.properties?.[0] || null,
        pastOwnerInfo: `Copied from seller ${sellerNumber}`,
      };
    } catch (error) {
      console.error('Copy seller error:', error);
      throw error;
    }
  }

  /**
   * Copy buyer information by buyer number
   * Note: This assumes a buyers table exists with similar structure
   * Returns the main fields from an existing buyer for copying to a new seller record
   * 
   * @param buyerNumber - Buyer number to copy from
   * @returns Partial seller data for copying
   */
  async copyBuyer(buyerNumber: string): Promise<Partial<any>> {
    try {
      // Check if buyers table exists and has data
      const { data, error } = await this.supabase
        .from('buyers')
        .select(`
          name,
          phone_number,
          email,
          address
        `)
        .eq('buyer_number', buyerNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Buyer number ${buyerNumber} not found`);
        }
        // If buyers table doesn't exist, return empty object
        if (error.code === '42P01') {
          console.warn('Buyers table does not exist yet');
          throw new Error('Buyers table not implemented yet');
        }
        console.error('Error copying buyer:', error);
        throw new Error(`Failed to copy buyer: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Buyer number ${buyerNumber} not found`);
      }

      // Return the main fields for copying
      return {
        name: data.name,
        phoneNumber: data.phone_number,
        email: data.email,
        address: data.address,
        purchaseInfo: `Copied from buyer ${buyerNumber}`,
      };
    } catch (error) {
      console.error('Copy buyer error:', error);
      throw error;
    }
  }

  /**
   * Get past owner and property information for display when duplicate is detected
   * 
   * @param phoneNumber - Phone number to search for
   * @param email - Optional email to search for
   * @returns Formatted string with past owner and property information
   */
  async getPastOwnerAndPropertyInfo(
    phoneNumber: string,
    email?: string
  ): Promise<{ pastOwnerInfo?: string; pastPropertyInfo?: string }> {
    try {
      const matches = await this.checkDuplicates(phoneNumber, email);

      if (matches.length === 0) {
        return {};
      }

      // Format past owner information
      const pastOwnerInfo = matches
        .map((match) => {
          const parts = [
            `売主番号: ${match.sellerInfo.sellerNumber || 'N/A'}`,
            `名前: ${match.sellerInfo.name}`,
            `電話: ${match.sellerInfo.phoneNumber}`,
          ];
          if (match.sellerInfo.email) {
            parts.push(`メール: ${match.sellerInfo.email}`);
          }
          if (match.sellerInfo.inquiryDate) {
            parts.push(`反響日: ${match.sellerInfo.inquiryDate.toLocaleDateString('ja-JP')}`);
          }
          return parts.join(', ');
        })
        .join('\n');

      // Format past property information
      const pastPropertyInfo = matches
        .filter((match) => match.propertyInfo)
        .map((match) => {
          return `${match.propertyInfo!.address} (${match.propertyInfo!.propertyType})`;
        })
        .join('\n');

      return {
        pastOwnerInfo: pastOwnerInfo || undefined,
        pastPropertyInfo: pastPropertyInfo || undefined,
      };
    } catch (error) {
      console.error('Get past owner and property info error:', error);
      throw error;
    }
  }
}

// Export singleton instance with lazy initialization
let _instance: DuplicateDetectionService | null = null;

export const duplicateDetectionService = {
  get instance(): DuplicateDetectionService {
    if (!_instance) {
      _instance = new DuplicateDetectionService();
    }
    return _instance;
  }
};
