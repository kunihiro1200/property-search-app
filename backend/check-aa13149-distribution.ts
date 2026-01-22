import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13149Distribution() {
  console.log('=== AA13149 配信チェック ===\n');

  // 1. 物件情報を確認
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13149')
    .single();

  if (propError || !property) {
    console.log('❌ 物件が見つかりません:', propError?.message);
    return;
  }

  console.log('📍 物件情報:');
  console.log('  物件番号:', property.property_number);
  console.log('  住所:', property.address);
  console.log('  GoogleMap URL:', property.google_map_url);
  console.log('  価格:', property.price?.toLocaleString(), '円');
  console.log('  物件種別:', property.property_type);
  console.log('  配信エリア:', property.distribution_areas);
  console.log('');

  // 2. distribution_areasが設定されているか確認
  if (!property.distribution_areas || property.distribution_areas.trim() === '') {
    console.log('❌ 問題発見: distribution_areasが設定されていません！');
    console.log('   これが原因で「配信対象の買主が見つかりませんでした」となります。');
    console.log('');
    console.log('💡 解決方法:');
    console.log('   1. 物件詳細画面で「配信エリア」フィールドを確認');
    console.log('   2. 配信エリアが空の場合は、適切なエリア番号を設定してください');
    console.log('   3. または、backfill-distribution-areas.tsスクリプトを実行して自動設定');
    return;
  }

  // 3. 買主の総数を確認
  const { data: allBuyers, error: buyersError } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, distribution_type, latest_status, desired_property_type, price_range_apartment, price_range_house, price_range_land')
    .not('email', 'is', null)
    .neq('email', '');

  if (buyersError) {
    console.log('❌ 買主データ取得エラー:', buyersError.message);
    return;
  }

  console.log(`📊 買主総数: ${allBuyers?.length || 0}名\n`);

  // 4. 各フィルター条件でどれだけ絞られるか確認
  const buyers = allBuyers || [];

  // 配信フラグフィルター
  const distFlagMatch = buyers.filter(b => {
    const distType = b.distribution_type?.trim() || '';
    return distType === '要' || distType === 'mail' || distType.includes('LINE→mail');
  });
  console.log(`✅ 配信フラグ（要/mail/LINE→mail）: ${distFlagMatch.length}名`);

  // ステータスフィルター
  const statusMatch = distFlagMatch.filter(b => {
    const status = b.latest_status || '';
    return !status.includes('買付') && !status.includes('D');
  });
  console.log(`✅ ステータス（買付・D除外）: ${statusMatch.length}名`);

  // エリアマッチング
  const areaMatch = statusMatch.filter(b => {
    const buyerArea = b.desired_area || '';
    // 物件の配信エリアを個別の文字に分割（⑫㊶㊸ → ['⑫', '㊶', '㊸']）
    const propertyAreas: string[] = Array.from(property.distribution_areas);
    // 買主の希望エリアも個別の文字に分割
    const buyerAreas: string[] = Array.from(buyerArea);
    
    return buyerAreas.some((ba) => propertyAreas.includes(ba));
  });
  console.log(`✅ エリアマッチ: ${areaMatch.length}名`);

  // 物件種別・価格帯フィルター
  const finalMatch = areaMatch.filter(b => {
    // 物件種別チェック
    if (b.desired_property_type && b.desired_property_type.trim() !== '') {
      const desiredTypes = b.desired_property_type.split(/[、・\/,]/).map((t: string) => t.trim());
      const actualType = property.property_type?.trim() || '';
      
      const typeMatch = desiredTypes.some((dt: string) => {
        if (dt === actualType) return true;
        if ((dt === 'マンション' || dt === 'アパート') && (actualType === 'マンション' || actualType === 'アパート')) return true;
        if ((dt === '戸建' || dt === '戸建て') && (actualType === '戸建' || actualType === '戸建て')) return true;
        return false;
      });
      
      if (!typeMatch) return false;
    }

    // 価格帯チェック
    if (!property.price) return true;

    let priceRangeText: string | null = null;
    if (property.property_type === 'マンション' || property.property_type === 'アパート') {
      priceRangeText = b.price_range_apartment;
    } else if (property.property_type === '戸建' || property.property_type === '戸建て') {
      priceRangeText = b.price_range_house;
    } else if (property.property_type === '土地') {
      priceRangeText = b.price_range_land;
    }

    if (!priceRangeText || priceRangeText.includes('指定なし') || priceRangeText.trim() === '') {
      return true;
    }

    // 価格範囲パース
    const minOnlyMatch = priceRangeText.match(/(\d+)万円以上/);
    if (minOnlyMatch) {
      const minPrice = parseInt(minOnlyMatch[1]) * 10000;
      return property.price >= minPrice;
    }

    const maxOnlyMatch = priceRangeText.match(/(?:~|～)?(\d+)万円(?:以下)?$/);
    if (maxOnlyMatch && !priceRangeText.includes('以上') && !priceRangeText.includes('～') && !priceRangeText.match(/(\d+)万円～(\d+)万円/)) {
      const maxPrice = parseInt(maxOnlyMatch[1]) * 10000;
      return property.price <= maxPrice;
    }

    const rangeMatch = priceRangeText.match(/(\d+)(?:万円)?[～~](\d+)万円/);
    if (rangeMatch) {
      const minPrice = parseInt(rangeMatch[1]) * 10000;
      const maxPrice = parseInt(rangeMatch[2]) * 10000;
      return property.price >= minPrice && property.price <= maxPrice;
    }

    return false;
  });

  console.log(`✅ 物件種別・価格帯マッチ: ${finalMatch.length}名\n`);

  if (finalMatch.length === 0) {
    console.log('❌ 最終的に配信対象の買主が0名になりました\n');
    console.log('📋 詳細分析:');
    
    // どの段階で絞られたか
    if (distFlagMatch.length === 0) {
      console.log('  → 配信フラグが「要」「mail」「LINE→mail」の買主がいません');
    } else if (statusMatch.length === 0) {
      console.log('  → ステータスフィルター後に0名になりました（全員が買付済みまたはD）');
    } else if (areaMatch.length === 0) {
      console.log('  → エリアマッチングで0名になりました');
      console.log(`     物件の配信エリア: ${property.distribution_areas}`);
      console.log('     買主の希望エリアと一致する人がいません');
    } else {
      console.log('  → 物件種別または価格帯フィルターで0名になりました');
      console.log(`     物件種別: ${property.property_type}`);
      console.log(`     物件価格: ${property.price?.toLocaleString()}円`);
    }
  } else {
    console.log(`✅ 配信対象: ${finalMatch.length}名\n`);
    console.log('📧 配信対象買主（最初の5名）:');
    finalMatch.slice(0, 5).forEach((b: any) => {
      console.log(`  - ${b.buyer_number}: ${b.email}`);
      console.log(`    希望エリア: ${b.desired_area || 'なし'}`);
      console.log(`    希望種別: ${b.desired_property_type || 'なし'}`);
    });
  }
}

checkAA13149Distribution().catch(console.error);
