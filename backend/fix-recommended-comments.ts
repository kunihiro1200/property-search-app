/**
 * recommended_commentsから内部メモ行（←で始まる行）を削除するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixRecommendedComments() {
  console.log('🔍 recommended_commentsに内部メモ行が含まれる物件を検索中...');

  // recommended_commentsがnullでない全レコードを取得
  const { data, error } = await supabase
    .from('property_details')
    .select('property_number, recommended_comments')
    .not('recommended_comments', 'is', null);

  if (error) {
    console.error('❌ 取得エラー:', error);
    return;
  }

  console.log(`📊 ${data.length}件のレコードを確認中...`);

  let fixedCount = 0;

  for (const row of data) {
    const comments: any[] = Array.isArray(row.recommended_comments) ? row.recommended_comments : [];
    
    const filtered = comments.filter((c: any) => {
      const text = Array.isArray(c) ? c.join(' ') : String(c ?? '');
      return !text.trim().startsWith('←') && !text.includes('一般媒介で、担当もついている場合');
    });

    if (filtered.length !== comments.length) {
      console.log(`🔧 ${row.property_number}: ${comments.length}件 → ${filtered.length}件に修正`);
      
      const { error: updateError } = await supabase
        .from('property_details')
        .update({ recommended_comments: filtered })
        .eq('property_number', row.property_number);

      if (updateError) {
        console.error(`❌ ${row.property_number} 更新エラー:`, updateError);
      } else {
        console.log(`✅ ${row.property_number} 更新完了`);
        fixedCount++;
      }
    }
  }

  console.log(`\n✅ 完了: ${fixedCount}件修正しました`);
}

fixRecommendedComments().catch(console.error);
