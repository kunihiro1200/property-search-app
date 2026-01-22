import { Pool } from 'pg';

/**
 * Email History Service
 * Manages email sending history for tracking which properties have been emailed to buyers
 * 
 * NOTE: Uses direct PostgreSQL connection to bypass PostgREST cache issues
 */

export interface EmailHistoryRecord {
  id?: number;
  buyerId: string;
  propertyNumbers: string[];
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  emailType: string;
  templateId?: string;
  templateName?: string;
  sentAt?: Date;
  createdAt?: Date;
}

export interface SaveEmailHistoryParams {
  buyerId: string;
  propertyNumbers: string[];
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string; // employee email or identifier
  emailType?: string;
  templateId?: string;
  templateName?: string;
}

export class EmailHistoryService {
  private pool: Pool;

  constructor() {
    // Use direct PostgreSQL connection to bypass PostgREST cache issues
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Save email history record for an email sent to a buyer
   * @param params - Email history parameters
   * @returns Created record ID
   */
  async saveEmailHistory(params: SaveEmailHistoryParams): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO email_history (
          buyer_id, 
          property_numbers, 
          recipient_email, 
          subject, 
          body, 
          sender_email, 
          email_type, 
          template_id,
          template_name,
          sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `;

      const values = [
        params.buyerId,
        params.propertyNumbers,
        params.recipientEmail,
        params.subject,
        params.body,
        params.senderEmail,
        params.emailType || 'inquiry_response',
        params.templateId || null,
        params.templateName || null
      ];

      const result = await client.query(query, values);
      return result.rows[0].id;
    } catch (error: any) {
      console.error('Error saving email history:', error);
      throw new Error(`Failed to save email history: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get email history for a specific buyer
   * @param buyerId - The buyer ID
   * @returns Array of email history records
   */
  async getEmailHistory(buyerId: string): Promise<EmailHistoryRecord[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM email_history
        WHERE buyer_id = $1
        ORDER BY sent_at DESC
      `;

      const result = await client.query(query, [buyerId]);

      return result.rows.map(record => ({
        id: record.id,
        buyerId: record.buyer_id,
        propertyNumbers: record.property_numbers,
        recipientEmail: record.recipient_email,
        subject: record.subject,
        body: record.body,
        senderEmail: record.sender_email,
        emailType: record.email_type,
        templateId: record.template_id,
        templateName: record.template_name,
        sentAt: new Date(record.sent_at),
        createdAt: new Date(record.created_at),
      }));
    } catch (error: any) {
      console.error('Error fetching email history:', error);
      throw new Error(`Failed to fetch email history: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Check if a property has been emailed to a buyer
   * @param buyerId - The buyer ID
   * @param propertyNumber - The property number
   * @returns True if email was sent, false otherwise
   */
  async hasBeenEmailed(buyerId: string, propertyNumber: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id FROM email_history
        WHERE buyer_id = $1 
        AND $2 = ANY(property_numbers)
        LIMIT 1
      `;

      const result = await client.query(query, [buyerId, propertyNumber]);
      return result.rows.length > 0;
    } catch (error: any) {
      console.error('Error checking email history:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get all properties that have been emailed to a buyer
   * @param buyerId - The buyer ID
   * @returns Array of property numbers
   */
  async getEmailedProperties(buyerId: string): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT property_numbers FROM email_history
        WHERE buyer_id = $1
        ORDER BY sent_at DESC
      `;

      const result = await client.query(query, [buyerId]);

      // Flatten the array of arrays and remove duplicates
      const allProperties = result.rows.flatMap(record => record.property_numbers);
      return [...new Set(allProperties)];
    } catch (error: any) {
      console.error('Error fetching emailed properties:', error);
      throw new Error(`Failed to fetch emailed properties: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   * Call this when shutting down the service
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

