/**
 * AA4885の簡易診断スクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function quickDiagnose() {
  const output: string[] = [];
  
  output.push('='.repeat(60));
  output.push('AA4885 物件リスト同期診断');
  output.push('='.repeat(60));
  output.push('');
  
  try {
    // Supabase接続
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      output.push('❌ エラー: 環境変数が設定されていません');
      output.push(`  SUPABASE_URL: ${supabaseUrl ? '設定済み' : '未設定'}`);
      output.push(`  SUPABASE_SERVICE_KEY: ${supabaseKey ? '設定済み' : '未設定'}`);
      console.log(output.join('\n'));
      fs.writeFileSync('diagnosis-aa4885.txt', output.join('\n'), 'utf8');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    output.push('Step 1: DBから AA4885 のデータを取得');
    output.push('-'.repeat(60));
    
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (error) {
      output.push(`❌ エラー: ${error.message}`);
      console.log(output.join('\n'));
      fs.writeFileSync('diagnosis-aa4885.txt', output.join('\n'), 'utf8');
      return;
    }
    
    if (!property) {
      output.push('❌ AA4885 がDBに見つかりません');
      console.log(output.join('\n'));
      fs.writeFileSync('diagnosis-aa4885.txt', output.join('\n'), 'utf8');
      return;
    }
    
    output.push('✓ AA4885 を発見');
    output.push('');
    output.push('重要フィールド:');
    output.push(`  物件番号: ${property.property_number}`);
    output.push(`  種別: ${property.property_type}`);
    output.push(`  状況: ${property.status}`);
    output.push(`  ATBB状態: ${property.atbb_status || '(null)'}`);
    output.push(`  所在地: ${property.address}`);
    output.push(`  売買価格: ${property.sales_price}`);
    output.push(`  最終更新: ${property.updated_at}`);
    output.push('');
    
    output.push('Step 2: 同期状況の確認');
    output.push('-'.repeat(60));
    output.push('');
    output.push('現在のATBB状態: ' + (property.atbb_status || '(null)'));
    output.push('');
    output.push('【診断結果】');
    output.push('');
    
    if (!property.atbb_status || property.atbb_status === '') {
      output.push('⚠️ ATBB状態が空です');
      output.push('');
      output.push('考えられる原因:');
      output.push('  1. スプレッドシートの「atbb成約済み/非公開」列が空');
      output.push('  2. 列マッピングが正しく機能していない');
      output.push('  3. 自動同期が実行されていない');
    } else {
      output.push('✓ ATBB状態が設定されています: ' + property.atbb_status);
      output.push('');
      output.push('ブラウザで表示されない場合の原因:');
      output.push('  1. ブラウザキャッシュの問題');
      output.push('  2. フロントエンドの表示ロジックの問題');
      output.push('  3. APIレスポンスの問題');
    }
    
    output.push('');
    output.push('='.repeat(60));
    output.push('診断完了');
    output.push('='.repeat(60));
    
    const result = output.join('\n');
    console.log(result);
    fs.writeFileSync('diagnosis-aa4885.txt', result, 'utf8');
    console.log('\n結果を diagnosis-aa4885.txt に保存しました');
    
  } catch (error: any) {
    output.push('');
    output.push('❌ 予期しないエラー:');
    output.push(error.message);
    if (error.stack) {
      output.push('');
      output.push('スタックトレース:');
      output.push(error.stack);
    }
    
    const result = output.join('\n');
    console.log(result);
    fs.writeFileSync('diagnosis-aa4885.txt', result, 'utf8');
  }
}

quickDiagnose().catch(console.error);
