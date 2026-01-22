import { Router, Request, Response } from 'express';
import { CacheHelper } from '../utils/cache';

const router = Router();

/**
 * DELETE /cache/seller/:id
 * 指定された売主のキャッシュをクリア
 */
router.delete('/seller/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Seller ID is required',
        },
      });
    }

    // 売主詳細のキャッシュをクリア
    const cacheKey = CacheHelper.generateKey('seller', id);
    await CacheHelper.del(cacheKey);
    
    console.log(`✅ Cache cleared for seller: ${id}`);

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error: any) {
    console.error('❌ Failed to clear cache:', error);
    
    // キャッシュクリアの失敗は致命的ではないので、成功として返す
    res.json({
      success: true,
      message: 'Cache clear attempted (error ignored)',
      warning: error.message,
    });
  }
});

/**
 * DELETE /cache/sellers/list
 * 売主リストのキャッシュをクリア
 */
router.delete('/sellers/list', async (req: Request, res: Response) => {
  try {
    // 売主リストのキャッシュパターンをクリア
    await CacheHelper.delPattern('sellers:list:*');
    
    console.log('✅ Cache cleared for sellers list');

    res.json({
      success: true,
      message: 'Sellers list cache cleared successfully',
    });
  } catch (error: any) {
    console.error('❌ Failed to clear sellers list cache:', error);
    
    res.json({
      success: true,
      message: 'Cache clear attempted (error ignored)',
      warning: error.message,
    });
  }
});

export default router;
