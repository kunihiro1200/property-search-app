import express from 'express';
import { EmailTemplateService } from '../services/EmailTemplateService';
import { TemplateContext } from '../types/emailTemplate';

const router = express.Router();
const templateService = new EmailTemplateService();

/**
 * Get all available email templates
 * GET /api/email-templates
 */
router.get('/', async (req, res) => {
  try {
    const templates = await templateService.getTemplates();
    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

/**
 * Get a specific email template by ID
 * GET /api/email-templates/:templateId
 */
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await templateService.getTemplateById(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

/**
 * Get template preview with sample data
 * GET /api/email-templates/:templateId/preview
 */
router.get('/:templateId/preview', async (req, res) => {
  try {
    const { templateId } = req.params;
    const preview = await templateService.getTemplatePreview(templateId);
    
    if (!preview) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(preview);
  } catch (error: any) {
    console.error('Error generating template preview:', error);
    res.status(500).json({ error: 'Failed to generate template preview' });
  }
});

/**
 * Merge template with actual data
 * POST /api/email-templates/:templateId/merge
 * Body: { buyer: BuyerData, property?: PropertyData }
 */
router.post('/:templateId/merge', async (req, res) => {
  try {
    const { templateId } = req.params;
    const context: TemplateContext = req.body;
    
    // Validate context
    if (!context.buyer) {
      return res.status(400).json({ error: 'Buyer data is required' });
    }
    
    // Get template
    const template = await templateService.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Validate placeholders
    const missingPlaceholders = templateService.validatePlaceholders(template, context);
    if (missingPlaceholders.length > 0) {
      return res.status(400).json({
        error: 'Missing required data for placeholders',
        missingPlaceholders
      });
    }
    
    // Merge template with data
    const mergedContent = templateService.mergePlaceholders(template, context);
    
    res.json(mergedContent);
  } catch (error: any) {
    console.error('Error merging template:', error);
    res.status(500).json({ error: 'Failed to merge template with data' });
  }
});

/**
 * Merge template with multiple properties
 * POST /api/email-templates/:templateId/merge-multiple
 * Body: { buyer: BuyerData, propertyIds: string[] }
 */
router.post('/:templateId/merge-multiple', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { buyer, propertyIds } = req.body;
    
    // Validate input
    if (!buyer) {
      return res.status(400).json({ error: 'Buyer data is required' });
    }
    
    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ error: 'Property IDs array is required' });
    }
    
    // Get template
    const template = await templateService.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Fetch property data for all property IDs
    // This would typically call PropertyListingService or similar
    // For now, we'll use a placeholder implementation
    const properties = await Promise.all(
      propertyIds.map(async (propertyId: string) => {
        try {
          // TODO: Replace with actual property data fetching
          // const propertyData = await propertyService.getPropertyById(propertyId);
          
          // Placeholder: Return mock data
          // In real implementation, fetch from database
          return {
            propertyNumber: `Property-${propertyId}`,
            propertyAddress: '大分県大分市',
            price: 30000000,
            propertyType: '戸建て',
            landArea: 150,
            buildingArea: 100
          };
        } catch (error) {
          console.error(`Failed to fetch property ${propertyId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null values (failed fetches)
    const validProperties = properties.filter(p => p !== null);
    
    if (validProperties.length === 0) {
      return res.status(404).json({ error: 'No valid properties found' });
    }
    
    // Merge template with multiple properties
    const mergedContent = templateService.mergeMultipleProperties(
      template,
      buyer,
      validProperties
    );
    
    res.json(mergedContent);
  } catch (error: any) {
    console.error('Error merging template with multiple properties:', error);
    res.status(500).json({ error: 'Failed to merge template with multiple properties' });
  }
});

export default router;
