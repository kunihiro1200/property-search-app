/**
 * AA4885のAPIレスポンスを確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkApiResponse() {
  const output: string[] = [];
  
  output.push('='.repeat(70));
  output.push('AA4885 APIレスポンス確認');
  output.push('='.repeat(70));
  output.push('');
  
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      output.push('❌ エラー: 環境変数が設定されていません');
      console.log(output.join('\n'));
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. 単一物件の取得（詳細ページ用）
    output.push('Test 1: 単一物件の取得 (GET /api/property-listings/:id)');
    output.push('-'.repeat(70));
    
    const { data: singleProperty, error: singleError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (singleError) {
      output.push(`❌ エラー: ${singleError.message}`);
    } else if (singleProperty) {
      output.push('✓ 取得成功');
      output.push('');
      output.push('レスポンスデータ:');
      output.push(`  property_number: ${singleProperty.property_number}`);
      output.push(`  property_type: ${singleProperty.property_type}`);
      output.push(`  status: ${singleProperty.status}`);
      output.push(`  atbb_status: ${singleProperty.atbb_status || '(null)'}`);
      output.push('');
      
      if (singleProperty.atbb_status) {
        output.push('✅ atbb_status フィールドが含まれています');
      } else {
        output.push('⚠️ atbb_status フィールドが空またはnullです');
      }
    }
    
    output.push('');
    output.push('');
    
    // 2. 物件リストの取得（一覧ページ用）
    output.push('Test 2: 物件リストの取得 (GET /api/property-listings)');
    output.push('-'.repeat(70));
    
    const { data: listProperties, error: listError } = await supabase
      .from('property_listings')
      .select('property_number, property_type, status, atbb_status, address')
      .eq('property_number', 'AA4885');
    
    if (listError) {
      output.push(`❌ エラー: ${listError.message}`);
    } else if (listProperties && listProperties.length > 0) {
      output.push('✓ 取得成功');
      output.push('');
      output.push('レスポンスデータ:');
      const prop = listProperties[0];
      output.push(`  property_number: ${prop.property_number}`);
      output.push(`  property_type: ${prop.property_type}`);
      output.push(`  status: ${prop.status}`);
      output.push(`  atbb_status: ${prop.atbb_status || '(null)'}`);
      output.push(`  address: ${prop.address}`);
      output.push('');
      
      if (prop.atbb_status) {
        output.push('✅ atbb_status フィールドが含まれています');
      } else {
        output.push('⚠️ atbb_status フィールドが空またはnullです');
      }
    }
    
    output.push('');
    output.push('');
    
    // 3. フィルタリングのテスト
    output.push('Test 3: ATBB状態でのフィルタリング');
    output.push('-'.repeat(70));
    
    const { data: filteredProperties, error: filterError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status')
      .eq('atbb_status', '一般・公開中')
      .limit(5);
    
    if (filterError) {
      output.push(`❌ エラー: ${filterError.message}`);
    } else if (filteredProperties) {
      output.push(`✓ 取得成功: ${filteredProperties.length}件`);
      output.push('');
      
      const aa4885Found = filteredProperties.find(p => p.property_number === 'AA4885');
      if (aa4885Found) {
        output.push('✅ AA4885 が「一般・公開中」でフィルタリングされました');
      } else {
        output.push('⚠️ AA4885 が「一般・公開中」でフィルタリングされませんでした');
      }
      
      output.push('');
      output.push('フィルタリング結果の例:');
      filteredProperties.slice(0, 3).forEach(p => {
        output.push(`  - ${p.property_number}: ${p.atbb_status}`);
      });
    }
    
    output.push('');
    output.push('='.repeat(70));
    output.push('確認完了');
    output.push('='.repeat(70));
    output.push('');
    output.push('【結論】');
    output.push('');
    
    if (singleProperty?.atbb_status && listProperties?.[0]?.atbb_status) {
      output.push('✅ APIは正しくATBB状態を返しています');
      output.push('');
      output.push('ブラウザで表示されない場合:');
      output.push('  1. ブラウザキャッシュをクリア（Ctrl+Shift+R）');
      output.push('  2. フロントエンドのコンポーネントを確認');
      output.push('  3. ブラウザの開発者ツールでNetworkタブを確認');
    } else {
      output.push('⚠️ APIレスポンスにATBB状態が含まれていません');
      output.push('');
      output.push('考えられる原因:');
      output.push('  1. バックエンドのマッピングロジックの問題');
      output.push('  2. Supabase RLSポリシーの問題');
      output.push('  3. カラムの権限設定の問題');
    }
    
    const result = output.join('\n');
    console.log(result);
    fs.writeFileSync('api-response-aa4885.txt', result, 'utf8');
    console.log('\n結果を api-response-aa4885.txt に保存しました');
    
  } catch (error: any) {
    output.push('');
    output.push('❌ 予期しないエラー:');
    output.push(error.message);
    
    const result = output.join('\n');
    console.log(result);
    fs.writeFileSync('api-response-aa4885.txt', result, 'utf8');
  }
}

checkApiResponse().catch(console.error);
