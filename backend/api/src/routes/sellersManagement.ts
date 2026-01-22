import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { sellerNumberService } from '../services/SellerNumberService';
import { duplicateDetectionService } from '../services/DuplicateDetectionService';
import { inquiryService } from '../services/InquiryService';
import { valuationService } from '../services/ValuationService';
import { visitService } from '../services/VisitService';
import { followUpProgressService } from '../services/FollowUpProgressService';
import { documentDeliveryService } from '../services/DocumentDeliveryService';
import { assigneeService } from '../services/AssigneeService';
import { competitorService } from '../services/CompetitorService';
import { pinrichService } from '../services/PinrichService';
import { exclusionService } from '../services/ExclusionService';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Generate seller number
 * POST /sellers/generate-number
 */
router.post('/generate-number', async (_req: Request, res: Response) => {
  try {
    const sellerNumber = await sellerNumberService.generateWithRetry();
    res.json({ sellerNumber });
  } catch (error: any) {
    console.error('Generate seller number error:', error);
    res.status(500).json({
      error: {
        code: 'GENERATION_ERROR',
        message: error.message || 'Failed to generate seller number',
        retryable: true,
      },
    });
  }
});

/**
 * Check for duplicate sellers
 * POST /sellers/check-duplicate
 */
router.post(
  '/check-duplicate',
  [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('excludeId').optional().isString(),
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

      const { phoneNumber, email, excludeId } = req.body;
      const matches = await duplicateDetectionService.checkDuplicates(
        phoneNumber,
        email,
        excludeId
      );

      res.json({ matches });
    } catch (error: any) {
      console.error('Check duplicate error:', error);
      res.status(500).json({
        error: {
          code: 'DUPLICATE_CHECK_ERROR',
          message: error.message || 'Failed to check duplicates',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Copy seller information
 * POST /sellers/copy/:sellerNumber
 */
router.post(
  '/copy/:sellerNumber',
  [param('sellerNumber').matches(/^AA\d{5}$/).withMessage('Invalid seller number format')],
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

      const { sellerNumber } = req.params;
      const sellerData = await duplicateDetectionService.copySeller(sellerNumber);

      res.json({ sellerData });
    } catch (error: any) {
      console.error('Copy seller error:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        error: {
          code: error.message.includes('not found') ? 'NOT_FOUND' : 'COPY_ERROR',
          message: error.message || 'Failed to copy seller',
          retryable: false,
        },
      });
    }
  }
);

/**
 * Copy buyer information
 * POST /buyers/copy/:buyerNumber
 */
router.post(
  '/buyers/copy/:buyerNumber',
  [param('buyerNumber').notEmpty().withMessage('Buyer number is required')],
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

      const { buyerNumber } = req.params;
      const buyerData = await duplicateDetectionService.copyBuyer(buyerNumber);

      res.json({ buyerData });
    } catch (error: any) {
      console.error('Copy buyer error:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        error: {
          code: error.message.includes('not found') ? 'NOT_FOUND' : 'COPY_ERROR',
          message: error.message || 'Failed to copy buyer',
          retryable: false,
        },
      });
    }
  }
);

/**
 * Get past owner and property information
 * POST /sellers/past-info
 */
router.post(
  '/past-info',
  [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
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

      const { phoneNumber, email } = req.body;
      const pastInfo = await duplicateDetectionService.getPastOwnerAndPropertyInfo(
        phoneNumber,
        email
      );

      res.json(pastInfo);
    } catch (error: any) {
      console.error('Get past info error:', error);
      res.status(500).json({
        error: {
          code: 'PAST_INFO_ERROR',
          message: error.message || 'Failed to get past information',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Record inquiry information
 * POST /sellers/:id/inquiry
 */
router.post(
  '/:id/inquiry',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('inquirySite').notEmpty().withMessage('Inquiry site is required'),
    body('inquiryDate').optional().isISO8601(),
    body('inquiryReason').optional().isString(),
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

      const { id } = req.params;
      const inquiryData = req.body;

      const inquiry = await inquiryService.recordInquiry(id, inquiryData);
      res.json({ inquiry });
    } catch (error: any) {
      console.error('Record inquiry error:', error);
      res.status(500).json({
        error: {
          code: 'INQUIRY_ERROR',
          message: error.message || 'Failed to record inquiry',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Get inquiry information
 * GET /sellers/:id/inquiry
 */
router.get(
  '/:id/inquiry',
  [param('id').isUUID().withMessage('Invalid seller ID')],
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

      const { id } = req.params;
      const inquiry = await inquiryService.getInquiry(id);

      if (!inquiry) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Inquiry not found',
            retryable: false,
          },
        });
      }

      res.json({ inquiry });
    } catch (error: any) {
      console.error('Get inquiry error:', error);
      res.status(500).json({
        error: {
          code: 'INQUIRY_ERROR',
          message: error.message || 'Failed to get inquiry',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Update valuation amounts
 * PUT /sellers/:id/valuations
 */
router.put(
  '/:id/valuations',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('valuationAmount1').optional().isNumeric(),
    body('valuationAmount2').optional().isNumeric(),
    body('valuationAmount3').optional().isNumeric(),
    body('postVisitValuationAmount1').optional().isNumeric(),
    body('valuationMethod').optional().isString(),
    body('valuationPdfUrl').optional().isURL(),
    body('fixedAssetTaxRoadPrice').optional().isNumeric(),
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

      const { id } = req.params;
      const valuations = await valuationService.saveValuationAmounts(id, req.body);

      res.json({ valuations });
    } catch (error: any) {
      console.error('Update valuations error:', error);
      res.status(500).json({
        error: {
          code: 'VALUATION_ERROR',
          message: error.message || 'Failed to update valuations',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Schedule visit
 * POST /sellers/:id/visit
 */
router.post(
  '/:id/visit',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('visitDate').notEmpty().isISO8601().withMessage('Valid visit date is required'),
    body('visitTime').notEmpty().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('visitAssignee').notEmpty().isString(),
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

      const { id } = req.params;
      const visit = await visitService.scheduleVisit(id, req.body);

      res.json({ visit });
    } catch (error: any) {
      console.error('Schedule visit error:', error);
      res.status(500).json({
        error: {
          code: 'VISIT_ERROR',
          message: error.message || 'Failed to schedule visit',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Update follow-up status
 * PUT /sellers/:id/follow-up-status
 */
router.put(
  '/:id/follow-up-status',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('unreachable').optional().isBoolean(),
    body('nextCallDate').optional().isISO8601(),
    body('confidence').optional().isIn(['高', '中', '低']),
    body('contactMethod').optional().isIn(['Email', 'Smail', '電話']),
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

      const { id } = req.params;
      const { unreachable, nextCallDate, confidence, contactMethod } = req.body;

      let result;
      if (unreachable !== undefined) {
        result = unreachable
          ? await followUpProgressService.markUnreachable(id)
          : await followUpProgressService.markReachable(id);
      } else if (nextCallDate) {
        result = await followUpProgressService.scheduleNextCall(id, new Date(nextCallDate));
      } else if (confidence) {
        result = await followUpProgressService.updateConfidence(id, confidence);
      } else if (contactMethod) {
        result = await followUpProgressService.updateContactMethod(id, contactMethod);
      }

      res.json({ followUpStatus: result });
    } catch (error: any) {
      console.error('Update follow-up status error:', error);
      res.status(500).json({
        error: {
          code: 'FOLLOW_UP_ERROR',
          message: error.message || 'Failed to update follow-up status',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Record document delivery
 * POST /sellers/:id/document-delivery
 */
router.post(
  '/:id/document-delivery',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('type').isIn(['email', 'mail']).withMessage('Type must be email or mail'),
    body('sentDate').optional().isISO8601(),
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

      const { id } = req.params;
      const { type, sentDate } = req.body;
      const date = sentDate ? new Date(sentDate) : new Date();

      const delivery =
        type === 'email'
          ? await documentDeliveryService.recordEmailSent(id, date)
          : await documentDeliveryService.recordMailSent(id, date);

      res.json({ delivery });
    } catch (error: any) {
      console.error('Record document delivery error:', error);
      res.status(500).json({
        error: {
          code: 'DELIVERY_ERROR',
          message: error.message || 'Failed to record document delivery',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Update assignees
 * PUT /sellers/:id/assignees
 */
router.put(
  '/:id/assignees',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('valuationAssignee').optional().isString(),
    body('phoneAssignee').optional().isString(),
    body('visitAssignee').optional().isString(),
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

      const { id } = req.params;
      const { valuationAssignee, phoneAssignee, visitAssignee } = req.body;

      let result;
      if (valuationAssignee) {
        result = await assigneeService.updateValuationAssignee(id, valuationAssignee);
      } else if (phoneAssignee !== undefined) {
        result = await assigneeService.updatePhoneAssignee(id, phoneAssignee);
      } else if (visitAssignee) {
        result = await assigneeService.updateVisitAssignee(id, visitAssignee);
      }

      res.json({ assignees: result });
    } catch (error: any) {
      console.error('Update assignees error:', error);
      res.status(500).json({
        error: {
          code: 'ASSIGNEE_ERROR',
          message: error.message || 'Failed to update assignees',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Record competitor information
 * POST /sellers/:id/competitor
 */
router.post(
  '/:id/competitor',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('competitorName').optional().isString(),
    body('exclusiveOtherDecisionFactor').optional().isString(),
    body('otherDecisionCountermeasure').optional().isString(),
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

      const { id } = req.params;
      const competitor = await competitorService.recordCompetitor(id, req.body);

      res.json({ competitor });
    } catch (error: any) {
      console.error('Record competitor error:', error);
      res.status(500).json({
        error: {
          code: 'COMPETITOR_ERROR',
          message: error.message || 'Failed to record competitor',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Update Pinrich status
 * PUT /sellers/:id/pinrich
 */
router.put(
  '/:id/pinrich',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('status').isIn(['配信中', 'クローズ']).withMessage('Invalid Pinrich status'),
    body('numberOfCompanies').optional().isInt({ min: 0 }),
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

      const { id } = req.params;
      const { status, numberOfCompanies } = req.body;

      const pinrich =
        status === '配信中'
          ? await pinrichService.startPinrichDistribution(id, numberOfCompanies)
          : await pinrichService.closePinrichDistribution(id);

      res.json({ pinrich });
    } catch (error: any) {
      console.error('Update Pinrich error:', error);
      res.status(500).json({
        error: {
          code: 'PINRICH_ERROR',
          message: error.message || 'Failed to update Pinrich',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Add to exclusion list
 * POST /sellers/:id/exclusion
 */
router.post(
  '/:id/exclusion',
  [
    param('id').isUUID().withMessage('Invalid seller ID'),
    body('exclusionSite').notEmpty().isString(),
    body('exclusionCriteria').optional().isString(),
    body('exclusionAction').optional().isString(),
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

      const { id } = req.params;
      const exclusion = await exclusionService.addToExclusionList(id, req.body);

      res.json({ exclusion });
    } catch (error: any) {
      console.error('Add to exclusion error:', error);
      res.status(500).json({
        error: {
          code: 'EXCLUSION_ERROR',
          message: error.message || 'Failed to add to exclusion list',
          retryable: true,
        },
      });
    }
  }
);

export default router;
