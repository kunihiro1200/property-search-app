/**
 * 格納先URL自動取得機能のテストスクリプト
 * 
 * 使い方:
 * npx ts-node src/scripts/testStorageUrlRetrieval.ts AA13069
 */

import dotenv from 'dotenv';
import { PropertyService } from '../services/PropertyService';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const propertyService = new PropertyService();

async function testStorageUrlRetrieval(propertyNumber: string) {
  console.log('='.repeat(60));
  console.log('格納先URL自動取得機能テスト');
  console.log('='.repeat(60));
  console.log(`物件番号: ${propertyNumber}`);
  console.log('');

  try {
    // 1. 現在の格納先URLを確認
    console.log('📋 ステップ1: 現在の格納先URLを確認');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();

    if (propertyError || !property) {
      console.error('❌ 物件が見つかりません');
      return;
    }

    console.log(`現在の格納先URL: ${property.storage_location || '未設定'}`);
    console.log('');

    // 2. Google Driveから自動取得
    console.log('🔍 ステップ2: Google Driveから格納先URLを自動取得');
    const storageUrl = await propertyService.retrieveStorageUrl(propertyNumber);

    if (storageUrl) {
      console.log('✅ 格納先URLを自動取得しました');
      console.log(`取得したURL: ${storageUrl}`);
      console.log('');

      // 3. データベースの更新を確認
      console.log('📊 ステップ3: データベースの更新を確認');
      const { data: updatedProperty, error: updateError } = await supabase
        .from('property_listings')
        .select('property_number, storage_location')
        .eq('property_number', propertyNumber)
        .single();

      if (updateError || !updatedProperty) {
        console.error('❌ 更新後の物件データの取得に失敗しました');
        return;
      }

      console.log(`更新後の格納先URL: ${updatedProperty.storage_location}`);
      console.log('');

      if (updatedProperty.storage_location === storageUrl) {
        console.log('✅ データベースが正常に更新されました');
      } else {
        console.log('⚠️ データベースの更新に問題がある可能性があります');
      }
    } else {
      console.log('❌ 格納先URLが見つかりませんでした');
      console.log('');
      console.log('考えられる原因:');
      console.log('- Google Driveに物件番号のフォルダが存在しない');
      console.log('- フォルダ名が物件番号で始まっていない（例: AA13069_住所_名前）');
      console.log('- サービスアカウントに共有ドライブへのアクセス権限がない');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('テスト完了');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

// コマンドライン引数から物件番号を取得
const propertyNumber = process.argv[2];

if (!propertyNumber) {
  console.error('使い方: npx ts-node src/scripts/testStorageUrlRetrieval.ts <物件番号>');
  console.error('例: npx ts-node src/scripts/testStorageUrlRetrieval.ts AA13069');
  process.exit(1);
}

testStorageUrlRetrieval(propertyNumber)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
