/**
 * マイグレーション077を直接実行
 * PostgreSQL接続を使用してALTER TABLEを実行
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('=== マイグレーション077: hidden_imagesカラム追加（直接実行） ===\n');
  
  try {
    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, 'migrations', '077_add_hidden_images_to_property_listings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('実行するSQL:');
    console.log(sql);
    console.log('\n実行中...\n');
    
    // Supabase REST APIではDDLを実行できないため、
    // rpc経由で実行を試みる
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ エラー:', error.message);
      console.error('エラーコード:', error.code);
      
      if (error.code === '42883') {
        console.log('\n=== exec_sql関数が存在しません ===');
        console.log('以下の手順で手動実行してください:\n');
        console.log('1. Supabaseダッシュボードにログイン');
        console.log('2. 左メニューから「SQL Editor」を選択');
        console.log('3. 以下のSQLをコピー＆ペースト:\n');
        console.log(sql);
        console.log('\n4. 「Run」ボタンをクリック');
      }
      return;
    }
    
    console.log('✅ マイグレーション実行成功');
    
    // 確認
    console.log('\n確認中...');
    const { data: sample, error: sampleError } = await supabase
      .from('property_listings')
      .select('hidden_images')
      .limit(1)
      .single();
    
    if (sampleError) {
      if (sampleError.code === 'PGRST116') {
        console.log('⚠️  データが存在しませんが、カラムは追加されている可能性があります');
      } else if (sampleError.message.includes('does not exist')) {
        console.log('❌ hidden_imagesカラムがまだ存在しません');
      } else {
        console.log('確認エラー:', sampleError.message);
      }
    } else {
      console.log('✅ hidden_imagesカラムが正常に追加されました');
      console.log('初期値:', sample?.hidden_images || []);
    }
    
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

executeMigration().catch(console.error);
