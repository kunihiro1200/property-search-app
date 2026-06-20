import { Router, Request, Response } from 'express';
import { ValuationEngine } from '../services/ValuationEngine.supabase';
import { SellerService } from '../services/SellerService.supabase';
import { authenticate } from '../middleware/auth';

const router = Router();
const valuationEngine = new ValuationEngine();
const sellerService = new SellerService();

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * 査定を実行
 */
router.post('/:sellerId/valuations', async (req: Request, res: Response) => {
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

    // 物件情報を取得
    const { data: property, error: propertyError } = await valuationEngine['table']('properties')
      .select('*')
      .eq('seller_id', sellerId)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Property information not found',
          retryable: false,
        },
      });
    }

    console.log('Property data from DB:', property);

    // データベースのスネークケースをキャメルケースに変換
    const propertyInfo = {
      id: property.id,
      sellerId: property.seller_id,
      address: property.address,
      prefecture: property.prefecture,
      city: property.city,
      propertyType: property.property_type,
      landArea: property.land_area,
      buildingArea: property.building_area,
      buildYear: property.build_year,
      structure: property.structure,
      floors: property.floors,
      rooms: property.rooms,
      parking: property.parking,
      additionalInfo: property.additional_info,
    };

    console.log('Converted property info:', propertyInfo);

    // 査定を実行
    const valuation = await valuationEngine.calculateValuation(sellerId, propertyInfo);

    res.status(201).json(valuation);
  } catch (error) {
    console.error('Valuation error:', error);
    res.status(500).json({
      error: {
        code: 'VALUATION_ERROR',
        message: 'Failed to calculate valuation',
        retryable: true,
      },
    });
  }
});

/**
 * 査定履歴を取得
 */
router.get('/:sellerId/valuations', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;

    const valuations = await valuationEngine.getValuationHistory(sellerId);
    res.json(valuations);
  } catch (error) {
    console.error('Get valuation history error:', error);
    res.status(500).json({
      error: {
        code: 'GET_VALUATION_HISTORY_ERROR',
        message: 'Failed to get valuation history',
        retryable: true,
      },
    });
  }
});

export default router;

/**
 * 査定額1を計算（詳細計算式）
 */
router.post('/:sellerId/calculate-valuation-amount1', async (req: Request, res: Response) => {
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

    // 物件情報を取得
    if (!seller.property) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Property information not found',
          retryable: false,
        },
      });
    }

    // 査定額1を計算
    console.log('🔢 Calculating valuation amount 1 for seller:', seller.id);
    console.log('📊 Property data:', seller.property);
    const { valuationCalculatorService } = await import('../services/ValuationCalculatorService');
    const valuationAmount1 = await valuationCalculatorService.calculateValuationAmount1(
      seller,
      seller.property
    );
    console.log('💰 Calculated valuation amount 1:', valuationAmount1);

    res.json({
      valuationAmount1,
      calculatedAt: new Date(),
    });
  } catch (error) {
    console.error('Calculate valuation amount 1 error:', error);
    res.status(500).json({
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate valuation amount 1',
        retryable: true,
      },
    });
  }
});

/**
 * 査定額2を計算
 */
router.post('/:sellerId/calculate-valuation-amount2', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const { valuationAmount1 } = req.body;

    if (!valuationAmount1) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'valuationAmount1 is required',
          retryable: false,
        },
      });
    }

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

    // 査定額2を計算
    const { valuationCalculatorService } = await import('../services/ValuationCalculatorService');
    const valuationAmount2 = await valuationCalculatorService.calculateValuationAmount2(
      seller,
      valuationAmount1
    );

    res.json({
      valuationAmount2,
      calculatedAt: new Date(),
    });
  } catch (error) {
    console.error('Calculate valuation amount 2 error:', error);
    res.status(500).json({
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate valuation amount 2',
        retryable: true,
      },
    });
  }
});

/**
 * 査定額3を計算
 */
router.post('/:sellerId/calculate-valuation-amount3', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const { valuationAmount1 } = req.body;

    if (!valuationAmount1) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'valuationAmount1 is required',
          retryable: false,
        },
      });
    }

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

    // 査定額3を計算
    const { valuationCalculatorService } = await import('../services/ValuationCalculatorService');
    const valuationAmount3 = await valuationCalculatorService.calculateValuationAmount3(
      seller,
      valuationAmount1
    );

    res.json({
      valuationAmount3,
      calculatedAt: new Date(),
    });
  } catch (error) {
    console.error('Calculate valuation amount 3 error:', error);
    res.status(500).json({
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate valuation amount 3',
        retryable: true,
      },
    });
  }
});
