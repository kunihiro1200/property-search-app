import dotenv from 'dotenv';
import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';

dotenv.config();

async function testPerformanceMetrics() {
  try {
    console.log('🔍 実績データ取得のテストを開始します...\n');

    const performanceMetricsService = new PerformanceMetricsService();
    
    // 現在の月でテスト
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`📅 対象月: ${currentMonth}\n`);
    
    console.log('📊 実績データを取得中...');
    const metrics = await performanceMetricsService.calculateEnhancedMetrics(currentMonth);
    
    console.log('\n✅ 実績データの取得に成功しました！\n');
    console.log('=== 取得データ ===');
    console.log(JSON.stringify(metrics, null, 2));
    
  } catch (error: any) {
    console.error('\n❌ 実績データの取得に失敗しました');
    console.error('エラーメッセージ:', error.message || '(空)');
    console.error('エラーオブジェクト:', JSON.stringify(error, null, 2));
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  }
}

testPerformanceMetrics();
