import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import { BuyerColumnMapper } from './BuyerColumnMapper';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

export interface BuyerVerificationResult {
  buyerNumber: string;
  existsInDatabase: boolean;
  existsInSpreadsheet: boolean;
  dataMatches: boolean;
  mismatches: FieldMismatch[];
  lastSyncedAt: string | null;
}

export interface FieldMismatch {
  field: string;
  databaseValue: any;
  spreadsheetValue: any;
}

/**
 * Service for verifying buyer data consistency between database and spreadsheet
 */
export class BuyerVerificationService {
  private supabase: SupabaseClient;
  private columnMapper: BuyerColumnMapper;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.columnMapper = new BuyerColumnMapper();
  }

  /**
   * Verify a specific buyer by buyer number
   * @param buyerNumber The buyer number to verify
   * @returns Verification result
   */
  async verifyBuyer(buyerNumber: string): Promise<BuyerVerificationResult> {
    console.log(`Verifying buyer ${buyerNumber}...`);

    // Check database
    const { data: dbBuyer, error: dbError } = await this.supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', buyerNumber)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      throw new Error(`Database error: ${dbError.message}`);
    }

    const existsInDatabase = !!dbBuyer;

    // Check spreadsheet
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

    // Find buyer in spreadsheet
    let sheetBuyer: any = null;
    for (const row of rows) {
      const data = this.columnMapper.mapSpreadsheetToDatabase(headers, row);
      if (data.buyer_number === buyerNumber) {
        sheetBuyer = data;
        break;
      }
    }

    const existsInSpreadsheet = !!sheetBuyer;

    // Compare fields if both exist
    let mismatches: FieldMismatch[] = [];
    let dataMatches = false;

    if (existsInDatabase && existsInSpreadsheet) {
      mismatches = this.compareFields(dbBuyer, sheetBuyer);
      dataMatches = mismatches.length === 0;
    }

    return {
      buyerNumber,
      existsInDatabase,
      existsInSpreadsheet,
      dataMatches,
      mismatches,
      lastSyncedAt: dbBuyer?.last_synced_at || null,
    };
  }

  /**
   * Compare fields between database and spreadsheet buyer
   * @param dbBuyer Buyer from database
   * @param sheetBuyer Buyer from spreadsheet
   * @returns Array of field mismatches
   */
  private compareFields(dbBuyer: any, sheetBuyer: any): FieldMismatch[] {
    const mismatches: FieldMismatch[] = [];

    // Fields to compare (excluding system fields)
    const fieldsToCompare = [
      'buyer_number',
      'name',
      'name_kana',
      'email',
      'phone',
      'address',
      'inquiry_source',
      'inquiry_date',
      'property_type',
      'budget_min',
      'budget_max',
      'desired_area',
      'notes',
    ];

    for (const field of fieldsToCompare) {
      const dbValue = dbBuyer[field];
      const sheetValue = sheetBuyer[field];

      // Normalize values for comparison
      const normalizedDbValue = this.normalizeValue(dbValue);
      const normalizedSheetValue = this.normalizeValue(sheetValue);

      if (normalizedDbValue !== normalizedSheetValue) {
        mismatches.push({
          field,
          databaseValue: dbValue,
          spreadsheetValue: sheetValue,
        });
      }
    }

    return mismatches;
  }

  /**
   * Normalize value for comparison
   * @param value Value to normalize
   * @returns Normalized value
   */
  private normalizeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  /**
   * Verify all buyers
   * @returns Summary of verification results
   */
  async verifyAllBuyers(): Promise<{
    total: number;
    matched: number;
    mismatched: number;
    missingInDb: number;
    missingInSheet: number;
  }> {
    console.log('Verifying all buyers...');

    // Get all buyers from database
    const { data: dbBuyers, error: dbError } = await this.supabase
      .from('buyers')
      .select('buyer_number');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    const dbBuyerNumbers = new Set(dbBuyers?.map(b => b.buyer_number) || []);

    // Get all buyers from spreadsheet
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../../google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];

    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];

    const sheetBuyerNumbers = new Set<string>();
    for (const row of rows) {
      const data = this.columnMapper.mapSpreadsheetToDatabase(headers, row);
      if (data.buyer_number && String(data.buyer_number).trim() !== '') {
        sheetBuyerNumbers.add(data.buyer_number);
      }
    }

    // Calculate statistics
    const total = sheetBuyerNumbers.size;
    let matched = 0;
    let mismatched = 0;
    let missingInDb = 0;

    for (const buyerNumber of sheetBuyerNumbers) {
      if (dbBuyerNumbers.has(buyerNumber)) {
        matched++;
      } else {
        missingInDb++;
      }
    }

    const missingInSheet = dbBuyerNumbers.size - matched;

    return {
      total,
      matched,
      mismatched,
      missingInDb,
      missingInSheet,
    };
  }
}
