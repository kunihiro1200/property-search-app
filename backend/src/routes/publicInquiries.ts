import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { createRateLimiter } from '../middleware/rateLimiter';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

// PostgreSQLプールを初期化（property_inquiriesテーブル用 - PostgRESTをバイパス）
// 現在は使用していないのでコメントアウト
// const pgPool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// GoogleSheetsClientを直接初期化
const sheetsClient = new GoogleSheetsClient({
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
  sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
});

// 認証を実行（同期的に待つ）
let isAuthenticated = false;
sheetsClient.authenticate()
  .then(() => {
    isAuthenticated = true;
    console.log('[publicInquiries] GoogleSheetsClient authenticated successfully');
  })
  .catch(error => {
    console.error('[publicInquiries] GoogleSheetsClient認証エラー:', error);
  });

// Validation schema for inquiry form
const inquirySchema = z.object({
  property_id: z.string().min(1, '物件IDまたは物件番号を指定してください').optional(),
  propertyId: z.string().min(1, '物件IDまたは物件番号を指定してください').optional(),
  name: z.string().min(1, '名前を入力してください').max(100, '名前は100文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください').max(255, 'メールアドレスは255文字以内で入力してください'),
  phone: z.string()
    .min(10, '有効な電話番号を入力してください')
    .max(15, '電話番号は15文字以内で入力してください')
    .regex(/^[0-9\-+() ]+$/, '電話番号は数字、ハイフン、括弧のみ使用できます'),
  message: z.string().min(1, 'お問い合わせ内容を入力してください').max(2000, 'お問い合わせ内容は2000文字以内で入力してください')
}).refine(data => {
  // property_idまたはpropertyIdのいずれかが存在すればOK
  const hasPropertyId = (data.property_id && data.property_id.length > 0) || 
                        (data.propertyId && data.propertyId.length > 0);
  return hasPropertyId;
}, {
  message: '物件IDまたは物件番号を指定してください',
  path: ['propertyId'],
});

type InquiryFormData = z.infer<typeof inquirySchema>;

/**
 * POST /api/public/inquiries
 * Submit a property inquiry
 * 
 * Rate limited to 3 requests per IP per hour
 */
router.post(
  '/',
  createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3
  }),
  async (req: Request, res: Response) => {
    try {
      console.log('[publicInquiries] Received inquiry request:', {
        body: req.body,
        property_id: req.body.property_id,
        propertyId: req.body.propertyId
      });

      // Validate request body
      const validationResult = inquirySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error('[publicInquiries] Validation error:', validationResult.error);
        return res.status(400).json({
          success: false,
          message: '入力内容に誤りがあります',
          errors: validationResult.error.issues?.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })) || []
        });
      }

      const inquiryData: InquiryFormData = validationResult.data;
      
      // property_idまたはpropertyIdを取得
      const propertyIdOrNumber = (inquiryData as any).property_id || (inquiryData as any).propertyId;

      console.log('[publicInquiries] Property ID or Number:', propertyIdOrNumber);

      // UUIDかどうかをチェック（UUID形式: 8-4-4-4-12の形式）
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyIdOrNumber);

      console.log('[publicInquiries] Is UUID:', isUUID);

      // Verify that the property exists and is public
      let query = supabase
        .from('property_listings')
        .select('id, property_number, address, atbb_status');

      // UUIDの場合はidで検索、それ以外は物件番号で検索
      if (isUUID) {
        console.log('[publicInquiries] Searching by UUID:', propertyIdOrNumber);
        query = query.eq('id', propertyIdOrNumber);
      } else {
        console.log('[publicInquiries] Searching by property_number:', propertyIdOrNumber);
        query = query.eq('property_number', propertyIdOrNumber);
      }

      const { data: property, error: propertyError } = await query.single();

      console.log('[publicInquiries] Property search result:', { property, propertyError });

      if (propertyError || !property) {
        console.error('[publicInquiries] Property not found or error:', propertyError);
        return res.status(404).json({
          success: false,
          message: '指定された物件が見つかりません'
        });
      }

      // 公開物件かどうかのチェックは一旦スキップ（全ての物件に対して問い合わせを受け付ける）
      // TODO: site_displayカラムが利用可能になったら、公開チェックを追加

      // Get client IP for logging
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

      // 直接買主リストに転記（property_inquiriesテーブルをバイパス）
      try {
        // GoogleSheetsClientの認証を確認
        if (!isAuthenticated) {
          console.error('[publicInquiries] GoogleSheetsClient not authenticated yet');
          // 認証を再試行
          await sheetsClient.authenticate();
          isAuthenticated = true;
        }

        console.log('[publicInquiries] Reading all rows from buyer sheet...');
        // 買主番号を採番
        const allRows = await sheetsClient.readAll();
        console.log('[publicInquiries] Read rows:', allRows ? allRows.length : 'undefined');
        
        if (!allRows || !Array.isArray(allRows)) {
          console.error('[publicInquiries] Failed to read buyer list rows, allRows:', allRows);
          throw new Error('Failed to read buyer list rows');
        }

        // ヘッダー名を確認（最初の行のキーを取得）
        if (allRows.length > 0) {
          console.log('[publicInquiries] Available headers:', Object.keys(allRows[0]));
        }

        const columnEValues = allRows
          .map(row => row['買主番号'])
          .filter(value => value !== null && value !== undefined)
          .map(value => String(value));
        
        // 最大値を取得して+1
        const maxNumber = columnEValues.length > 0
          ? Math.max(...columnEValues.map(v => parseInt(v) || 0))
          : 0;
        const buyerNumber = maxNumber + 1;

        // フィールドマッピング
        const normalizedPhone = inquiryData.phone.replace(/[^0-9]/g, ''); // 数字のみ抽出
        const receptionDate = new Date().toLocaleDateString('ja-JP'); // 受付日（今日の日付）
        
        // ATBB状況に基づいて問合せ元を判定
        let inquirySource = 'サイト'; // デフォルト
        if (property.atbb_status) {
          const status = property.atbb_status.toLowerCase();
          if (status.includes('公開中')) {
            inquirySource = 'いふう独自サイト';
          } else if (status.includes('公開前')) {
            inquirySource = '公開前・いふう独自サイト';
          } else if (status.includes('非公開')) {
            inquirySource = '非公開・いふう独自サイト';
          }
        }

        const rowData = {
          '買主番号': buyerNumber.toString(),
          '受付日': receptionDate,
          '●氏名・会社名': inquiryData.name,
          '●問合時ヒアリング': inquiryData.message,
          '●電話番号\n（ハイフン不要）': normalizedPhone,
          '●メアド': inquiryData.email,
          '●問合せ元': inquirySource,
          '物件番号': property.property_number,
        };

        // 最後のデータ行の次の行に追加（ヘッダー行が1行目、データは2行目から）
        // allRows.length = 実際のデータ行数
        // targetRowIndex = ヘッダー行(1) + データ行数(allRows.length) + 1
        const targetRowIndex = allRows.length + 2;

        // スプレッドシートの特定行に直接書き込み
        console.log('[publicInquiries] Writing to row:', targetRowIndex, 'with data:', rowData);
        await sheetsClient.updateRow(targetRowIndex, rowData);
        console.log('[publicInquiries] Row written successfully');

        console.log('Inquiry synced to buyer sheet:', {
          buyerNumber,
          propertyNumber: property.property_number,
          customerName: inquiryData.name
        });

      } catch (syncError) {
        // 転記エラーはログに記録するが、ユーザーには成功を返す
        console.error('Failed to sync inquiry to buyer sheet:', syncError);
        console.error('Sync error details:', {
          message: (syncError as Error).message,
          stack: (syncError as Error).stack
        });
      }

      // Return success response
      return res.status(201).json({
        success: true,
        message: 'お問い合わせを受け付けました。担当者より折り返しご連絡いたします。'
      });

    } catch (error) {
      console.error('Unexpected error in inquiry submission:', error);
      return res.status(500).json({
        success: false,
        message: 'お問い合わせの送信中にエラーが発生しました。しばらくしてから再度お試しください。'
      });
    }
  }
);

export default router;
