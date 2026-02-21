/**
 * Vercel環境変数診断スクリプト
 * 
 * このスクリプトをVercel Functionとしてデプロイして、
 * 環境変数が正しく読み込まれているか確認します。
 */

export default async function handler(req: any, res: any) {
  try {
    // 環境変数の存在確認
    const hasGoogleServiceAccountJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const hasGoogleServiceAccountEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const hasGooglePrivateKey = !!process.env.GOOGLE_PRIVATE_KEY;
    
    // 環境変数の長さ確認（値は表示しない）
    const googleServiceAccountJsonLength = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0;
    
    // 環境変数の最初の文字確認（JSONかどうか）
    const googleServiceAccountJsonFirstChar = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.charAt(0) || '';
    
    // Google Sheets認証テスト
    let authTestResult = 'Not tested';
    let authError = null;
    
    try {
      const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: '1BuvYd9cKOdgIAy0XhL-voVx1tiGA-cd6MCU_dYvbAQE',
        sheetName: '共有',
        serviceAccountKeyPath: './google-service-account.json',
      });
      
      await sheetsClient.authenticate();
      authTestResult = 'Success';
    } catch (error: any) {
      authTestResult = 'Failed';
      authError = error.message;
    }
    
    res.status(200).json({
      success: true,
      environment: {
        hasGoogleServiceAccountJson,
        hasGoogleServiceAccountEmail,
        hasGooglePrivateKey,
        googleServiceAccountJsonLength,
        googleServiceAccountJsonFirstChar,
      },
      authTest: {
        result: authTestResult,
        error: authError,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
