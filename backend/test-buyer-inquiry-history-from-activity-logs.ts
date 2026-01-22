import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testBuyerInquiryHistory() {
  console.log('=== 買主の問い合わせ履歴テスト（activity_logs使用） ===\n');

  try {
    // 1. past_buyer_listが設定されている買主を検索
    console.log('1. past_buyer_listが設定されている買主を検索...');
    const { data: buyersWithPastList, error: searchError } = await supabase
      .from('buyers')
      .select('buyer_id, name, email, past_buyer_list')
      .not('past_buyer_list', 'is', null)
      .neq('past_buyer_list', '')
      .limit(3);

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

      // 4. activity_logsから問い合わせ履歴を取得
      console.log('\n問い合わせ履歴を取得中（activity_logs）...');
      const { data: activities, error: activityError } = await supabase
        .from('activity_logs')
        .select(`
          id,
          seller_number,
          action_type,
          details,
          created_at,
          user_id
        `)
        .in('seller_number', allBuyerIds)
        .in('action_type', ['email_sent', 'inquiry_received', 'viewing_scheduled'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (activityError) {
        console.error('❌ activity_logs取得エラー:', activityError);
        continue;
      }

      if (!activities || activities.length === 0) {
        console.log('⚠️ 問い合わせ履歴が見つかりませんでした');
        continue;
      }

      console.log(`✅ ${activities.length}件のアクティビティを取得\n`);

      // 5. アクティビティを表示
      for (const activity of activities) {
        console.log(`アクティビティID: ${activity.id}`);
        console.log(`  買主ID: ${activity.seller_number}`);
        console.log(`  アクション: ${activity.action_type}`);
        console.log(`  日時: ${new Date(activity.created_at).toLocaleString('ja-JP')}`);
        console.log(`  ユーザーID: ${activity.user_id || '未設定'}`);
        
        if (activity.details) {
          try {
            const details = typeof activity.details === 'string' 
              ? JSON.parse(activity.details) 
              : activity.details;
            console.log(`  詳細:`);
            if (details.property_number) {
              console.log(`    - 物件番号: ${details.property_number}`);
            }
            if (details.email_type) {
              console.log(`    - メールタイプ: ${details.email_type}`);
            }
            if (details.subject) {
              console.log(`    - 件名: ${details.subject}`);
            }
          } catch (e) {
            console.log(`  詳細: ${activity.details}`);
          }
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testBuyerInquiryHistory();
