import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testEmptyAtbbStatus() {
  console.log('🔍 atbb_statusが空欄の物件を確認中...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // atbb_statusがnullまたは空文字列の物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, latitude, longitude')
      .or('atbb_status.is.null,atbb_status.eq.')
      .limit(5);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log(`✅ atbb_statusが空欄の物件: ${properties?.length || 0}件\n`);

    if (properties && properties.length > 0) {
      properties.forEach((property, index) => {
        console.log(`${index + 1}. ${property.property_number}`);
        console.log(`   - atbb_status: ${property.atbb_status || '(null/空)'}`);
        console.log(`   - 座標: ${property.latitude ? 'あり' : 'なし'}`);
        
        // getBadgeTypeロジックをシミュレート
        const atbbStatus = property.atbb_status;
        let badgeType: string;

        if (!atbbStatus || atbbStatus === '') {
          badgeType = 'sold';
        } else if (atbbStatus === 'ステータスなし') {
          badgeType = 'none';
        } else if (atbbStatus.includes('公開中')) {
          badgeType = 'none';
        } else if (atbbStatus.includes('公開前')) {
          badgeType = 'pre_release';
        } else if (atbbStatus.includes('非公開（配信メールのみ）')) {
          badgeType = 'email_only';
        } else {
          badgeType = 'sold';
        }

        const markerColorMap: Record<string, string> = {
          'none': '#2196F3',
          'pre_release': '#ff9800',
          'email_only': '#f44336',
          'sold': '#9e9e9e',
        };
        
        const markerColor = markerColorMap[badgeType];
        console.log(`   - badge_type: ${badgeType}`);
        console.log(`   - マーカー色: ${markerColor} (グレー)\n`);
      });
    } else {
      console.log('❌ atbb_statusが空欄の物件が見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testEmptyAtbbStatus();
