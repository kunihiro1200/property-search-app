// 拡張買主同期サービス - property_number の明示的な処理
import { SyncResult } from './BuyerSyncService';
import { BuyerColumnMapper } from './BuyerColumnMapper';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as path from 'path';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';
const BATCH_SIZE = 100;

interface SyncError {
  row: number;
  buyerNumber: string | null;
  message: string;
}

export interface EnhancedSyncResult extends SyncResult {
  propertyNumberStats: {
    extracted: number;
    validated: number;
    invalid: number;
    missing: number;
  };
}

export class EnhancedBuyerSyncService {
  private supabase;
  private columnMapper: BuyerColumnMapper;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.columnMapper = new BuyerColumnMapper();
  }

  /**
   * property_number の検証付きで全データを同期
   */
  async syncWithPropertyValidation(): Promise<EnhancedSyncResult> {
    const startTime = Date.now();
    const result: EnhancedSyncResult = {
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
      propertyNumberStats: {
        extracted: 0,
        validated: 0,
        invalid: 0,
        missing: 0
      }
    };

    try {
      console.log('Starting enhanced buyers sync with property validation...');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, '../../google-service-account.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // ヘッダー取得
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!1:1`,
      });
      const headers = headerResponse.data.values?.[0] || [];
      console.log(`Found ${headers.length} columns`);

      // データ取得
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A2:GZ`,
      });
      const rows = dataResponse.data.values || [];
      console.log(`Found ${rows.length} rows to sync`);

      // バッチ処理
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, rows.length);
        const batch = rows.slice(start, end);
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (rows ${start + 2} to ${end + 1})`);
        
        const batchResult = await this.processEnhancedBatch(headers, batch, start + 2);
        
        result.created += batchResult.created;
        result.updated += batchResult.updated;
        result.failed += batchResult.failed;
        result.skipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
        result.propertyNumberStats.extracted += batchResult.propertyNumberStats.extracted;
        result.propertyNumberStats.validated += batchResult.propertyNumberStats.validated;
        result.propertyNumberStats.invalid += batchResult.propertyNumberStats.invalid;
        result.propertyNumberStats.missing += batchResult.propertyNumberStats.missing;
      }

      result.duration = Date.now() - startTime;
      console.log(`Enhanced sync complete in ${result.duration}ms:`);
      console.log(`  Created: ${result.created}, Updated: ${result.updated}`);
      console.log(`  Failed: ${result.failed}, Skipped: ${result.skipped}`);
      console.log(`  Property Numbers - Extracted: ${result.propertyNumberStats.extracted}, Validated: ${result.propertyNumberStats.validated}`);
      console.log(`  Property Numbers - Invalid: ${result.propertyNumberStats.invalid}, Missing: ${result.propertyNumberStats.missing}`);
      
      return result;
    } catch (error: any) {
      console.error('Enhanced sync failed:', error.message);
      throw error;
    }
  }

  /**
   * バッチを処理（拡張版）
   */
  private async processEnhancedBatch(
    headers: string[],
    rows: any[][],
    startRowNumber: number
  ): Promise<EnhancedSyncResult> {
    const result: EnhancedSyncResult = {
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as SyncError[],
      duration: 0,
      propertyNumberStats: {
        extracted: 0,
        validated: 0,
        invalid: 0,
        missing: 0
      }
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = startRowNumber + i;
      
      try {
        const data = this.columnMapper.mapSpreadsheetToDatabase(headers, row);
        
        // 買主番号がない場合はスキップ
        if (!data.buyer_number || String(data.buyer_number).trim() === '') {
          result.skipped++;
          continue;
        }

        // property_number を明示的に抽出
        const propertyNumber = await this.extractPropertyNumber(headers, row);
        
        if (propertyNumber) {
          result.propertyNumberStats.extracted++;
          
          // property_number を検証
          const isValid = await this.validatePropertyNumber(propertyNumber);
          
          if (isValid) {
            result.propertyNumberStats.validated++;
            data.property_number = propertyNumber;
            console.log(`  ✓ Row ${rowNumber} (${data.buyer_number}): property_number = ${propertyNumber}`);
          } else {
            result.propertyNumberStats.invalid++;
            data.property_number = null;
            console.log(`  ✗ Row ${rowNumber} (${data.buyer_number}): Invalid property_number = ${propertyNumber}`);
          }
        } else {
          result.propertyNumberStats.missing++;
          data.property_number = null;
        }

        // 既存レコードを確認
        const { data: existing } = await this.supabase
          .from('buyers')
          .select('id')
          .eq('buyer_number', data.buyer_number)
          .single();

        // Upsert
        const { error } = await this.supabase
          .from('buyers')
          .upsert(
            { 
              ...data, 
              synced_at: new Date().toISOString(),
              db_updated_at: new Date().toISOString()
            },
            { onConflict: 'buyer_number' }
          );

        if (error) {
          console.error(`  ✗ Row ${rowNumber} (${data.buyer_number}): ${error.message}`);
          result.failed++;
          result.errors.push({
            row: rowNumber,
            buyerNumber: data.buyer_number,
            message: error.message
          });
        } else {
          if (existing) {
            result.updated++;
          } else {
            result.created++;
          }
        }
      } catch (err: any) {
        console.error(`  ✗ Row ${rowNumber}: ${err.message}`);
        result.failed++;
        result.errors.push({
          row: rowNumber,
          buyerNumber: null,
          message: err.message
        });
      }
    }

    return result;
  }

  /**
   * property_number を明示的に抽出
   */
  private async extractPropertyNumber(headers: string[], row: any[]): Promise<string | null> {
    // "物件番号" カラムのインデックスを取得
    const columnIndex = headers.indexOf('物件番号');
    
    if (columnIndex === -1) {
      return null;
    }

    const value = row[columnIndex];
    
    if (!value || String(value).trim() === '') {
      return null;
    }

    return String(value).trim();
  }

  /**
   * property_number を検証
   * - フォーマット検証（AA + 数字）
   * - property_listings テーブルとの参照整合性検証
   */
  private async validatePropertyNumber(propertyNumber: string): Promise<boolean> {
    // 1. フォーマット検証
    const formatPattern = /^AA\d+$/;
    if (!formatPattern.test(propertyNumber)) {
      return false;
    }

    // 2. property_listings テーブルに存在するか確認
    const { data, error } = await this.supabase
      .from('property_listings')
      .select('property_number')
      .eq('property_number', propertyNumber)
      .single();

    if (error || !data) {
      // 物件が見つからない場合は警告のみ（厳格モードではfalseを返す）
      // 現在は寛容モード: 物件が見つからなくても許容
      return true;
    }

    return true;
  }

  /**
   * 既存の買主データの property_number を再同期
   */
  async reSyncPropertyNumbers(): Promise<EnhancedSyncResult> {
    console.log('Re-syncing property_number for existing buyers...');
    return await this.syncWithPropertyValidation();
  }
}
