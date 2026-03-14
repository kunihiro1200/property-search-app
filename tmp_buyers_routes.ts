// 雋ｷ荳ｻ繝ｪ繧ｹ繝医・API繝ｫ繝ｼ繝・import { Router, Request, Response } from 'express';
import { BuyerService } from '../services/BuyerService';
import { BuyerSyncService } from '../services/BuyerSyncService';
import { EmailHistoryService } from '../services/EmailHistoryService';
import { relatedBuyerService } from '../services/RelatedBuyerService';
import { uuidValidationMiddleware } from '../middleware/uuidValidator';
import { ValidationError, NotFoundError, ServiceError } from '../errors';
import { EnhancedAutoSyncService } from '../services/EnhancedAutoSyncService';
import { BuyerTemplateService } from '../services/BuyerTemplateService';

const router = Router();
const buyerService = new BuyerService();
const buyerSyncService = new BuyerSyncService();
const emailHistoryService = new EmailHistoryService();

// EnhancedAutoSyncService縺ｮ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ繧剃ｽ懈・・郁ｲｷ荳ｻ蜷梧悄逕ｨ・・const enhancedAutoSyncService = new EnhancedAutoSyncService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 雋ｷ荳ｻ繝・Φ繝励Ξ繝ｼ繝亥叙蠕暦ｼ・:id縺ｮ蜑阪↓驟咲ｽｮ・・router.get('/templates', async (req: Request, res: Response) => {
  try {
    const buyerTemplateService = new BuyerTemplateService();
    const templates = await buyerTemplateService.getBuyerTemplates();
    res.json(templates);
  } catch (error: any) {
    console.error('Failed to fetch buyer templates:', error);
    res.status(500).json({ error: error.message || '繝・Φ繝励Ξ繝ｼ繝医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 荳隕ｧ蜿門ｾ・router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      status,
      assignee,
      dateFrom,
      dateTo,
      sortBy = 'reception_date',
      sortOrder = 'desc',
    } = req.query;

    const result = await buyerService.getAll({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: search as string,
      status: status as string,
      assignee: assignee as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// 邨ｱ險亥叙蠕・router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await buyerService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching buyer stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// 蜷梧悄螳溯｡・router.post('/sync', async (_req: Request, res: Response) => {
  try {
    if (buyerSyncService.isSyncInProgress()) {
      return res.status(409).json({ error: 'Sync is already in progress' });
    }

    const result = await buyerSyncService.syncAll();
    res.json(result);
  } catch (error: any) {
    console.error('Error syncing buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// 蜷梧悄繧ｹ繝・・繧ｿ繧ｹ蜿門ｾ・router.get('/sync/status', async (_req: Request, res: Response) => {
  try {
    const stats = await buyerSyncService.getSyncStats();
    const isSyncing = buyerSyncService.isSyncInProgress();
    
    res.json({
      isSyncing,
      ...stats
    });
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 讀懃ｴ｢
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = '20' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await buyerService.search(q as string, parseInt(limit as string, 10));
    res.json(results);
  } catch (error: any) {
    console.error('Error searching buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// CSV繧ｨ繧ｯ繧ｹ繝昴・繝・router.get('/export', async (req: Request, res: Response) => {
  try {
    const { search, status, assignee, dateFrom, dateTo } = req.query;

    const data = await buyerService.getExportData({
      search: search as string,
      status: status as string,
      assignee: assignee as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    // CSV繝倥ャ繝繝ｼ
    if (data.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n') 
            ? `"${str}"` 
            : str;
        }).join(',')
      )
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=buyers_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csvRows.join('\n')); // BOM for Excel
  } catch (error: any) {
    console.error('Error exporting buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// 譁ｰ隕剰ｲｷ荳ｻ菴懈・
router.post('/', async (req: Request, res: Response) => {
  try {
    const buyerData = req.body;

    // 蝓ｺ譛ｬ逧・↑繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!buyerData.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newBuyer = await buyerService.create(buyerData);
    res.status(201).json(newBuyer);
  } catch (error: any) {
    console.error('Error creating buyer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 蜈ｷ菴鍋噪縺ｪ繝ｫ繝ｼ繝茨ｼ・:id 繧医ｊ繧ょ燕縺ｫ螳夂ｾｩ縺吶ｋ蠢・ｦ√′縺ゅｋ・・=====

// 邏舌▼縺冗黄莉ｶ蜿門ｾ・router.get('/:id/properties', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // UUID縺九←縺・°縺ｧ蛻､螳・    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｮ蝣ｴ蜷医・縲√∪縺喘uyer_id繧貞叙蠕・    let buyerId = id;
    if (!isUuid) {
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerId = buyer.buyer_id; // 笨・buyer.buyer_id繧剃ｽｿ逕ｨ
    }
    
    const properties = await buyerService.getLinkedProperties(buyerId);
    res.json(properties);
  } catch (error: any) {
    console.error('Error fetching linked properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// 驕主悉雋ｷ荳ｻ逡ｪ蜿ｷ蜿門ｾ・router.get('/:id/past-buyer-numbers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pastBuyerNumbers = await buyerService.getPastBuyerNumbers(id);
    res.json(pastBuyerNumbers);
  } catch (error: any) {
    console.error('Error fetching past buyer numbers:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// 螳悟・縺ｪ蝠上＞蜷医ｏ縺帛ｱ･豁ｴ蜿門ｾ暦ｼ域立蠖｢蠑擾ｼ・router.get('/:id/inquiry-history-legacy', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await buyerService.getCompleteInquiryHistory(id);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching inquiry history:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// 蝠上＞蜷医ｏ縺帛ｱ･豁ｴ蜿門ｾ暦ｼ郁ｲｷ荳ｻ隧ｳ邏ｰ繝壹・繧ｸ逕ｨ・・router.get('/:id/inquiry-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // buyer_number縺ｧ逶ｴ謗･讀懃ｴ｢
    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    
    // getInquiryHistory繝｡繧ｽ繝・ラ繧剃ｽｿ逕ｨ・亥・驛ｨ縺ｧbuyer_number繝吶・繧ｹ縺ｮ蜃ｦ逅・ｒ螳溯｡鯉ｼ・    const inquiryHistory = await buyerService.getInquiryHistory(buyer.buyer_number);
    res.json({ inquiryHistory });
  } catch (error: any) {
    console.error('Error fetching inquiry history:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// 繝｡繝ｼ繝ｫ騾∽ｿ｡螻･豁ｴ繧剃ｿ晏ｭ・router.post('/:buyerId/email-history', async (req: Request, res: Response) => {
  try {
    const { buyerId } = req.params;
    const { propertyNumbers, recipientEmail, subject, body, sentBy, emailType } = req.body;

    // Validation
    if (!propertyNumbers || !Array.isArray(propertyNumbers) || propertyNumbers.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: propertyNumbers array is required and cannot be empty',
      });
    }

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: recipientEmail is required',
      });
    }

    if (!subject || !body) {
      return res.status(400).json({
        error: 'Invalid request: subject and body are required',
      });
    }

    if (!sentBy) {
      return res.status(400).json({
        error: 'Invalid request: sentBy is required',
      });
    }

    // Save email history
    const historyIds = await emailHistoryService.saveEmailHistory({
      buyerId,
      propertyNumbers,
      recipientEmail,
      subject,
      body,
      sentBy,
      emailType,
    });

    res.json({
      success: true,
      message: 'Email history saved successfully',
      historyIds,
    });
  } catch (error: any) {
    console.error('Error saving email history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 繝｡繝ｼ繝ｫ騾∽ｿ｡螻･豁ｴ繧貞叙蠕・router.get('/:buyerId/email-history', async (req: Request, res: Response) => {
  try {
    const { buyerId } = req.params;
    
    // UUID縺九←縺・°縺ｧ蛻､螳・    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(buyerId);
    
    // 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｮ蝣ｴ蜷医・縲√∪縺喘uyer_id繧貞叙蠕・    let actualBuyerId = buyerId;
    if (!isUuid) {
      const buyer = await buyerService.getByBuyerNumber(buyerId);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      actualBuyerId = buyer.buyer_id; // 笨・buyer.buyer_id繧剃ｽｿ逕ｨ・・UID・・    }
    
    const emailHistory = await emailHistoryService.getEmailHistory(actualBuyerId);
    res.json({ emailHistory });
  } catch (error: any) {
    console.error('Error fetching email history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 髢｢騾｣雋ｷ荳ｻ繧貞叙蠕・router.get('/:id/related', uuidValidationMiddleware('id'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[API] GET /buyers/${id}/related - Request received`);
    
    // UUID縺九←縺・°縺ｧ蛻､螳・    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｮ蝣ｴ蜷医・縲√∪縺喘uyer_id繧貞叙蠕・    let buyerId = id;
    if (!isUuid) {
      console.log(`[API] Resolving buyer number ${id} to UUID`);
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        console.warn(`[API] Buyer not found for buyer_number: ${id}`);
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Buyer not found',
          code: 'BUYER_NOT_FOUND',
          details: { buyer_number: id }
        });
      }
      buyerId = buyer.buyer_id; // 笨・buyer.buyer_id繧剃ｽｿ逕ｨ・・UID・・      console.log(`[API] Resolved buyer_number ${id} to UUID ${buyerId}`);
    }
    
    // 迴ｾ蝨ｨ縺ｮ雋ｷ荳ｻ繧貞叙蠕・    const currentBuyer = await buyerService.getById(buyerId);
    if (!currentBuyer) {
      console.warn(`[API] Buyer not found for UUID: ${buyerId}`);
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Buyer not found',
        code: 'BUYER_NOT_FOUND',
        details: { buyer_id: buyerId }
      });
    }

    // 髢｢騾｣雋ｷ荳ｻ繧呈､懃ｴ｢
    const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
    
    const duration = Date.now() - startTime;
    console.log(`[API] GET /buyers/${id}/related - Success (${duration}ms, ${relatedBuyers.length} related buyers)`);

    res.json({
      current_buyer: currentBuyer,
      related_buyers: relatedBuyers,
      total_count: relatedBuyers.length
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[API] GET /buyers/${id}/related - Error (${duration}ms):`, error);
    
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        code: 'BUYER_NOT_FOUND'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch related buyers',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 邨ｱ蜷亥撫蜷医○螻･豁ｴ繧貞叙蠕・router.get('/:id/unified-inquiry-history', uuidValidationMiddleware('id'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[API] GET /buyers/${id}/unified-inquiry-history - Request received`);
    
    // UUID縺九←縺・°縺ｧ蛻､螳・    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｮ蝣ｴ蜷医・縲√∪縺喘uyer_id繧貞叙蠕・    let buyerId = id;
    if (!isUuid) {
      console.log(`[API] Resolving buyer number ${id} to UUID`);
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        console.warn(`[API] Buyer not found for buyer_number: ${id}`);
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Buyer not found',
          code: 'BUYER_NOT_FOUND',
          details: { buyer_number: id }
        });
      }
      buyerId = buyer.buyer_id; // 笨・buyer.buyer_id繧剃ｽｿ逕ｨ・・UID・・      console.log(`[API] Resolved buyer_number ${id} to UUID ${buyerId}`);
    }
    
    // 迴ｾ蝨ｨ縺ｮ雋ｷ荳ｻ繧貞叙蠕・    const currentBuyer = await buyerService.getById(buyerId);
    if (!currentBuyer) {
      console.warn(`[API] Buyer not found for UUID: ${buyerId}`);
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Buyer not found',
        code: 'BUYER_NOT_FOUND',
        details: { buyer_id: buyerId }
      });
    }

    // 髢｢騾｣雋ｷ荳ｻ繧貞叙蠕・    const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
    
    // 蜈ｨ縺ｦ縺ｮ雋ｷ荳ｻID繧帝寔繧√ｋ
    const allBuyerIds = [buyerId, ...relatedBuyers.map(rb => rb.id)];
    
    // 邨ｱ蜷亥撫蜷医○螻･豁ｴ繧貞叙蠕・    const inquiries = await relatedBuyerService.getUnifiedInquiryHistory(allBuyerIds);
    
    // 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｮ繝ｪ繧ｹ繝医ｒ菴懈・
    const buyerNumbers = [
      currentBuyer.buyer_number,
      ...relatedBuyers.map(rb => rb.buyer_number)
    ];
    
    const duration = Date.now() - startTime;
    console.log(`[API] GET /buyers/${id}/unified-inquiry-history - Success (${duration}ms, ${inquiries.length} inquiries)`);
    
    if (duration > 1000) {
      console.warn(`[API] Slow query detected: ${duration}ms for buyer ${id}`);
    }

    res.json({
      inquiries,
      buyer_numbers: buyerNumbers
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[API] GET /buyers/${id}/unified-inquiry-history - Error (${duration}ms):`, error);
    
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        code: 'BUYER_NOT_FOUND'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch unified inquiry history',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 遶ｶ蜷医メ繧ｧ繝・け繧ｨ繝ｳ繝峨・繧､繝ｳ繝茨ｼ・ET・・router.get('/:id/conflict-check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { field, timestamp } = req.query;

    if (!field || !timestamp) {
      return res.status(400).json({ error: 'field and timestamp are required' });
    }

    // UUID縺九←縺・°縺ｧ蛻､螳・    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｮ蝣ｴ蜷医・縲√∪縺喘uyer_id繧貞叙蠕・    let buyerId = id;
    if (!isUuid) {
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerId = buyer.buyer_id; // 笨・buyer.buyer_id繧剃ｽｿ逕ｨ・・UID・・    }

    // 雋ｷ荳ｻ繧貞叙蠕・    const buyer = await buyerService.getById(buyerId);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    // 遶ｶ蜷医メ繧ｧ繝・け: last_synced_at縺荊imestamp繧医ｊ譁ｰ縺励＞蝣ｴ蜷医・遶ｶ蜷・    const clientTimestamp = new Date(timestamp as string);
    const lastSyncedAt = buyer.last_synced_at ? new Date(buyer.last_synced_at) : null;
    const updatedAt = buyer.updated_at ? new Date(buyer.updated_at) : null;

    // 遶ｶ蜷亥愛螳・ DB縺梧峩譁ｰ縺輔ｌ縺ｦ縺・※縲√°縺､繧ｯ繝ｩ繧､繧｢繝ｳ繝医・繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｈ繧頑眠縺励＞蝣ｴ蜷・    const hasConflict = updatedAt && updatedAt > clientTimestamp;

    if (hasConflict) {
      return res.json({
        hasConflict: true,
        conflictingValue: buyer[field as string],
        conflictingUser: 'another user', // TODO: 螳滄圀縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧貞叙蠕・        conflictingTimestamp: updatedAt?.toISOString()
      });
    }

    return res.json({
      hasConflict: false
    });
  } catch (error: any) {
    console.error('Error checking conflict:', error);
    res.status(500).json({ error: error.message });
  }
});

// 遶ｶ蜷郁ｧ｣豎ｺ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・router.post('/:id/conflict', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, conflicts } = req.body;

    // resolution: 'db_wins' | 'spreadsheet_wins' | 'manual'
    if (!resolution) {
      return res.status(400).json({ error: 'Resolution strategy is required' });
    }

    // Get user info from request
    const userId = (req as any).employee?.id || 'system';
    const userEmail = (req as any).employee?.email || 'system@example.com';

    // 雋ｷ荳ｻ繧貞叙蠕・    const buyer = await buyerService.getById(id);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    if (resolution === 'db_wins') {
      // DB縺ｮ蛟､縺ｧ繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医ｒ蠑ｷ蛻ｶ荳頑嶌縺・      // conflicts縺九ｉ譖ｴ譁ｰ縺吶ｋ繝輔ぅ繝ｼ繝ｫ繝峨ｒ謚ｽ蜃ｺ
      const updateData: Record<string, any> = {};
      if (conflicts && Array.isArray(conflicts)) {
        for (const conflict of conflicts) {
          updateData[conflict.fieldName] = conflict.dbValue;
        }
      }

      // force=true縺ｧ譖ｴ譁ｰ繧貞ｮ溯｡・      const result = await buyerService.updateWithSync(
        id,
        updateData,
        userId,
        userEmail,
        { force: true }
      );

      return res.json({
        success: true,
        buyer: result.buyer,
        syncStatus: result.syncResult.syncStatus
      });
    } else if (resolution === 'spreadsheet_wins') {
      // 繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医・蛟､繧堤ｶｭ謖・ｼ・B繧呈峩譁ｰ縺励↑縺・ｼ・      // last_synced_at繧呈峩譁ｰ縺励※遶ｶ蜷育憾諷九ｒ隗｣豸・      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      await supabase
        .from('buyers')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', id);

      return res.json({
        success: true,
        message: 'Spreadsheet values preserved',
        syncStatus: 'synced'
      });
    } else {
      return res.status(400).json({ error: 'Invalid resolution strategy' });
    }
  } catch (error: any) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 豎守畑繝ｫ繝ｼ繝茨ｼ域怙蠕後↓螳夂ｾｩ縺吶ｋ蠢・ｦ√′縺ゅｋ・・=====

// 蛟句挨蜿門ｾ暦ｼ・D・・router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    
    // UUID縺九←縺・°縺ｧ蛻､螳・    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // force=true縺ｮ蝣ｴ蜷医・繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医°繧牙ｼｷ蛻ｶ蜷梧悄
    if (force === 'true') {
      console.log(`[Buyers API] Force sync from spreadsheet for buyer: ${id}`);
      
      // 雋ｷ荳ｻ逡ｪ蜿ｷ繧貞叙蠕・      let buyerNumber: string;
      if (isUuid) {
        const buyer = await buyerService.getById(id);
        if (!buyer) {
          return res.status(404).json({ error: 'Buyer not found' });
        }
        buyerNumber = buyer.buyer_number;
      } else {
        buyerNumber = id;
      }
      
      // 繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医°繧牙酔譛滂ｼ・nhancedAutoSyncService繧剃ｽｿ逕ｨ・・      try {
        await enhancedAutoSyncService.initializeBuyer(); // 蛻晄悄蛹・        const syncResult = await enhancedAutoSyncService.syncUpdatedBuyers([buyerNumber]);
        console.log(`[Buyers API] Successfully synced buyer ${buyerNumber} from spreadsheet:`, syncResult);
      } catch (syncError: any) {
        console.error(`[Buyers API] Failed to sync buyer ${buyerNumber} from spreadsheet:`, syncError);
        // 蜷梧悄繧ｨ繝ｩ繝ｼ縺ｧ繧らｶ夊｡鯉ｼ・B縺九ｉ蜿門ｾ暦ｼ・      }
    }
    
    const data = isUuid 
      ? await buyerService.getById(id)
      : await buyerService.getByBuyerNumber(id);
    
    if (!data) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching buyer:', error);
    res.status(500).json({ error: error.message });
  }
});

// 雋ｷ荳ｻ諠・ｱ譖ｴ譁ｰ
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { force, sync } = req.query;

    // 蝓ｺ譛ｬ逧・↑繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }

    // 譖ｴ譁ｰ荳榊庄繝輔ぅ繝ｼ繝ｫ繝峨ｒ閾ｪ蜍慕噪縺ｫ髯､螟厄ｼ医お繝ｩ繝ｼ縺ｫ縺帙★縲∝腰縺ｫ辟｡隕悶☆繧具ｼ・    const protectedFields = ['buyer_id', 'created_at', 'synced_at', 'updated_at'];
    const sanitizedData = { ...updateData };
    protectedFields.forEach(field => {
      delete sanitizedData[field];
    });

    // 髯､螟門ｾ後↓繝・・繧ｿ縺檎ｩｺ縺ｫ縺ｪ縺｣縺溷ｴ蜷医・繧ｨ繝ｩ繝ｼ
    if (Object.keys(sanitizedData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Get user info from request (set by auth middleware)
    const userId = (req as any).employee?.id || 'system';
    const userEmail = (req as any).employee?.email || 'system@example.com';

    // id縺袈UID縺玖ｲｷ荳ｻ逡ｪ蜿ｷ縺九ｒ蛻､螳・    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let buyerId = id;

    console.log(`[PUT /buyers/:id] id=${id}, isUuid=${isUuid}`);

    // 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｮ蝣ｴ蜷医・buyer_id繧貞叙蠕・    if (!isUuid) {
      const buyer = await buyerService.getByBuyerNumber(id);
      console.log(`[PUT /buyers/:id] getByBuyerNumber result:`, buyer ? `found (buyer_id=${buyer.buyer_id})` : 'not found');
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerId = buyer.buyer_id; // 笨・buyer.buyer_id繧剃ｽｿ逕ｨ・・UID・・    }

    console.log(`[PUT /buyers/:id] buyerId=${buyerId}`);

    // sync=true縺ｮ蝣ｴ蜷医・蜿梧婿蜷大酔譛溘ｒ菴ｿ逕ｨ
    if (sync === 'true') {
      const result = await buyerService.updateWithSync(
        buyerId,
        sanitizedData,
        userId,
        userEmail,
        { force: force === 'true' }
      );

      // 遶ｶ蜷医′縺ゅｋ蝣ｴ蜷医・409繧定ｿ斐☆
      if (result.syncResult.conflict && result.syncResult.conflict.length > 0) {
        return res.status(409).json({
          error: 'Conflict detected',
          buyer: result.buyer,
          syncStatus: result.syncResult.syncStatus,
          conflicts: result.syncResult.conflict
        });
      }

      return res.json({
        ...result.buyer,
        syncStatus: result.syncResult.syncStatus,
        syncError: result.syncResult.error
      });
    }

    // 蠕捺擂縺ｮ譖ｴ譁ｰ・亥酔譛溘↑縺暦ｼ・    const updatedBuyer = await buyerService.update(buyerId, sanitizedData, userId, userEmail);
    res.json(updatedBuyer);
  } catch (error: any) {
    console.error('Error updating buyer:', error);
    
    if (error.message === 'Buyer not found') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// 雋ｷ荳ｻ縺ｸ縺ｮ繝｡繝ｼ繝ｫ騾∽ｿ｡
router.post('/:id/send-email', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { to, subject, content, htmlBody, selectedImages, templateType } = req.body;

    console.log('[POST /buyers/:id/send-email] Request received:', {
      buyerId: id,
      to,
      subject,
      contentLength: content?.length || 0,
      htmlBodyLength: htmlBody?.length || 0,
      hasImages: selectedImages && Array.isArray(selectedImages) && selectedImages.length > 0,
      imageCount: selectedImages?.length || 0,
      templateType,
    });

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!to || !subject || !content) {
      console.error('[POST /buyers/:id/send-email] Validation failed:', { to: !!to, subject: !!subject, content: !!content });
      return res.status(400).json({ error: '螳帛・縲∽ｻｶ蜷阪∵悽譁・・蠢・医〒縺・ });
    }

    // 雋ｷ荳ｻ諠・ｱ繧貞叙蠕・    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      console.error('[POST /buyers/:id/send-email] Buyer not found:', id);
      return res.status(404).json({ error: '雋ｷ荳ｻ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    console.log('[POST /buyers/:id/send-email] Buyer found:', {
      buyerNumber: buyer.buyer_number,
      name: buyer.name,
      email: buyer.email,
    });

    // EmailService繧剃ｽｿ逕ｨ縺励※Gmail騾∽ｿ｡
    const { EmailService } = require('../services/EmailService');
    const emailService = new EmailService();

    console.log('[POST /buyers/:id/send-email] Calling sendBuyerEmail...');

    // 繝｡繝ｼ繝ｫ騾∽ｿ｡・育判蜒乗ｷｻ莉伜ｯｾ蠢懶ｼ・    const result = await emailService.sendBuyerEmail({
      to: to,
      subject: subject,
      body: htmlBody || content,
      selectedImages: selectedImages || [], // 逕ｻ蜒乗ｷｻ莉倥ョ繝ｼ繧ｿ
    });

    console.log('[POST /buyers/:id/send-email] sendBuyerEmail result:', {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    if (!result.success) {
      console.error('[POST /buyers/:id/send-email] Email sending failed:', result.error);
      throw new Error(result.error || '繝｡繝ｼ繝ｫ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }

    // 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ繧定ｨ倬鹸
    try {
      const { ActivityLogService } = require('../services/ActivityLogService');
      const activityLogService = new ActivityLogService();
      
      // employee_id縺後↑縺・ｴ蜷医・繝ｭ繧ｰ繧定ｨ倬鹸縺励↑縺・ｼ・UID縺悟ｿ・医・縺溘ａ・・      const employeeId = (req as any).employee?.id;
      if (employeeId) {
        await activityLogService.logActivity({
          employeeId: employeeId,
          action: 'email',
          targetType: 'buyer',
          targetId: buyer.buyer_number,
          metadata: {
            template_type: templateType || '荳肴・',
            subject: subject,
            body: content, // 譛ｬ譁・・菴薙ｒ菫晏ｭ・            recipient_email: to,
            sender_email: (req as any).employee?.email || 'unknown',
            selected_images: selectedImages?.length || 0,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        console.log('[POST /buyers/:id/send-email] Activity log recorded successfully');
      } else {
        console.warn('[POST /buyers/:id/send-email] Skipping activity log: No employee_id available');
      }
    } catch (logError: any) {
      // 繝ｭ繧ｰ險倬鹸螟ｱ謨励＠縺ｦ繧ゅΓ繝ｼ繝ｫ騾∽ｿ｡縺ｯ謌仙粥縺ｨ縺励※謇ｱ縺・      console.error('[POST /buyers/:id/send-email] Failed to log email activity:', logError);
    }

    console.log('[POST /buyers/:id/send-email] Email sent successfully:', result.messageId);

    res.json({
      success: true,
      message: '繝｡繝ｼ繝ｫ繧帝∽ｿ｡縺励∪縺励◆',
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('[POST /buyers/:id/send-email] Exception:', error);
    console.error('[POST /buyers/:id/send-email] Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || '繝｡繝ｼ繝ｫ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error.toString(),
    });
  }
});

// 雋ｷ荳ｻ縺ｸ縺ｮSMS騾∽ｿ｡險倬鹸
router.post('/:id/send-sms', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, templateType } = req.body;

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!message) {
      return res.status(400).json({ error: '繝｡繝・そ繝ｼ繧ｸ縺ｯ蠢・医〒縺・ });
    }

    // 雋ｷ荳ｻ諠・ｱ繧貞叙蠕・    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      return res.status(404).json({ error: '雋ｷ荳ｻ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    // SMS騾∽ｿ｡險倬鹸繧偵い繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ縺ｫ菫晏ｭ・    try {
      const { ActivityLogService } = require('../services/ActivityLogService');
      const activityLogService = new ActivityLogService();
      
      // employee_id縺後↑縺・ｴ蜷医・繝ｭ繧ｰ繧定ｨ倬鹸縺励↑縺・ｼ・UID縺悟ｿ・医・縺溘ａ・・      const employeeId = (req as any).employee?.id;
      if (employeeId) {
        await activityLogService.logActivity({
          employeeId: employeeId,
          action: 'sms',
          targetType: 'buyer',
          targetId: buyer.buyer_number,
          metadata: {
            template_type: templateType || '荳肴・',
            message: message,
            recipient_phone: buyer.phone_number,
            sender: (req as any).employee?.name || 'unknown',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        console.log('SMS activity log recorded successfully for buyer:', id);
      } else {
        console.warn('Skipping SMS activity log: No employee_id available');
      }
    } catch (logError: any) {
      // 繝ｭ繧ｰ險倬鹸螟ｱ謨励＠縺ｦ繧４MS騾∽ｿ｡縺ｯ謌仙粥縺ｨ縺励※謇ｱ縺・      console.error('Failed to log SMS activity:', logError);
    }

    console.log('Recording SMS to buyer:', {
      buyerNumber: id,
      phoneNumber: buyer.phone_number,
      message: message.substring(0, 100) + '...',
    });

    res.json({
      success: true,
      message: 'SMS騾∽ｿ｡繧定ｨ倬鹸縺励∪縺励◆',
    });
  } catch (error: any) {
    console.error('Failed to record SMS:', error);
    res.status(500).json({ error: error.message || 'SMS騾∽ｿ｡險倬鹸縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 諡・ｽ薙∈縺ｮ遒ｺ隱堺ｺ矩・ｒGoogle Chat縺ｫ騾∽ｿ｡
router.post('/:buyer_number/send-confirmation', async (req: Request, res: Response) => {
  try {
    const { buyer_number } = req.params;
    const { confirmationText, buyerDetailUrl } = req.body;

    console.log('[POST /buyers/:buyer_number/send-confirmation] Request received:', {
      buyer_number,
      confirmationTextLength: confirmationText?.length || 0,
      buyerDetailUrl
    });

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ: confirmationText縺檎ｩｺ縺ｾ縺溘・譛ｪ螳夂ｾｩ
    if (!confirmationText || confirmationText.trim().length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Validation failed: confirmationText is empty');
      return res.status(400).json({
        success: false,
        error: '遒ｺ隱堺ｺ矩・ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞'
      });
    }

    // 1. buyer_number縺ｧ雋ｷ荳ｻ繧貞叙蠕・    const buyer = await buyerService.getByBuyerNumber(buyer_number);
    if (!buyer) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Buyer not found:', buyer_number);
      return res.status(404).json({
        success: false,
        error: '雋ｷ荳ｻ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆'
      });
    }

    console.log('[POST /buyers/:buyer_number/send-confirmation] Buyer found:', {
      buyer_number: buyer.buyer_number,
      name: buyer.name,
      property_number: buyer.property_number
    });

    // 2. property_number縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・    if (!buyer.property_number || buyer.property_number.trim().length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] property_number is empty');
      return res.status(400).json({
        success: false,
        error: '迚ｩ莉ｶ逡ｪ蜿ｷ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ'
      });
    }

    // 3. 邏舌▼縺冗黄莉ｶ繧貞叙蠕・    const properties = await buyerService.getLinkedProperties(buyer.buyer_id);
    if (!properties || properties.length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] No linked properties found');
      return res.status(400).json({
        success: false,
        error: '邏舌▼縺冗黄莉ｶ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆'
      });
    }

    console.log('[POST /buyers/:buyer_number/send-confirmation] Linked properties found:', {
      count: properties.length,
      first_property: properties[0].property_number
    });

    // 4. sales_assignee縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・    const firstProperty = properties[0];
    if (!firstProperty.sales_assignee || firstProperty.sales_assignee.trim().length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] sales_assignee is empty');
      return res.status(400).json({
        success: false,
        error: '迚ｩ莉ｶ諡・ｽ楢・′險ｭ螳壹＆繧後※縺・∪縺帙ｓ'
      });
    }

    const assigneeName = firstProperty.sales_assignee;
    console.log('[POST /buyers/:buyer_number/send-confirmation] Assignee name:', assigneeName);

    // 5. StaffManagementService.getWebhookUrl()縺ｧWebhook URL繧貞叙蠕・    const { StaffManagementService } = require('../services/StaffManagementService');
    const staffService = new StaffManagementService();
    
    const webhookResult = await staffService.getWebhookUrl(assigneeName);
    
    if (!webhookResult.success) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Failed to get webhook URL:', webhookResult.error);
      return res.status(404).json({
        success: false,
        error: webhookResult.error || '諡・ｽ楢・・Webhook URL縺悟叙蠕励〒縺阪∪縺帙ｓ縺ｧ縺励◆'
      });
    }

    const webhookUrl = webhookResult.webhookUrl!;
    console.log('[POST /buyers/:buyer_number/send-confirmation] Webhook URL retrieved');

    // 6. 繝｡繝・そ繝ｼ繧ｸ繧偵ヵ繧ｩ繝ｼ繝槭ャ繝・    // 萓｡譬ｼ縺ｮ繝輔か繝ｼ繝槭ャ繝茨ｼ井ｸ・・陦ｨ遉ｺ・・    // property_listings繝・・繝悶Ν縺ｮprice繝輔ぅ繝ｼ繝ｫ繝峨ｒ菴ｿ逕ｨ
    const price = firstProperty.price || firstProperty.sales_price || firstProperty.listing_price;
    const priceFormatted = price 
      ? `${(price / 10000).toLocaleString()}荳・・`
      : '譛ｪ險ｭ螳・;
    
    console.log('[POST /buyers/:buyer_number/send-confirmation] Price data:', {
      price: firstProperty.price,
      sales_price: firstProperty.sales_price,
      listing_price: firstProperty.listing_price,
      formatted: priceFormatted
    });
    
    // 雋ｷ荳ｻ隧ｳ邏ｰ逕ｻ髱｢縺ｮURL・医ヵ繝ｭ繝ｳ繝医お繝ｳ繝峨°繧蛾∽ｿ｡縺輔ｌ縺欟RL縲√∪縺溘・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・    const detailUrl = buyerDetailUrl || `https://www.appsheet.com/start/8f0d5296-d256-411a-9a64-a13f2e034d8f#view=%E8%B2%B7%E4%B8%BB%E3%83%AA%E3%82%B9%E3%83%88_Detail&row=${buyer.buyer_number}`;
    
    // 繝｡繝・そ繝ｼ繧ｸ繧呈ｧ狗ｯ会ｼ域ｳ穂ｺｺ蜷阪→莉ｲ莉九・譛臥┌縺ｯ譚｡莉ｶ莉倥″陦ｨ遉ｺ・・    let message = `蝠丞粋縺帙≠繧翫∪縺励◆: 
縲縲仙・蜍墓球蠖薙・{buyer.initial_assignee || '譛ｪ險ｭ螳・}縲宣｣邨｡蜈医・{buyer.assignee_phone || '譛ｪ險ｭ螳・}
縲千黄莉ｶ謇蝨ｨ蝨ｰ縲・${firstProperty.display_address || firstProperty.address || '譛ｪ險ｭ螳・}
縲蝉ｾ｡譬ｼ縲・{priceFormatted}
縲絶・蝠丞粋縺帛・螳ｹ縲・{confirmationText}
 縲仙撫蜷医○閠・ｰ丞錐縲・{buyer.name || '譛ｪ險ｭ螳・}`;

    // 豕穂ｺｺ蜷阪′縺ゅｋ蝣ｴ蜷医・縺ｿ霑ｽ蜉
    if (buyer.company_name && buyer.company_name.trim().length > 0) {
      message += `\n縲先ｳ穂ｺｺ縺ｮ蝣ｴ蜷域ｳ穂ｺｺ蜷阪・{buyer.company_name}`;
      // 莉ｲ莉九・譛臥┌繧りｿｽ蜉・域ｳ穂ｺｺ縺ｮ蝣ｴ蜷医・縺ｿ・・      if (buyer.broker_inquiry && buyer.broker_inquiry.trim().length > 0) {
        message += `\n縲蝉ｻｲ莉九・譛臥┌縲・{buyer.broker_inquiry}`;
      }
    }

    message += `\n縲仙撫蜷医○閠・崕隧ｱ逡ｪ蜿ｷ縲・${buyer.phone_number || '譛ｪ險ｭ螳・}
${detailUrl}`;

    console.log('[POST /buyers/:buyer_number/send-confirmation] Message formatted');

    // 7. GoogleChatService.sendMessage()縺ｧ繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡
    const { GoogleChatService } = require('../services/GoogleChatService');
    const chatService = new GoogleChatService();
    
    const sendResult = await chatService.sendMessage(webhookUrl, message);
    
    if (!sendResult.success) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Failed to send message:', sendResult.error);
      return res.status(500).json({
        success: false,
        error: sendResult.error || '繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
      });
    }

    console.log('[POST /buyers/:buyer_number/send-confirmation] Message sent successfully');

    // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ
    res.json({
      success: true,
      message: '騾∽ｿ｡縺励∪縺励◆'
    });

  } catch (error: any) {
    console.error('[POST /buyers/:buyer_number/send-confirmation] Exception:', error);
    console.error('[POST /buyers/:buyer_number/send-confirmation] Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: `繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${error.message}`
    });
  }
});

export default router;
