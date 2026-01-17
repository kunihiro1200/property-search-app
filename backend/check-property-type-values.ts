// 物件タイプの実際の値を確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkPropertyTypeValues() {
  console.log('=== 物件タイプの値を確認中 ===\n');

  try {
    // すべての物件タイプの値を取得（重複なし）
    const { data: types, error: typesError } = await supabase
      .from('property_listings')
      .select('property_type')
      .not('property_type', 'is', null);

    if (typesError) {
      console.error('エラー:', typesError);
      return;
    }

    // ユニークな値を集計
    const uniqueTypes = new Map<string, number>();
    types?.forEach(row => {
      const type = row.property_type;
      uniqueTypes.set(type, (uniqueTypes.get(type) || 0) + 1);
    });

    console.log('データベースに保存されている物件タイプの値:');
    console.log('----------------------------------------');
    for (const [type, count] of uniqueTypes.entries()) {
      console.log(`"${type}": ${count}件`);
    }
    console.log('----------------------------------------\n');

    // 土地の物件を検索（日本語）
    console.log('=== "土地"で検索 ===');
    const { data: landJP, error: landJPError } = await supabase
      .from('property_listings')
      .select('property_number, property_type, address')
      .eq('property_type', '土地')
      .limit(5);

    if (landJPError) {
      console.error('エラー:', landJPError);
    } else {
      console.log(`見つかった件数: ${landJP?.length || 0}件`);
      if (landJP && landJP.length > 0) {
        console.log('サンプル:');
        landJP.forEach(p => {
          console.log(`  - ${p.property_number}: ${p.property_type} (${p.address?.substring(0, 30)}...)`);
        });
      }
    }
    console.log('');

    // 土地の物件を検索（英語）
    console.log('=== "land"で検索 ===');
    const { data: landEN, error: landENError } = await supabase
      .from('property_listings')
      .select('property_number, property_type, address')
      .eq('property_type', 'land')
      .limit(5);

    if (landENError) {
      console.error('エラー:', landENError);
    } else {
      console.log(`見つかった件数: ${landEN?.length || 0}件`);
      if (landEN && landEN.length > 0) {
        console.log('サンプル:');
        landEN.forEach(p => {
          console.log(`  - ${p.property_number}: ${p.property_type} (${p.address?.substring(0, 30)}...)`);
        });
      }
    }
    console.log('');

    // 公開中の物件で土地を検索
    console.log('=== 公開中の物件で"土地"を検索 ===');
    const { data: publicLand, error: publicLandError } = await supabase
      .from('property_listings')
      .select('property_number, property_type, address, atbb_status')
      .eq('atbb_status', '専任・公開中')
      .eq('property_type', '土地')
      .limit(5);

    if (publicLandError) {
      console.error('エラー:', publicLandError);
    } else {
      console.log(`見つかった件数: ${publicLand?.length || 0}件`);
      if (publicLand && publicLand.length > 0) {
        console.log('サンプル:');
        publicLand.forEach(p => {
          console.log(`  - ${p.property_number}: ${p.property_type} (${p.atbb_status})`);
        });
      }
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

checkPropertyTypeValues();
