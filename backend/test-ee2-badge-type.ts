import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testEE2BadgeType() {
  console.log('🔍 EE2のbadge_type判定をテスト中...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // property_listingsテーブルからEE2を取得
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, latitude, longitude')
      .eq('property_number', 'EE2')
      .single();

    if (propertyError) {
      console.error('❌ property_listingsエラー:', propertyError);
      return;
    }

    if (!property) {
      console.error('❌ EE2が見つかりません');
      return;
    }

    console.log('✅ EE2のデータ:');
    console.log('- property_number:', property.property_number);
    console.log('- atbb_status:', property.atbb_status || '(null/空)');
    console.log('- latitude:', property.latitude);
    console.log('- longitude:', property.longitude);

    // getBadgeTypeロジックをシミュレート
    const atbbStatus = property.atbb_status;
    let badgeType: string;

    // 空欄（null、空文字列）の場合は'sold'（成約済み、グレーマーカー）
    if (!atbbStatus || atbbStatus === '') {
      badgeType = 'sold';
    } 
    // "ステータスなし"の場合も'sold'（成約済み、グレーマーカー）
    else if (atbbStatus === 'ステータスなし') {
      badgeType = 'sold';
    } else if (atbbStatus.includes('公開中')) {
      badgeType = 'none';
    } else if (atbbStatus.includes('公開前')) {
      badgeType = 'pre_release';
    } else if (atbbStatus.includes('非公開（配信メールのみ）')) {
      badgeType = 'email_only';
    } else {
      badgeType = 'sold';
    }

    console.log('\n📋 badge_type判定結果:');
    console.log('- badge_type:', badgeType);
    
    // マーカーの色を判定
    const markerColorMap: Record<string, string> = {
      'none': '#2196F3', // 青（販売中）
      'pre_release': '#ff9800', // オレンジ
      'email_only': '#f44336', // 赤
      'sold': '#9e9e9e', // グレー
    };
    
    const markerColor = markerColorMap[badgeType] || '#2196F3';
    console.log('- マーカーの色:', markerColor);
    
    // EE2の場合の期待値
    if (property.atbb_status === 'ステータスなし') {
      console.log('- 期待される色: #9e9e9e (グレー) - ステータスなしは成約済み扱い');
      console.log('- 判定:', markerColor === '#9e9e9e' ? '✅ 正しい' : '❌ 間違い');
    } else if (!property.atbb_status || property.atbb_status === '') {
      console.log('- 期待される色: #9e9e9e (グレー) - 空欄は成約済み扱い');
      console.log('- 判定:', markerColor === '#9e9e9e' ? '✅ 正しい' : '❌ 間違い');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testEE2BadgeType();
