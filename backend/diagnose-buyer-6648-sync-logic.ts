import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseBuyer6648SyncLogic() {
  console.log('=== 買主6648同期ロジック診断 ===\n');

  // 1. スキーマリロードを実行
  console.log('1. スキーマリロードを実行...');
  try {
    const { error: notifyError } = await supabase.rpc('notify_schema_reload');
    if (notifyError) {
      console.log('RPC経由でのスキーマリロード失敗、直接SQLで実行します...');
      // 直接SQLで実行
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: "NOTIFY pgrst, 'reload schema';"
      });
      if (sqlError) {
        console.error('SQLエラー:', sqlError);
      } else {
        console.log('✓ スキーマリロード成功');
      }
    } else {
      console.log('✓ スキーマリロード成功');
    }
  } catch (error) {
    console.error('スキーマリロードエラー:', error);
  }

  // 2秒待機
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. 買主6648をスプレッドシートから取得
  console.log('\n2. スプレッドシートから買主6648を確認...');
  // ここでは仮のデータを使用（実際のスプレッドシート連携が必要）
  const buyer6648FromSheet = {
    buyer_number: '6648',
    name: 'テスト買主6648',
    email: 'test6648@example.com',
    phone: '090-1234-5678'
  };
  console.log('スプレッドシートデータ:', buyer6648FromSheet);

  // 3. データベースで買主6648を確認
  console.log('\n3. データベースで買主6648を確認...');
  const { data: existingBuyer, error: selectError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648')
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('✗ 検索エラー:', selectError);
  } else if (existingBuyer) {
    console.log('✓ 買主6648は既に存在します:', existingBuyer);
  } else {
    console.log('○ 買主6648は存在しません（新規作成が必要）');
  }

  // 4. 買主6648の同期を試行
  console.log('\n4. 買主6648の同期を試行...');
  
  if (existingBuyer) {
    // 更新
    console.log('既存レコードを更新します...');
    const { data: updateData, error: updateError } = await supabase
      .from('buyers')
      .update({
        name: buyer6648FromSheet.name,
        email: buyer6648FromSheet.email,
        phone: buyer6648FromSheet.phone,
        updated_at: new Date().toISOString()
      })
      .eq('buyer_number', '6648')
      .select();

    if (updateError) {
      console.error('✗ 更新エラー:', updateError);
      console.error('エラー詳細:', JSON.stringify(updateError, null, 2));
    } else {
      console.log('✓ 更新成功:', updateData);
    }
  } else {
    // 新規作成
    console.log('新規レコードを作成します...');
    const { data: insertData, error: insertError } = await supabase
      .from('buyers')
      .insert({
        buyer_number: buyer6648FromSheet.buyer_number,
        name: buyer6648FromSheet.name,
        email: buyer6648FromSheet.email,
        phone: buyer6648FromSheet.phone
      })
      .select();

    if (insertError) {
      console.error('✗ 挿入エラー:', insertError);
      console.error('エラー詳細:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✓ 挿入成功:', insertData);
    }
  }

  // 5. 最終確認
  console.log('\n5. 最終確認...');
  const { data: finalCheck, error: finalError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648')
    .single();

  if (finalError) {
    console.error('✗ 最終確認エラー:', finalError);
  } else {
    console.log('✓ 買主6648の最終状態:', finalCheck);
  }

  // 6. カラムマッピングの確認
  console.log('\n6. カラムマッピングの確認...');
  console.log('スプレッドシート → データベース:');
  console.log('  氏名・会社名 → name');
  console.log('  買主番号 → buyer_number (KEY)');
  console.log('  買主ID → id (自動生成、KEYではない)');

  console.log('\n=== 診断完了 ===');
}

diagnoseBuyer6648SyncLogic().catch(console.error);
