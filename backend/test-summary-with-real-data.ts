/**
 * 実際の本番データで通話履歴サマリーをテスト
 * 
 * DBから売主のコメントデータを取得してサマリー生成をテスト
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { SummaryGenerator } from './src/services/SummaryGenerator';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const summaryGenerator = new SummaryGenerator();

async function main() {
  console.log('=== 通話履歴サマリー 本番データテスト ===\n');

  // コメントがある売主を取得（追客中のものを優先）
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, comments, status, confidence')
    .not('comments', 'is', null)
    .not('comments', 'eq', '')
    .eq('status', '追客中')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching sellers:', error);
    return;
  }

  console.log(`コメントがある売主: ${sellers?.length || 0}件\n`);

  if (!sellers || sellers.length === 0) {
    console.log('テスト対象の売主が見つかりませんでした');
    return;
  }

  // 各売主のサマリーを生成
  for (const seller of sellers.slice(0, 5)) {
    console.log('═'.repeat(60));
    console.log(`売主番号: ${seller.seller_number}`);
    console.log(`名前: ${seller.name || '(未設定)'}`);
    console.log(`ステータス: ${seller.status || '(未設定)'}`);
    console.log('─'.repeat(60));
    
    // コメントをパース
    const comments: string[] = [];
    if (seller.comments) {
      if (typeof seller.comments === 'string') {
        // 改行で分割
        comments.push(...seller.comments.split('\n').filter((c: string) => c.trim()));
      } else if (Array.isArray(seller.comments)) {
        comments.push(...seller.comments);
      }
    }

    console.log(`\n【元のコメント】(${comments.length}件)`);
    console.log('─'.repeat(40));
    comments.slice(0, 10).forEach((c, i) => {
      const truncated = c.length > 100 ? c.substring(0, 100) + '...' : c;
      console.log(`${i + 1}. ${truncated}`);
    });
    if (comments.length > 10) {
      console.log(`... 他 ${comments.length - 10}件`);
    }

    // アクティビティログを取得
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`\n【アクティビティログ】${activities?.length || 0}件`);

    // サマリー生成
    const startTime = Date.now();
    const result = summaryGenerator.generateEnhancedSummary({
      communicationHistory: activities || [],
      spreadsheetComments: comments,
      sellerData: {
        name: seller.name,
        status: seller.status,
        confidence: seller.confidence,
      },
    });
    const processingTime = Date.now() - startTime;

    console.log(`\n【生成されたサマリー】(処理時間: ${processingTime}ms)`);
    console.log('─'.repeat(40));
    console.log(result.summary);
    console.log('─'.repeat(40));

    console.log('\n【メタデータ】');
    console.log(`  通話回数: ${result.metadata.totalCalls}回`);
    console.log(`    - 履歴から: ${result.metadata.callsFromHistory}回`);
    console.log(`    - コメントから: ${result.metadata.callsFromComments}回`);
    console.log(`  生成セクション: ${result.metadata.sectionsGenerated.join(', ')}`);
    if (result.metadata.oldestEntry) {
      console.log(`  最古エントリー: ${result.metadata.oldestEntry}`);
    }
    if (result.metadata.newestEntry) {
      console.log(`  最新エントリー: ${result.metadata.newestEntry}`);
    }

    console.log('\n');
  }

  console.log('═'.repeat(60));
  console.log('テスト完了');
}

main().catch(console.error);
