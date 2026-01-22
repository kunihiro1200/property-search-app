import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkSchema() {
  try {
    console.log('🔍 property_detailsテーブルのスキーマを確認中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // property_detailsの全カラムを取得
    const { data, error } = await supabase
      .from('property_details')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ property_detailsテーブルのカラム:');
      console.log('');
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
    } else {
      console.log('⚠️ データが存在しません');
    }

    console.log('');
    console.log('=== CC23のproperty_detailsを検索 ===');
    
    // property_numberで検索してみる
    const { data: byNumber, error: numberError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'CC23');

    if (numberError) {
      console.error('❌ エラー:', numberError.message);
    } else {
      console.log(`結果: ${byNumber?.length || 0} 件`);
      if (byNumber && byNumber.length > 0) {
        const detail = byNumber[0];
        console.log('');
        console.log('物件番号:', detail.property_number);
        console.log('お気に入り文言:', detail.favorite_comment || '(なし)');
        console.log('パノラマURL:', detail.panorama_url || '(なし)');
        
        const comments = [
          detail.recommended_comment_1,
          detail.recommended_comment_2,
          detail.recommended_comment_3,
          detail.recommended_comment_4,
          detail.recommended_comment_5,
          detail.recommended_comment_6,
          detail.recommended_comment_7,
          detail.recommended_comment_8,
          detail.recommended_comment_9,
          detail.recommended_comment_10,
          detail.recommended_comment_11,
          detail.recommended_comment_12,
        ].filter(c => c);

        console.log('おすすめコメント数:', comments.length);
        if (comments.length > 0) {
          comments.forEach((comment, index) => {
            console.log(`  ${index + 1}. ${comment.substring(0, 50)}...`);
          });
        }
      }
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkSchema();
