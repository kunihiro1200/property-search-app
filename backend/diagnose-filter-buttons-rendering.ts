import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseFilterButtons() {
  console.log('\n=== 物件タイプフィルターボタン診断 ===\n');

  // 1. 公開物件のデータを確認
  console.log('1. 公開物件データの確認...');
  const { data: properties, error: propertiesError } = await supabase
    .from('property_listings')
    .select('property_number, property_type, atbb_status')
    .eq('atbb_status', '専任・公開中')
    .limit(5);

  if (propertiesError) {
    console.error('❌ エラー:', propertiesError);
  } else {
    console.log(`✅ 公開物件数: ${properties?.length || 0}件`);
    if (properties && properties.length > 0) {
      console.log('\n最初の5件:');
      properties.forEach(p => {
        console.log(`  - ${p.property_number}: ${p.property_type}`);
      });
    }
  }

  // 2. 物件タイプの種類を確認
  console.log('\n2. 物件タイプの種類を確認...');
  const { data: types, error: typesError } = await supabase
    .from('property_listings')
    .select('property_type')
    .eq('atbb_status', '専任・公開中');

  if (typesError) {
    console.error('❌ エラー:', typesError);
  } else if (types) {
    const uniqueTypes = [...new Set(types.map(t => t.property_type))];
    console.log('✅ 物件タイプの種類:');
    uniqueTypes.forEach(type => {
      const count = types.filter(t => t.property_type === type).length;
      console.log(`  - ${type}: ${count}件`);
    });
  }

  // 3. APIエンドポイントの確認
  console.log('\n3. APIエンドポイントの確認...');
  try {
    const response = await fetch('http://localhost:3000/api/public/properties?limit=1');
    const data: any = await response.json();
    console.log('✅ APIレスポンス:');
    console.log(`  - ステータス: ${response.status}`);
    console.log(`  - データ件数: ${data.properties?.length || 0}`);
    if (data.properties && data.properties.length > 0) {
      console.log(`  - 最初の物件タイプ: ${data.properties[0].property_type}`);
    }
  } catch (error) {
    console.error('❌ APIエラー:', error);
  }

  // 4. フロントエンドのビルド状態を確認
  console.log('\n4. フロントエンドのビルド状態...');
  console.log('以下のURLにアクセスして、ブラウザの開発者ツールで確認してください:');
  console.log('  http://localhost:5173/public/properties');
  console.log('\n開発者ツール(F12)で以下を確認:');
  console.log('  1. Console タブ: エラーメッセージがないか');
  console.log('  2. Network タブ: PropertyTypeFilterButtons.tsx が読み込まれているか');
  console.log('  3. Elements タブ: <div class="property-type-filter-buttons"> が存在するか');

  console.log('\n=== 診断完了 ===\n');
}

diagnoseFilterButtons().catch(console.error);
