// 最小限のテスト用エンドポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  res.status(200).json({
    status: 'ok',
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};
