/**
 * favorite_comment が削除された原因を調査
 * 
 * 確認項目:
 * 1. property_details テーブルの更新履歴
 * 2. 最近実行されたスクリプト
 * 3. 同期処理の動作
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function investigate() {
  console.log('='.repeat(80));
  console.log('favorite_comment 削除原因の調査');
  console.log('='.repeat(80));
  console.log('');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: property_details テーブルの更新日時を確認
  console.log('[Step 1] property_details テーブルの更新日時を確認...');
  const { data: recentUpdates, error: updatesError } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (updatesError) {
    console.error('エラー:', updatesError);
  } else {
    console.log('最近更新された property_details:');
    console.log('='.repeat(80));
    recentUpdates?.forEach(item => {
      console.log(`${item.property_number}:`);
      console.log(`  favorite_comment: ${item.favorite_comment ? '✅ あり' : '❌ なし'}`);
      console.log(`  updated_at: ${item.updated_at}`);
      console.log('');
    });
  }

  // Step 2: 最近実行されたスクリプトを確認
  console.log('='.repeat(80));
  console.log('[Step 2] 最近実行された可能性のあるスクリプトを確認...');
  console.log('='.repeat(80));
  console.log('');

  const backendDir = path.join(__dirname);
  const scriptFiles = fs.readdirSync(backendDir)
    .filter(file => file.endsWith('.ts') && (
      file.includes('sync') || 
      file.includes('update') || 
      file.includes('save') ||
      file.includes('property-details')
    ))
    .map(file => {
      const stats = fs.statSync(path.join(backendDir, file));
      return {
        name: file,
        modified: stats.mtime
      };
    })
    .sort((a, b) => b.modified.getTime() - a.modified.getTime())
    .slice(0, 20);

  console.log('最近変更されたスクリプト（sync/update/save/property-details関連）:');
  scriptFiles.forEach(file => {
    console.log(`  ${file.name} - 最終更新: ${file.modified.toLocaleString('ja-JP')}`);
  });
  console.log('');

  // Step 3: PropertyDetailsService の動作を確認
  console.log('='.repeat(80));
  console.log('[Step 3] PropertyDetailsService の savePropertyDetails メソッドを確認...');
  console.log('='.repeat(80));
  console.log('');

  // PropertyDetailsService のコードを読み込んで確認
  const propertyDetailsServicePath = path.join(__dirname, 'src', 'services', 'PropertyDetailsService.ts');
  if (fs.existsSync(propertyDetailsServicePath)) {
    const content = fs.readFileSync(propertyDetailsServicePath, 'utf-8');
    
    // savePropertyDetails メソッドを探す
    const saveMethodMatch = content.match(/async savePropertyDetails\([^)]*\)[^{]*{[\s\S]*?(?=\n  async |\n  \/\/|\n})/);
    
    if (saveMethodMatch) {
      console.log('PropertyDetailsService.savePropertyDetails メソッド:');
      console.log('─'.repeat(80));
      console.log(saveMethodMatch[0].substring(0, 1000) + '...');
      console.log('─'.repeat(80));
      console.log('');
      
      // favorite_comment が含まれているか確認
      if (saveMethodMatch[0].includes('favorite_comment')) {
        console.log('✅ savePropertyDetails メソッドに favorite_comment が含まれています');
      } else {
        console.log('⚠️ savePropertyDetails メソッドに favorite_comment が含まれていません！');
        console.log('   これが原因で、他のデータを保存する際に favorite_comment が null で上書きされている可能性があります。');
      }
    }
  }
  console.log('');

  // Step 4: 最近の同期ログを確認
  console.log('='.repeat(80));
  console.log('[Step 4] 最近の同期ログを確認...');
  console.log('='.repeat(80));
  console.log('');

  const logFiles = ['sync-output.log', 'sync-errors.log', 'logs/sync.log']
    .map(logFile => path.join(backendDir, logFile))
    .filter(logPath => fs.existsSync(logPath));

  if (logFiles.length > 0) {
    console.log('見つかったログファイル:');
    logFiles.forEach(logPath => {
      const stats = fs.statSync(logPath);
      console.log(`  ${path.basename(logPath)} - 最終更新: ${stats.mtime.toLocaleString('ja-JP')}`);
      
      // 最後の100行を読み込む
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').slice(-100);
      
      // favorite_comment に関連する行を探す
      const relevantLines = lines.filter(line => 
        line.toLowerCase().includes('favorite') || 
        line.toLowerCase().includes('property_details')
      );
      
      if (relevantLines.length > 0) {
        console.log(`\n  ${path.basename(logPath)} の関連ログ:`);
        relevantLines.slice(-10).forEach(line => {
          console.log(`    ${line}`);
        });
      }
    });
  } else {
    console.log('⚠️ ログファイルが見つかりませんでした');
  }
  console.log('');

  // Step 5: 結論と推奨事項
  console.log('='.repeat(80));
  console.log('調査結果と推奨事項');
  console.log('='.repeat(80));
  console.log('');
  console.log('考えられる原因:');
  console.log('1. PropertyDetailsService.savePropertyDetails が favorite_comment を含まずに保存');
  console.log('   → 他のデータ（recommended_comments, athome_data）を保存する際に');
  console.log('      favorite_comment が null で上書きされた可能性');
  console.log('');
  console.log('2. 最近実行されたスクリプトが favorite_comment を削除');
  console.log('   → 上記のスクリプトリストを確認してください');
  console.log('');
  console.log('3. データベースマイグレーションやスキーマ変更');
  console.log('   → マイグレーションファイルを確認してください');
  console.log('');
  console.log('推奨事項:');
  console.log('1. PropertyDetailsService.savePropertyDetails メソッドを確認');
  console.log('2. 最近実行されたスクリプトを確認');
  console.log('3. favorite_comment を再度同期する前に、上書きされないように修正');
  console.log('');
}

investigate().catch(console.error);
