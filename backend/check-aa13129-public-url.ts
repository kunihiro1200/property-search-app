import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13129PublicUrl() {
  console.log('=== 物件AA13129の公開URL表示問題診断 ===\n');

  try {
    // 物件データを取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('id, property_number, status, atbb_status')
      .eq('property_number', 'AA13129')
      .single();

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!property) {
      console.log('❌ 物件AA13129が見つかりません');
      return;
    }

    console.log('📋 物件データ:');
    console.log(`  物件番号: ${property.property_number}`);
    console.log(`  物件ID: ${property.id}`);
    console.log(`  status: ${property.status || '(null)'}`);
    console.log(`  atbb_status: ${property.atbb_status || '(null)'}`);
    console.log('');

    // 公開URL生成条件をチェック
    console.log('🔍 公開URL生成条件チェック:');
    
    const isPublic = property.atbb_status === '専任・公開中';
    console.log(`  atbb_status === '専任・公開中': ${isPublic ? '✅ はい' : '❌ いいえ'}`);
    
    if (isPublic) {
      const baseUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
      const publicUrl = `${baseUrl}/public/properties/${property.id}`;
      console.log(`  生成されるURL: ${publicUrl}`);
    } else {
      console.log(`  ❌ 公開URLは生成されません（atbb_statusが「専任・公開中」ではないため）`);
      console.log(`  現在の値: "${property.atbb_status}"`);
    }
    console.log('');

    // 解決策を提示
    console.log('💡 解決策:');
    if (!isPublic) {
      console.log('  1. 物件のatbb_statusを「専任・公開中」に変更する');
      console.log('  2. または、statusフィールドを確認する');
      console.log('');
      console.log('📝 注意:');
      console.log('  - Phase 4の実装では、atbb_statusフィールドを使用してURL生成判定を行います');
      console.log('  - PropertyListingDetailPage.tsxでは、data.status を atbbStatus として渡しています');
      console.log('  - しかし、PublicUrlCellでは atbbStatus === "専任・公開中" で判定しています');
      console.log('');
      console.log('🔧 修正が必要な可能性:');
      console.log('  - PropertyListingDetailPage.tsxで atbbStatus={data.atbb_status || data.status || null} に変更');
      console.log('  - または、statusフィールドに「専任・公開中」を設定');
    } else {
      console.log('  ✅ 設定は正しいです。フロントエンドで正しく表示されるはずです。');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkAA13129PublicUrl();
