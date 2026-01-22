import { createClient } from '@supabase/supabase-js';
import { PropertyInfo, PropertyType } from '../types';
import { CacheHelper } from '../utils/cache';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Service for managing property information
 * Handles property types, structures, seller situations, and verified measurements
 */
export class PropertyService {
  /**
   * Create a new property record
   * 
   * @param propertyData - Property information to create
   * @returns Created property record
   */
  async createProperty(propertyData: Omit<PropertyInfo, 'id'>): Promise<PropertyInfo> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          seller_id: propertyData.sellerId,
          address: propertyData.address,
          prefecture: propertyData.prefecture,
          city: propertyData.city,
          property_type: propertyData.propertyType,
          land_area: propertyData.landArea,
          building_area: propertyData.buildingArea,
          land_area_verified: propertyData.landAreaVerified,
          building_area_verified: propertyData.buildingAreaVerified,
          build_year: propertyData.buildYear,
          structure: propertyData.structure,
          floor_plan: propertyData.floorPlan,
          floors: propertyData.floors,
          rooms: propertyData.rooms,
          seller_situation: propertyData.sellerSituation,
          parking: propertyData.parking,
          additional_info: propertyData.additionalInfo,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating property:', error);
        throw new Error(`Failed to create property: ${error.message}`);
      }

      return this.mapToPropertyInfo(data);
    } catch (error) {
      console.error('Create property error:', error);
      throw error;
    }
  }

  /**
   * Get property by ID
   * 
   * @param propertyId - Property ID
   * @param includeDeleted - Whether to include soft-deleted properties (default: false)
   * @returns Property information
   */
  async getProperty(propertyId: string, includeDeleted: boolean = false): Promise<PropertyInfo | null> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId);

      // Filter out deleted properties by default
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting property:', error);
        throw new Error(`Failed to get property: ${error.message}`);
      }

      return this.mapToPropertyInfo(data);
    } catch (error) {
      console.error('Get property error:', error);
      throw error;
    }
  }

  /**
   * Get property by seller ID
   * 
   * @param sellerId - Seller ID
   * @param includeDeleted - Whether to include soft-deleted properties (default: false)
   * @returns Property information or null if not found
   */
  async getPropertyBySellerId(sellerId: string, includeDeleted: boolean = false): Promise<PropertyInfo | null> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('seller_id', sellerId);

      // Filter out deleted properties by default
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting property by seller:', error);
        throw new Error(`Failed to get property by seller: ${error.message}`);
      }

      return this.mapToPropertyInfo(data);
    } catch (error) {
      console.error('Get property by seller error:', error);
      throw error;
    }
  }

  /**
   * Update property information
   * 
   * @param propertyId - Property ID
   * @param updates - Fields to update
   * @returns Updated property information
   */
  async updateProperty(
    propertyId: string,
    updates: Partial<Omit<PropertyInfo, 'id' | 'sellerId'>>
  ): Promise<PropertyInfo> {
    try {
      const updateData: any = {};

      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.prefecture !== undefined) updateData.prefecture = updates.prefecture;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.propertyType !== undefined) updateData.property_type = updates.propertyType;
      if (updates.landArea !== undefined) updateData.land_area = updates.landArea;
      if (updates.buildingArea !== undefined) updateData.building_area = updates.buildingArea;
      if (updates.landAreaVerified !== undefined)
        updateData.land_area_verified = updates.landAreaVerified;
      if (updates.buildingAreaVerified !== undefined)
        updateData.building_area_verified = updates.buildingAreaVerified;
      if (updates.buildYear !== undefined) updateData.build_year = updates.buildYear;
      if (updates.structure !== undefined) updateData.structure = updates.structure;
      if (updates.floorPlan !== undefined) updateData.floor_plan = updates.floorPlan;
      if (updates.floors !== undefined) updateData.floors = updates.floors;
      if (updates.rooms !== undefined) updateData.rooms = updates.rooms;
      if (updates.sellerSituation !== undefined)
        updateData.seller_situation = updates.sellerSituation;
      if (updates.parking !== undefined) updateData.parking = updates.parking;
      if (updates.additionalInfo !== undefined)
        updateData.additional_info = updates.additionalInfo;

      const { data, error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating property:', error);
        throw new Error(`Failed to update property: ${error.message}`);
      }

      // Clear seller cache since property is part of seller data
      if (data.seller_id) {
        await CacheHelper.del(`seller:${data.seller_id}`);
        await CacheHelper.delPattern('sellers:list*');
      }

      return this.mapToPropertyInfo(data);
    } catch (error) {
      console.error('Update property error:', error);
      throw error;
    }
  }

  /**
   * Validate property type
   * 
   * @param propertyType - Property type to validate
   * @returns true if valid
   */
  validatePropertyType(propertyType: string): boolean {
    const validTypes = Object.values(PropertyType);
    return validTypes.includes(propertyType as PropertyType);
  }

  /**
   * Validate structure type
   * 
   * @param structure - Structure to validate
   * @returns true if valid
   */
  validateStructure(structure: string): boolean {
    const validStructures = ['木造', '軽量鉄骨', '鉄骨', '他'];
    return validStructures.includes(structure);
  }

  /**
   * Validate seller situation
   * 
   * @param situation - Seller situation to validate
   * @returns true if valid
   */
  validateSellerSituation(situation: string): boolean {
    const validSituations = ['居', '空', '賃', '古有', '更'];
    return validSituations.includes(situation);
  }

  /**
   * Check if property is for Ieul mansion (イエウール・マンション)
   * 
   * @param inquirySite - Inquiry site code
   * @param propertyType - Property type
   * @returns true if it's Ieul mansion
   */
  isIeulMansion(inquirySite?: string, propertyType?: PropertyType): boolean {
    return inquirySite === 'ウ' && propertyType === PropertyType.APARTMENT;
  }

  /**
   * Map database record to PropertyInfo type
   */
  private mapToPropertyInfo(data: any): PropertyInfo {
    return {
      id: data.id,
      sellerId: data.seller_id,
      address: data.address,
      prefecture: data.prefecture,
      city: data.city,
      propertyType: data.property_type,
      landArea: data.land_area,
      buildingArea: data.building_area,
      landAreaVerified: data.land_area_verified,
      buildingAreaVerified: data.building_area_verified,
      buildYear: data.build_year,
      structure: data.structure,
      floorPlan: data.floor_plan,
      floors: data.floors,
      rooms: data.rooms,
      sellerSituation: data.seller_situation,
      parking: data.parking,
      additionalInfo: data.additional_info,
    };
  }

  /**
   * 物件番号から決済日を取得
   * @param propertyNumber 物件番号（例: AA10424）
   * @returns 決済日（ISO 8601形式）またはnull
   */
  async getSettlementDate(propertyNumber: string): Promise<string | null> {
    try {
      // キャッシュをチェック
      const cacheKey = `settlement_date:${propertyNumber}`;
      const cached = await CacheHelper.get<string>(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      const { GoogleSheetsClient } = await import('./GoogleSheetsClient');
      
      // GoogleSheetsClientを使用して物件シートにアクセス
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
        sheetName: '物件',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      });
      
      await sheetsClient.authenticate();
      
      // 物件番号で行を検索（A列に物件番号があると仮定）
      const rowIndex = await sheetsClient.findRowByColumn('物件番号', propertyNumber);
      
      if (!rowIndex) {
        console.log(`Property ${propertyNumber} not found in sheet`);
        // nullもキャッシュ（5分間）
        await CacheHelper.set(cacheKey, null, 300);
        return null;
      }
      
      // E列（決済日）を取得
      // E列は5番目の列なので、ヘッダーから「決済日」を探す
      const allData = await sheetsClient.readRange(`A${rowIndex}:Z${rowIndex}`);
      
      if (allData.length === 0) {
        await CacheHelper.set(cacheKey, null, 300);
        return null;
      }
      
      // E列のデータを取得（ヘッダーが「決済日」のカラム）
      const rowData = allData[0];
      const settlementDateValue = rowData['決済日'];
      
      if (!settlementDateValue) {
        await CacheHelper.set(cacheKey, null, 300);
        return null;
      }
      
      // 日付を正規化（ISO 8601形式に変換）
      const settlementDate = this.normalizeDate(settlementDateValue);
      
      // キャッシュに保存（5分間）
      await CacheHelper.set(cacheKey, settlementDate, 300);
      
      return settlementDate;
    } catch (error) {
      console.error('Failed to get settlement date:', error);
      return null;  // エラー時はnullを返す（ページ全体の表示には影響しない）
    }
  }
  
  /**
   * 日付を正規化（ISO 8601形式に変換）
   */
  private normalizeDate(dateValue: any): string | null {
    if (!dateValue) return null;
    
    try {
      // Googleスプレッドシートの日付形式を処理
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];  // YYYY-MM-DD形式
    } catch (error) {
      console.error('Failed to normalize date:', error);
      return null;
    }
  }

  /**
   * 物件番号からBQ列の説明文を取得
   * @param propertyNumber 物件番号（例: AA10424）
   * @returns 説明文またはnull
   */
  async getPropertyAbout(propertyNumber: string): Promise<string | null> {
    try {
      // キャッシュをチェック
      const cacheKey = `property_about:${propertyNumber}`;
      const cached = await CacheHelper.get<string>(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      const { GoogleSheetsClient } = await import('./GoogleSheetsClient');
      
      console.log(`[getPropertyAbout] Starting for property: ${propertyNumber}`);
      
      // GoogleSheetsClientを使用して物件シートにアクセス
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
        sheetName: '物件',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      });
      
      await sheetsClient.authenticate();
      console.log(`[getPropertyAbout] Authenticated successfully`);
      
      // 物件番号で行を検索
      const rowIndex = await sheetsClient.findRowByColumn('物件番号', propertyNumber);
      console.log(`[getPropertyAbout] Row index: ${rowIndex}`);
      
      if (!rowIndex) {
        console.log(`[getPropertyAbout] Property ${propertyNumber} not found in sheet`);
        // nullもキャッシュ（5分間）
        await CacheHelper.set(cacheKey, null, 300);
        return null;
      }
      
      // より広い範囲を読み取る（ZZ列まで）
      const allData = await sheetsClient.readRange(`A${rowIndex}:ZZ${rowIndex}`);
      console.log(`[getPropertyAbout] Data length: ${allData.length}`);
      
      if (allData.length === 0) {
        console.log(`[getPropertyAbout] No data found for row ${rowIndex}`);
        await CacheHelper.set(cacheKey, null, 300);
        return null;
      }
      
      // BQ列のデータを取得
      const rowData = allData[0];
      console.log(`[getPropertyAbout] Looking for key: "●内覧前伝達事項"`);
      
      const aboutValue = rowData['●内覧前伝達事項'];
      console.log(`[getPropertyAbout] About value:`, aboutValue);
      
      if (!aboutValue) {
        console.log(`[getPropertyAbout] No value found for "●内覧前伝達事項"`);
        await CacheHelper.set(cacheKey, null, 300);
        return null;
      }
      
      // キャッシュに保存（5分間）
      await CacheHelper.set(cacheKey, aboutValue as string, 300);
      
      return aboutValue as string;
    } catch (error) {
      console.error('[getPropertyAbout] Error:', error);
      return null;  // エラー時はnullを返す
    }
  }

  /**
   * 概算書PDFを生成
   * @param propertyNumber 物件番号（例: AA10424）
   * @returns PDFのURL
   */
  async generateEstimatePdf(propertyNumber: string): Promise<string> {
    try {
      const { google } = await import('googleapis');
      const fs = require('fs');
      const path = require('path');
      
      console.log(`[generateEstimatePdf] Starting for property: ${propertyNumber}`);
      
      // サービスアカウント認証
      // Vercel環境では環境変数から、ローカル環境ではファイルから読み込む
      let keyFile;
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        // Vercel環境: 環境変数から直接読み込む
        console.log(`[generateEstimatePdf] Using GOOGLE_SERVICE_ACCOUNT_JSON from environment`);
        keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } else {
        // ローカル環境: ファイルから読み込む
        console.log(`[generateEstimatePdf] Using service account key file`);
        const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json');
        keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      }
      
      const auth = new google.auth.JWT({
        email: keyFile.client_email,
        key: keyFile.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      await auth.authorize();
      const sheets = google.sheets({ version: 'v4', auth });
      
      console.log(`[generateEstimatePdf] Authenticated successfully`);
      
      const spreadsheetId = '1gBH9bqI7g3Xp6x8ZvWjeHVVcnSadpcB_7OpCt72w_7I';
      const sheetName = 'Sheet1';  // 新しいスプレッドシートのシート名（英語名を使用）
      
      // C2セルに物件番号を直接書き込み
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!C2`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[propertyNumber]],
        },
      });
      
      console.log(`[generateEstimatePdf] Updated C2 cell with property number: ${propertyNumber}`);
      
      // D11セルの計算完了を待機
      await this.waitForCalculationCompletion(sheets, spreadsheetId, sheetName);
      
      // シートIDを取得
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets?.find(
        (s: any) => s.properties?.title === sheetName
      );
      
      if (!sheet || sheet.properties?.sheetId === undefined) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }
      
      const sheetId = sheet.properties.sheetId;
      
      if (sheetId === null || sheetId === undefined) {
        throw new Error(`Sheet ID not found for sheet "${sheetName}"`);
      }
      
      console.log(`[generateEstimatePdf] Sheet ID: ${sheetId}`);
      
      // PDFをエクスポート（特定のシートのみ）
      const pdfUrl = this.exportSheetAsPdf(spreadsheetId, sheetId, propertyNumber);
      console.log(`[generateEstimatePdf] Generated PDF URL: ${pdfUrl}`);
      
      return pdfUrl;
    } catch (error) {
      console.error('[generateEstimatePdf] Error:', error);
      throw new Error('概算書の生成に失敗しました');
    }
  }
  
  /**
   * スプレッドシートの計算完了を待機
   * D11セル（金額セル）の値をポーリングして計算完了を確認
   * 
   * @param sheets Google Sheets APIクライアント
   * @param spreadsheetId スプレッドシートID
   * @param sheetName シート名
   */
  private async waitForCalculationCompletion(
    sheets: any,
    spreadsheetId: string,
    sheetName: string
  ): Promise<void> {
    const VALIDATION_CELL = 'D11';  // 金額セル
    const MAX_ATTEMPTS = 20;        // 最大試行回数
    const RETRY_INTERVAL = 500;     // リトライ間隔（ms）
    
    console.log(`[waitForCalculationCompletion] Starting validation for cell ${VALIDATION_CELL}`);
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // D11セルの値を読み取り
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!${VALIDATION_CELL}`,
        });
        
        const cellValue = response.data.values?.[0]?.[0];
        console.log(`[waitForCalculationCompletion] Attempt ${attempt}/${MAX_ATTEMPTS}: Cell value = ${cellValue}`);
        
        // 値が有効な数値かチェック
        if (this.isValidCalculatedValue(cellValue)) {
          console.log(`[waitForCalculationCompletion] Calculation completed. Value: ${cellValue}`);
          return;
        }
        
        // 最後の試行でない場合は待機
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
      } catch (error) {
        console.error(`[waitForCalculationCompletion] Error reading cell on attempt ${attempt}:`, error);
        // エラーが発生しても続行（次の試行へ）
      }
    }
    
    // タイムアウト
    const timeoutSeconds = (MAX_ATTEMPTS * RETRY_INTERVAL) / 1000;
    throw new Error(`計算がタイムアウトしました（${timeoutSeconds}秒）。D11セルに値が入力されませんでした。`);
  }
  
  /**
   * セルの値が有効な計算結果かチェック
   * 
   * @param value セルの値
   * @returns 有効な場合はtrue
   */
  private isValidCalculatedValue(value: any): boolean {
    // 値が存在しない場合
    if (value === undefined || value === null || value === '') {
      return false;
    }
    
    // 数値に変換
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    
    // 数値でない、または0以下の場合は無効
    if (isNaN(numValue) || numValue <= 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * シート名からシートIDを取得
   */
  private async getSheetId(sheetsClient: any, sheetName: string): Promise<number> {
    const metadata = await sheetsClient.getSpreadsheetMetadata();
    const sheet = metadata.sheets?.find(
      (s: any) => s.properties?.title === sheetName
    );
    
    if (!sheet || sheet.properties?.sheetId === undefined) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    return sheet.properties.sheetId;
  }
  
  /**
   * スプレッドシートをPDFとしてエクスポート（特定のシートのみ）
   */
  private exportSheetAsPdf(spreadsheetId: string, sheetId: number, propertyNumber?: string): string {
    // Google Sheets APIを使用してPDFエクスポートURLを生成
    // gid パラメータで特定のシートを指定
    let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&size=A4&portrait=true&fitw=true&gid=${sheetId}`;
    
    // 物件番号が指定されている場合、ファイル名を設定
    if (propertyNumber) {
      const fileName = encodeURIComponent(`概算書（${propertyNumber}）`);
      exportUrl += `&title=${fileName}`;
    }
    
    return exportUrl;
  }

  /**
   * 物件番号からGoogle Driveの画像フォルダURLを自動取得
   * 
   * @param propertyNumber 物件番号（例: AA13069）
   * @returns Google DriveフォルダのURL、見つからない場合はnull
   */
  async retrieveStorageUrl(propertyNumber: string): Promise<string | null> {
    try {
      const { PropertyImageService } = await import('./PropertyImageService');
      const propertyImageService = new PropertyImageService();
      
      const folderUrl = await propertyImageService.getImageFolderUrl(propertyNumber);
      
      if (folderUrl) {
        // データベースに保存
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        );
        
        const { error } = await supabase
          .from('property_listings')
          .update({ 
            storage_location: folderUrl,
            updated_at: new Date().toISOString()
          })
          .eq('property_number', propertyNumber);
        
        if (error) {
          console.error(`[PropertyService] Failed to update storage_location for ${propertyNumber}:`, error);
          throw new Error(`データベースの更新に失敗しました: ${error.message}`);
        }
        
        console.log(`[PropertyService] Successfully updated storage_location for ${propertyNumber}: ${folderUrl}`);
      }
      
      return folderUrl;
      
    } catch (error: any) {
      console.error(`[PropertyService] Error retrieving storage URL for ${propertyNumber}:`, error);
      throw error;
    }
  }

  /**
   * 格納先URLを手動で更新
   * 
   * @param propertyNumber 物件番号
   * @param storageUrl 格納先URL
   * @returns 成功した場合はtrue
   */
  async updateStorageUrl(propertyNumber: string, storageUrl: string): Promise<boolean> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      const { error } = await supabase
        .from('property_listings')
        .update({ 
          storage_location: storageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('property_number', propertyNumber);
      
      if (error) {
        console.error(`[PropertyService] Failed to update storage_location for ${propertyNumber}:`, error);
        throw new Error(`データベースの更新に失敗しました: ${error.message}`);
      }
      
      console.log(`[PropertyService] Successfully updated storage_location for ${propertyNumber}: ${storageUrl}`);
      return true;
      
    } catch (error: any) {
      console.error(`[PropertyService] Error updating storage URL for ${propertyNumber}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const propertyService = new PropertyService();
