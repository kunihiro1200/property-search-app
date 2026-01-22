import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function searchCC23() {
  try {
    console.log('🔍 CC23を検索中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 小文字で検索
    console.log('=== 小文字 "cc23" で検索 ===');
    const { data: lower, error: lowerError } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, price, atbb_status')
      .eq('property_number', 'cc23');

    if (lowerError) {
      console.error('❌ エラー:', lowerError.message);
    } else {
      console.log(`結果: ${lower?.length || 0} 件`);
      if (lower && lower.length > 0) {
        lower.forEach(p => console.log(`  - ${p.property_number} (UUID: ${p.id})`));
      }
    }
    console.log('');

    // 大文字で検索
    console.log('=== 大文字 "CC23" で検索 ===');
    const { data: upper, error: upperError } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, price, atbb_status')
      .eq('property_number', 'CC23');

    if (upperError) {
      console.error('❌ エラー:', upperError.message);
    } else {
      console.log(`結果: ${upper?.length || 0} 件`);
      if (upper && upper.length > 0) {
        upper.forEach(p => console.log(`  - ${p.property_number} (UUID: ${p.id})`));
      }
    }
    console.log('');

    // LIKEで検索
    console.log('=== LIKE "%cc23%" で検索 ===');
    const { data: like, error: likeError } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, price, atbb_status')
      .ilike('property_number', '%cc23%');

    if (likeError) {
      console.error('❌ エラー:', likeError.message);
    } else {
      console.log(`結果: ${like?.length || 0} 件`);
      if (like && like.length > 0) {
        like.forEach(p => console.log(`  - ${p.property_number} (UUID: ${p.id})`));
      }
    }
    console.log('');

    // CCで始まる物件を検索
    console.log('=== "CC" で始まる物件を検索 ===');
    const { data: ccProperties, error: ccError } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, price, atbb_status')
      .ilike('property_number', 'cc%')
      .order('property_number', { ascending: true });

    if (ccError) {
      console.error('❌ エラー:', ccError.message);
    } else {
      console.log(`結果: ${ccProperties?.length || 0} 件`);
      if (ccProperties && ccProperties.length > 0) {
        ccProperties.forEach(p => console.log(`  - ${p.property_number} (UUID: ${p.id})`));
      }
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

searchCC23();
