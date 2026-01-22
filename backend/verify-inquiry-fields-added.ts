import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyInquiryFieldsAdded() {
  console.log('🔍 inquiry_yearとinquiry_siteカラムの存在を確認中...\n');

  try {
    // テストクエリを実行
    const { data, error } = await supabase
      .from('sellers')
      .select('id, seller_number, inquiry_year, inquiry_site')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ カラムがまだ存在しません');
        console.log(`   エラー: ${error.message}`);
        console.log('\n💡 マイグレーションを実行してください');
        return false;
      }
      throw error;
    }

    console.log('✅ inquiry_yearとinquiry_siteカラムが正常に追加されました！');
    console.log('\n📊 サンプルデータ:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🎯 次のステップ:');
    console.log('   1. スプレッドシートから同期を実行');
    console.log('   2. フロントエンドで反響年・サイトが表示されることを確認');
    
    return true;
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    return false;
  }
}

verifyInquiryFieldsAdded()
  .then((success) => {
    if (success) {
      console.log('\n✅ 検証完了 - カラムが正常に追加されています');
    } else {
      console.log('\n⚠️  検証失敗 - マイグレーションを実行してください');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
