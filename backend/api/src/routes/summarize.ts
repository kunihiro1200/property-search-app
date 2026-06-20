import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { SummaryGenerator } from '../services/SummaryGenerator';
import { ActivityLogService } from '../services/ActivityLogService';
import { SellerService } from '../services/SellerService';

const router = Router();
const summaryGenerator = new SummaryGenerator();
const activityLogService = new ActivityLogService();
const sellerService = new SellerService();

/**
 * 通話メモを要約（拡張版）
 * 
 * Supports both old format (memos array) and new format (structured data)
 */
router.post('/call-memos', authenticate, async (req: Request, res: Response) => {
  try {
    const { memos, communicationHistory, spreadsheetComments, sellerData } = req.body;

    // Backward compatibility: support old format with memos array
    if (memos && Array.isArray(memos)) {
      if (memos.length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Memos are required',
            retryable: false,
          },
        });
      }

      // Use new generator with backward compatible method
      const summary = summaryGenerator.generateSimpleSummary(memos);
      return res.json({ summary });
    }

    // New format: structured data
    if (!communicationHistory && !spreadsheetComments) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either memos, communicationHistory, or spreadsheetComments are required',
          retryable: false,
        },
      });
    }

    // Generate enhanced summary
    const result = summaryGenerator.generateEnhancedSummary({
      communicationHistory: communicationHistory || [],
      spreadsheetComments: spreadsheetComments || [],
      sellerData: sellerData || {},
    });

    return res.json({
      summary: result.summary,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Summarization error:', error);
    return res.status(500).json({
      error: {
        code: 'SUMMARIZATION_ERROR',
        message: 'Failed to summarize memos',
        retryable: true,
      },
    });
  }
});

/**
 * 売主の通話履歴サマリーを生成（統合版）
 * 
 * Fetches data from ActivityLogService and SellerService, then generates summary
 */
router.get('/seller/:sellerId', authenticate, async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Seller ID is required',
          retryable: false,
        },
      });
    }

    // Fetch seller data
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

    // Fetch communication history (limit to 200 most recent entries)
    const activityLogs = await activityLogService.getLogs({
      sellerId,
    });

    // Extract spreadsheet comments from seller.comments field
    const spreadsheetComments: string[] = [];
    if (seller.comments) {
      // Parse comments field - assuming it's stored as JSON array or newline-separated
      try {
        if (typeof seller.comments === 'string') {
          // Try parsing as JSON first
          try {
            const parsed = JSON.parse(seller.comments);
            if (Array.isArray(parsed)) {
              spreadsheetComments.push(...parsed);
            } else {
              // Split by newlines if not JSON
              spreadsheetComments.push(...seller.comments.split('\n').filter(c => c.trim()));
            }
          } catch {
            // Split by newlines if JSON parse fails
            spreadsheetComments.push(...seller.comments.split('\n').filter(c => c.trim()));
          }
        } else if (Array.isArray(seller.comments)) {
          spreadsheetComments.push(...seller.comments);
        }
      } catch (error) {
        console.warn('Failed to parse seller comments:', error);
      }
    }

    // Limit to 200 most recent entries for performance
    const limitedActivityLogs = activityLogs.slice(0, 200);

    // Generate enhanced summary
    const result = summaryGenerator.generateEnhancedSummary({
      communicationHistory: limitedActivityLogs,
      spreadsheetComments,
      sellerData: {
        name: seller.name,
        status: seller.status,
        confidence: seller.confidence,
        assignedTo: seller.assignedTo,
      },
    });

    return res.json({
      summary: result.summary,
      metadata: result.metadata,
      seller: {
        id: seller.id,
        name: seller.name,
        status: seller.status,
      },
    });
  } catch (error) {
    console.error('Seller summary generation error:', error);
    return res.status(500).json({
      error: {
        code: 'SUMMARIZATION_ERROR',
        message: 'Failed to generate seller summary',
        retryable: true,
      },
    });
  }
});

export default router;
