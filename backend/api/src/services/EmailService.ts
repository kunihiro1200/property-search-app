import { google } from 'googleapis';
import { BaseRepository } from '../repositories/BaseRepository';
import { Seller, ValuationResult } from '../types';
import { GoogleDriveService, DriveFile } from './GoogleDriveService';
import { ImageProcessorService, SelectedImages } from './ImageProcessorService';
import { ImageIdentifierService } from './ImageIdentifierService';
import { InlineImageProcessor, InlineImage } from './InlineImageProcessor';

export interface EmailResult {
  messageId: string;
  sentAt: Date;
  success: boolean;
  error?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailWithImagesParams {
  sellerId: string;
  sellerNumber: string;
  to: string;
  subject: string;
  body: string;
  from: string;
  selectedImages?: SelectedImages;  // 手動選択された画像
}

export interface DistributionEmailParams {
  senderAddress: string;
  recipients: string[];
  subject: string;
  body: string;
  propertyNumber: string;
}

export interface DistributionEmailResponse {
  success: boolean;
  message: string;
  recipientCount: number;
  batchCount?: number;
  errors?: string[];
}

export class EmailService extends BaseRepository {
  private gmail: any;
  private driveService: GoogleDriveService;
  private imageProcessor: ImageProcessorService;
  private imageIdentifier: ImageIdentifierService;
  private inlineImageProcessor: InlineImageProcessor;

  // Send As アドレスのホワイトリスト
  private readonly ALLOWED_SEND_AS_ADDRESSES = [
    'tenant@ifoo-oita.com',
    'gyosha@ifoo-oita.com',
    'hiromitsu-kakui@ifoo-oita.com',
    'tomoko.kunihiro@ifoo-oita.com',
    'info@ifoo-oita.com'
  ];

  constructor() {
    super();
    // Gmail APIは遅延初期化（最初の使用時に初期化）
    this.driveService = new GoogleDriveService();
    this.imageProcessor = new ImageProcessorService();
    this.imageIdentifier = new ImageIdentifierService();
    this.inlineImageProcessor = new InlineImageProcessor();
  }

  /**
   * Gmail APIを初期化
   */
  private async initializeGmail() {
    try {
      // GoogleAuthServiceを使用して認証済みクライアントを取得
      const { GoogleAuthService } = await import('./GoogleAuthService');
      const googleAuthService = new GoogleAuthService();
      const oauth2Client = await googleAuthService.getAuthenticatedClient();
      
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      console.log('✅ Gmail API initialized with authenticated client');
    } catch (error) {
      console.warn('⚠️ Gmail API initialization failed:', error);
      // フォールバック: 環境変数から直接初期化
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    }
  }

  /**
   * Gmail APIが初期化されていることを確認
   */
  private async ensureGmailInitialized() {
    if (!this.gmail) {
      await this.initializeGmail();
    }
  }

  /**
   * Send As アドレスを検証
   * @param address 送信元アドレス
   * @throws Error 無効なアドレスの場合
   */
  private validateSendAsAddress(address: string): void {
    if (!this.ALLOWED_SEND_AS_ADDRESSES.includes(address)) {
      const error = new Error(
        `Invalid Send As address: ${address}. ` +
        `Allowed addresses: ${this.ALLOWED_SEND_AS_ADDRESSES.join(', ')}`
      );
      console.error('❌ Send As validation failed:', {
        attemptedAddress: address,
        allowedAddresses: this.ALLOWED_SEND_AS_ADDRESSES
      });
      throw error;
    }
    console.log(`✅ Send As address validated: ${address}`);
  }

  /**
   * 査定メールを送信
   */
  async sendValuationEmail(
    seller: Seller,
    valuation: ValuationResult,
    employeeEmail: string
  ): Promise<EmailResult> {
    try {
      // メールテンプレートを生成
      const template = this.generateValuationEmailTemplate(seller, valuation);

      // メールを送信
      const result = await this.sendEmail(
        seller.email || seller.phoneNumber, // メールアドレスがない場合は電話番号（実際は別の方法で通知）
        template.subject,
        template.body,
        employeeEmail
      );

      return result;
    } catch (error) {
      console.error('Send valuation email error:', error);
      return {
        messageId: '',
        sentAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 追客メールを送信
   */
  async sendFollowUpEmail(
    seller: Seller,
    content: string,
    employeeEmail: string
  ): Promise<EmailResult> {
    try {
      const subject = `【フォローアップ】${seller.name}様へのご連絡`;

      const result = await this.sendEmail(
        seller.email || seller.phoneNumber,
        subject,
        content,
        employeeEmail
      );

      return result;
    } catch (error) {
      console.error('Send follow-up email error:', error);
      return {
        messageId: '',
        sentAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * メールを送信（Gmail API使用）
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    from: string
  ): Promise<EmailResult> {
    try {
      // メールメッセージを作成
      const message = this.createMessage(to, from, subject, body);

      // Gmail APIで送信（実際の実装では、リトライロジックを追加）
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      return {
        messageId: response.data.id,
        sentAt: new Date(),
        success: true,
      };
    } catch (error) {
      console.error('Gmail API error:', error);
      
      // リトライ可能なエラーの場合は、指数バックオフでリトライ
      // ここでは簡易実装
      throw error;
    }
  }

  /**
   * メールメッセージを作成（Base64エンコード）
   */
  private createMessage(
    to: string,
    from: string,
    subject: string,
    body: string
  ): string {
    // 日本語の件名をRFC 2047形式でエンコード
    const encodedSubject = this.encodeSubject(subject);
    
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  /**
   * 件名をRFC 2047形式でエンコード（日本語対応）
   */
  private encodeSubject(subject: string): string {
    // ASCII文字のみの場合はそのまま返す
    if (/^[\x00-\x7F]*$/.test(subject)) {
      return subject;
    }
    
    // UTF-8でBase64エンコード
    const encoded = Buffer.from(subject, 'utf-8').toString('base64');
    return `=?UTF-8?B?${encoded}?=`;
  }

  /**
   * 査定メールテンプレートを生成
   */
  private generateValuationEmailTemplate(
    seller: Seller,
    valuation: ValuationResult
  ): EmailTemplate {
    const subject = `【査定結果】${seller.name}様の物件査定について`;

    const body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f5f5f5; }
    .price { font-size: 24px; font-weight: bold; color: #1976d2; margin: 20px 0; }
    .details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .warning { background-color: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>物件査定結果のご報告</h1>
    </div>
    
    <div class="content">
      <p>${seller.name} 様</p>
      
      <p>いつもお世話になっております。<br>
      ご依頼いただきました物件の査定が完了いたしましたので、ご報告申し上げます。</p>
      
      <div class="details">
        <h2>査定結果</h2>
        <div class="price">
          査定額: ${valuation.estimatedPrice.toLocaleString()}円
        </div>
        <p>価格範囲: ${valuation.priceMin.toLocaleString()}円 〜 ${valuation.priceMax.toLocaleString()}円</p>
      </div>
      
      <div class="details">
        <h3>計算根拠</h3>
        <pre style="white-space: pre-wrap;">${valuation.calculationBasis}</pre>
      </div>
      
      ${
        valuation.warnings && valuation.warnings.length > 0
          ? `
      <div class="warning">
        <h3>⚠️ 注意事項</h3>
        <ul>
          ${valuation.warnings.map((w) => `<li>${w}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }
      
      <p>この査定結果は、現在の市場動向と物件情報に基づいた概算となります。<br>
      より詳細な査定をご希望の場合は、訪問査定をお勧めいたします。</p>
      
      <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
    </div>
    
    <div class="footer">
      <p>このメールは自動送信されています。<br>
      返信される場合は、担当者のメールアドレスへお願いいたします。</p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, body };
  }

  /**
   * 画像付きメールを送信（インライン画像対応）
   */
  async sendEmailWithImages(params: EmailWithImagesParams): Promise<EmailResult> {
    try {
      // HTML内のインライン画像を処理
      const processed = this.inlineImageProcessor.processHtmlWithImages(params.body);

      let message: string;

      if (processed.useDataUrls) {
        // Data URLをそのまま使用（小さい画像の場合）
        message = this.createHtmlMessageWithDataUrls(
          params.to,
          params.from,
          params.subject,
          processed.html
        );
      } else {
        // CID参照を使用（大きい画像の場合）
        message = this.createMultipartRelatedMessage(
          params.to,
          params.from,
          params.subject,
          processed.html,
          processed.inlineImages
        );
      }

      // Gmail APIで送信
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      return {
        messageId: response.data.id,
        sentAt: new Date(),
        success: true,
      };
    } catch (error) {
      console.error('Send email with images error:', error);
      return {
        messageId: '',
        sentAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 画像付きメールを送信（従来の添付ファイル方式 - 後方互換性のため保持）
   * Note: ImageProcessorServiceの実装が必要
   */
  // async sendEmailWithAttachments(params: EmailWithImagesParams): Promise<EmailResult> {
  //   try {
  //     // TODO: ImageProcessorServiceにprocessImagesForEmailメソッドを実装
  //     // const processedEmail = await this.imageProcessor.processImagesForEmail({
  //     //   sellerId: params.sellerId,
  //     //   sellerNumber: params.sellerNumber,
  //     //   selectedImages: params.selectedImages,
  //     // });

  //     // マルチパートメールを作成
  //     const message = this.createMultipartMessage(
  //       params.to,
  //       params.from,
  //       params.subject,
  //       params.body,
  //       [] // processedEmail.attachments
  //     );

  //     // Gmail APIで送信
  //     const response = await this.gmail.users.messages.send({
  //       userId: 'me',
  //       requestBody: {
  //         raw: message,
  //       },
  //     });

  //     return {
  //       messageId: response.data.id,
  //       sentAt: new Date(),
  //       success: true,
  //     };
  //   } catch (error) {
  //     console.error('Send email with attachments error:', error);
  //     return {
  //       messageId: '',
  //       sentAt: new Date(),
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error',
  //     };
  //   }
  // }

  /**
   * multipart/relatedメッセージを作成（インライン画像対応）
   */
  private createMultipartRelatedMessage(
    to: string,
    from: string,
    subject: string,
    html: string,
    inlineImages: InlineImage[]
  ): string {
    const boundaryMain = '----=_Part_Main_' + Date.now();
    const boundaryAlt = '----=_Part_Alt_' + Date.now();
    
    // 日本語の件名をRFC 2047形式でエンコード
    const encodedSubject = this.encodeSubject(subject);
    
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${boundaryMain}"`,
      '',
      `--${boundaryMain}`,
      `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
      '',
      `--${boundaryAlt}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      'このメールはHTML形式です。HTMLメールに対応したメールクライアントでご覧ください。',
      '',
      `--${boundaryAlt}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      html,
      '',
      `--${boundaryAlt}--`,
      '',
    ];

    // インライン画像を追加
    for (const image of inlineImages) {
      messageParts.push(`--${boundaryMain}`);
      messageParts.push(`Content-Type: ${image.mimeType}`);
      messageParts.push('Content-Transfer-Encoding: base64');
      messageParts.push(`Content-ID: <${image.id}>`);
      messageParts.push('Content-Disposition: inline');
      messageParts.push('');
      messageParts.push(image.data.toString('base64'));
      messageParts.push('');
    }

    messageParts.push(`--${boundaryMain}--`);

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  /**
   * Data URLを含むHTMLメッセージを作成
   */
  private createHtmlMessageWithDataUrls(
    to: string,
    from: string,
    subject: string,
    html: string
  ): string {
    // 日本語の件名をRFC 2047形式でエンコード
    const encodedSubject = this.encodeSubject(subject);
    
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      html,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  /**
   * マルチパートメールメッセージを作成（画像添付対応 - 後方互換性のため保持）
   */
  private createMultipartMessage(
    to: string,
    from: string,
    subject: string,
    body: string,
    attachments: Array<{ filename: string; mimeType: string; data: Buffer }>
  ): string {
    const boundary = '----=_Part_' + Date.now();
    
    // 日本語の件名をRFC 2047形式でエンコード
    const encodedSubject = this.encodeSubject(subject);
    
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      body,
      '',
    ];

    // 添付ファイルを追加
    for (const attachment of attachments) {
      messageParts.push(`--${boundary}`);
      messageParts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
      messageParts.push('Content-Transfer-Encoding: base64');
      messageParts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      messageParts.push('');
      messageParts.push(attachment.data.toString('base64'));
      messageParts.push('');
    }

    messageParts.push(`--${boundary}--`);

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  /**
   * 売主の画像を取得（プレビュー用）
   */
  async getSellerImages(sellerId: string): Promise<DriveFile[]> {
    try {
      const files = await this.driveService.listFiles(sellerId);
      
      // 画像ファイルのみをフィルタリング
      const imageFiles = files.filter(file => 
        this.imageIdentifier.isImageFile(file.name)
      );

      return imageFiles;
    } catch (error) {
      console.error('Get seller images error:', error);
      return [];
    }
  }

  /**
   * メールテンプレートを取得
   */
  async getTemplate(_templateId: string): Promise<EmailTemplate> {
    // 実装: データベースからテンプレートを取得
    // ここでは簡易実装
    return {
      subject: 'テンプレート件名',
      body: 'テンプレート本文',
    };
  }

  /**
   * Gmail配信メールを送信（バッチ処理対応）
   */
  async sendDistributionEmail(params: DistributionEmailParams): Promise<DistributionEmailResponse> {
    // Gmail APIを初期化
    await this.ensureGmailInitialized();
    
    const { senderAddress, recipients, subject, body, propertyNumber } = params;
    
    // Send As アドレスを事前検証
    try {
      this.validateSendAsAddress(senderAddress);
    } catch (error) {
      console.error('❌ Send As validation failed before sending:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Invalid sender address',
        recipientCount: 0,
        errors: [error instanceof Error ? error.message : 'Invalid sender address']
      };
    }
    
    // バッチサイズ（Gmail APIの制限に基づく）
    const MAX_BCC_PER_BATCH = 100;
    const BATCH_DELAY_MS = 1000; // バッチ間の遅延（1秒）
    
    // 受信者をバッチに分割
    const batches = this.splitIntoBatches(recipients, MAX_BCC_PER_BATCH);
    
    console.log(`📧 Sending distribution email for property ${propertyNumber}`);
    console.log(`📤 Sender: ${senderAddress}`);
    console.log(`📊 Total recipients: ${recipients.length}`);
    console.log(`📦 Batches: ${batches.length}`);
    
    const errors: string[] = [];
    let successCount = 0;
    
    // 各バッチを送信
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        await this.sendBatch({
          senderAddress,
          recipients: batch,
          subject,
          body,
        });
        
        successCount += batch.length;
        console.log(`✅ Batch ${i + 1}/${batches.length} sent successfully (${batch.length} recipients)`);
        
        // バッチ間で待機（レート制限回避）
        if (i < batches.length - 1) {
          await this.delay(BATCH_DELAY_MS);
        }
      } catch (error) {
        console.error(`❌ Batch ${i + 1}/${batches.length} failed:`, error);
        errors.push(`バッチ ${i + 1} の送信に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // 結果を返す
    if (errors.length === 0) {
      return {
        success: true,
        message: 'メールを送信しました',
        recipientCount: successCount,
        batchCount: batches.length,
      };
    } else if (successCount > 0) {
      return {
        success: true,
        message: `一部のメールを送信しました (${successCount}/${recipients.length}件)`,
        recipientCount: successCount,
        batchCount: batches.length,
        errors,
      };
    } else {
      return {
        success: false,
        message: 'メール送信に失敗しました',
        recipientCount: 0,
        batchCount: batches.length,
        errors,
      };
    }
  }

  /**
   * バッチ送信（BCC使用）
   */
  private async sendBatch(params: {
    senderAddress: string;
    recipients: string[];
    subject: string;
    body: string;
  }): Promise<void> {
    const { senderAddress, recipients, subject, body } = params;
    
    // Send As アドレスを検証
    this.validateSendAsAddress(senderAddress);
    
    console.log(`📧 Sending batch email:`);
    console.log(`  From: ${senderAddress}`);
    console.log(`  Recipients: ${recipients.length}`);
    console.log(`  Subject: ${subject}`);
    
    // RFC 2822形式のメッセージを作成
    const message = [
      `From: ${senderAddress}`,
      `Reply-To: ${senderAddress}`,
      `Bcc: ${recipients.join(', ')}`,
      `Subject: ${this.encodeSubject(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      body,
    ].join('\r\n');
    
    // Base64url形式でエンコード
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    try {
      // Gmail APIで送信
      // Note: Gmail APIは認証されたアカウントから送信するため、
      // Send Asアドレスが正しく設定されている必要があります
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });
      
      console.log(`✅ Batch email sent successfully (Message ID: ${response.data.id})`);
    } catch (error: any) {
      console.error(`❌ Failed to send batch email:`, {
        senderAddress,
        recipientCount: recipients.length,
        error: error.message,
        errorDetails: error.response?.data
      });
      
      // Send As設定に関するエラーの場合、より詳細なメッセージを提供
      if (error.message?.includes('sendAs') || error.message?.includes('delegation')) {
        throw new Error(
          `Send As configuration error for ${senderAddress}. ` +
          `Please ensure this address is configured in Gmail Settings > Accounts > Send mail as. ` +
          `Original error: ${error.message}`
        );
      }
      
      throw error;
    }
  }

  /**
   * 配列をバッチに分割
   */
  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
