import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSellersSchema() {
  console.log('🔍 sellersテーブルのスキーマを確認中...\n');

  // 1件のレコードを取得してカラム名を確認
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ sellersテーブルにデータがありません');
    return;
  }

  const columns = Object.keys(data[0]);
  console.log(`📊 sellersテーブルのカラム数: ${columns.length}\n`);
  console.log('📋 カラム一覧:');
  columns.sort().forEach(column => {
    console.log(`  - ${column}`);
  });

  // column-mapping.jsonで定義されているが、データベースに存在しないカラムを確認
  const requiredColumns = [
    'seller_number',
    'name',
    'address',
    'phone_number',
    'email',
    'inquiry_site',
    'property_type',
    'property_address',
    'land_area',
    'building_area',
    'build_year',
    'structure',
    'floor_plan',
    'current_status',
    'inquiry_year',
    'inquiry_date',
    'inquiry_detailed_datetime',
    'valuation_amount_1',
    'valuation_amount_2',
    'valuation_amount_3',
    'visit_acquisition_date',
    'visit_date',
    'visit_time',
    'visit_assignee',
    'visit_valuation_acquirer',
    'valuation_assignee',
    'phone_contact_person',
    'preferred_contact_time',
    'contact_method',
    'status',
    'comments',
    'pinrich_status',
    'unreachable_status',
    'confidence_level',
    'next_call_date',
    'contract_year_month',
    'competitor_name',
    'competitor_name_and_reason',
    'exclusive_other_decision_factor',
    'visit_notes',
    'valuation_method',
  ];

  console.log('\n🔍 column-mapping.jsonで定義されているカラムの存在確認:');
  const missingColumns: string[] = [];
  requiredColumns.forEach(column => {
    if (columns.includes(column)) {
      console.log(`  ✅ ${column}`);
    } else {
      console.log(`  ❌ ${column} - データベースに存在しません`);
      missingColumns.push(column);
    }
  });

  if (missingColumns.length > 0) {
    console.log('\n⚠️ データベースに存在しないカラム:');
    missingColumns.forEach(column => console.log(`  - ${column}`));
    console.log('\nこれらのカラムを追加するマイグレーションが必要です。');
  } else {
    console.log('\n✅ 全てのカラムがデータベースに存在します');
  }
}

checkSellersSchema().catch(console.error);
