// Gmail配信サービス
import api from './api';
import { EmailTemplate, replacePlaceholders } from '../utils/gmailDistributionTemplates';

export interface GmailUrlParams {
  to?: string;
  bcc: string[];
  subject: string;
  body: string;
  from?: string;  // 送信元メールアドレス
}

export interface BuyerEmailsResponse {
  emails: string[];
  count: number;
  appliedFilters: {
    areaFilter: boolean;
    distributionFilter: boolean;
    radiusFilter: boolean;
  };
}

export interface EnhancedBuyerEmailsResponse {
  emails: string[];
  count: number;
  totalBuyers: number;
  appliedFilters: {
    geographyFilter: boolean;
    distributionFilter: boolean;
    statusFilter: boolean;
    priceRangeFilter: boolean;
  };
  filteredBuyers?: Array<{
    buyer_number: string;
    email: string;
    desired_area: string | null;
    distribution_type: string | null;
    latest_status: string | null;
    property_type: string | null;
    price_range_min: number | null;
    price_range_max: number | null;
    price_range_text: string | null;
    filterResults: {
      geography: boolean;
      distribution: boolean;
      status: boolean;
      priceRange: boolean;
    };
    geographicMatch?: {
      matched: boolean;
      matchedAreas: string[];
      matchType: 'radius' | 'city-wide' | 'none';
    };
  }>;
}

export class GmailDistributionService {
  // Gmail URLの最大長（安全マージンを含む）
  private readonly MAX_URL_LENGTH = 1900;
  
  // 送信元メールアドレス
  private readonly FROM_EMAIL = 'tenant@ifoo-oita.com';

  /**
   * 物件の配信対象買主のメールアドレスを取得
   * @param propertyNumber 物件番号
   * @returns メールアドレスリスト
   */
  async fetchQualifiedBuyerEmails(propertyNumber: string): Promise<BuyerEmailsResponse> {
    try {
      const response = await api.get(
        `/api/property-listings/${propertyNumber}/distribution-buyers`
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch buyer emails:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to fetch buyer emails'
      );
    }
  }

  /**
   * 物件の配信対象買主のメールアドレスを取得（拡張版 - 複数条件フィルタリング）
   * @param propertyNumber 物件番号
   * @param includeDetails 詳細情報を含めるかどうか
   * @returns メールアドレスリストと詳細情報
   */
  async fetchQualifiedBuyerEmailsEnhanced(
    propertyNumber: string,
    includeDetails: boolean = false
  ): Promise<EnhancedBuyerEmailsResponse> {
    try {
      const params = new URLSearchParams();
      if (includeDetails) {
        params.append('includeDetails', 'true');
      }
      
      const url = `/api/property-listings/${propertyNumber}/distribution-buyers-enhanced${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch enhanced buyer emails:', error);
      
      // エラーコードに応じた適切なエラーメッセージ
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;
      const diagnostics = error.response?.data?.diagnostics;
      
      if (errorCode === 'PROPERTY_NOT_FOUND') {
        // 診断情報がある場合、より詳細なエラーメッセージを提供
        if (diagnostics) {
          if (diagnostics.canBeRecovered) {
            throw new Error(
              `物件が見つかりません: ${propertyNumber}\n\n` +
              `この物件は売主データには存在しますが、物件リストに登録されていません。\n` +
              `システム管理者に連絡して、データ同期を実行してください。`
            );
          } else if (diagnostics.existsInSellers) {
            throw new Error(
              `物件が見つかりません: ${propertyNumber}\n\n` +
              `この物件は売主データには存在しますが、物件リストに登録されていません。`
            );
          } else {
            throw new Error(
              `物件が見つかりません: ${propertyNumber}\n\n` +
              `この物件番号は登録されていません。物件番号を確認してください。`
            );
          }
        } else {
          throw new Error(`物件が見つかりません: ${propertyNumber}`);
        }
      } else if (errorCode === 'INVALID_PARAMETER') {
        throw new Error(`無効なパラメータ: ${errorMessage || '不明なエラー'}`);
      } else if (errorCode === 'SERVICE_UNAVAILABLE') {
        throw new Error('サービスが一時的に利用できません。しばらくしてから再度お試しください。');
      } else {
        throw new Error(
          errorMessage || error.response?.data?.error || '買主メールアドレスの取得に失敗しました'
        );
      }
    }
  }

  /**
   * Gmail新規作成URLを生成
   * @param params URLパラメータ
   * @returns Gmail URL
   */
  generateGmailUrl(params: GmailUrlParams): string {
    const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
    
    const urlParams = new URLSearchParams();
    
    if (params.to) {
      urlParams.append('to', params.to);
    }
    
    // 送信元アドレスを追加
    if (params.from) {
      urlParams.append('from', params.from);
    }
    
    // BCCを追加（URL長制限を考慮）
    const bccList = this.limitBccForUrlLength(params.bcc, params.subject, params.body, params.from);
    if (bccList.length > 0) {
      urlParams.append('bcc', bccList.join(','));
    }
    
    urlParams.append('su', params.subject);
    urlParams.append('body', params.body);
    
    return `${baseUrl}&${urlParams.toString()}`;
  }

  /**
   * テンプレートを使用してGmail URLを生成
   * @param template メールテンプレート
   * @param propertyData 物件データ
   * @param bccEmails BCC送信先メールアドレス
   * @param from 送信元メールアドレス（オプション）
   * @returns Gmail URL
   */
  generateGmailUrlFromTemplate(
    template: EmailTemplate,
    propertyData: Record<string, string>,
    bccEmails: string[],
    from?: string
  ): string {
    const subject = replacePlaceholders(template.subject, propertyData);
    const body = replacePlaceholders(template.body, propertyData);
    
    return this.generateGmailUrl({
      bcc: bccEmails,
      subject,
      body,
      from
    });
  }

  /**
   * URL長制限を考慮してBCCリストを制限
   * @param bccList BCCメールアドレスリスト
   * @param subject 件名
   * @param body 本文
   * @param from 送信元メールアドレス（オプション）
   * @returns 制限されたBCCリスト
   */
  private limitBccForUrlLength(
    bccList: string[],
    subject: string,
    body: string,
    from?: string
  ): string[] {
    const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
    const subjectEncoded = encodeURIComponent(subject);
    const bodyEncoded = encodeURIComponent(body);
    const fromEncoded = from ? encodeURIComponent(from) : '';
    
    // 基本URL + 件名 + 本文 + 送信元の長さ
    let currentLength = baseUrl.length + 
                       '&su='.length + subjectEncoded.length +
                       '&body='.length + bodyEncoded.length +
                       (from ? '&from='.length + fromEncoded.length : 0) +
                       '&bcc='.length;
    
    const result: string[] = [];
    
    for (const email of bccList) {
      const emailEncoded = encodeURIComponent(email);
      const additionalLength = emailEncoded.length + (result.length > 0 ? 3 : 0); // カンマとエンコード分
      
      if (currentLength + additionalLength > this.MAX_URL_LENGTH) {
        console.warn(`URL length limit reached. Truncating BCC list at ${result.length} recipients.`);
        break;
      }
      
      result.push(email);
      currentLength += additionalLength;
    }
    
    return result;
  }

  /**
   * Gmailを新しいウィンドウで開く
   * @param url Gmail URL
   */
  openGmail(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * 送信元メールアドレスを取得
   * @returns 送信元メールアドレス
   */
  getFromEmail(): string {
    return this.FROM_EMAIL;
  }

  /**
   * 既存のメール送信APIを使用して直接メールを送信
   * @param template メールテンプレート
   * @param propertyData 物件データ
   * @param recipientEmails 送信先メールアドレスリスト
   * @param from 送信元メールアドレス
   * @param buyers 買主情報
   * @returns 送信結果
   */
  async sendEmailsDirectly(
    template: any,
    propertyData: Record<string, string>,
    recipientEmails: string[],
    from: string,
    _buyers: Array<{ buyer_number: string; email: string; [key: string]: any }>
  ): Promise<{
    success: boolean;
    successCount: number;
    failedCount: number;
    error?: string;
  }> {
    try {
      const subject = replacePlaceholders(template.subject, propertyData);
      const body = replacePlaceholders(template.body, propertyData);

      // 物件番号から一括メール送信APIを呼び出し
      const response = await api.post(
        `/api/property-listings/${propertyData.propertyNumber}/send-distribution-emails`,
        {
          templateId: template.id,
          recipientEmails,
          subject,
          content: body,
          htmlBody: body,
          from
        }
      );

      const result = response.data;
      
      return {
        success: result.failedCount === 0,
        successCount: result.successCount || 0,
        failedCount: result.failedCount || 0,
        error: result.error
      };
    } catch (error: any) {
      console.error('Failed to send emails directly:', error);
      
      // エラーレスポンスから詳細を取得
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send emails';
      
      return {
        success: false,
        successCount: 0,
        failedCount: recipientEmails.length,
        error: errorMessage
      };
    }
  }
}

export default new GmailDistributionService();
