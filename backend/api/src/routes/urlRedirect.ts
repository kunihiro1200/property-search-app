import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

/**
 * 短縮URLのリダイレクト先を取得するAPI
 * フロントエンドからのCORS問題を回避するため
 */
router.get('/resolve', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('🔗 Resolving shortened URL:', url);
    
    // HEADリクエストでリダイレクト先を取得
    const response = await axios.head(url, {
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    
    const redirectedUrl = response.request.res.responseUrl || url;
    console.log('✅ Redirected URL:', redirectedUrl);
    
    res.json({
      originalUrl: url,
      redirectedUrl: redirectedUrl,
    });
  } catch (error: any) {
    console.error('❌ Error resolving URL:', error.message);
    res.status(500).json({
      error: 'Failed to resolve URL',
      message: error.message,
    });
  }
});

export default router;
