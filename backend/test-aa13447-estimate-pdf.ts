import dotenv from 'dotenv';
import path from 'path';
import { PropertyService } from './src/services/PropertyService';

// 環境変数を読み込む（backendディレクトリの.envファイル）
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testEstimatePdf() {
  try {
    console.log('🧪 Testing estimate PDF generation for AA13447...');
    console.log('Environment check:', {
      hasGoogleServiceAccountJson: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      googleServiceAccountJsonLength: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0,
      hasGoogleServiceAccountKeyPath: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      nodeEnv: process.env.NODE_ENV,
    });
    
    const propertyService = new PropertyService();
    
    console.log('📄 Generating estimate PDF...');
    const pdfUrl = await propertyService.generateEstimatePdf('AA13447');
    
    console.log('✅ Success!');
    console.log('PDF URL:', pdfUrl);
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    process.exit(1);
  }
}

testEstimatePdf();
