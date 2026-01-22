import { GoogleSheetsClient } from '../services/GoogleSheetsClient';
import { ColumnMapper } from '../services/ColumnMapper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config();

async function fixCallModeDataTargeted() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase環境変数が設定されていません');
    process.exit(1);
  }

  if (!spreadsheetId) {
    console.error('❌ GOOGLE_SHEETS_SPREADSHEET_IDが設定されていません');
    process.exit(1);
  }

  if (!serviceAccountKeyPath) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY_PATHが設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // サービスアカウントキーのパスを解決
  const resolvedKeyPath = path.resolve(process.cwd(), serviceAccountKeyPath);
  console.log(`📁 サービスアカウントキー: ${resolvedKeyPath}`);

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: resolvedKeyPath,
  });
  const columnMapper = new ColumnMapper();

  console.log('🔧 通話モードデータを修正中（対象データのみ）...\n');

  try {
    // 認証
    console.log('🔐 Google Sheetsに認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // サイト情報が欠けている売主を取得
    console.log('🔍 サイト情報が欠けている売主を検索中...');
    const { data: sellersWithoutSite, error: siteError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .is('site', null)
      .limit(1000);

    if (siteError) {
      throw new Error(`売主検索エラー: ${siteError.message}`);
    }

    console.log(`✅ ${sellersWithoutSite?.length || 0}件の売主が見つかりました\n`);

    if (!sellersWithoutSite || sellersWithoutSite.length === 0) {
      console.log('✅ 修正が必要な売主はありません');
      return;
    }

    // スプレッドシートから全データを読み取り
    console.log('📖 スプレッドシートからデータを読み取り中...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ ${rows.length}行のデータを読み取りました\n`);

    // 売主番号でインデックスを作成
    const rowMap = new Map();
    for (const row of rows) {
      const sellerNumber = String(row['売主番号'] || '');
      if (sellerNumber) {
        rowMap.set(sellerNumber, row);
      }
    }

    let updatedSellerCount = 0;
    let createdPropertyCount = 0;
    let updatedPropertyCount = 0;
    let errorCount = 0;
    const errors: Array<{ sellerNumber: string; error: string }> = [];

    console.log('🔧 データを修正中...\n');

    for (let i = 0; i < sellersWithoutSite.length; i++) {
      const seller = sellersWithoutSite[i];
      const sellerNumber = seller.seller_number;

      try {
        const row = rowMap.get(sellerNumber);
        if (!row) {
          console.log(`⚠️  売主番号${sellerNumber}がスプレッドシートに見つかりません。スキップします。`);
          continue;
        }

        // データ変換
        const sellerData = columnMapper.mapToDatabase(row);

        // 売主データを更新
        const { error: updateError } = await supabase
          .from('sellers')
          .update(sellerData as any)
          .eq('id', seller.id);

        if (updateError) {
          throw new Error(`売主更新エラー: ${updateError.message}`);
        }

        updatedSellerCount++;

        // 物件情報を確認
        const { data: existingProperty, error: propertyFindError } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_id', seller.id)
          .single();

        if (propertyFindError && propertyFindError.code !== 'PGRST116') {
          throw new Error(`物件検索エラー: ${propertyFindError.message}`);
        }

        const propertyData = columnMapper.extractPropertyData(row, seller.id);

        if (propertyData) {
          if (existingProperty) {
            // 物件情報を更新
            const { error: propertyUpdateError } = await supabase
              .from('properties')
              .update(propertyData)
              .eq('id', existingProperty.id);

            if (propertyUpdateError) {
              throw new Error(`物件更新エラー: ${propertyUpdateError.message}`);
            }

            updatedPropertyCount++;
          } else {
            // 物件情報を作成
            const { error: propertyInsertError } = await supabase
              .from('properties')
              .insert(propertyData);

            if (propertyInsertError) {
              throw new Error(`物件作成エラー: ${propertyInsertError.message}`);
            }

            createdPropertyCount++;
          }
        }

        // 進捗表示（50件ごと）
        if ((i + 1) % 50 === 0) {
          console.log(`   処理中: ${i + 1}/${sellersWithoutSite.length}件`);
        }
      } catch (error: any) {
        console.error(`❌ エラー (売主番号: ${sellerNumber}):`, error.message);
        errors.push({ sellerNumber, error: error.message });
        errorCount++;
      }
    }

    console.log('\n✅ データ修正が完了しました！');
    console.log(`   売主更新: ${updatedSellerCount}件`);
    console.log(`   物件作成: ${createdPropertyCount}件`);
    console.log(`   物件更新: ${updatedPropertyCount}件`);
    console.log(`   エラー: ${errorCount}件\n`);

    if (errors.length > 0) {
      console.log('⚠️  エラーが発生した売主（最初の10件）:');
      errors.slice(0, 10).forEach(err => {
        console.log(`   ${err.sellerNumber}: ${err.error}`);
      });

      if (errors.length > 10) {
        console.log(`   ... 他${errors.length - 10}件\n`);
      }
    }
  } catch (error: any) {
    console.error('❌ 修正中に致命的なエラーが発生しました:', error.message);
    process.exit(1);
  }
}

fixCallModeDataTargeted().catch(error => {
  console.error('❌ 実行中にエラーが発生しました:', error);
  process.exit(1);
});
