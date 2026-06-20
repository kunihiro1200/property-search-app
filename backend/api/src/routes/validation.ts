import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { PropertyDataValidator } from '../services/PropertyDataValidator';
import { DataIntegrityDiagnosticService } from '../services/DataIntegrityDiagnosticService';
import pool from '../config/database';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Get comprehensive property data validation report
 * GET /validation/property-data
 */
router.get('/property-data', async (req: Request, res: Response) => {
  try {
    const validator = new PropertyDataValidator(pool);
    const diagnosticService = new DataIntegrityDiagnosticService();

    // Generate validation summary
    const summary = await validator.generateSummary();

    // Find properties with issues
    const issues = await validator.findPropertiesWithIssues();

    // Generate distribution area report
    const distributionReport = await diagnosticService.generateDistributionAreaReport();

    // Compile actionable recommendations
    const recommendations: string[] = [];

    if (issues.missingGoogleMapUrl.length > 0) {
      recommendations.push(
        `${issues.missingGoogleMapUrl.length}件の物件にGoogle Map URLを設定してください`
      );
    }

    if (issues.missingCity.length > 0) {
      recommendations.push(
        `${issues.missingCity.length}件の物件に市フィールドを設定してください（batch-extract-cities.tsスクリプトで自動抽出可能）`
      );
    }

    if (issues.missingPropertyListing.length > 0) {
      recommendations.push(
        `${issues.missingPropertyListing.length}件の物件リストを作成してください`
      );
    }

    const distributionIssues = distributionReport.issues.filter(
      issue => issue.issueType === 'incorrect_calculation'
    );

    if (distributionIssues.length > 0) {
      recommendations.push(
        `${distributionIssues.length}件の配信エリアを再計算してください（recalculate-distribution-areas.tsスクリプトで再計算可能）`
      );
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalProperties: summary.total,
          missingGoogleMapUrl: summary.missingGoogleMapUrl,
          missingCity: summary.missingCity,
          missingPropertyListing: summary.missingPropertyListing,
          completeData: summary.completeData,
          propertiesWithIncorrectAreas: distributionReport.summary.propertiesWithIncorrectAreas
        },
        issues: {
          missingGoogleMapUrl: issues.missingGoogleMapUrl.map(p => ({
            propertyNumber: p.seller_number,
            address: p.address
          })),
          missingCity: issues.missingCity.map(p => ({
            propertyNumber: p.seller_number,
            address: p.address
          })),
          missingPropertyListing: issues.missingPropertyListing.map(p => ({
            propertyNumber: p.seller_number,
            address: p.address
          })),
          incorrectDistributionAreas: distributionIssues.map(issue => ({
            propertyNumber: issue.propertyNumber,
            details: issue.details
          }))
        },
        recommendations
      }
    });
  } catch (error) {
    console.error('Error generating validation report:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate validation report',
        retryable: true
      }
    });
  }
});

/**
 * Get validation report for a specific property
 * GET /validation/property-data/:propertyNumber
 */
router.get('/property-data/:propertyNumber', async (req: Request, res: Response) => {
  try {
    const { propertyNumber } = req.params;
    const diagnosticService = new DataIntegrityDiagnosticService();

    // Diagnose distribution areas
    const diagnostic = await diagnosticService.diagnoseDistributionAreas(propertyNumber);

    res.json({
      success: true,
      data: {
        propertyNumber: diagnostic.propertyNumber,
        address: diagnostic.address,
        googleMapUrl: diagnostic.googleMapUrl,
        city: diagnostic.city,
        currentDistributionAreas: diagnostic.currentDistributionAreas,
        calculatedDistributionAreas: diagnostic.calculatedDistributionAreas,
        discrepancy: diagnostic.discrepancy,
        missingAreas: diagnostic.missingAreas,
        unexpectedAreas: diagnostic.unexpectedAreas,
        debugInfo: diagnostic.distanceDebugInfo
      }
    });
  } catch (error) {
    console.error('Error diagnosing property:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Property not found',
          retryable: false
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to diagnose property',
        retryable: true
      }
    });
  }
});

export default router;
