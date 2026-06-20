import { GoogleSheetsClient } from '../services/GoogleSheetsClient';
import { ColumnMapper } from '../services/ColumnMapper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config();

async function fixCallModeData() {
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

  console.log('🔧 通話モードデータを修正中...\n');

  try {
    // 認証
    console.log('🔐 Google Sheetsに認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // スプレッドシートから全データを読み取り
    console.log('📖 スプレッドシートからデータを読み取り中...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ ${rows.length}行のデータを読み取りました\n`);

    let updatedSellerCount = 0;
    let createdPropertyCount = 0;
    let updatedPropertyCount = 0;
    let errorCount = 0;
    const errors: Array<{ sellerNumber: string; error: string }> = [];

    // バッチサイズを設定
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, rows.length);
      const batch = rows.slice(startIndex, endIndex);

      console.log(`📦 バッチ ${batchIndex + 1}/${totalBatches} を処理中 (${startIndex + 1}-${endIndex}/${rows.length}件)...`);

      // バッチ内の全売主番号を取得
      const sellerNumbers = batch
        .map(row => String(row['売主番号'] || ''))
        .filter(num => num !== '');

      if (sellerNumbers.length === 0) {
        console.log('   ⚠️  このバッチには有効な売主番号がありません。スキップします。');
        continue;
      }

      // 一括で売主データを取得
      const { data: existingSellers, error: findError } = await supabase
        .from('sellers')
        .select('id, seller_number')
        .in('seller_number', sellerNumbers);

      if (findError) {
        console.error(`   ❌ 売主検索エラー:`, findError.message);
        errorCount += batch.length;
        continue;
      }

      // 売主番号とIDのマップを作成
      const sellerMap = new Map(
        (existingSellers || []).map(s => [s.seller_number, s.id])
      );

      // 一括で物件データを取得
      const sellerIds = Array.from(sellerMap.values());
      const { data: existingProperties, error: propertyFindError } = await supabase
        .from('properties')
        .select('id, seller_id')
        .in('seller_id', sellerIds);

      if (propertyFindError) {
        console.error(`   ❌ 物件検索エラー:`, propertyFindError.message);
      }

      // 売主IDと物件IDのマップを作成
      const propertyMap = new Map(
        (existingProperties || []).map(p => [p.seller_id, p.id])
      );

      // バッチ内の各行を処理
      const sellerUpdates: any[] = [];
      const propertyInserts: any[] = [];
      const propertyUpdates: Array<{ id: string; data: any }> = [];

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const sellerNumber = String(row['売主番号'] || '');

        if (!sellerNumber) {
          continue;
        }

        try {
          const sellerId = sellerMap.get(sellerNumber);
          if (!sellerId) {
            continue;
          }

          // データ変換
          const sellerData = columnMapper.mapToDatabase(row);
          sellerUpdates.push({ id: sellerId, data: sellerData });

          // 物件情報を抽出
          const propertyData = columnMapper.extractPropertyData(row, sellerId);
          if (propertyData) {
            const existingPropertyId = propertyMap.get(sellerId);
            if (existingPropertyId) {
              propertyUpdates.push({ id: existingPropertyId, data: propertyData });
            } else {
              propertyInserts.push(propertyData);
            }
          }
        } catch (error: any) {
          errors.push({ sellerNumber, error: error.message });
          errorCount++;
        }
      }

      // 売主データを一括更新
      for (const update of sellerUpdates) {
        const { error: updateError } = await supabase
          .from('sellers')
          .update(update.data as any)
          .eq('id', update.id);

        if (updateError) {
          console.error(`   ❌ 売主更新エラー (ID: ${update.id}):`, updateError.message);
          errorCount++;
        } else {
          updatedSellerCount++;
        }
      }

      // 物件データを一括作成
      if (propertyInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('properties')
          .insert(propertyInserts);

        if (insertError) {
          console.error(`   ❌ 物件一括作成エラー:`, insertError.message);
          errorCount += propertyInserts.length;
        } else {
          createdPropertyCount += propertyInserts.length;
        }
      }

      // 物件データを一括更新
      for (const update of propertyUpdates) {
        const { error: updateError } = await supabase
          .from('properties')
          .update(update.data)
          .eq('id', update.id);

        if (updateError) {
          console.error(`   ❌ 物件更新エラー (ID: ${update.id}):`, updateError.message);
          errorCount++;
        } else {
          updatedPropertyCount++;
        }
      }

      console.log(`   ✅ バッチ完了: 売主${sellerUpdates.length}件更新, 物件${propertyInserts.length}件作成, ${propertyUpdates.length}件更新`);
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

fixCallModeData().catch(error => {
  console.error('❌ 実行中にエラーが発生しました:', error);
  process.exit(1);
});
