// Vercelの環境変数を確認するスクリプト
// このスクリプトをVercelにデプロイして実行することで、
// 本番環境の環境変数が正しく設定されているか確認できます

export default function handler(req: any, res: any) {
  const envCheck = {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 設定済み' : '❌ 未設定',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定',
    NODE_ENV: process.env.NODE_ENV || '未設定',
  };

  res.status(200).json({
    message: 'Environment Variables Check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
}
