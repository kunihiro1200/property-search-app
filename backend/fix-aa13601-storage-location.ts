/**
 * AA13601の storage_location を確認・設定するスクリプト
 * 
 * 実行方法:
 * npx ts-node backend/fix-aa13601-storage-location.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// AA13601のGoogle Drive athome公開フォルダURL（スクリーンショットから確認済み）
// 親フォルダ: 1WYUI5n1r-p0NLqOVy4RE7q-UQ2WPEwUO
// athome公開フォルダ: 1An5jZx-8b2OqeCZ-jefDIILL99Zb6MPF
const STORAGE_URL = 'https://drive.google.com/drive/folders/1An5jZx-8b2OqeCZ-jefDIILL99Zb6MPF';

async function main() {
  console.log('🔍 AA13601の storage_location を確認中...');
  
  // 現在の状態を確認
  const { data: property, error: selectError } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, atbb_status')
    .eq('property_number', 'AA13601')
    .single();
  
  if (selectError) {
    console.error('❌ 物件の取得に失敗しました:', selectError.message);
    process.exit(1);
  }
  
  if (!property) {
    console.error('❌ AA13601が見つかりません');
    process.exit(1);
  }
  
  console.log('📋 現在の状態:');
  console.log(`  property_number: ${property.property_number}`);
  console.log(`  id: ${property.id}`);
  console.log(`  storage_location: ${property.storage_location || '(NULL)'}`);
  console.log(`  atbb_status: ${property.atbb_status}`);
  
  if (property.storage_location) {
    console.log('⚠️  storage_location は既に設定されています:', property.storage_location);
    console.log('🔧 athome公開フォルダURLに更新します...');
  }
  
  // storage_locationがNULLの場合、設定する
  console.log(`\n🔧 storage_location を設定します: ${STORAGE_URL}`);
  
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ storage_location: STORAGE_URL })
    .eq('property_number', 'AA13601');
  
  if (updateError) {
    console.error('❌ storage_location の更新に失敗しました:', updateError.message);
    process.exit(1);
  }
  
  console.log('✅ storage_location を正常に設定しました！');
  
  // 更新後の確認
  const { data: updatedProperty } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'AA13601')
    .single();
  
  console.log('\n📋 更新後の状態:');
  console.log(`  property_number: ${updatedProperty?.property_number}`);
  console.log(`  storage_location: ${updatedProperty?.storage_location}`);
}

main().catch(console.error);
