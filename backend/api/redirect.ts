import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 短縮URLリダイレクトハンドラー
 * GET /p/:propertyNumber
 * 
 * 例: https://ifoo.jp/p/AA9831
 *  → https://property-site-frontend-kappa.vercel.app/public/properties/AA9831
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // パスパラメータから物件番号を取得
    const { propertyNumber } = req.query;

    // バリデーション: 物件番号が存在するか
    if (!propertyNumber || typeof propertyNumber !== 'string') {
      return res.status(400).json({
        error: '物件番号が指定されていません'
      });
    }

    // バリデーション: 物件番号の形式チェック（例: AA9831, AA13501-2）
    const propertyNumberPattern = /^[A-Z]{2}\d{4,5}(-\d+)?$/;
    if (!propertyNumberPattern.test(propertyNumber)) {
      return res.status(400).json({
        error: '無効な物件番号形式です'
      });
    }

    // リダイレクト先URL
    const redirectUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${propertyNumber}`;

    // HTTP 301 Permanent Redirect
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // HSTS
    res.status(301).end();

  } catch (error: any) {
    console.error('Redirect error:', error);
    res.status(500).json({
      error: 'リダイレクト処理に失敗しました'
    });
  }
}
