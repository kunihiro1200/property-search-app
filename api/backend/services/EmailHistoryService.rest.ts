/**
 * Email History Service (REST API Version)
 * Manages email sending history for tracking which properties have been emailed to buyers
 * 
 * NOTE: Uses Supabase REST API instead of direct PostgreSQL connection
 * This version works around PostgREST schema cache issues by using the REST API
 */

export interface EmailHistoryRecord {
  id?: number;
  buyer_id: string;
  property_numbers: string[];
  recipient_email: string;
  subject: string;
  body: string;
  sender_email: string;
  email_type: string;
  sent_at?: string;
  created_at?: string;
}

export interface SaveEmailHistoryParams {
  buyerId: string;
  propertyNumbers: string[];
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string; // employee email or identifier
  emailType?: string;
}

export class EmailHistoryService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }
  }

  /**
   * Save email history record for an email sent to a buyer
   * @param params - Email history parameters
   * @returns Created record ID
   */
  async saveEmailHistory(params: SaveEmailHistoryParams): Promise<number> {
    try {
      const record = {
        buyer_id: params.buyerId,
        property_numbers: params.propertyNumbers,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        body: params.body,
        sender_email: params.senderEmail,
        email_type: params.emailType || 'inquiry_response',
        sent_at: new Date().toISOString()
      };

      const response = await fetch(`${this.supabaseUrl}/rest/v1/email_history`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save email history: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result[0].id;
    } catch (error: any) {
      console.error('Error saving email history:', error);
      throw new Error(`Failed to save email history: ${error.message}`);
    }
  }

  /**
   * Get email history for a specific buyer
   * @param buyerId - The buyer ID
   * @returns Array of email history records
   */
  async getEmailHistory(buyerId: string): Promise<EmailHistoryRecord[]> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/email_history?buyer_id=eq.${buyerId}&order=sent_at.desc`,
        {
          method: 'GET',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch email history: ${response.status} ${errorText}`);
      }

      const records = await response.json();
      return records;
    } catch (error: any) {
      console.error('Error fetching email history:', error);
      throw new Error(`Failed to fetch email history: ${error.message}`);
    }
  }

  /**
   * Check if a property has been emailed to a buyer
   * @param buyerId - The buyer ID
   * @param propertyNumber - The property number
   * @returns True if email was sent, false otherwise
   */
  async hasBeenEmailed(buyerId: string, propertyNumber: string): Promise<boolean> {
    try {
      // Use PostgREST's array contains operator
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/email_history?buyer_id=eq.${buyerId}&property_numbers=cs.{${propertyNumber}}&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error('Error checking email history:', await response.text());
        return false;
      }

      const records = await response.json();
      return records.length > 0;
    } catch (error: any) {
      console.error('Error checking email history:', error);
      return false;
    }
  }

  /**
   * Get all properties that have been emailed to a buyer
   * @param buyerId - The buyer ID
   * @returns Array of property numbers
   */
  async getEmailedProperties(buyerId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/email_history?buyer_id=eq.${buyerId}&order=sent_at.desc&select=property_numbers`,
        {
          method: 'GET',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch emailed properties: ${response.status} ${errorText}`);
      }

      const records = await response.json();

      // Flatten the array of arrays and remove duplicates
      const allProperties = records.flatMap((record: any) => record.property_numbers);
      return [...new Set(allProperties)];
    } catch (error: any) {
      console.error('Error fetching emailed properties:', error);
      throw new Error(`Failed to fetch emailed properties: ${error.message}`);
    }
  }

  /**
   * Close method for compatibility (no-op for REST API)
   */
  async close(): Promise<void> {
    // No connection to close for REST API
  }
}
