import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testBuyerInquiryHistory() {
  console.log('=== 買主の問い合わせ履歴テスト（buyer_inquiries使用） ===\n');

  try {
    // 1. past_buyer_listが設定されている買主を検索
    console.log('1. past_buyer_listが設定されている買主を検索...');
    const { data: buyersWithPastList, error: searchError } = await supabase
      .from('buyers')
      .select('buyer_id, name, email, past_buyer_list')
      .not('past_buyer_list', 'is', null)
      .neq('past_buyer_list', '')
      .limit(5);

    if (searchError) {
      console.error('❌ 検索エラー:', searchError);
      return;
    }

    if (!buyersWithPastList || buyersWithPastList.length === 0) {
      console.log('⚠️ past_buyer_listが設定されている買主が見つかりませんでした');
      return;
    }

    console.log(`✅ ${buyersWithPastList.length}件の買主を発見\n`);

    // 2. 各買主の問い合わせ履歴を取得
    for (const buyer of buyersWithPastList) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`買主ID: ${buyer.buyer_id}`);
      console.log(`名前: ${buyer.name}`);
      console.log(`メール: ${buyer.email || '未設定'}`);
      console.log(`過去買主リスト: ${buyer.past_buyer_list}`);

      // past_buyer_listをパース
      const pastBuyerIds = buyer.past_buyer_list
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);

      console.log(`統合対象の買主ID: ${pastBuyerIds.join(', ')}`);

      // 3. 現在の買主IDと過去の買主IDを統合
      const allBuyerIds = [buyer.buyer_id, ...pastBuyerIds];
      console.log(`全買主ID（統合後）: ${allBuyerIds.join(', ')}`);

      // 4. buyer_inquiriesテーブルから問い合わせ履歴を取得
      console.log('\n問い合わせ履歴を取得中（buyer_inquiries）...');
      const { data: inquiries, error: inquiriesError } = await supabase
        .from('buyer_inquiries')
        .select(`
          id,
          buyer_id,
          property_number,
          inquiry_date,
          inquiry_content,
          inquiry_source,
          created_at
        `)
        .in('buyer_id', allBuyerIds)
        .order('inquiry_date', { ascending: false })
        .limit(20);

      if (inquiriesError) {
        console.error('❌ buyer_inquiries取得エラー:', inquiriesError);
        continue;
      }

      if (!inquiries || inquiries.length === 0) {
        console.log('⚠️ 問い合わせ履歴が見つかりませんでした');
        continue;
      }

      console.log(`✅ ${inquiries.length}件の問い合わせ履歴を取得\n`);

      // 5. 問い合わせ履歴を表示
      for (const inquiry of inquiries) {
        console.log(`問い合わせID: ${inquiry.id}`);
        console.log(`  買主ID: ${inquiry.buyer_id}`);
        console.log(`  物件番号: ${inquiry.property_number}`);
        console.log(`  問い合わせ日時: ${new Date(inquiry.inquiry_date).toLocaleString('ja-JP')}`);
        console.log(`  問い合わせ元: ${inquiry.inquiry_source || '未設定'}`);
        
        if (inquiry.inquiry_content) {
          const content = inquiry.inquiry_content.substring(0, 100);
          console.log(`  内容: ${content}${inquiry.inquiry_content.length > 100 ? '...' : ''}`);
        }
        
        console.log('');
      }
    }

    console.log('\n✅ テスト完了');

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testBuyerInquiryHistory();
