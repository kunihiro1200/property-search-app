// データベース接続テスト
import dotenv from 'dotenv';
import { PropertyDetailsService } from '../services/PropertyDetailsService';

// 環境変数を読み込む
dotenv.config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  const service = new PropertyDetailsService();
  
  try {
    // テストデータで保存を試みる
    console.log('📝 Attempting to save test data...');
    const success = await service.upsertPropertyDetails('TEST-001', {
      property_about: 'Test property about',
      recommended_comments: [{ comment: 'Test comment' }],
      athome_data: [{ key: 'value' }],
      favorite_comment: 'Test favorite'
    });
    
    if (success) {
      console.log('✅ Database connection successful!');
    } else {
      console.log('❌ Database save failed (returned false)');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('📋 Stack:', error.stack);
  }
  
  process.exit(0);
}

testDatabaseConnection();
