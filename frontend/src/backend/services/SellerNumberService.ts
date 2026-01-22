import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Service for managing seller number generation and validation
 * Format: AA + 5-digit number (e.g., AA00001, AA00002, AA12345)
 */
export class SellerNumberService {
  /**
   * Generate the next seller number in sequence
   * Format: AA{5-digit number} (e.g., AA00001, AA00002, AA00003)
   * 
   * Uses database function for atomic generation to handle concurrent requests
   */
  async generateSellerNumber(): Promise<string> {
    try {
      // Call the database function to generate next number atomically
      const { data, error } = await supabase.rpc('generate_seller_number');

      if (error) {
        console.error('Error generating seller number:', error);
        throw new Error(`Failed to generate seller number: ${error.message}`);
      }

      if (!data) {
        throw new Error('No seller number returned from database');
      }

      console.log(`Generated seller number: ${data}`);
      return data as string;
    } catch (error) {
      console.error('Seller number generation error:', error);
      throw error;
    }
  }

  /**
   * Get the next seller number that would be generated
   * Does not increment the sequence
   * 
   * @returns The next seller number in format AA{5-digit number}
   */
  async getNextSellerNumber(): Promise<string> {
    try {
      const currentSequence = await this.getCurrentSequence();
      const nextNumber = currentSequence + 1;
      return this.formatSellerNumber(nextNumber);
    } catch (error) {
      console.error('Get next seller number error:', error);
      throw error;
    }
  }

  /**
   * Format a number as a seller number
   * 
   * @param num - The sequence number to format
   * @returns Formatted seller number (e.g., AA00001)
   */
  private formatSellerNumber(num: number): string {
    // Pad with zeros to 5 digits
    const paddedNumber = num.toString().padStart(5, '0');
    return `AA${paddedNumber}`;
  }

  /**
   * Get the current sequence number (for display/debugging purposes)
   * Does not increment the sequence
   */
  async getCurrentSequence(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('seller_number_sequence')
        .select('current_number')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error getting current sequence:', error);
        throw new Error(`Failed to get current sequence: ${error.message}`);
      }

      return data.current_number;
    } catch (error) {
      console.error('Get sequence error:', error);
      throw error;
    }
  }

  /**
   * Validate seller number format
   * Must be in format: AA{5-digit number} (e.g., AA00001, AA12345)
   * 
   * @param sellerNumber - The seller number to validate
   * @returns true if valid, false otherwise
   */
  validateSellerNumber(sellerNumber: string): boolean {
    if (!sellerNumber || typeof sellerNumber !== 'string') {
      return false;
    }

    // Check format: AA followed by exactly 5 digits
    const pattern = /^AA\d{5}$/;
    return pattern.test(sellerNumber);
  }

  /**
   * Check if a seller number is unique (does not exist in database)
   * 
   * @param sellerNumber - The seller number to check
   * @returns true if unique (does not exist), false if already exists
   */
  async isSellerNumberUnique(sellerNumber: string): Promise<boolean> {
    try {
      const exists = await this.sellerNumberExists(sellerNumber);
      return !exists;
    } catch (error) {
      console.error('Seller number uniqueness check error:', error);
      throw error;
    }
  }

  /**
   * Check if a seller number already exists in the database
   * 
   * @param sellerNumber - The seller number to check
   * @returns true if exists, false otherwise
   */
  async sellerNumberExists(sellerNumber: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .maybeSingle();

      if (error) {
        console.error('Error checking seller number existence:', error);
        throw new Error(`Failed to check seller number: ${error.message}`);
      }

      return data !== null;
    } catch (error) {
      console.error('Seller number existence check error:', error);
      throw error;
    }
  }

  /**
   * Generate seller number with retry logic for handling concurrent conflicts
   * 
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Generated seller number
   */
  async generateWithRetry(maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const sellerNumber = await this.generateSellerNumber();
        
        // Validate the generated number
        if (!this.validateSellerNumber(sellerNumber)) {
          throw new Error(`Invalid seller number format generated: ${sellerNumber}`);
        }

        return sellerNumber;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Seller number generation attempt ${attempt} failed:`, error);

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to generate seller number after ${maxRetries} attempts: ${lastError?.message}`
    );
  }
}

// Export singleton instance
export const sellerNumberService = new SellerNumberService();
