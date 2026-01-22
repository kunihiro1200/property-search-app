import axios from 'axios';

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
 * 査定依頼メールから売主を自動登録するヘルパー関数
 * 
 * 既存のメールシステムから呼び出して、統合APIを通じて
 * SupabaseとGoogleスプレッドシートに売主を登録します。
 */
export class EmailIntegrationHelper {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    baseUrl: string = process.env.API_BASE_URL || 'http://localhost:3000',
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * 査定依頼メールから売主を登録
   */
  async registerSellerFromEmail(
    emailData: InquiryEmailData
  ): Promise<EmailIntegrationResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/api/integration/inquiry-email`,
          emailData,
          {
            timeout: 30000, // 30秒タイムアウト
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.data.success) {
          return {
            success: true,
            sellerId: response.data.data.sellerId,
            sellerNumber: response.data.data.sellerNumber,
          };
        } else {
          return {
            success: false,
            error: response.data.error || 'Unknown error',
          };
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Email integration attempt ${attempt + 1} failed:`, error.message);

        // 最後の試行でない場合は待機してリトライ
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    // すべてのリトライが失敗
    return {
      success: false,
      error: lastError?.message || 'Failed after multiple retries',
    };
  }

  /**
   * 複数の査定依頼メールを一括登録
   */
  async registerSellersFromEmails(
    emails: InquiryEmailData[]
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: EmailIntegrationResult[];
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/integration/inquiry-email/batch`,
        { emails },
        {
          timeout: 60000, // 60秒タイムアウト
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Batch registration failed');
      }
    } catch (error: any) {
      console.error('Batch email integration failed:', error.message);
      return {
        successCount: 0,
        failureCount: emails.length,
        results: emails.map(() => ({
          success: false,
          error: error.message,
        })),
      };
    }
  }

  /**
   * 重複チェック
   */
  async checkDuplicates(
    phoneNumber: string,
    email?: string
  ): Promise<{
    hasDuplicates: boolean;
    matches: Array<{ sellerId: string; sellerNumber: string; matchType: string }>;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/integration/check-duplicates`,
        { phoneNumber, email },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Duplicate check failed');
      }
    } catch (error: any) {
      console.error('Duplicate check failed:', error.message);
      return {
        hasDuplicates: false,
        matches: [],
      };
    }
  }

  /**
   * 待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// シングルトンインスタンスをエクスポート
export const emailIntegrationHelper = new EmailIntegrationHelper();
