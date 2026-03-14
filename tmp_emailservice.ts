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
  selectedImages?: SelectedImages;  // 謇句虚驕ｸ謚槭＆繧後◆逕ｻ蜒・}

export interface BuyerEmailParams {
  to: string;
  subject: string;
  body: string;
  selectedImages?: any[];  // 逕ｻ蜒乗ｷｻ莉倥ョ繝ｼ繧ｿ
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

  // Send As 繧｢繝峨Ξ繧ｹ縺ｮ繝帙Ρ繧､繝医Μ繧ｹ繝・  private readonly ALLOWED_SEND_AS_ADDRESSES = [
    'tenant@ifoo-oita.com',
    'gyosha@ifoo-oita.com',
    'hiromitsu-kakui@ifoo-oita.com',
    'tomoko.kunihiro@ifoo-oita.com',
    'info@ifoo-oita.com'
  ];

  constructor() {
    super();
    // Gmail API縺ｯ驕・ｻｶ蛻晄悄蛹厄ｼ域怙蛻昴・菴ｿ逕ｨ譎ゅ↓蛻晄悄蛹厄ｼ・    this.driveService = new GoogleDriveService();
    this.imageProcessor = new ImageProcessorService();
    this.imageIdentifier = new ImageIdentifierService();
    this.inlineImageProcessor = new InlineImageProcessor();
  }

  /**
   * Gmail API繧貞・譛溷喧
   */
  private async initializeGmail() {
    try {
      console.log('[EmailService.initializeGmail] Starting Gmail API initialization...');
      
      // GoogleAuthService繧剃ｽｿ逕ｨ縺励※隱崎ｨｼ貂医∩繧ｯ繝ｩ繧､繧｢繝ｳ繝医ｒ蜿門ｾ・      const { GoogleAuthService } = await import('./GoogleAuthService');
      const googleAuthService = new GoogleAuthService();
      
      console.log('[EmailService.initializeGmail] Getting authenticated client...');
      const oauth2Client = await googleAuthService.getAuthenticatedClient();
      
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      console.log('笨・Gmail API initialized with authenticated client');
    } catch (error) {
      console.error('笞・・Gmail API initialization failed:', error);
      console.error('笞・・Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: 迺ｰ蠅・､画焚縺九ｉ逶ｴ謗･蛻晄悄蛹・      console.log('[EmailService.initializeGmail] Attempting fallback initialization...');
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
          process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
          process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
        );
        
        // 繝ｪ繝輔Ξ繝・す繝･繝医・繧ｯ繝ｳ繧定ｨｭ螳夲ｼ・MAIL_REFRESH_TOKEN繧貞━蜈茨ｼ・        const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
        if (refreshToken) {
          oauth2Client.setCredentials({
            refresh_token: refreshToken,
          });
          console.log('[EmailService.initializeGmail] Refresh token set from:', 
            process.env.GMAIL_REFRESH_TOKEN ? 'GMAIL_REFRESH_TOKEN' : 'GOOGLE_REFRESH_TOKEN');
        } else {
          console.error('[EmailService.initializeGmail] Neither GMAIL_REFRESH_TOKEN nor GOOGLE_REFRESH_TOKEN found in environment');
          throw new Error('GMAIL_REFRESH_TOKEN or GOOGLE_REFRESH_TOKEN not found in environment variables');
        }
        
        this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        console.log('笨・Gmail API initialized with fallback method');
      } catch (fallbackError) {
        console.error('笶・Fallback initialization also failed:', fallbackError);
        throw new Error(
          `Gmail API initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Gmail API縺悟・譛溷喧縺輔ｌ縺ｦ縺・ｋ縺薙→繧堤｢ｺ隱・   */
  private async ensureGmailInitialized() {
    if (!this.gmail) {
      await this.initializeGmail();
    }
  }

  /**
   * Send As 繧｢繝峨Ξ繧ｹ繧呈､懆ｨｼ
   * @param address 騾∽ｿ｡蜈・い繝峨Ξ繧ｹ
   * @throws Error 辟｡蜉ｹ縺ｪ繧｢繝峨Ξ繧ｹ縺ｮ蝣ｴ蜷・   */
  private validateSendAsAddress(address: string): void {
    if (!this.ALLOWED_SEND_AS_ADDRESSES.includes(address)) {
      const error = new Error(
        `Invalid Send As address: ${address}. ` +
        `Allowed addresses: ${this.ALLOWED_SEND_AS_ADDRESSES.join(', ')}`
      );
      console.error('笶・Send As validation failed:', {
        attemptedAddress: address,
        allowedAddresses: this.ALLOWED_SEND_AS_ADDRESSES
      });
      throw error;
    }
    console.log(`笨・Send As address validated: ${address}`);
  }

  /**
   * 譟ｻ螳壹Γ繝ｼ繝ｫ繧帝∽ｿ｡
   */
  async sendValuationEmail(
    seller: Seller,
    valuation: ValuationResult,
    employeeEmail: string
  ): Promise<EmailResult> {
    try {
      // 繝｡繝ｼ繝ｫ繝・Φ繝励Ξ繝ｼ繝医ｒ逕滓・
      const template = this.generateValuationEmailTemplate(seller, valuation);

      // 繝｡繝ｼ繝ｫ繧帝∽ｿ｡
      const result = await this.sendEmail(
        seller.email || seller.phoneNumber, // 繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺後↑縺・ｴ蜷医・髮ｻ隧ｱ逡ｪ蜿ｷ・亥ｮ滄圀縺ｯ蛻･縺ｮ譁ｹ豕輔〒騾夂衍・・        template.subject,
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
   * 霑ｽ螳｢繝｡繝ｼ繝ｫ繧帝∽ｿ｡
   */
  async sendFollowUpEmail(
    seller: Seller,
    content: string,
    employeeEmail: string
  ): Promise<EmailResult> {
    try {
      const subject = `縲舌ヵ繧ｩ繝ｭ繝ｼ繧｢繝・・縲・{seller.name}讒倥∈縺ｮ縺秘｣邨｡`;

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
   * 繝｡繝ｼ繝ｫ繧帝∽ｿ｡・・mail API菴ｿ逕ｨ・・   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    from: string
  ): Promise<EmailResult> {
    try {
      // 繝｡繝ｼ繝ｫ繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
      const message = this.createMessage(to, from, subject, body);

      // Gmail API縺ｧ騾∽ｿ｡・亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ縲√Μ繝医Λ繧､繝ｭ繧ｸ繝・け繧定ｿｽ蜉・・      const response = await this.gmail.users.messages.send({
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
      
      // 繝ｪ繝医Λ繧､蜿ｯ閭ｽ縺ｪ繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・縲∵欠謨ｰ繝舌ャ繧ｯ繧ｪ繝輔〒繝ｪ繝医Λ繧､
      // 縺薙％縺ｧ縺ｯ邁｡譏灘ｮ溯｣・      throw error;
    }
  }

  /**
   * 繝｡繝ｼ繝ｫ繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・・・ase64繧ｨ繝ｳ繧ｳ繝ｼ繝会ｼ・   */
  private createMessage(
    to: string,
    from: string,
    subject: string,
    body: string
  ): string {
    // 譌･譛ｬ隱槭・莉ｶ蜷阪ｒRFC 2047蠖｢蠑上〒繧ｨ繝ｳ繧ｳ繝ｼ繝・    const encodedSubject = this.encodeSubject(subject);
    
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
   * 莉ｶ蜷阪ｒRFC 2047蠖｢蠑上〒繧ｨ繝ｳ繧ｳ繝ｼ繝会ｼ域律譛ｬ隱槫ｯｾ蠢懶ｼ・   */
  private encodeSubject(subject: string): string {
    // ASCII譁・ｭ励・縺ｿ縺ｮ蝣ｴ蜷医・縺昴・縺ｾ縺ｾ霑斐☆
    if (/^[\x00-\x7F]*$/.test(subject)) {
      return subject;
    }
    
    // UTF-8縺ｧBase64繧ｨ繝ｳ繧ｳ繝ｼ繝・    const encoded = Buffer.from(subject, 'utf-8').toString('base64');
    return `=?UTF-8?B?${encoded}?=`;
  }

  /**
   * 譟ｻ螳壹Γ繝ｼ繝ｫ繝・Φ繝励Ξ繝ｼ繝医ｒ逕滓・
   */
  private generateValuationEmailTemplate(
    seller: Seller,
    valuation: ValuationResult
  ): EmailTemplate {
    const subject = `縲先渊螳夂ｵ先棡縲・{seller.name}讒倥・迚ｩ莉ｶ譟ｻ螳壹↓縺､縺・※`;

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
      <h1>迚ｩ莉ｶ譟ｻ螳夂ｵ先棡縺ｮ縺泌ｱ蜻・/h1>
    </div>
    
    <div class="content">
      <p>${seller.name} 讒・/p>
      
      <p>縺・▽繧ゅ♀荳冶ｩｱ縺ｫ縺ｪ縺｣縺ｦ縺翫ｊ縺ｾ縺吶・br>
      縺比ｾ晞ｼ縺・◆縺縺阪∪縺励◆迚ｩ莉ｶ縺ｮ譟ｻ螳壹′螳御ｺ・＞縺溘＠縺ｾ縺励◆縺ｮ縺ｧ縲√＃蝣ｱ蜻顔筏縺嶺ｸ翫￡縺ｾ縺吶・/p>
      
      <div class="details">
        <h2>譟ｻ螳夂ｵ先棡</h2>
        <div class="price">
          譟ｻ螳夐｡・ ${valuation.estimatedPrice.toLocaleString()}蜀・        </div>
        <p>萓｡譬ｼ遽・峇: ${valuation.priceMin.toLocaleString()}蜀・縲・${valuation.priceMax.toLocaleString()}蜀・/p>
      </div>
      
      <div class="details">
        <h3>險育ｮ玲ｹ諡</h3>
        <pre style="white-space: pre-wrap;">${valuation.calculationBasis}</pre>
      </div>
      
      ${
        valuation.warnings && valuation.warnings.length > 0
          ? `
      <div class="warning">
        <h3>笞・・豕ｨ諢丈ｺ矩・/h3>
        <ul>
          ${valuation.warnings.map((w) => `<li>${w}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }
      
      <p>縺薙・譟ｻ螳夂ｵ先棡縺ｯ縲∫樟蝨ｨ縺ｮ蟶ょｴ蜍募髄縺ｨ迚ｩ莉ｶ諠・ｱ縺ｫ蝓ｺ縺･縺・◆讎らｮ励→縺ｪ繧翫∪縺吶・br>
      繧医ｊ隧ｳ邏ｰ縺ｪ譟ｻ螳壹ｒ縺泌ｸ梧悍縺ｮ蝣ｴ蜷医・縲∬ｨｪ蝠乗渊螳壹ｒ縺雁匡繧√＞縺溘＠縺ｾ縺吶・/p>
      
      <p>縺比ｸ肴・縺ｪ轤ｹ縺後＃縺悶＞縺ｾ縺励◆繧峨√♀豌苓ｻｽ縺ｫ縺雁撫縺・粋繧上○縺上□縺輔＞縲・/p>
    </div>
    
    <div class="footer">
      <p>縺薙・繝｡繝ｼ繝ｫ縺ｯ閾ｪ蜍暮∽ｿ｡縺輔ｌ縺ｦ縺・∪縺吶・br>
      霑比ｿ｡縺輔ｌ繧句ｴ蜷医・縲∵球蠖楢・・繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｸ縺企｡倥＞縺・◆縺励∪縺吶・/p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, body };
  }

  /**
   * 雋ｷ荳ｻ縺ｸ縺ｮ繝｡繝ｼ繝ｫ繧帝∽ｿ｡・育判蜒乗ｷｻ莉伜ｯｾ蠢懶ｼ・   */
  async sendBuyerEmail(params: BuyerEmailParams): Promise<EmailResult> {
    try {
      console.log('[EmailService.sendBuyerEmail] Starting email send:', {
        to: params.to,
        subject: params.subject,
        bodyLength: params.body?.length || 0,
        hasImages: params.selectedImages && params.selectedImages.length > 0,
        imageCount: params.selectedImages?.length || 0,
      });

      // Gmail API繧貞・譛溷喧
      console.log('[EmailService.sendBuyerEmail] Initializing Gmail API...');
      await this.ensureGmailInitialized();
      console.log('[EmailService.sendBuyerEmail] Gmail API initialized');

      // 騾∽ｿ｡蜈・い繝峨Ξ繧ｹ・医ョ繝輔か繝ｫ繝茨ｼ・      const from = 'tenant@ifoo-oita.com';

      // 謾ｹ陦後ｒ<br>繧ｿ繧ｰ縺ｫ螟画鋤・・TML繝｡繝ｼ繝ｫ逕ｨ・・      const htmlBody = params.body.replace(/\n/g, '<br>');

      // 逕ｻ蜒乗ｷｻ莉倥′縺ｪ縺・ｴ蜷医・繧ｷ繝ｳ繝励Ν縺ｪHTML繝｡繝ｼ繝ｫ繧帝∽ｿ｡
      if (!params.selectedImages || params.selectedImages.length === 0) {
        console.log('[EmailService.sendBuyerEmail] Sending simple HTML email (no images)');
        
        const message = this.createHtmlMessageWithDataUrls(
          params.to,
          from,
          params.subject,
          htmlBody  // 謾ｹ陦後ｒ<br>縺ｫ螟画鋤縺励◆HTML繧剃ｽｿ逕ｨ
        );

        console.log('[EmailService.sendBuyerEmail] Message created, sending via Gmail API...');

        // Gmail API縺ｧ騾∽ｿ｡
        const response = await this.gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: message,
          },
        });

        console.log('[EmailService.sendBuyerEmail] Email sent successfully:', response.data.id);

        return {
          messageId: response.data.id,
          sentAt: new Date(),
          success: true,
        };
      }

      console.log('[EmailService.sendBuyerEmail] Sending email with images');

      // 逕ｻ蜒乗ｷｻ莉倥′縺ゅｋ蝣ｴ蜷医・縲［ultipart/related繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
      // selectedImages繧棚nlineImage蠖｢蠑上↓螟画鋤
      const inlineImages: InlineImage[] = params.selectedImages.map((img, index) => ({
        id: `image${index}`,
        mimeType: img.mimeType || 'image/jpeg',
        data: Buffer.from(img.data, 'base64'),
      }));

      console.log('[EmailService.sendBuyerEmail] Inline images created:', inlineImages.length);

      // 謾ｹ陦後ｒ<br>繧ｿ繧ｰ縺ｫ螟画鋤縺励※縺九ｉHTML蜀・・逕ｻ蜒丞盾辣ｧ繧辰ID蜿ら・縺ｫ螟画鋤
      let html = params.body.replace(/\n/g, '<br>');
      params.selectedImages.forEach((img, index) => {
        // 逕ｻ蜒上・URL繧辰ID蜿ら・縺ｫ鄂ｮ縺肴鋤縺・        if (img.url) {
          html = html.replace(img.url, `cid:image${index}`);
        }
      });

      const message = this.createMultipartRelatedMessage(
        params.to,
        from,
        params.subject,
        html,
        inlineImages
      );

      console.log('[EmailService.sendBuyerEmail] Multipart message created, sending via Gmail API...');

      // Gmail API縺ｧ騾∽ｿ｡
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      console.log('[EmailService.sendBuyerEmail] Email with images sent successfully:', response.data.id);

      return {
        messageId: response.data.id,
        sentAt: new Date(),
        success: true,
      };
    } catch (error) {
      console.error('[EmailService.sendBuyerEmail] Error:', error);
      console.error('[EmailService.sendBuyerEmail] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        messageId: '',
        sentAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 逕ｻ蜒丈ｻ倥″繝｡繝ｼ繝ｫ繧帝∽ｿ｡・医う繝ｳ繝ｩ繧､繝ｳ逕ｻ蜒丞ｯｾ蠢懶ｼ・   */
  async sendEmailWithImages(params: EmailWithImagesParams): Promise<EmailResult> {
    try {
      // HTML蜀・・繧､繝ｳ繝ｩ繧､繝ｳ逕ｻ蜒上ｒ蜃ｦ逅・      const processed = this.inlineImageProcessor.processHtmlWithImages(params.body);

      let message: string;

      if (processed.useDataUrls) {
        // Data URL繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ・亥ｰ上＆縺・判蜒上・蝣ｴ蜷茨ｼ・        message = this.createHtmlMessageWithDataUrls(
          params.to,
          params.from,
          params.subject,
          processed.html
        );
      } else {
        // CID蜿ら・繧剃ｽｿ逕ｨ・亥､ｧ縺阪＞逕ｻ蜒上・蝣ｴ蜷茨ｼ・        message = this.createMultipartRelatedMessage(
          params.to,
          params.from,
          params.subject,
          processed.html,
          processed.inlineImages
        );
      }

      // Gmail API縺ｧ騾∽ｿ｡
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
   * 逕ｻ蜒丈ｻ倥″繝｡繝ｼ繝ｫ繧帝∽ｿ｡・亥ｾ捺擂縺ｮ豺ｻ莉倥ヵ繧｡繧､繝ｫ譁ｹ蠑・- 蠕梧婿莠呈鋤諤ｧ縺ｮ縺溘ａ菫晄戟・・   * Note: ImageProcessorService縺ｮ螳溯｣・′蠢・ｦ・   */
  // async sendEmailWithAttachments(params: EmailWithImagesParams): Promise<EmailResult> {
  //   try {
  //     // TODO: ImageProcessorService縺ｫprocessImagesForEmail繝｡繧ｽ繝・ラ繧貞ｮ溯｣・  //     // const processedEmail = await this.imageProcessor.processImagesForEmail({
  //     //   sellerId: params.sellerId,
  //     //   sellerNumber: params.sellerNumber,
  //     //   selectedImages: params.selectedImages,
  //     // });

  //     // 繝槭Ν繝√ヱ繝ｼ繝医Γ繝ｼ繝ｫ繧剃ｽ懈・
  //     const message = this.createMultipartMessage(
  //       params.to,
  //       params.from,
  //       params.subject,
  //       params.body,
  //       [] // processedEmail.attachments
  //     );

  //     // Gmail API縺ｧ騾∽ｿ｡
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
   * multipart/related繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・・医う繝ｳ繝ｩ繧､繝ｳ逕ｻ蜒丞ｯｾ蠢懶ｼ・   */
  private createMultipartRelatedMessage(
    to: string,
    from: string,
    subject: string,
    html: string,
    inlineImages: InlineImage[]
  ): string {
    const boundaryMain = '----=_Part_Main_' + Date.now();
    const boundaryAlt = '----=_Part_Alt_' + Date.now();
    
    // 譌･譛ｬ隱槭・莉ｶ蜷阪ｒRFC 2047蠖｢蠑上〒繧ｨ繝ｳ繧ｳ繝ｼ繝・    const encodedSubject = this.encodeSubject(subject);
    
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
      '縺薙・繝｡繝ｼ繝ｫ縺ｯHTML蠖｢蠑上〒縺吶・TML繝｡繝ｼ繝ｫ縺ｫ蟇ｾ蠢懊＠縺溘Γ繝ｼ繝ｫ繧ｯ繝ｩ繧､繧｢繝ｳ繝医〒縺碑ｦｧ縺上□縺輔＞縲・,
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

    // 繧､繝ｳ繝ｩ繧､繝ｳ逕ｻ蜒上ｒ霑ｽ蜉
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
   * Data URL繧貞性繧HTML繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
   */
  private createHtmlMessageWithDataUrls(
    to: string,
    from: string,
    subject: string,
    html: string
  ): string {
    // 譌･譛ｬ隱槭・莉ｶ蜷阪ｒRFC 2047蠖｢蠑上〒繧ｨ繝ｳ繧ｳ繝ｼ繝・    const encodedSubject = this.encodeSubject(subject);
    
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
   * 繝槭Ν繝√ヱ繝ｼ繝医Γ繝ｼ繝ｫ繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・・育判蜒乗ｷｻ莉伜ｯｾ蠢・- 蠕梧婿莠呈鋤諤ｧ縺ｮ縺溘ａ菫晄戟・・   */
  private createMultipartMessage(
    to: string,
    from: string,
    subject: string,
    body: string,
    attachments: Array<{ filename: string; mimeType: string; data: Buffer }>
  ): string {
    const boundary = '----=_Part_' + Date.now();
    
    // 譌･譛ｬ隱槭・莉ｶ蜷阪ｒRFC 2047蠖｢蠑上〒繧ｨ繝ｳ繧ｳ繝ｼ繝・    const encodedSubject = this.encodeSubject(subject);
    
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

    // 豺ｻ莉倥ヵ繧｡繧､繝ｫ繧定ｿｽ蜉
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
   * 螢ｲ荳ｻ縺ｮ逕ｻ蜒上ｒ蜿門ｾ暦ｼ医・繝ｬ繝薙Η繝ｼ逕ｨ・・   */
  async getSellerImages(sellerId: string): Promise<DriveFile[]> {
    try {
      const files = await this.driveService.listFiles(sellerId);
      
      // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
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
   * 繝｡繝ｼ繝ｫ繝・Φ繝励Ξ繝ｼ繝医ｒ蜿門ｾ・   */
  async getTemplate(_templateId: string): Promise<EmailTemplate> {
    // 螳溯｣・ 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝・Φ繝励Ξ繝ｼ繝医ｒ蜿門ｾ・    // 縺薙％縺ｧ縺ｯ邁｡譏灘ｮ溯｣・    return {
      subject: '繝・Φ繝励Ξ繝ｼ繝井ｻｶ蜷・,
      body: '繝・Φ繝励Ξ繝ｼ繝域悽譁・,
    };
  }

  /**
   * Gmail驟堺ｿ｡繝｡繝ｼ繝ｫ繧帝∽ｿ｡・医ヰ繝・メ蜃ｦ逅・ｯｾ蠢懶ｼ・   */
  async sendDistributionEmail(params: DistributionEmailParams): Promise<DistributionEmailResponse> {
    // Gmail API繧貞・譛溷喧
    await this.ensureGmailInitialized();
    
    const { senderAddress, recipients, subject, body, propertyNumber } = params;
    
    // Send As 繧｢繝峨Ξ繧ｹ繧剃ｺ句燕讀懆ｨｼ
    try {
      this.validateSendAsAddress(senderAddress);
    } catch (error) {
      console.error('笶・Send As validation failed before sending:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Invalid sender address',
        recipientCount: 0,
        errors: [error instanceof Error ? error.message : 'Invalid sender address']
      };
    }
    
    // 繝舌ャ繝√し繧､繧ｺ・・mail API縺ｮ蛻ｶ髯舌↓蝓ｺ縺･縺擾ｼ・    const MAX_BCC_PER_BATCH = 100;
    const BATCH_DELAY_MS = 1000; // 繝舌ャ繝・俣縺ｮ驕・ｻｶ・・遘抵ｼ・    
    // 蜿嶺ｿ｡閠・ｒ繝舌ャ繝√↓蛻・牡
    const batches = this.splitIntoBatches(recipients, MAX_BCC_PER_BATCH);
    
    console.log(`透 Sending distribution email for property ${propertyNumber}`);
    console.log(`豆 Sender: ${senderAddress}`);
    console.log(`投 Total recipients: ${recipients.length}`);
    console.log(`逃 Batches: ${batches.length}`);
    
    const errors: string[] = [];
    let successCount = 0;
    
    // 蜷・ヰ繝・メ繧帝∽ｿ｡
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
        console.log(`笨・Batch ${i + 1}/${batches.length} sent successfully (${batch.length} recipients)`);
        
        // 繝舌ャ繝・俣縺ｧ蠕・ｩ滂ｼ医Ξ繝ｼ繝亥宛髯仙屓驕ｿ・・        if (i < batches.length - 1) {
          await this.delay(BATCH_DELAY_MS);
        }
      } catch (error) {
        console.error(`笶・Batch ${i + 1}/${batches.length} failed:`, error);
        errors.push(`繝舌ャ繝・${i + 1} 縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // 邨先棡繧定ｿ斐☆
    if (errors.length === 0) {
      return {
        success: true,
        message: '繝｡繝ｼ繝ｫ繧帝∽ｿ｡縺励∪縺励◆',
        recipientCount: successCount,
        batchCount: batches.length,
      };
    } else if (successCount > 0) {
      return {
        success: true,
        message: `荳驛ｨ縺ｮ繝｡繝ｼ繝ｫ繧帝∽ｿ｡縺励∪縺励◆ (${successCount}/${recipients.length}莉ｶ)`,
        recipientCount: successCount,
        batchCount: batches.length,
        errors,
      };
    } else {
      return {
        success: false,
        message: '繝｡繝ｼ繝ｫ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
        recipientCount: 0,
        batchCount: batches.length,
        errors,
      };
    }
  }

  /**
   * 繝舌ャ繝・∽ｿ｡・・CC菴ｿ逕ｨ・・   */
  private async sendBatch(params: {
    senderAddress: string;
    recipients: string[];
    subject: string;
    body: string;
  }): Promise<void> {
    const { senderAddress, recipients, subject, body } = params;
    
    // Send As 繧｢繝峨Ξ繧ｹ繧呈､懆ｨｼ
    this.validateSendAsAddress(senderAddress);
    
    console.log(`透 Sending batch email:`);
    console.log(`  From: ${senderAddress}`);
    console.log(`  Recipients: ${recipients.length}`);
    console.log(`  Subject: ${subject}`);
    
    // RFC 2822蠖｢蠑上・繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
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
    
    // Base64url蠖｢蠑上〒繧ｨ繝ｳ繧ｳ繝ｼ繝・    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    try {
      // Gmail API縺ｧ騾∽ｿ｡
      // Note: Gmail API縺ｯ隱崎ｨｼ縺輔ｌ縺溘い繧ｫ繧ｦ繝ｳ繝医°繧蛾∽ｿ｡縺吶ｋ縺溘ａ縲・      // Send As繧｢繝峨Ξ繧ｹ縺梧ｭ｣縺励￥險ｭ螳壹＆繧後※縺・ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });
      
      console.log(`笨・Batch email sent successfully (Message ID: ${response.data.id})`);
    } catch (error: any) {
      console.error(`笶・Failed to send batch email:`, {
        senderAddress,
        recipientCount: recipients.length,
        error: error.message,
        errorDetails: error.response?.data
      });
      
      // Send As險ｭ螳壹↓髢｢縺吶ｋ繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医√ｈ繧願ｩｳ邏ｰ縺ｪ繝｡繝・そ繝ｼ繧ｸ繧呈署萓・      if (error.message?.includes('sendAs') || error.message?.includes('delegation')) {
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
   * 驟榊・繧偵ヰ繝・メ縺ｫ蛻・牡
   */
  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 驕・ｻｶ蜃ｦ逅・   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
