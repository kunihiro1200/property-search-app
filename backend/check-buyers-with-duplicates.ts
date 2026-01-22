import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuyersWithDuplicates() {
  console.log('=== 重複買主番号を持つ買主を検索 ===\n');

  try {
    // 重複買主番号を持つ買主を検索
    const { data: buyers, error } = await supabase
      .from('buyers')
      .select('buyer_id, name, email, duplicate_of, property_number, inquiry_date')
      .not('duplicate_of', 'is', null)
      .order('buyer_id', { ascending: true })
      .limit(10);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    if (!buyers || buyers.length === 0) {
      console.log('⚠️ 重複買主番号を持つ買主が見つかりませんでした');
      console.log('');
      
      // 代わりに、複数の問い合わせを持つ買主を検索
      console.log('=== 複数の問い合わせを持つ買主を検索 ===\n');
      
      const { data: allBuyers, error: allError } = await supabase
        .from('buyers')
        .select('buyer_id, name, email, property_number, inquiry_date')
        .not('property_number', 'is', null)
        .order('buyer_id', { ascending: true })
        .limit(100);

      if (allError) {
        console.error('❌ エラー:', allError);
        return;
      }

      // 買主IDでグループ化
      const buyerGroups = new Map<number, any[]>();
      allBuyers?.forEach(buyer => {
        if (!buyerGroups.has(buyer.buyer_id)) {
          buyerGroups.set(buyer.buyer_id, []);
        }
        buyerGroups.get(buyer.buyer_id)!.push(buyer);
      });

      // 複数の問い合わせを持つ買主を表示
      let count = 0;
      for (const [buyerId, inquiries] of buyerGroups.entries()) {
        if (inquiries.length > 1 && count < 5) {
          console.log(`買主ID: ${buyerId}`);
          console.log(`名前: ${inquiries[0].name || '未設定'}`);
          console.log(`メール: ${inquiries[0].email || '未設定'}`);
          console.log(`問い合わせ件数: ${inquiries.length}件`);
          inquiries.forEach((inq, idx) => {
            console.log(`  ${idx + 1}. 物件番号: ${inq.property_number}, 受付日: ${inq.inquiry_date || '未設定'}`);
          });
          console.log('');
          count++;
        }
      }

      if (count === 0) {
        console.log('⚠️ 複数の問い合わせを持つ買主も見つかりませんでした');
      }

      return;
    }

    console.log(`✅ ${buyers.length}件の買主が見つかりました\n`);

    buyers.forEach((buyer, index) => {
      console.log(`${index + 1}. 買主ID: ${buyer.buyer_id}`);
      console.log(`   名前: ${buyer.name || '未設定'}`);
      console.log(`   メール: ${buyer.email || '未設定'}`);
      console.log(`   重複元: ${buyer.duplicate_of}`);
      console.log(`   物件番号: ${buyer.property_number || '未設定'}`);
      console.log(`   受付日: ${buyer.inquiry_date || '未設定'}`);
      console.log('');
    });

    // 最初の買主でテストを推奨
    if (buyers.length > 0) {
      const testBuyer = buyers[0];
      console.log('=== テスト推奨 ===');
      console.log(`買主ID ${testBuyer.buyer_id} を使用してテストを実行できます`);
      console.log(`この買主は買主ID ${testBuyer.duplicate_of} の重複です`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkBuyersWithDuplicates();
