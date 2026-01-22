import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseBuyerConflict() {
  console.log('=== 買主6647と6648の競合診断 ===\n');

  try {
    // 1. データベースの制約を確認
    console.log('1. buyersテーブルの制約を確認中...');
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'buyers' })
      .single();

    if (constraintError) {
      console.log('制約情報の取得に失敗（RPCが存在しない可能性）');
      console.log('代わりにスキーマ情報を確認します...\n');
    }

    // 2. 既存の買主データを確認
    console.log('2. 既存の買主6647と6648を確認中...');
    const { data: existingBuyers, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .in('buyer_number', [6647, 6648]);

    if (buyerError) {
      console.error('❌ 買主データの取得エラー:', buyerError);
    } else {
      console.log(`✅ 既存レコード数: ${existingBuyers?.length || 0}`);
      if (existingBuyers && existingBuyers.length > 0) {
        existingBuyers.forEach(buyer => {
          console.log(`\n買主番号: ${buyer.buyer_number}`);
          console.log(`  氏名: ${buyer.name}`);
          console.log(`  電話番号: ${buyer.phone}`);
          console.log(`  メール: ${buyer.email}`);
          console.log(`  作成日: ${buyer.created_at}`);
        });
      } else {
        console.log('既存レコードなし');
      }
    }

    // 3. 名前と電話番号が同じレコードを検索
    console.log('\n3. 同じ名前または電話番号を持つ買主を検索中...');
    const { data: duplicates, error: dupError } = await supabase
      .from('buyers')
      .select('buyer_number, name, phone, email')
      .or('name.eq.にけた,phone.eq.090-1234-5678'); // 実際の値に置き換える

    if (dupError) {
      console.error('❌ 重複検索エラー:', dupError);
    } else {
      console.log(`✅ 同じ名前/電話番号のレコード数: ${duplicates?.length || 0}`);
      if (duplicates && duplicates.length > 0) {
        duplicates.forEach(buyer => {
          console.log(`\n買主番号: ${buyer.buyer_number}`);
          console.log(`  氏名: ${buyer.name}`);
          console.log(`  電話番号: ${buyer.phone}`);
          console.log(`  メール: ${buyer.email}`);
        });
      }
    }

    // 4. テーブルのUNIQUE制約を確認
    console.log('\n4. UNIQUE制約の確認...');
    const { data: tableInfo, error: infoError } = await supabase
      .from('buyers')
      .select('*')
      .limit(1);

    if (!infoError) {
      console.log('✅ buyersテーブルにアクセス可能');
    }

    // 5. last_synced_atカラムの存在確認
    console.log('\n5. last_synced_atカラムの存在確認...');
    const { data: columnCheck, error: columnError } = await supabase
      .from('buyers')
      .select('buyer_number, last_synced_at')
      .limit(1);

    if (columnError) {
      console.error('❌ last_synced_atカラムエラー:', columnError.message);
      console.log('→ これが買主6648の同期失敗の原因です');
    } else {
      console.log('✅ last_synced_atカラムは存在します');
    }

    // 6. 推奨される対処法
    console.log('\n=== 診断結果と推奨対処法 ===\n');
    
    if (columnError && columnError.message.includes('last_synced_at')) {
      console.log('【問題1】last_synced_atカラムがスキーマキャッシュにない');
      console.log('対処法: Supabaseプロジェクトを再起動してスキーマキャッシュをリフレッシュ');
      console.log('または: マイグレーション054を再実行\n');
    }

    if (existingBuyers && existingBuyers.length > 0) {
      console.log('【問題2】買主6647または6648が既に存在する');
      console.log('対処法: 既存レコードを更新（INSERT → UPDATE）\n');
    }

    if (duplicates && duplicates.length > 1) {
      console.log('【問題3】名前または電話番号が重複している');
      console.log('対処法:');
      console.log('  - UNIQUE制約がある場合: 片方のデータを修正');
      console.log('  - 制約がない場合: 両方とも挿入可能（ビジネスロジックで判断）\n');
    }

  } catch (error) {
    console.error('❌ 診断中にエラーが発生:', error);
  }
}

diagnoseBuyerConflict();
