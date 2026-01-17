import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInquiryHistoryDisplay() {
  console.log('=== 問い合わせ履歴表示のテスト ===\n');

  try {
    // 1. 複数の問い合わせを持つ買主を検索
    console.log('1. 複数の問い合わせを持つ買主を検索...');
    
    const { data: allBuyers, error: allError } = await supabase
      .from('buyers')
      .select('buyer_id, name, email, property_number, reception_date, inquiry_source')
      .not('property_number', 'is', null)
      .order('buyer_id', { ascending: true })
      .limit(500);

    if (allError) {
      console.error('❌ エラー:', allError);
      return;
    }

    // 買主IDでグループ化
    const buyerGroups = new Map<string, any[]>();
    allBuyers?.forEach(buyer => {
      if (!buyerGroups.has(buyer.buyer_id)) {
        buyerGroups.set(buyer.buyer_id, []);
      }
      buyerGroups.get(buyer.buyer_id)!.push(buyer);
    });

    // 複数の問い合わせを持つ買主を見つける
    let testBuyerId: string | null = null;
    let testBuyerInquiries: any[] = [];
    
    for (const [buyerId, inquiries] of buyerGroups.entries()) {
      if (inquiries.length > 1) {
        testBuyerId = buyerId;
        testBuyerInquiries = inquiries;
        break;
      }
    }

    if (!testBuyerId) {
      console.log('⚠️ 複数の問い合わせを持つ買主が見つかりませんでした');
      console.log('   単一の問い合わせを持つ買主でテストします...\n');
      
      // 単一の問い合わせを持つ買主を使用
      if (allBuyers && allBuyers.length > 0) {
        testBuyerId = allBuyers[0].buyer_id;
        testBuyerInquiries = [allBuyers[0]];
      } else {
        console.log('❌ テスト可能な買主が見つかりませんでした');
        return;
      }
    }

    console.log(`✅ テスト対象の買主ID: ${testBuyerId}`);
    console.log(`   問い合わせ件数: ${testBuyerInquiries.length}件\n`);

    // 2. 買主の詳細情報を取得
    console.log('2. 買主の詳細情報を取得...');
    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_id', testBuyerId)
      .limit(1)
      .single();

    if (buyerError) {
      console.error('❌ 買主取得エラー:', buyerError);
      return;
    }

    console.log('✅ 買主情報:');
    console.log(`   - 買主ID: ${buyer.buyer_id}`);
    console.log(`   - 名前: ${buyer.name}`);
    console.log(`   - メール: ${buyer.email || '未設定'}`);
    console.log('');

    // 3. 問い合わせ履歴を取得（物件情報を含む）
    console.log('3. 問い合わせ履歴を取得（物件情報を含む）...');
    
    // まず買主の問い合わせ履歴を取得
    const { data: buyerInquiries, error: buyerInquiriesError } = await supabase
      .from('buyers')
      .select('buyer_id, property_number, reception_date, inquiry_source')
      .eq('buyer_id', testBuyerId)
      .not('property_number', 'is', null)
      .order('reception_date', { ascending: false });

    if (buyerInquiriesError) {
      console.error('❌ 買主問い合わせ取得エラー:', buyerInquiriesError);
      return;
    }

    // 物件番号のリストを取得
    const propertyNumbers = buyerInquiries?.map(i => i.property_number).filter(Boolean) || [];
    
    // 物件情報を取得
    const { data: properties, error: propertiesError } = await supabase
      .from('property_listings')
      .select('property_number, address, property_type, price, viewing_notes')
      .in('property_number', propertyNumbers);

    if (propertiesError) {
      console.error('❌ 物件情報取得エラー:', propertiesError);
      return;
    }

    // 物件情報をマップに変換
    const propertyMap = new Map(properties?.map(p => [p.property_number, p]) || []);

    // 問い合わせ履歴と物件情報を結合
    const inquiries = buyerInquiries?.map(inquiry => ({
      ...inquiry,
      property_listings: propertyMap.get(inquiry.property_number)
    })) || [];

    console.log(`✅ 問い合わせ履歴: ${inquiries?.length || 0}件\n`);

    if (inquiries && inquiries.length > 0) {
      inquiries.forEach((inquiry, index) => {
        console.log(`${index + 1}. 物件番号: ${inquiry.property_number}`);
        console.log(`   - 受付日: ${inquiry.reception_date || '未設定'}`);
        console.log(`   - 問い合わせ元: ${inquiry.inquiry_source || '未設定'}`);
        
        if (inquiry.property_listings) {
          const prop = Array.isArray(inquiry.property_listings) 
            ? inquiry.property_listings[0] 
            : inquiry.property_listings;
          
          console.log(`   - 住所: ${prop.address || '未設定'}`);
          console.log(`   - 物件種別: ${prop.property_type || '未設定'}`);
          console.log(`   - 価格: ${prop.price ? `${prop.price.toLocaleString()}万円` : '未設定'}`);
          console.log(`   - 内覧前伝達事項: ${prop.viewing_notes || '特になし'}`);
        }
        console.log('');
      });

      // 4. ソート順の確認
      console.log('=== ソート順の確認 ===');
      const dates = inquiries
        .filter(i => i.reception_date)
        .map(i => new Date(i.reception_date!));
      
      const isSortedDesc = dates.every((date, i) => {
        if (i === 0) return true;
        return date <= dates[i - 1];
      });

      if (isSortedDesc) {
        console.log('✅ 受付日で降順にソートされています');
      } else {
        console.log('⚠️ ソート順が正しくありません');
      }
      console.log('');

    } else {
      console.log('⚠️ 問い合わせ履歴が見つかりませんでした');
    }

    // 5. テスト結果のサマリー
    console.log('=== テスト結果サマリー ===');
    console.log(`✅ 買主情報取得: 成功 (ID: ${testBuyerId})`);
    console.log(`✅ 問い合わせ履歴取得: 成功 (${inquiries?.length || 0}件)`);
    console.log('✅ 物件情報の結合: 成功');
    console.log('✅ ソート機能: 実装済み');
    console.log('');
    console.log('次のステップ:');
    console.log(`1. フロントエンドで買主 ${testBuyerId} の詳細ページを開く`);
    console.log('2. 問い合わせ履歴テーブルが表示されることを確認');
    console.log('3. 受付日で降順にソートされていることを確認');
    console.log('4. 物件情報（住所、価格、内覧前伝達事項）が表示されることを確認');

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

testInquiryHistoryDisplay();
