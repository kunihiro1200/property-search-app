import { EmailService } from './EmailService';
import { EmailHistoryService } from './EmailHistoryService';
import { ActivityLogService } from './ActivityLogService';
import { supabase } from '../config/supabase';

/**
 * 物件問い合わせ返信メール生成サービス
 * 
 * スプレッドシートから物件データ(BQ列)を取得し、
 * メールテンプレートを生成してGmail APIで配信します。
 */

export interface InquiryResponseEmailParams {
  propertyNumbers: string[];
  buyerName: string;
  buyerEmail: string;
  senderAddress: string;
  buyerId?: string; // Optional buyer ID for email history tracking
}

export interface PropertyInquiryInfo {
  propertyNumber: string;
  address: string;
  athomeUrl: string | null;
  preViewingInfo: string | null;
}

export interface GeneratedEmailContent {
  subject: string;
  body: string;
  properties: PropertyInquiryInfo[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class InquiryResponseService {
  private emailService: EmailService;
  private emailHistoryService: EmailHistoryService;
  private activityLogService: ActivityLogService;

  constructor() {
    this.emailService = new EmailService();
    this.emailHistoryService = new EmailHistoryService();
    this.activityLogService = new ActivityLogService();
  }

  /**
   * 問い合わせ返信メールの内容を生成
   */
  async generateEmailContent(
    params: InquiryResponseEmailParams
  ): Promise<GeneratedEmailContent> {
    try {
      // 各物件の情報を取得
      const properties: PropertyInquiryInfo[] = [];

      for (const propertyNumber of params.propertyNumbers) {
        // データベースから物件情報を取得
        const { data: propertyData, error } = await supabase
          .from('property_listings')
          .select('property_number, address, athome_url')
          .eq('property_number', propertyNumber)
          .single();

        if (error || !propertyData) {
          console.warn(`Property ${propertyNumber} not found in database`);
          continue;
        }

        // スプレッドシートから内覧前伝達事項を取得
        const preViewingInfo = await this.fetchPreViewingInfo(propertyNumber);

        properties.push({
          propertyNumber: propertyData.property_number,
          address: propertyData.address || '',
          athomeUrl: propertyData.athome_url || null,
          preViewingInfo,
        });
      }

      // メールテンプレートを生成
      const body = this.generateEmailTemplate(params.buyerName, properties);
      const subject = `【物件お問い合わせ】${properties.map(p => p.propertyNumber).join('、')}`;

      return {
        subject,
        body,
        properties,
      };
    } catch (error) {
      console.error('Error generating email content:', error);
      throw new Error('Failed to generate email content');
    }
  }

  /**
   * スプレッドシートから内覧前伝達事項を取得
   */
  async fetchPreViewingInfo(propertyNumber: string): Promise<string | null> {
    try {
      const spreadsheetId = process.env.PROPERTY_SPREADSHEET_ID;
      if (!spreadsheetId) {
        throw new Error('PROPERTY_SPREADSHEET_ID is not configured');
      }

      // 物件番号から行を検索
      const propertyRow = await this.findPropertyRow(spreadsheetId, propertyNumber);
      if (!propertyRow) {
        return null;
      }

      // BQ列(列番号69)のデータを取得
      const bqColumnIndex = 68; // 0-indexed (BQ = 69列目)
      const preViewingInfo = propertyRow[bqColumnIndex];

      return preViewingInfo && preViewingInfo.trim() !== '' ? preViewingInfo : null;
    } catch (error) {
      console.error('Error fetching pre-viewing info from sheet:', error);
      return null; // エラー時はnullを返して処理を継続
    }
  }

  /**
   * スプレッドシートから物件番号に一致する行を検索
   */
  private async findPropertyRow(
    spreadsheetId: string,
    propertyNumber: string
  ): Promise<any[] | null> {
    try {
      const { google } = require('googleapis');
      const { GoogleAuthService } = require('./GoogleAuthService');
      
      // 認証クライアントを取得
      const googleAuthService = new GoogleAuthService();
      const auth = await googleAuthService.getAuthenticatedClient();
      const sheets = google.sheets({ version: 'v4', auth });

      // A列(物件番号)を含む範囲を取得
      const range = 'シート1!A:BQ'; // A列からBQ列まで
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return null;
      }

      // ヘッダー行をスキップして物件番号で検索
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] === propertyNumber) {
          return row;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding property row:', error);
      throw error;
    }
  }

  /**
   * メールテンプレートを生成
   */
  private generateEmailTemplate(
    buyerName: string,
    properties: PropertyInquiryInfo[]
  ): string {
    const viewingSurveyUrl = process.env.VIEWING_SURVEY_URL || 'https://forms.gle/example';

    let template = `${buyerName}様\n\n`;
    template += `この度はお問い合わせありがとうございます。株式会社いふうと申します。\n\n`;

    // 各物件の情報を追加
    properties.forEach((property, index) => {
      if (index > 0) {
        template += `\n---\n\n`;
      }

      template += `【物件番号: ${property.propertyNumber}】\n`;
      template += `所在地: ${property.address}\n`;
      
      if (property.athomeUrl) {
        template += `${property.athomeUrl}\n`;
      }

      template += `\n上記の物件のお問い合わせ、ありがとうございます。\n`;

      // 内覧前伝達事項を明確なフォーマットで追加
      template += `\n内覧前伝達事項:\n`;
      if (property.preViewingInfo && property.preViewingInfo.trim() !== '') {
        template += `${property.preViewingInfo}\n`;
      } else {
        template += `特になし\n`;
      }
    });

    template += `\nご不明な点等ございましたら、お気軽にお問い合わせください。\n\n`;
    template += `内覧ご希望の際は、下記よりご予約お願いいたします。\n`;
    template += `↓↓\n${viewingSurveyUrl}\n\n`;
    template += `★水曜日は定休日となっておりますのでそれ以外の日程でお願いいたします。\n\n`;
    template += `また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡ください。\n\n`;
    template += `それでは、引き続きよろしくお願いいたします。\n\n`;

    // 会社署名を追加
    template += this.getCompanySignature();

    return template;
  }

  /**
   * 会社署名ブロックを取得
   */
  private getCompanySignature(): string {
    return `***************************
株式会社 いふう 
〒870-0044
大分市舞鶴町1丁目3-30
TEL：097-533-2022 
FAX：097-529-7160 
MAIL:tenant@ifoo-oita.com 
HP：https://ifoo-oita.com/ 
採用HP：https://en-gage.net/ifoo-oita/
店休日：毎週水曜日 年末年始、GW、盆 
***************************`;
  }

  /**
   * 問い合わせ返信メールを送信
   */
  async sendInquiryResponseEmail(
    params: InquiryResponseEmailParams,
    emailContent: GeneratedEmailContent,
    employeeId?: string
  ): Promise<EmailResult> {
    try {
      // EmailServiceのsendDistributionEmailメソッドを使用
      const result = await this.emailService.sendDistributionEmail({
        senderAddress: params.senderAddress,
        recipients: [params.buyerEmail],
        subject: emailContent.subject,
        body: emailContent.body,
        propertyNumber: params.propertyNumbers.join(','),
      });

      if (result.success) {
        // Save email history if buyerId is provided
        if (params.buyerId) {
          try {
            await this.emailHistoryService.saveEmailHistory({
              buyerId: params.buyerId,
              propertyNumbers: params.propertyNumbers,
              recipientEmail: params.buyerEmail,
              subject: emailContent.subject,
              body: emailContent.body,
              senderEmail: params.senderAddress,
              emailType: 'inquiry_response',
            });
          } catch (historyError) {
            // Log error but don't fail the email send
            console.error('Failed to save email history:', historyError);
          }
        }

        // activity_logsに記録（通話モードと同じアプローチ）
        if (params.buyerId && employeeId) {
          try {
            // 内覧前伝達事項を抽出
            const preViewingNotes = emailContent.properties
              .map(p => p.preViewingInfo)
              .filter(info => info && info.trim() !== '')
              .join('\n\n');

            await this.activityLogService.logEmail({
              buyerId: params.buyerId,
              propertyNumbers: params.propertyNumbers,
              recipientEmail: params.buyerEmail,
              subject: emailContent.subject,
              senderEmail: params.senderAddress,
              preViewingNotes: preViewingNotes || undefined,
              createdBy: employeeId,
            });
          } catch (activityError) {
            // Log error but don't fail the email send
            console.error('Failed to log email activity:', activityError);
          }
        }

        return {
          success: true,
          messageId: 'sent', // sendDistributionEmailはmessageIdを返さないため
        };
      } else {
        return {
          success: false,
          error: result.message,
        };
      }
    } catch (error: any) {
      console.error('Error sending inquiry response email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * メールプレビューを生成 (送信せずに内容を確認)
   */
  async generatePreview(
    params: InquiryResponseEmailParams
  ): Promise<GeneratedEmailContent> {
    return this.generateEmailContent(params);
  }
}
