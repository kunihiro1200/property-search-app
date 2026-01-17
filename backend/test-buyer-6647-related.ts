import { supabase } from './src/config/supabase';
import { relatedBuyerService } from './src/services/RelatedBuyerService';

async function testBuyer6647Related() {
  console.log('=== 買主6647の関連買主テスト ===\n');

  try {
    // 1. 買主6647を取得
    console.log('1. 買主6647を取得中...');
    const { data: buyer6647, error: buyer6647Error } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6647')
      .single();

    if (buyer6647Error || !buyer6647) {
      console.error('❌ 買主6647が見つかりません:', buyer6647Error);
      return;
    }

    console.log('✅ 買主6647を取得しました');
    console.log('   ID:', buyer6647.id);
    console.log('   名前:', buyer6647.name);
    console.log('   電話番号:', buyer6647.phone_number);
    console.log('   メールアドレス:', buyer6647.email);
    console.log('   物件番号:', buyer6647.property_number);
    console.log('');

    // 2. 買主6648を取得
    console.log('2. 買主6648を取得中...');
    const { data: buyer6648, error: buyer6648Error } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6648')
      .single();

    if (buyer6648Error || !buyer6648) {
      console.error('❌ 買主6648が見つかりません:', buyer6648Error);
      return;
    }

    console.log('✅ 買主6648を取得しました');
    console.log('   ID:', buyer6648.id);
    console.log('   名前:', buyer6648.name);
    console.log('   電話番号:', buyer6648.phone_number);
    console.log('   メールアドレス:', buyer6648.email);
    console.log('   物件番号:', buyer6648.property_number);
    console.log('');

    // 3. 電話番号とメールアドレスの一致を確認
    console.log('3. 連絡先の一致を確認中...');
    const phoneMatch = buyer6647.phone_number === buyer6648.phone_number;
    const emailMatch = buyer6647.email === buyer6648.email;
    
    console.log('   電話番号一致:', phoneMatch ? '✅ はい' : '❌ いいえ');
    console.log('   メールアドレス一致:', emailMatch ? '✅ はい' : '❌ いいえ');
    console.log('');

    if (!phoneMatch && !emailMatch) {
      console.warn('⚠️  警告: 電話番号もメールアドレスも一致していません');
      console.log('');
    }

    // 4. RelatedBuyerServiceを使って関連買主を検索
    console.log('4. RelatedBuyerServiceで関連買主を検索中...');
    const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyer6647.id);
    
    console.log(`✅ 関連買主を${relatedBuyers.length}件見つけました`);
    console.log('');

    if (relatedBuyers.length === 0) {
      console.warn('⚠️  警告: 関連買主が見つかりませんでした');
      console.log('');
      return;
    }

    // 5. 関連買主の詳細を表示
    console.log('5. 関連買主の詳細:');
    relatedBuyers.forEach((rb, index) => {
      console.log(`\n   [${index + 1}] 買主番号: ${rb.buyer_number}`);
      console.log(`       名前: ${rb.name || '(なし)'}`);
      console.log(`       電話番号: ${rb.phone_number || '(なし)'}`);
      console.log(`       メールアドレス: ${rb.email || '(なし)'}`);
      console.log(`       物件番号: ${rb.property_number || '(なし)'}`);
      console.log(`       関係タイプ: ${rb.relation_type}`);
      console.log(`       マッチ理由: ${rb.match_reason}`);
    });
    console.log('');

    // 6. 買主6648が含まれているか確認
    const has6648 = relatedBuyers.some(rb => rb.buyer_number === '6648');
    if (has6648) {
      console.log('✅ 買主6648が関連買主に含まれています');
    } else {
      console.error('❌ 買主6648が関連買主に含まれていません');
    }
    console.log('');

    // 7. APIエンドポイントのテスト（買主番号で）
    console.log('7. APIエンドポイントのテスト（買主番号: 6647）...');
    const apiUrl = `http://localhost:3001/api/buyers/6647/related`;
    console.log(`   URL: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl);
      console.log(`   ステータス: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ APIレスポンス成功');
        console.log(`   関連買主数: ${data.total_count}`);
        console.log(`   現在の買主: ${data.current_buyer?.buyer_number} (${data.current_buyer?.name})`);
        
        if (data.related_buyers && data.related_buyers.length > 0) {
          console.log('   関連買主リスト:');
          data.related_buyers.forEach((rb: any, index: number) => {
            console.log(`     [${index + 1}] ${rb.buyer_number} - ${rb.name || '(名前なし)'} (${rb.relation_type})`);
          });
        }
      } else {
        const errorData = await response.json();
        console.error('   ❌ APIエラー:', errorData);
      }
    } catch (apiError: any) {
      console.error('   ❌ API呼び出しエラー:', apiError.message);
    }
    console.log('');

    // 8. APIエンドポイントのテスト（UUIDで）
    console.log('8. APIエンドポイントのテスト（UUID）...');
    const apiUrlUuid = `http://localhost:3001/api/buyers/${buyer6647.id}/related`;
    console.log(`   URL: ${apiUrlUuid}`);
    
    try {
      const response = await fetch(apiUrlUuid);
      console.log(`   ステータス: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ APIレスポンス成功');
        console.log(`   関連買主数: ${data.total_count}`);
      } else {
        const errorData = await response.json();
        console.error('   ❌ APIエラー:', errorData);
      }
    } catch (apiError: any) {
      console.error('   ❌ API呼び出しエラー:', apiError.message);
    }
    console.log('');

    console.log('=== テスト完了 ===');

  } catch (error: any) {
    console.error('❌ テスト中にエラーが発生しました:', error);
    console.error('スタックトレース:', error.stack);
  }
}

testBuyer6647Related();
