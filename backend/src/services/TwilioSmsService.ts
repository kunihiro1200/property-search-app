import twilio from 'twilio';

/**
 * Twilio SMS送信サービス
 * 
 * 環境変数:
 * - TWILIO_ACCOUNT_SID: TwilioアカウントSID
 * - TWILIO_AUTH_TOKEN: Twilio認証トークン
 * - TWILIO_PHONE_NUMBER: Twilio電話番号（送信元）
 */
export class TwilioSmsService {
  private client: twilio.Twilio | null = null;
  private fromPhoneNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !this.fromPhoneNumber) {
      console.warn('Twilio credentials not configured. SMS sending will be disabled.');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      console.log('Twilio SMS Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
    }
  }

  /**
   * 単一のSMSを送信
   */
  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your credentials.',
      };
    }

    try {
      // 電話番号のフォーマット（日本の場合は+81で始まる必要がある）
      const formattedTo = this.formatPhoneNumber(to);

      const message_result = await this.client.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to: formattedTo,
      });

      return {
        success: true,
        messageId: message_result.sid,
      };
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * 複数のSMSを一括送信
   */
  async sendBulkSms(
    recipients: Array<{ phoneNumber: string; message: string }>
  ): Promise<{
    successCount: number;
    failedCount: number;
    results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    if (!this.client) {
      return {
        successCount: 0,
        failedCount: recipients.length,
        results: recipients.map(r => ({
          phoneNumber: r.phoneNumber,
          success: false,
          error: 'Twilio client not initialized',
        })),
      };
    }

    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const result = await this.sendSms(recipient.phoneNumber, recipient.message);
        return {
          phoneNumber: recipient.phoneNumber,
          ...result,
        };
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedCount = results.length - successCount;

    return {
      successCount,
      failedCount,
      results: results.map(r => r.status === 'fulfilled' ? r.value : {
        phoneNumber: '',
        success: false,
        error: 'Promise rejected',
      }),
    };
  }

  /**
   * 電話番号を国際フォーマットに変換
   * 日本の電話番号の場合、+81形式に変換
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // ハイフンやスペースを削除
    let cleaned = phoneNumber.replace(/[-\s]/g, '');

    // 既に+81で始まっている場合はそのまま返す
    if (cleaned.startsWith('+81')) {
      return cleaned;
    }

    // 0で始まる場合は+81に置き換え
    if (cleaned.startsWith('0')) {
      return '+81' + cleaned.substring(1);
    }

    // それ以外の場合は+81を追加
    return '+81' + cleaned;
  }

  /**
   * Twilioクライアントが初期化されているか確認
   */
  isConfigured(): boolean {
    return this.client !== null;
  }
}

// シングルトンインスタンス
export const twilioSmsService = new TwilioSmsService();
