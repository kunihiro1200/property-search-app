import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleSheetsClient, SheetRow } from './GoogleSheetsClient';
import { SyncLogger } from './SyncLogger';

export interface ValidationMismatch {
  sellerNumber: string;
  sellerId: string;
  propertyId: string;
  databaseValue: string | null;
  spreadsheetValue: string | null;
  severity: 'critical' | 'warning' | 'info';
}

export interface ValidationReport {
  timestamp: Date;
  totalSellers: number;
  totalChecked: number;
  mismatchCount: number;
  mismatches: ValidationMismatch[];
  skipped: Array<{
    sellerNumber: string;
    reason: string;
  }>;
  duration: number;
}

export interface AutoFixResult {
  timestamp: Date;
  totalFixed: number;
  fixes: Array<{
    sellerNumber: string;
    propertyId: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
  errors: Array<{
    sellerNumber: string;
    error: string;
  }>;
  duration: number;
}

/**
 * Property Type Validation Service
 * 
 * Validates and auto-fixes property_type mismatches between database and spreadsheet.
 * Ensures data consistency by comparing values and providing automated correction.
 */
export class PropertyTypeValidationService {
  private supabase: SupabaseClient;
  private sheetsClient: GoogleSheetsClient;
  private syncLogger: SyncLogger;
  private propertyTypeColumn = '種別'; // Changed from '物件種別' to use existing column
  private sellerNumberColumn = '売主番号';

  constructor(
    supabase: SupabaseClient,
    sheetsClient: GoogleSheetsClient,
    syncLogger: SyncLogger
  ) {
    this.supabase = supabase;
    this.sheetsClient = sheetsClient;
    this.syncLogger = syncLogger;
  }

  /**
   * Validate all sellers for property_type mismatches
   */
  async validateAll(): Promise<ValidationReport> {
    const startTime = Date.now();
    const timestamp = new Date();
    const mismatches: ValidationMismatch[] = [];
    const skipped: Array<{ sellerNumber: string; reason: string }> = [];

    try {
      // Fetch all sellers with properties from database
      const { data: sellers, error: dbError } = await this.supabase
        .from('sellers')
        .select(`
          id,
          seller_number,
          properties (
            id,
            property_type
          )
        `)
        .not('properties', 'is', null);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      if (!sellers || sellers.length === 0) {
        return {
          timestamp,
          totalSellers: 0,
          totalChecked: 0,
          mismatchCount: 0,
          mismatches: [],
          skipped: [],
          duration: Date.now() - startTime,
        };
      }

      // Fetch all data from spreadsheet
      const sheetRows = await this.sheetsClient.readAll();
      
      // Create a map for quick lookup
      const sheetMap = new Map<string, SheetRow>();
      for (const row of sheetRows) {
        const sellerNumber = row[this.sellerNumberColumn];
        if (sellerNumber) {
          sheetMap.set(String(sellerNumber), row);
        }
      }

      // Compare each seller
      let totalChecked = 0;
      for (const seller of sellers) {
        try {
          const sellerNumber = seller.seller_number;
          
          // Check if seller has property
          if (!seller.properties || seller.properties.length === 0) {
            skipped.push({
              sellerNumber,
              reason: 'No property in database',
            });
            continue;
          }

          // Use the first property (or latest if multiple)
          const property = Array.isArray(seller.properties) 
            ? seller.properties[0] 
            : seller.properties;

          // Check if seller exists in spreadsheet
          const sheetRow = sheetMap.get(sellerNumber);
          if (!sheetRow) {
            skipped.push({
              sellerNumber,
              reason: 'Not found in spreadsheet',
            });
            continue;
          }

          // Compare property_type values
          const dbValue = property.property_type || null;
          const sheetValue = sheetRow[this.propertyTypeColumn] 
            ? String(sheetRow[this.propertyTypeColumn]) 
            : null;

          totalChecked++;

          if (dbValue !== sheetValue) {
            mismatches.push({
              sellerNumber,
              sellerId: seller.id,
              propertyId: property.id,
              databaseValue: dbValue,
              spreadsheetValue: sheetValue,
              severity: this.determineSeverity(dbValue, sheetValue),
            });
          }
        } catch (error: any) {
          skipped.push({
            sellerNumber: seller.seller_number,
            reason: `Error: ${error.message}`,
          });
        }
      }

      const duration = Date.now() - startTime;

      return {
        timestamp,
        totalSellers: sellers.length,
        totalChecked,
        mismatchCount: mismatches.length,
        mismatches,
        skipped,
        duration,
      };
    } catch (error: any) {
      await this.syncLogger.logError('validation', error.message, {
        operation: 'property_type_validation',
        stackTrace: error.stack,
      });
      throw error;
    }
  }

  /**
   * Validate specific seller for property_type mismatch
   */
  async validateSeller(sellerNumber: string): Promise<ValidationMismatch | null> {
    try {
      // Fetch seller with property from database
      const { data: seller, error: dbError } = await this.supabase
        .from('sellers')
        .select(`
          id,
          seller_number,
          properties (
            id,
            property_type
          )
        `)
        .eq('seller_number', sellerNumber)
        .single();

      if (dbError || !seller) {
        return null;
      }

      // Check if seller has property
      if (!seller.properties || seller.properties.length === 0) {
        return null;
      }

      const property = Array.isArray(seller.properties) 
        ? seller.properties[0] 
        : seller.properties;

      // Fetch from spreadsheet
      const sheetRows = await this.sheetsClient.readAll();
      const sheetRow = sheetRows.find(
        row => String(row[this.sellerNumberColumn]) === sellerNumber
      );

      if (!sheetRow) {
        return null;
      }

      // Compare values
      const dbValue = property.property_type || null;
      const sheetValue = sheetRow[this.propertyTypeColumn] 
        ? String(sheetRow[this.propertyTypeColumn]) 
        : null;

      if (dbValue !== sheetValue) {
        return {
          sellerNumber,
          sellerId: seller.id,
          propertyId: property.id,
          databaseValue: dbValue,
          spreadsheetValue: sheetValue,
          severity: this.determineSeverity(dbValue, sheetValue),
        };
      }

      return null;
    } catch (error: any) {
      await this.syncLogger.logError('validation', error.message, {
        operation: 'property_type_validation_single',
        metadata: { sellerNumber },
        stackTrace: error.stack,
      });
      throw error;
    }
  }

  /**
   * Auto-fix all mismatches by updating database to match spreadsheet
   */
  async autoFix(dryRun: boolean = false): Promise<AutoFixResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const fixes: AutoFixResult['fixes'] = [];
    const errors: AutoFixResult['errors'] = [];

    try {
      // First, validate to find all mismatches
      const report = await this.validateAll();

      if (report.mismatchCount === 0) {
        return {
          timestamp,
          totalFixed: 0,
          fixes: [],
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Fix each mismatch
      for (const mismatch of report.mismatches) {
        try {
          if (!dryRun) {
            // Update database
            const { error } = await this.supabase
              .from('properties')
              .update({ 
                property_type: mismatch.spreadsheetValue,
              })
              .eq('id', mismatch.propertyId);

            if (error) {
              throw new Error(`Database update failed: ${error.message}`);
            }
          }

          fixes.push({
            sellerNumber: mismatch.sellerNumber,
            propertyId: mismatch.propertyId,
            oldValue: mismatch.databaseValue,
            newValue: mismatch.spreadsheetValue,
          });
        } catch (error: any) {
          errors.push({
            sellerNumber: mismatch.sellerNumber,
            error: error.message,
          });

          await this.syncLogger.logError('validation', error.message, {
            operation: 'property_type_auto_fix',
            sellerId: mismatch.sellerId,
            stackTrace: error.stack,
          });
        }
      }

      const duration = Date.now() - startTime;

      return {
        timestamp,
        totalFixed: fixes.length,
        fixes,
        errors,
        duration,
      };
    } catch (error: any) {
      await this.syncLogger.logError('validation', error.message, {
        operation: 'property_type_auto_fix_batch',
        stackTrace: error.stack,
      });
      throw error;
    }
  }

  /**
   * Auto-fix specific seller by updating database to match spreadsheet
   */
  async autoFixSeller(sellerNumber: string, dryRun: boolean = false): Promise<boolean> {
    try {
      const mismatch = await this.validateSeller(sellerNumber);

      if (!mismatch) {
        return false; // No mismatch found
      }

      if (!dryRun) {
        const { error } = await this.supabase
          .from('properties')
          .update({ 
            property_type: mismatch.spreadsheetValue,
          })
          .eq('id', mismatch.propertyId);

        if (error) {
          throw new Error(`Database update failed: ${error.message}`);
        }
      }

      return true;
    } catch (error: any) {
      await this.syncLogger.logError('validation', error.message, {
        operation: 'property_type_auto_fix_single',
        metadata: { sellerNumber },
        stackTrace: error.stack,
      });
      throw error;
    }
  }

  /**
   * Determine severity of mismatch
   */
  private determineSeverity(
    dbValue: string | null, 
    sheetValue: string | null
  ): 'critical' | 'warning' | 'info' {
    // Critical: Database has value but spreadsheet doesn't (data loss risk)
    if (dbValue && !sheetValue) {
      return 'critical';
    }

    // Warning: Spreadsheet has value but database doesn't (missing data)
    if (!dbValue && sheetValue) {
      return 'warning';
    }

    // Info: Both have values but they differ
    return 'info';
  }
}
