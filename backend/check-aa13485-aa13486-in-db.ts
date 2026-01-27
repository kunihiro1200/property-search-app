/**
 * AA13485とAA13486がデータベースに存在するか確認
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: '.env.local' });

async function checkSellersInDB() {
  try {
    console.log('🔍 Checking if AA13485 and AA13486 exist in database...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set in .env.local');
      process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // AA13485とAA13486を検索
    const targetSellers = ['AA13485', 'AA13486'];

    for (const sellerNumber of targetSellers) {
      const { data: seller, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('seller_number', sellerNumber)
        .single();

      console.log('='.repeat(80));
      console.log(`売主番号: ${sellerNumber}`);
      console.log('='.repeat(80));

      if (error || !seller) {
        console.log('❌ データベースに存在しません');
        console.log(`   エラー: ${error?.message || 'Not found'}\n`);
      } else {
        console.log('✅ データベースに存在します');
        console.log(`   ID: ${seller.id}`);
        console.log(`   氏名: ${seller.name ? '（暗号化済み）' : '（空）'}`);
        console.log(`   状況: ${seller.status || '（空）'}`);
        console.log(`   次電日: ${seller.next_call_date || '（空）'}`);
        console.log(`   訪問日: ${seller.visit_date || '（空）'}`);
        console.log(`   営担: ${seller.visit_assignee || '（空）'}`);
        console.log(`   電話担当: ${seller.phone_assignee || '（空）'}`);
        console.log(`   Pinrich: ${seller.pinrich || '（空）'}`);
        console.log(`   不通: ${seller.not_reachable || '（空）'}`);
        console.log(`   作成日時: ${seller.created_at}`);
        console.log(`   更新日時: ${seller.updated_at}\n`);
      }
    }

    // 最新の売主番号を確認
    console.log('='.repeat(80));
    console.log('最新の売主番号（上位10件）');
    console.log('='.repeat(80));

    const { data: latestSellers, error: latestError } = await supabase
      .from('sellers')
      .select('seller_number, status, created_at')
      .order('seller_number', { ascending: false })
      .limit(10);

    if (latestError) {
      console.error('❌ Error:', latestError.message);
    } else if (latestSellers) {
      latestSellers.forEach((seller: any) => {
        console.log(`  ${seller.seller_number} - ${seller.status} (作成: ${seller.created_at})`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSellersInDB();
