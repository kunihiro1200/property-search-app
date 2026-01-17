import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testInquiryHistoryWithPastBuyers() {
  console.log('=== 問い合わせ履歴表示のテスト（past_buyer_list使用） ===\n');

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
      
      // 代わりに、同じメールアドレスを持つ買主を検索
      console.log('\n同じメールアドレスを持つ買主を検索...');
      const { data: allBuyers, error: allError } = await supabase
        .from('buyers')
        .select('buyer_id, name, email')
        .not('email', 'is', null)
        .neq('email', '')
        .order('email');

      if (allError || !allBuyers) {
        console.error('❌ エラー:', allError);
        return;
      }

      // メールアドレスでグループ化
      const emailGroups = new Map<string, any[]>();
      for (const buyer of allBuyers) {
        if (!emailGroups.has(buyer.email)) {
          emailGroups.set(buyer.email, []);
        }
        emailGroups.get(buyer.email)!.push(buyer);
      }

      // 重複があるメールアドレスを探す
      const duplicates = Array.from(emailGroups.entries())
        .filter(([_, buyers]) => buyers.length > 1)
        .slice(0, 3);

      if (duplicates.length === 0) {
        console.log('⚠️ 重複するメールアドレスも見つかりませんでした');
        return;
      }

      console.log(`✅ ${duplicates.length}件の重複メールアドレスを発見\n`);

      for (const [email, buyers] of duplicates) {
        console.log(`\nメールアドレス: ${email}`);
        console.log(`買主数: ${buyers.length}`);
        
        for (const buyer of buyers) {
          console.log(`  - 買主ID: ${buyer.buyer_id}, 名前: ${buyer.name}`);
        }

        // 各買主の問い合わせ履歴を取得
        const buyerIds = buyers.map(b => b.buyer_id);
        console.log(`\n問い合わせ履歴を取得中...`);
        
        const { data: inquiries, error: inquiryError } = await supabase
          .from('email_history')
          .select(`
            id,
            buyer_id,
            property_number,
            sent_at,
            email_type,
            property_listings (
              property_number,
              address,
              property_type,
              price
            )
          `)
          .in('buyer_id', buyerIds)
          .order('sent_at', { ascending: false });

        if (inquiryError) {
          console.error('❌ 問い合わせ履歴取得エラー:', inquiryError);
          continue;
        }

        if (!inquiries || inquiries.length === 0) {
          console.log('⚠️ 問い合わせ履歴が見つかりませんでした');
          continue;
        }

        console.log(`✅ ${inquiries.length}件の問い合わせ履歴を取得\n`);

        // 問い合わせ履歴を表示
        for (const inquiry of inquiries) {
          console.log(`問い合わせID: ${inquiry.id}`);
          console.log(`  買主ID: ${inquiry.buyer_id}`);
          console.log(`  物件番号: ${inquiry.property_number}`);
          console.log(`  送信日時: ${inquiry.sent_at}`);
          console.log(`  メールタイプ: ${inquiry.email_type}`);
          
          if (inquiry.property_listings) {
            const prop = inquiry.property_listings as any;
            console.log(`  物件情報:`);
            console.log(`    - 住所: ${prop.address}`);
            console.log(`    - 種別: ${prop.property_type}`);
            console.log(`    - 価格: ${prop.price ? `${prop.price.toLocaleString()}万円` : '未設定'}`);
          }
          console.log('');
        }
      }

      return;
    }

    console.log(`✅ ${buyersWithPastList.length}件の買主を発見\n`);

    // 2. 各買主の詳細を表示
    for (const buyer of buyersWithPastList) {
      console.log(`\n買主ID: ${buyer.buyer_id}`);
      console.log(`名前: ${buyer.name}`);
      console.log(`メール: ${buyer.email}`);
      console.log(`過去買主リスト: ${buyer.past_buyer_list}`);

      // past_buyer_listをパース
      const pastBuyerIds = buyer.past_buyer_list
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);

      console.log(`統合対象の買主ID: ${pastBuyerIds.join(', ')}`);

      // 3. 現在の買主IDと過去の買主IDを統合
      const allBuyerIds = [buyer.buyer_id, ...pastBuyerIds];
      console.log(`\n全買主ID（統合後）: ${allBuyerIds.join(', ')}`);

      // 4. 統合された買主IDの問い合わせ履歴を取得
      console.log('\n問い合わせ履歴を取得中...');
      const { data: inquiries, error: inquiryError } = await supabase
        .from('email_history')
        .select(`
          id,
          buyer_id,
          property_number,
          sent_at,
          email_type,
          property_listings (
            property_number,
            address,
            property_type,
            price
          )
        `)
        .in('buyer_id', allBuyerIds)
        .order('sent_at', { ascending: false });

      if (inquiryError) {
        console.error('❌ 問い合わせ履歴取得エラー:', inquiryError);
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
        console.log(`  送信日時: ${inquiry.sent_at}`);
        console.log(`  メールタイプ: ${inquiry.email_type}`);
        
        if (inquiry.property_listings) {
          const prop = inquiry.property_listings as any;
          console.log(`  物件情報:`);
          console.log(`    - 住所: ${prop.address}`);
          console.log(`    - 種別: ${prop.property_type}`);
          console.log(`    - 価格: ${prop.price ? `${prop.price.toLocaleString()}万円` : '未設定'}`);
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testInquiryHistoryWithPastBuyers();
