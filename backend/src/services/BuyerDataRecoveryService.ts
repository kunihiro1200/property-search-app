import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import { BuyerColumnMapper } from './BuyerColumnMapper';
import { DataConsistencyChecker, BuyerInconsistency } from './DataConsistencyChecker';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

export interface RecoveryResult {
  backupId: string;
  successCount: number;
  failureCount: number;
  recoveredBuyers: string[];
  failedBuyers: { buyerNumber: string; error: string }[];
  executedAt: Date;
}

export interface BackupData {
  backupId: string;
  buyerNumber: string;
  fieldName: string;
  oldValue: string | null;
  backedUpAt: Date;
}

export class BuyerDataRecoveryService {
  private supabase: SupabaseClient;
  private columnMapper: BuyerColumnMapper;
  private consistencyChecker: DataConsistencyChecker;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.columnMapper = new BuyerColumnMapper();
    this.consistencyChecker = new DataConsistencyChecker();
  }

  /**
   * Recover data for specific buyers
   */
  async recoverBuyers(
    buyerNumbers: string[],
    fieldNames?: string[]
  ): Promise<RecoveryResult> {
    const backupId = uuidv4();
    const result: RecoveryResult = {
      backupId,
      successCount: 0,
      failureCount: 0,
      recoveredBuyers: [],
      failedBuyers: [],
      executedAt: new Date()
    };

    console.log(`Starting recovery for ${buyerNumbers.length} buyers...`);
    console.log(`Backup ID: ${backupId}`);

    // Create backup first
    await this.createBackup(backupId, buyerNumbers, fieldNames);

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

    const buyerNumberIndex = headers.indexOf('買主番号');

    // Recover each buyer
    for (const buyerNumber of buyerNumbers) {
      try {
        const buyerRow = rows.find(row => String(row[buyerNumberIndex]) === buyerNumber);
        
        if (!buyerRow) {
          throw new Error(`Buyer ${buyerNumber} not found in spreadsheet`);
        }

        // Map spreadsheet data
        const data = this.columnMapper.mapSpreadsheetToDatabase(headers, buyerRow);

        // Prepare update data
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        // If specific fields are specified, only update those
        if (fieldNames && fieldNames.length > 0) {
          for (const fieldName of fieldNames) {
            updateData[fieldName] = data[fieldName];
          }
        } else {
          // Update all fields
          Object.assign(updateData, data);
        }

        // Update database
        const { error } = await this.supabase
          .from('buyers')
          .update(updateData)
          .eq('buyer_number', buyerNumber);

        if (error) {
          throw error;
        }

        result.successCount++;
        result.recoveredBuyers.push(buyerNumber);
        console.log(`✅ Recovered buyer ${buyerNumber}`);
      } catch (err: any) {
        result.failureCount++;
        result.failedBuyers.push({
          buyerNumber,
          error: err.message
        });
        console.error(`❌ Failed to recover buyer ${buyerNumber}:`, err.message);
      }
    }

    // Log recovery result
    await this.logRecovery(result, fieldNames);

    console.log(`\nRecovery complete: ${result.successCount} succeeded, ${result.failureCount} failed`);
    return result;
  }

  /**
   * Recover all detected inconsistencies
   */
  async recoverAllInconsistencies(
    fieldNames?: string[]
  ): Promise<RecoveryResult> {
    console.log('Finding all inconsistencies...');
    
    const inconsistencies = await this.consistencyChecker.findInconsistencies(fieldNames);
    
    if (inconsistencies.length === 0) {
      console.log('No inconsistencies found');
      return {
        backupId: '',
        successCount: 0,
        failureCount: 0,
        recoveredBuyers: [],
        failedBuyers: [],
        executedAt: new Date()
      };
    }

    console.log(`Found ${inconsistencies.length} buyers with inconsistencies`);
    
    const buyerNumbers = inconsistencies.map(inc => inc.buyerNumber);
    return this.recoverBuyers(buyerNumbers, fieldNames);
  }

  /**
   * Create backup before recovery
   */
  async createBackup(
    backupId: string,
    buyerNumbers: string[],
    fieldNames?: string[]
  ): Promise<void> {
    console.log(`Creating backup ${backupId}...`);

    const backupData: BackupData[] = [];

    for (const buyerNumber of buyerNumbers) {
      try {
        // Get current database values
        const { data: buyer, error } = await this.supabase
          .from('buyers')
          .select('*')
          .eq('buyer_number', buyerNumber)
          .single();

        if (error || !buyer) {
          console.warn(`Buyer ${buyerNumber} not found in database, skipping backup`);
          continue;
        }

        // Backup specified fields or all fields
        const fieldsToBackup = fieldNames || this.columnMapper.getMappedFields();

        for (const fieldName of fieldsToBackup) {
          backupData.push({
            backupId,
            buyerNumber,
            fieldName,
            oldValue: buyer[fieldName] ? String(buyer[fieldName]) : null,
            backedUpAt: new Date()
          });
        }
      } catch (err) {
        console.error(`Error backing up buyer ${buyerNumber}:`, err);
      }
    }

    // Store backup in database
    if (backupData.length > 0) {
      const { error } = await this.supabase
        .from('buyer_data_backups')
        .insert(backupData);

      if (error) {
        console.error('Error storing backup:', error);
        throw new Error('Failed to create backup');
      }

      console.log(`✅ Backup created: ${backupData.length} field values backed up`);
    }
  }

  /**
   * Rollback to a previous backup
   */
  async rollbackToBackup(backupId: string): Promise<RecoveryResult> {
    console.log(`Rolling back to backup ${backupId}...`);

    const result: RecoveryResult = {
      backupId: `rollback-${backupId}`,
      successCount: 0,
      failureCount: 0,
      recoveredBuyers: [],
      failedBuyers: [],
      executedAt: new Date()
    };

    // Get backup data
    const { data: backupData, error } = await this.supabase
      .from('buyer_data_backups')
      .select('*')
      .eq('backup_id', backupId);

    if (error || !backupData || backupData.length === 0) {
      throw new Error(`Backup ${backupId} not found`);
    }

    console.log(`Found ${backupData.length} backed up field values`);

    // Group by buyer number
    const buyerBackups = new Map<string, BackupData[]>();
    for (const backup of backupData) {
      if (!buyerBackups.has(backup.buyer_number)) {
        buyerBackups.set(backup.buyer_number, []);
      }
      buyerBackups.get(backup.buyer_number)!.push(backup);
    }

    // Restore each buyer
    for (const [buyerNumber, backups] of buyerBackups) {
      try {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        for (const backup of backups) {
          updateData[backup.field_name] = backup.old_value;
        }

        const { error } = await this.supabase
          .from('buyers')
          .update(updateData)
          .eq('buyer_number', buyerNumber);

        if (error) {
          throw error;
        }

        result.successCount++;
        result.recoveredBuyers.push(buyerNumber);
        console.log(`✅ Rolled back buyer ${buyerNumber}`);
      } catch (err: any) {
        result.failureCount++;
        result.failedBuyers.push({
          buyerNumber,
          error: err.message
        });
        console.error(`❌ Failed to rollback buyer ${buyerNumber}:`, err.message);
      }
    }

    console.log(`\nRollback complete: ${result.successCount} succeeded, ${result.failureCount} failed`);
    return result;
  }

  /**
   * Log recovery operation
   */
  private async logRecovery(
    result: RecoveryResult,
    fieldNames?: string[]
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('buyer_data_recovery_logs')
        .insert({
          id: uuidv4(),
          buyer_numbers: result.recoveredBuyers.concat(
            result.failedBuyers.map(f => f.buyerNumber)
          ),
          field_names: fieldNames || null,
          backup_id: result.backupId,
          success_count: result.successCount,
          failure_count: result.failureCount,
          executed_at: result.executedAt.toISOString()
        });

      if (error) {
        console.error('Error logging recovery:', error);
      }
    } catch (err) {
      console.error('Error logging recovery:', err);
    }
  }

  /**
   * Get recovery history
   */
  async getRecoveryHistory(limit: number = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('buyer_data_recovery_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting recovery history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get backup details
   */
  async getBackupDetails(backupId: string): Promise<BackupData[]> {
    const { data, error } = await this.supabase
      .from('buyer_data_backups')
      .select('*')
      .eq('backup_id', backupId);

    if (error) {
      console.error('Error getting backup details:', error);
      return [];
    }

    return data || [];
  }
}
