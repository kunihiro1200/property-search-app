import express from 'express';
import { MessageTemplateService } from '../services/MessageTemplateService';

const router = express.Router();
const messageTemplateService = new MessageTemplateService();

/**
 * GET /api/message-templates
 * メッセージテンプレート一覧を取得
 */
router.get('/', async (req, res) => {
  try {
    const { category = '物件' } = req.query;
    const templates = await messageTemplateService.getTemplates(category as string);
    res.json(templates);
  } catch (error) {
    console.error('Failed to fetch message templates:', error);
    res.status(500).json({ error: 'Failed to fetch message templates' });
  }
});

/**
 * GET /api/message-templates/:type
 * 特定の種別のテンプレートを取得
 */
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { category = '物件' } = req.query;
    const template = await messageTemplateService.getTemplateByType(category as string, type);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Failed to fetch template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

export default router;
