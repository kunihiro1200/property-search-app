import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13508SyncStatus() {
  console.log('🔍 AA13508のデータベース同期状況を確認中...\n');

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13508')
    .single();

  if (error) {
    console.log('❌ AA13508はデータベースに存在しません');
    console.log('エラー:', error.message);
    return;
  }

  console.log('✅ AA13508はデータベースに存在します\n');
  console.log('📋 データベースのデータ:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 重要なフィールドを表示
  const importantFields = [
    'seller_number',
    'name',
    'property_address',
    'valuation_amount_1',
    'valuation_amount_2',
    'valuation_amount_3',
    'valuation_method',
    'status',
    'visit_date',
    'visit_assignee',
    'inquiry_site',
    'unreachable_status',
    'comments',
    'phone_number',
    'email',
    'address',
    'property_type',
    'land_area',
    'building_area',
    'build_year',
    'structure',
    'floor_plan',
    'current_status',
    'inquiry_year',
    'inquiry_date',
    'inquiry_detailed_datetime',
    'visit_acquisition_date',
    'visit_time',
    'visit_valuation_acquirer',
    'valuation_assignee',
    'phone_contact_person',
    'preferred_contact_time',
    'contact_method',
    'pinrich_status',
    'confidence_level',
    'next_call_date',
    'contract_year_month',
    'competitor_name',
    'competitor_name_and_reason',
    'exclusive_other_decision_factor',
    'visit_notes',
  ];

  importantFields.forEach(field => {
    const value = seller[field];
    if (value === null || value === undefined) {
      console.log(`  ${field}: ❌ null`);
    } else if (value === '') {
      console.log(`  ${field}: ⚠️ 空文字列`);
    } else {
      console.log(`  ${field}: ✅ ${value}`);
    }
  });

  console.log('\n📊 同期状況サマリー:');
  const nullFields = importantFields.filter(field => seller[field] === null || seller[field] === undefined);
  const emptyFields = importantFields.filter(field => seller[field] === '');
  const syncedFields = importantFields.filter(field => seller[field] !== null && seller[field] !== undefined && seller[field] !== '');

  console.log(`  ✅ 同期済み: ${syncedFields.length}/${importantFields.length}`);
  console.log(`  ❌ null: ${nullFields.length}/${importantFields.length}`);
  console.log(`  ⚠️ 空文字列: ${emptyFields.length}/${importantFields.length}`);

  if (nullFields.length > 0) {
    console.log('\n❌ 同期されていないフィールド:');
    nullFields.forEach(field => console.log(`  - ${field}`));
  }
}

checkAA13508SyncStatus().catch(console.error);
