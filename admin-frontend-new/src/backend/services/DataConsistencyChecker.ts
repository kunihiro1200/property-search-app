import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import { BuyerColumnMapper } from './BuyerColumnMapper';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

export interface FieldInconsistency {
  fieldName: string;
  spreadsheetValue: string | null;
  databaseValue: string | null;
}

export interface BuyerInconsistency {
  buyerNumber: string;
  inconsistencies: FieldInconsistency[];
}

export interface ConsistencyReport {
  totalBuyers: number;
  inconsistentBuyers: number;
  consistentBuyers: number;
  inconsistencies: BuyerInconsistency[];
  checkedAt: Date;
}

export class DataConsistencyChecker {
  private columnMapper: BuyerColumnMapper;
  private supabase: SupabaseClient;

  constructor() {
    this.columnMapper = new BuyerColumnMapper();
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Find all buyers with data inconsistencies
   */
  async findInconsistencies(
    fieldNames?: string[]
  ): Promise<BuyerInconsistency[]> {
    try {
      console.log('Starting consistency check...');

      // Get spreadsheet data
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, '../../google-service-account.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Get headers
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!1:1`,
      });
      const headers = headerResponse.data.values?.[0] || [];

      // Get all data
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A2:GZ`,
      });
      const rows = dataResponse.data.values || [];

      console.log(`Checking ${rows.length} buyers...`);

      const inconsistencies: BuyerInconsistency[] = [];
      const buyerNumberIndex = headers.indexOf('買主番号');

      for (const row of rows) {
        const buyerNumber = row[buyerNumberIndex];
        if (!buyerNumber) continue;

        const buyerInconsistency = await this.verifyBuyer(
          String(buyerNumber),
          headers,
          row,
          fieldNames
        );

        if (buyerInconsistency && buyerInconsistency.inconsistencies.length > 0) {
          inconsistencies.push(buyerInconsistency);
        }
      }

      console.log(`Found ${inconsistencies.length} buyers with inconsistencies`);
      return inconsistencies;
    } catch (err) {
      console.error('Error finding inconsistencies:', err);
      throw err;
    }
  }

  /**
   * Verify a specific buyer's data consistency
   */
  async verifyBuyer(
    buyerNumber: string,
    headers?: string[],
    row?: any[],
    fieldNames?: string[]
  ): Promise<BuyerInconsistency | null> {
    try {
      // Get database data
      const { data: dbBuyer, error } = await this.supabase
        .from('buyers')
        .select('*')
        .eq('buyer_number', buyerNumber)
        .single();

      if (error || !dbBuyer) {
        console.warn(`Buyer ${buyerNumber} not found in database`);
        return null;
      }

      // Get spreadsheet data if not provided
      let spreadsheetData: any = {};
      if (!headers || !row) {
        const auth = new google.auth.GoogleAuth({
          keyFile: path.join(__dirname, '../../google-service-account.json'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Get headers
        const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!1:1`,
        });
        headers = headerResponse.data.values?.[0] || [];

        // Find buyer row
        const dataResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A2:GZ`,
        });
        const rows = dataResponse.data.values || [];
        const buyerNumberIndex = headers.indexOf('買主番号');
        row = rows.find(r => String(r[buyerNumberIndex]) === buyerNumber);

        if (!row) {
          console.warn(`Buyer ${buyerNumber} not found in spreadsheet`);
          return null;
        }
      }

      spreadsheetData = this.columnMapper.mapSpreadsheetToDatabase(headers, row);

      // Compare fields
      const fieldsToCheck = fieldNames || this.columnMapper.getMappedFields();
      const inconsistencies: FieldInconsistency[] = [];

      for (const fieldName of fieldsToCheck) {
        const spreadsheetValue = this.normalizeValue(spreadsheetData[fieldName]);
        const databaseValue = this.normalizeValue(dbBuyer[fieldName]);

        if (spreadsheetValue !== databaseValue) {
          inconsistencies.push({
            fieldName,
            spreadsheetValue,
            databaseValue
          });
        }
      }

      if (inconsistencies.length === 0) {
        return null;
      }

      return {
        buyerNumber,
        inconsistencies
      };
    } catch (err) {
      console.error(`Error verifying buyer ${buyerNumber}:`, err);
      return null;
    }
  }

  /**
   * Generate a comprehensive consistency report
   */
  async generateReport(fieldNames?: string[]): Promise<ConsistencyReport> {
    const startTime = Date.now();
    console.log('Generating consistency report...');

    const inconsistencies = await this.findInconsistencies(fieldNames);

    // Get total buyer count
    const { count } = await this.supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    const totalBuyers = count || 0;
    const inconsistentBuyers = inconsistencies.length;
    const consistentBuyers = totalBuyers - inconsistentBuyers;

    const report: ConsistencyReport = {
      totalBuyers,
      inconsistentBuyers,
      consistentBuyers,
      inconsistencies,
      checkedAt: new Date()
    };

    const duration = Date.now() - startTime;
    console.log(`Report generated in ${duration}ms`);
    console.log(`Total: ${totalBuyers}, Consistent: ${consistentBuyers}, Inconsistent: ${inconsistentBuyers}`);

    return report;
  }

  /**
   * Normalize value for comparison
   */
  private normalizeValue(value: any): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Convert to string and trim
    let normalized = String(value).trim();

    // Normalize dates
    if (normalized.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Extract just the date part
      normalized = normalized.substring(0, 10);
    }

    return normalized;
  }

  /**
   * Get inconsistencies for specific fields
   */
  async getFieldInconsistencies(
    fieldName: string
  ): Promise<BuyerInconsistency[]> {
    return this.findInconsistencies([fieldName]);
  }

  /**
   * Check if a specific buyer has inconsistencies
   */
  async hasBuyerInconsistencies(
    buyerNumber: string,
    fieldNames?: string[]
  ): Promise<boolean> {
    const result = await this.verifyBuyer(buyerNumber, undefined, undefined, fieldNames);
    return result !== null && result.inconsistencies.length > 0;
  }
}
