import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * テスト可能な買主を検索
 * - property_numberが設定されている
 * - 紐づく物件のsales_assigneeがスタッフスプレッドシートに存在する（国広, 山本, 角井, 林田, 生野, 裏, 木村, 久米, 和田）
 */
async function findTestableBuyer() {
  console.log('🔍 Finding testable buyer\n');

  const validAssignees = ['国広', '山本', '角井', '林田', '生野', '裏', '木村', '久米', '和田'];

  try {
    // property_numberが設定されている買主を取得
    const { data: buyers, error: buyersError } = await supabase
      .from('buyers')
      .select('buyer_id, buyer_number, name, property_number')
      .not('property_number', 'is', null)
      .limit(100);

    if (buyersError) {
      console.error('❌ Failed to fetch buyers:', buyersError.message);
      return;
    }

    console.log(`✅ Found ${buyers?.length || 0} buyers with property_number\n`);

    // 各買主について、紐づく物件のsales_assigneeを確認
    for (const buyer of buyers || []) {
      const propertyNumbers = buyer.property_number.split(',').map((n: string) => n.trim());

      const { data: properties, error: propertyError } = await supabase
        .from('property_listings')
        .select('property_number, address, sales_assignee')
        .in('property_number', propertyNumbers);

      if (propertyError || !properties || properties.length === 0) {
        continue;
      }

      const firstProperty = properties[0];
      
      // sales_assigneeが有効な名字かチェック
      if (firstProperty.sales_assignee && validAssignees.includes(firstProperty.sales_assignee)) {
        console.log('✅ Testable buyer found!');
        console.log(`   - Buyer number: ${buyer.buyer_number}`);
        console.log(`   - Buyer name: ${buyer.name}`);
        console.log(`   - Property number: ${firstProperty.property_number}`);
        console.log(`   - Property address: ${firstProperty.address}`);
        console.log(`   - Sales assignee: ${firstProperty.sales_assignee}`);
        console.log('\n💡 Use this buyer for testing the send-confirmation endpoint');
        return;
      }
    }

    console.log('❌ No testable buyer found');
    console.log('💡 Please ensure that:');
    console.log('   1. A buyer has property_number set');
    console.log('   2. The linked property has sales_assignee set to one of: 国広, 山本, 角井, 林田, 生野, 裏, 木村, 久米, 和田');

  } catch (err: any) {
    console.error('❌ Search failed:', err.message);
  }
}

findTestableBuyer()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
