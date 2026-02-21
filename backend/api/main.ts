// 業務管理システム専用のエントリーポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel環境変数を設定（.envファイルの読み込みをスキップ）
process.env.VERCEL = '1';
process.env.SKIP_DOTENV = '1';

// Expressアプリをインポート
import app from '../src/index';

// Vercelサーバーレス関数としてエクスポート
export default app;
