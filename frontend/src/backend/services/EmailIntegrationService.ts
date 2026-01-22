import { SupabaseClient } from '@supabase/supabase-js';
import { SpreadsheetSyncService } from './SpreadsheetSyncService';
import { sellerNumberService } from './SellerNumberService';
import { encrypt } from '../utils/encryption';
import { SellerStatus } from '../types';

export interface InquiryEmailData {
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  propertyAddress: string;
  inquirySource: string;
  inquiryDate: Date;
  inquiryYear?: number;
  propertyType?: string;
  landArea?: number;
  buildingArea?: number;
  buildYear?: number;
  prefecture?: string;
  city?: string;
  additionalInfo?: string;
}

export interface EmailIntegrationResult {
  success: boolean;
  sellerId?: string;
  sellerNumber?: string;
  error?: string;
}

/**
 * メール統合サービス
 * 
 * 査定依頼メールから自動的に売主を登録し、
 * SupabaseとGoogleスプレッドシートの両方に同期します。
 */
export class EmailIntegrationService {
  private supabase: SupabaseClient;
  private syncService: SpreadsheetSyncService;

  constructor(supabase: SupabaseClient, syncService: SpreadsheetSyncService) {
    this.supabase = supabase;
    this.syncService = syncService;
  }

  /**
   * 査定依頼メールを処理して売主を登録
   */
  async handleInquiryEmail(emailData: InquiryEmailData): Promise<EmailIntegrationResult> {
    try {
      // バリデーション
      const validationError = this.validateEmailData(emailData);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      // 売主番号を生成
      const sellerNumber = await this.generateSellerNumber();

      // 個人情報を暗号化
      const encryptedData = {
        seller_number: sellerNumber,
        name: encrypt(emailData.name),
        address: encrypt(emailData.address),
        phone_number: encrypt(emailData.phoneNumber),
        email: emailData.email ? encrypt(emailData.email) : null,
        inquiry_source: emailData.inquirySource,
        inquiry_date: emailData.inquiryDate.toISOString(),
        inquiry_year: emailData.inquiryYear || emailData.inquiryDate.getFullYear(),
        status: SellerStatus.NEW,
        is_unreachable: false,
        duplicate_confirmed: false,
      };

      // Supabaseに売主を作成
      const { data: seller, error: sellerError } = await this.supabase
        .from('sellers')
        .insert(encryptedData)
        .select()
        .single();

      if (sellerError || !seller) {
        return {
          success: false,
          error: `Failed to create seller: ${sellerError?.message}`,
        };
      }

      // 物件情報を作成
      const { error: propertyError } = await this.supabase
        .from('properties')
        .insert({
          seller_id: seller.id,
          address: emailData.propertyAddress,
          prefecture: emailData.prefecture,
          city: emailData.city,
          property_type: emailData.propertyType,
          land_area: emailData.landArea,
          building_area: emailData.buildingArea,
          build_year: emailData.buildYear,
          additional_info: emailData.additionalInfo,
        });

      if (propertyError) {
        // ロールバック: 売主を削除
        await this.supabase.from('sellers').delete().eq('id', seller.id);
        return {
          success: false,
          error: `Failed to create property: ${propertyError.message}`,
        };
      }

      // スプレッドシートに同期
      const syncResult = await this.syncService.syncToSpreadsheet(seller.id);

      if (!syncResult.success) {
        console.error('Failed to sync to spreadsheet:', syncResult.error);
        // 同期失敗はエラーとして扱わない（後でリトライ可能）
      }

      return {
        success: true,
        sellerId: seller.id,
        sellerNumber: sellerNumber,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * メールデータをバリデーション
   */
  private validateEmailData(data: InquiryEmailData): string | null {
    if (!data.name || data.name.trim() === '') {
      return '名前は必須です';
    }

    if (!data.address || data.address.trim() === '') {
      return '住所は必須です';
    }

    if (!data.phoneNumber || data.phoneNumber.trim() === '') {
      return '電話番号は必須です';
    }

    // 電話番号の形式チェック（簡易版）
    const phoneRegex = /^[0-9\-\(\)\s]+$/;
    if (!phoneRegex.test(data.phoneNumber)) {
      return '電話番号の形式が不正です';
    }

    // メールアドレスの形式チェック
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return 'メールアドレスの形式が不正です';
      }
    }

    if (!data.propertyAddress || data.propertyAddress.trim() === '') {
      return '物件住所は必須です';
    }

    if (!data.inquirySource || data.inquirySource.trim() === '') {
      return '反響元は必須です';
    }

    if (!data.inquiryDate) {
      return '反響日は必須です';
    }

    return null;
  }

  /**
   * 売主番号を生成
   */
  private async generateSellerNumber(): Promise<string> {
    try {
      return await sellerNumberService.generateWithRetry();
    } catch (error) {
      console.error('Failed to generate seller number, using fallback:', error);
      // Fallback: タイムスタンプベースの番号を生成
      const timestamp = Date.now().toString().slice(-5);
      return `AA${timestamp}`;
    }
  }

  /**
   * 重複チェック（オプション）
   */
  async checkDuplicates(phoneNumber: string, email?: string): Promise<{
    hasDuplicates: boolean;
    matches: Array<{ sellerId: string; sellerNumber: string; matchType: string }>;
  }> {
    const encryptedPhone = encrypt(phoneNumber);
    const encryptedEmail = email ? encrypt(email) : undefined;

    const matches: Array<{ sellerId: string; sellerNumber: string; matchType: string }> = [];

    // 電話番号で検索
    const { data: phoneMatches } = await this.supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('phone_number', encryptedPhone);

    if (phoneMatches && phoneMatches.length > 0) {
      phoneMatches.forEach(match => {
        matches.push({
          sellerId: match.id,
          sellerNumber: match.seller_number,
          matchType: 'phone',
        });
      });
    }

    // メールアドレスで検索
    if (encryptedEmail) {
      const { data: emailMatches } = await this.supabase
        .from('sellers')
        .select('id, seller_number')
        .eq('email', encryptedEmail);

      if (emailMatches && emailMatches.length > 0) {
        emailMatches.forEach(match => {
          // 既に電話番号でマッチしている場合はスキップ
          if (!matches.find(m => m.sellerId === match.id)) {
            matches.push({
              sellerId: match.id,
              sellerNumber: match.seller_number,
              matchType: 'email',
            });
          }
        });
      }
    }

    return {
      hasDuplicates: matches.length > 0,
      matches,
    };
  }

  /**
   * バッチ処理: 複数のメールを一括処理
   */
  async handleBatchInquiryEmails(
    emails: InquiryEmailData[]
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: EmailIntegrationResult[];
  }> {
    const results: EmailIntegrationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const email of emails) {
      const result = await this.handleInquiryEmail(email);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      successCount,
      failureCount,
      results,
    };
  }
}
