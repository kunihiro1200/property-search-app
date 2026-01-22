import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkPublicProperties() {
  console.log('🔍 本番Supabaseデータベースの物件データを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 環境変数が設定されていません');
    console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. 全物件数を確認
    const { count: totalCount, error: totalError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ エラー:', totalError);
      return;
    }

    console.log(`📊 全物件数: ${totalCount}件\n`);

    // 2. atbb_statusごとの物件数を確認
    const { data: statusData, error: statusError } = await supabase
      .from('property_listings')
      .select('atbb_status');

    if (statusError) {
      console.error('❌ エラー:', statusError);
      return;
    }

    // atbb_statusごとにカウント
    const statusCounts: Record<string, number> = {};
    statusData?.forEach((row: any) => {
      const status = row.atbb_status || '未設定';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📊 atbb_statusごとの物件数:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}件`);
      });

    console.log('\n');

    // 3. 公開中の物件を確認
    const { data: publicProperties, error: publicError } = await supabase
      .from('property_listings')
      .select('property_number, address, price, atbb_status, created_at')
      .eq('atbb_status', '公開中')
      .order('created_at', { ascending: false })
      .limit(10);

    if (publicError) {
      console.error('❌ エラー:', publicError);
      return;
    }

    console.log(`✅ 公開中の物件: ${publicProperties?.length || 0}件`);
    if (publicProperties && publicProperties.length > 0) {
      console.log('\n最新の公開物件:');
      publicProperties.forEach((prop: any, index: number) => {
        console.log(`  ${index + 1}. ${prop.property_number} - ${prop.address} - ${prop.price}万円`);
      });
    }

    console.log('\n');

    // 4. 最新の物件10件を確認（atbb_statusに関係なく）
    const { data: latestProperties, error: latestError } = await supabase
      .from('property_listings')
      .select('property_number, address, price, atbb_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (latestError) {
      console.error('❌ エラー:', latestError);
      return;
    }

    console.log('📋 最新の物件10件（atbb_statusに関係なく）:');
    latestProperties?.forEach((prop: any, index: number) => {
      console.log(`  ${index + 1}. ${prop.property_number} - ${prop.atbb_status || '未設定'} - ${prop.address}`);
    });

    console.log('\n');

    // 5. 画像URLが設定されている物件数を確認
    const { data: propertiesWithImages, error: imagesError } = await supabase
      .from('property_listings')
      .select('property_number, image_url, storage_location')
      .not('image_url', 'is', null)
      .limit(10);

    if (imagesError) {
      console.error('❌ エラー:', imagesError);
      return;
    }

    console.log(`📷 画像URLが設定されている物件: ${propertiesWithImages?.length || 0}件（サンプル）`);
    if (propertiesWithImages && propertiesWithImages.length > 0) {
      propertiesWithImages.forEach((prop: any, index: number) => {
        try {
          const imageCount = prop.image_url ? JSON.parse(prop.image_url).length : 0;
          console.log(`  ${index + 1}. ${prop.property_number} - 画像${imageCount}枚`);
          if (index === 0) {
            // 最初の物件の画像URLをサンプル表示
            const images = JSON.parse(prop.image_url);
            console.log(`     サンプル画像URL: ${images[0]?.substring(0, 80)}...`);
          }
        } catch (e) {
          console.log(`  ${index + 1}. ${prop.property_number} - JSONパースエラー`);
        }
      });
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkPublicProperties();
