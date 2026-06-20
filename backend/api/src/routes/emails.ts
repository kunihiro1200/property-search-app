import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { EmailService } from '../services/EmailService.supabase';
import { SellerService } from '../services/SellerService.supabase';
import { ValuationEngine } from '../services/ValuationEngine.supabase';
import { authenticate } from '../middleware/auth';

const router = Router();
const emailService = new EmailService();
const sellerService = new SellerService();
const valuationEngine = new ValuationEngine();

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * 査定メールを送信
 */
router.post(
  '/:sellerId/send-valuation-email',
  async (req: Request, res: Response) => {
    try {
      const { sellerId } = req.params;

      // 売主情報を取得
      const seller = await sellerService.getSeller(sellerId);
      if (!seller) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Seller not found',
            retryable: false,
          },
        });
      }

      // 査定額が計算されているか確認
      if (!seller.valuationAmount1 || !seller.valuationAmount2 || !seller.valuationAmount3) {
        return res.status(400).json({
          error: {
            code: 'VALUATION_NOT_CALCULATED',
            message: 'Valuation amounts not calculated. Please calculate first.',
            retryable: false,
          },
        });
      }

      // 新しい査定額データを作成
      const valuationData = {
        valuationAmount1: seller.valuationAmount1,
        valuationAmount2: seller.valuationAmount2,
        valuationAmount3: seller.valuationAmount3,
        fixedAssetTaxRoadPrice: seller.fixedAssetTaxRoadPrice,
      };

      // メールを送信
      const result = await emailService.sendValuationEmail(
        seller,
        valuationData,
        req.employee!.email,
        req.employee!.id
      );

      if (!result.success) {
        return res.status(502).json({
          error: {
            code: 'EMAIL_SEND_ERROR',
            message: result.error || 'Failed to send email',
            retryable: true,
          },
        });
      }

      res.json({
        messageId: result.messageId,
        sentAt: result.sentAt,
        success: true,
      });
    } catch (error) {
      console.error('Send valuation email error:', error);
      res.status(500).json({
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send valuation email',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 追客メールを送信
 */
router.post(
  '/:sellerId/send-follow-up-email',
  [
    body('content').notEmpty().withMessage('Email content is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId } = req.params;
      const { content } = req.body;

      // 売主情報を取得
      const seller = await sellerService.getSeller(sellerId);
      if (!seller) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Seller not found',
            retryable: false,
          },
        });
      }

      // メールを送信
      const result = await emailService.sendFollowUpEmail(
        seller,
        content,
        req.employee!.email
      );

      if (!result.success) {
        return res.status(502).json({
          error: {
            code: 'EMAIL_SEND_ERROR',
            message: result.error || 'Failed to send email',
            retryable: true,
          },
        });
      }

      res.json({
        messageId: result.messageId,
        sentAt: result.sentAt,
        success: true,
      });
    } catch (error) {
      console.error('Send follow-up email error:', error);
      res.status(500).json({
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send follow-up email',
          retryable: true,
        },
      });
    }
  }
);

/**
 * テンプレートメールを送信
 */
router.post(
  '/:sellerId/send-template-email',
  [
    body('templateId').notEmpty().withMessage('Template ID is required'),
    body('to').optional().isEmail().withMessage('Invalid email address'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('htmlBody').optional().isString().withMessage('HTML body must be a string'),
    body('from').optional().isEmail().withMessage('Invalid from email address'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId } = req.params;
      const { templateId, to, subject, content, htmlBody, from } = req.body;

      // 売主情報を取得
      const seller = await sellerService.getSeller(sellerId);
      if (!seller) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Seller not found',
            retryable: false,
          },
        });
      }

      // 送信先メールアドレス（編集された値を優先、なければ売主のメールアドレス）
      const recipientEmail = to || seller.email;
      
      if (!recipientEmail) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Recipient email address is required',
            retryable: false,
          },
        });
      }

      // メールを送信（売主オブジェクトのemailを一時的に上書き）
      const sellerWithUpdatedEmail = { ...seller, email: recipientEmail };
      const result = await emailService.sendTemplateEmail(
        sellerWithUpdatedEmail,
        subject,
        content,
        req.employee!.email,
        req.employee!.id,
        htmlBody,  // オプション: カスタムHTMLボディ（貼り付けた画像を含む場合）
        from       // オプション: 送信元メールアドレス
      );

      if (!result.success) {
        return res.status(502).json({
          error: {
            code: 'EMAIL_SEND_ERROR',
            message: result.error || 'Failed to send email',
            retryable: true,
          },
        });
      }

      res.json({
        messageId: result.messageId,
        sentAt: result.sentAt,
        success: true,
        templateId,
      });
    } catch (error) {
      console.error('Send template email error:', error);
      res.status(500).json({
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send template email',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 画像付きメールを送信
 */
router.post(
  '/with-images',
  [
    body('sellerId').notEmpty().withMessage('Seller ID is required'),
    body('sellerNumber').notEmpty().withMessage('Seller number is required'),
    body('to').isEmail().withMessage('Valid email address is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('body').notEmpty().withMessage('Email body is required'),
    body('selectedImages').optional().isObject().withMessage('Selected images must be an object'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId, sellerNumber, to, subject, body, selectedImages } = req.body;

      // メールを送信
      const result = await emailService.sendEmailWithImages({
        sellerId,
        sellerNumber,
        to,
        subject,
        body,
        from: req.employee!.email,
        selectedImages,
      });

      if (!result.success) {
        return res.status(502).json({
          error: {
            code: 'EMAIL_SEND_ERROR',
            message: result.error || 'Failed to send email with images',
            retryable: true,
          },
        });
      }

      res.json({
        messageId: result.messageId,
        sentAt: result.sentAt,
        success: true,
      });
    } catch (error) {
      console.error('Send email with images error:', error);
      res.status(500).json({
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send email with images',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 売主の画像一覧を取得
 */
router.get(
  '/images/:sellerNumber',
  async (req: Request, res: Response) => {
    try {
      const { sellerNumber } = req.params;

      console.log(`📸 GET /api/emails/images/${sellerNumber}`);

      // 売主情報を取得して売主IDを確認
      const sellers = await sellerService.searchSellers(sellerNumber);
      if (!sellers || sellers.length === 0) {
        console.error(`❌ Seller not found: ${sellerNumber}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Seller not found',
            retryable: false,
          },
        });
      }

      const seller = sellers[0];
      console.log(`✅ Seller found: ${seller.name} (ID: ${seller.id})`);

      // 画像一覧を取得
      const images = await emailService.getSellerImages(seller.id, sellerNumber);

      console.log(`📊 Found ${images.length} images in Drive folder`);

      // 画像が見つからない場合
      if (images.length === 0) {
        console.warn(`⚠️ No images found for seller ${sellerNumber}`);
        return res.json({
          images: [],
          categorized: {
            exterior: [],
            interior: [],
            uncategorized: [],
          },
          autoSelected: {
            exterior: null,
            interior: null,
          },
          count: 0,
        });
      }

      // 画像識別サービスで分類
      const { ImageIdentifierService } = await import('../services/ImageIdentifierService');
      const imageIdentifier = new ImageIdentifierService();
      const categorized = imageIdentifier.categorizeImages(images);

      console.log(`📊 Categorization results:`);
      console.log(`  - Exterior: ${categorized.exterior.length} images`);
      console.log(`  - Interior: ${categorized.interior.length} images`);
      console.log(`  - Uncategorized: ${categorized.uncategorized.length} images`);

      // フォールバック戦略: パターンに一致しない場合、最初の2つの画像を使用
      let autoSelectedExterior = null;
      let autoSelectedInterior = null;

      if (categorized.exterior.length > 0) {
        // 外観画像が見つかった場合、最新のものを選択
        autoSelectedExterior = categorized.exterior[0].id;
      } else if (categorized.uncategorized.length > 0) {
        // 外観画像が見つからない場合、未分類の最初の画像を外観として使用
        console.log(`⚠️ No exterior images found, using first uncategorized image`);
        autoSelectedExterior = categorized.uncategorized[0].id;
      }

      if (categorized.interior.length > 0) {
        // 室内画像が見つかった場合、最新のものを選択
        autoSelectedInterior = categorized.interior[0].id;
      } else if (categorized.uncategorized.length > 1) {
        // 室内画像が見つからない場合、未分類の2番目の画像を室内として使用
        console.log(`⚠️ No interior images found, using second uncategorized image`);
        autoSelectedInterior = categorized.uncategorized[1].id;
      } else if (categorized.uncategorized.length === 1 && !autoSelectedExterior) {
        // 未分類が1つだけで、外観にも使われていない場合
        autoSelectedInterior = categorized.uncategorized[0].id;
      }

      const autoSelected = {
        exterior: autoSelectedExterior,
        interior: autoSelectedInterior,
      };

      console.log(`✅ Auto-selected: exterior=${autoSelectedExterior}, interior=${autoSelectedInterior}`);
      console.log(`✅ Returning ${images.length} images with auto-selection`);

      res.json({
        images,
        categorized,
        autoSelected,
        count: images.length,
      });
    } catch (error: any) {
      console.error('❌ Get seller images error:', error);
      res.status(500).json({
        error: {
          code: 'IMAGE_FETCH_ERROR',
          message: error.message || 'Failed to fetch seller images',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 画像プレビューを取得
 */
router.get(
  '/images/preview/:fileId',
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;

      // Google Drive から画像データを取得
      const { GoogleDriveService } = await import('../services/GoogleDriveService');
      const driveService = new GoogleDriveService();
      const imageData = await driveService.getFile(fileId);

      if (!imageData) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Image not found',
            retryable: false,
          },
        });
      }

      // 画像データを返す
      res.set('Content-Type', imageData.mimeType || 'image/jpeg');
      res.send(imageData.data);
    } catch (error) {
      console.error('Get image preview error:', error);
      res.status(500).json({
        error: {
          code: 'IMAGE_FETCH_ERROR',
          message: 'Failed to fetch image preview',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Gmail配信メールを送信（Gmail API経由）
 */
router.post(
  '/send-distribution',
  [
    body('senderAddress').isEmail().withMessage('Valid sender email address is required'),
    body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    body('recipients.*').isEmail().withMessage('All recipients must be valid email addresses'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('body').notEmpty().withMessage('Email body is required'),
    body('propertyNumber').optional().isString().withMessage('Property number must be a string'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { senderAddress, recipients, subject, body, propertyNumber } = req.body;

      // 送信元アドレスのホワイトリスト検証
      const validSenders = [
        'tenant@ifoo-oita.com',
        'gyosha@ifoo-oita.com',
        'info@ifoo-oita.com',
      ];

      if (!validSenders.includes(senderAddress)) {
        return res.status(400).json({
          success: false,
          message: '無効な送信元アドレスです',
        });
      }

      // EmailServiceを使用してメールを送信
      // @ts-ignore - TypeScript compilation issue, method exists at runtime
      const result = await emailService.sendDistributionEmail({
        senderAddress,
        recipients,
        subject,
        body,
        propertyNumber: propertyNumber || 'unknown',
      });

      res.json(result);
    } catch (error) {
      console.error('Send distribution email error:', error);
      res.status(500).json({
        success: false,
        message: 'メール送信中にエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
