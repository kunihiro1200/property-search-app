import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSellerByNumber(sellerNumber: string) {
  console.log(`\n=== 売主番号 ${sellerNumber} を検索 ===\n`);

  try {
    // データベースで検索
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', sellerNumber);

    if (error) {
      console.error('エラー:', error);
      return;
    }

    if (!sellers || sellers.length === 0) {
      console.log('❌ データベースに見つかりませんでした');
      
      // 類似の番号を検索
      const { data: similarSellers } = await supabase
        .from('sellers')
        .select('seller_number, name')
        .ilike('seller_number', `%${sellerNumber.slice(-4)}%`)
        .limit(10);
      
      if (similarSellers && similarSellers.length > 0) {
        console.log('\n類似の売主番号:');
        similarSellers.forEach(s => {
          console.log(`  - ${s.seller_number}: ${s.name}`);
        });
      }
    } else {
      console.log('✅ データベースに存在します:');
      sellers.forEach(seller => {
        console.log(`  ID: ${seller.id}`);
        console.log(`  売主番号: ${seller.seller_number}`);
        console.log(`  名前: ${seller.name}`);
        console.log(`  電話番号: ${seller.phone_number}`);
        console.log(`  ステータス: ${seller.status}`);
        console.log(`  作成日: ${seller.created_at}`);
      });
    }
  } catch (err) {
    console.error('予期しないエラー:', err);
  }
}

// コマンドライン引数から売主番号を取得
const sellerNumber = process.argv[2] || 'AA12923';
checkSellerByNumber(sellerNumber);
