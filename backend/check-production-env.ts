// 本番環境の環境変数を確認
import dotenv from 'dotenv';

dotenv.config();

console.log('=== 環境変数確認 ===\n');

const envVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`✅ ${varName}: ${preview} (長さ: ${value.length})`);
  } else {
    console.log(`❌ ${varName}: 未設定`);
  }
});

console.log('\n=== Supabase接続テスト ===\n');

async function testSupabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    // SERVICE_ROLE_KEYでテスト
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Service Role Key exists: ${!!serviceRoleKey}`);
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // property_detailsテーブルからAA9743を取得
    const { data, error } = await supabase
      .from('property_details')
      .select('property_number, property_about, recommended_comments, athome_data, favorite_comment')
      .eq('property_number', 'AA9743')
      .single();
    
    if (error) {
      console.error('❌ Supabaseクエリエラー:', error);
      return;
    }
    
    console.log('✅ Supabase接続成功');
    console.log('\nAA9743データ:');
    console.log(`  - property_about: ${data.property_about ? '✅' : '❌'}`);
    console.log(`  - recommended_comments: ${data.recommended_comments ? '✅' : '❌'}`);
    console.log(`  - athome_data: ${data.athome_data ? '✅' : '❌'}`);
    console.log(`  - favorite_comment: ${data.favorite_comment ? '✅' : '❌'}`);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

testSupabaseConnection();
