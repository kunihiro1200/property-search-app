import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check2026DistributionDates() {
  console.log('🔍 2026年の配信日を持つ物件を確認中...\n');

  // 2026年の配信日を持つ物件を取得
  const { data: properties2026, error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, distribution_date, created_at')
    .gte('distribution_date', '2026-01-01')
    .order('distribution_date', { ascending: false });

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log(`📊 2026年の配信日を持つ物件: ${properties2026.length}件\n`);

  if (properties2026.length > 0) {
    console.log('📋 2026年の物件一覧:');
    properties2026.forEach((property, index) => {
      console.log(`${index + 1}. ${property.property_number}`);
      console.log(`   - atbb_status: ${property.atbb_status}`);
      console.log(`   - distribution_date: ${property.distribution_date}`);
      console.log(`   - created_at: ${property.created_at}`);
      console.log('');
    });
  }

  // AA10804を確認
  const aa10804 = properties2026.find(p => p.property_number === 'AA10804');
  if (aa10804) {
    console.log('✅ AA10804は2026年の配信日を持っています');
    console.log(`   - distribution_date: ${aa10804.distribution_date}`);
  } else {
    console.log('⚠️ AA10804は2026年の配信日を持っていません');
    
    // AA10804の実際の配信日を確認
    const { data: aa10804Data } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, distribution_date')
      .eq('property_number', 'AA10804')
      .single();
    
    if (aa10804Data) {
      console.log(`   - 実際の配信日: ${aa10804Data.distribution_date || 'NULL'}`);
    }
  }
}

check2026DistributionDates().catch(console.error);
