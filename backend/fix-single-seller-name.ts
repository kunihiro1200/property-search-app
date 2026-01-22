import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { encrypt } from './src/utils/encryption';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSingleSellerName(sellerNumber: string) {
  console.log(`\n=== 売主番号 ${sellerNumber} の名前を修正 ===\n`);

  try {
    // 1. データベースから売主を取得
    const { data: seller, error: fetchError } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', sellerNumber)
      .single();

    if (fetchError || !seller) {
      console.error('❌ 売主が見つかりません:', fetchError);
      return;
    }

    console.log('現在の名前:', seller.name);

    // 2. スプレッドシートから名前を取得
    const sheetsClient = new GoogleSheetsClient();
    await sheetsClient.initialize();
    
    const columnMapper = new ColumnMapper();
    await columnMapper.initialize();

    const rows = await sheetsClient.getAllRows();
    console.log(`スプレッドシートから${rows.length}行を取得`);

    // 売主番号でスプレッドシートの行を検索
    const sheetRow = rows.find(row => {
      const rowSellerNumber = columnMapper.getValue(row, 'seller_number');
      return rowSellerNumber === sellerNumber;
    });

    if (!sheetRow) {
      console.error('❌ スプレッドシートに売主番号が見つかりません');
      return;
    }

    const nameFromSheet = columnMapper.getValue(sheetRow, 'name');
    console.log('スプレッドシートの名前:', nameFromSheet);

    if (!nameFromSheet || nameFromSheet.trim() === '') {
      console.log('⚠️  スプレッドシートに名前がありません');
      return;
    }

    // 3. 名前を暗号化して更新
    const encryptedName = encrypt(nameFromSheet);
    
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ name: encryptedName })
      .eq('seller_number', sellerNumber);

    if (updateError) {
      console.error('❌ 更新エラー:', updateError);
      return;
    }

    console.log('✅ 名前を更新しました:', nameFromSheet);

  } catch (err) {
    console.error('予期しないエラー:', err);
  }
}

// コマンドライン引数から売主番号を取得
const sellerNumber = process.argv[2] || 'AA12923';
fixSingleSellerName(sellerNumber).then(() => {
  console.log('\n完了');
  process.exit(0);
});
