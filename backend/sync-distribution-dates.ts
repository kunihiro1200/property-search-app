/**
 * 配信日（distribution_date）をスプレッドシートからデータベースに同期するスクリプト
 * 
 * 問題: 配信日がデータベースに同期されていないため、公開物件サイトのソートが正しく動作しない
 * 解決: スプレッドシートから配信日を取得してデータベースを更新
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function syncDistributionDates() {
  console.log('🔄 配信日（distribution_date）の同期を開始します...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // GoogleSheetsClientをインポート
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');

    const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    const PROPERTY_LIST_SHEET_NAME = '物件';

    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    console.log('✅ Googleスプレッドシートに接続しました\n');

    // スプレッドシートから全データを取得
    const spreadsheetData = await sheetsClient.readAll();
    console.log(`📊 スプレッドシートから ${spreadsheetData.length} 件のデータを取得しました\n`);

    // 配信日があるデータを抽出
    const propertiesWithDistributionDate: Array<{
      property_number: string;
      distribution_date: string;
    }> = [];

    for (const row of spreadsheetData) {
      const propertyNumber = String(row['物件番号'] || '').trim();
      const distributionDateRaw = row['配信日【公開）'];

      if (!propertyNumber) continue;

      if (distributionDateRaw) {
        // 日付をパース
        let distributionDate: string | null = null;

        if (typeof distributionDateRaw === 'number') {
          // Excelシリアル値の場合
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch.getTime() + distributionDateRaw * 24 * 60 * 60 * 1000);
          distributionDate = date.toISOString().split('T')[0];
        } else if (typeof distributionDateRaw === 'string') {
          // 文字列の場合
          const trimmed = distributionDateRaw.trim();
          if (trimmed) {
            // YYYY/MM/DD または YYYY-MM-DD 形式を想定
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) {
              distributionDate = parsed.toISOString().split('T')[0];
            }
          }
        }

        if (distributionDate) {
          propertiesWithDistributionDate.push({
            property_number: propertyNumber,
            distribution_date: distributionDate
          });
        }
      }
    }

    console.log(`📊 配信日があるデータ: ${propertiesWithDistributionDate.length} 件\n`);

    // 2026年のデータを確認
    const properties2026 = propertiesWithDistributionDate.filter(p => p.distribution_date.startsWith('2026'));
    console.log(`📊 2026年の配信日: ${properties2026.length} 件`);
    if (properties2026.length > 0) {
      console.log('   例:');
      properties2026.slice(0, 10).forEach(p => {
        console.log(`   - ${p.property_number}: ${p.distribution_date}`);
      });
    }
    console.log('');

    // データベースを更新
    console.log('📋 データベースを更新中...\n');

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ property_number: string; error: string }> = [];

    // バッチ処理
    const batchSize = 50;
    for (let i = 0; i < propertiesWithDistributionDate.length; i += batchSize) {
      const batch = propertiesWithDistributionDate.slice(i, i + batchSize);
      
      console.log(`   バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(propertiesWithDistributionDate.length / batchSize)}: ${batch.length} 件を処理中...`);

      for (const property of batch) {
        try {
          const { error } = await supabase
            .from('property_listings')
            .update({
              distribution_date: property.distribution_date,
              updated_at: new Date().toISOString()
            })
            .eq('property_number', property.property_number);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (error: any) {
          failCount++;
          errors.push({
            property_number: property.property_number,
            error: error.message
          });
        }
      }

      // レート制限対策
      if (i + batchSize < propertiesWithDistributionDate.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 結果サマリー
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 同期結果サマリー');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   対象物件数: ${propertiesWithDistributionDate.length} 件`);
    console.log(`   ✅ 成功: ${successCount} 件`);
    console.log(`   ❌ 失敗: ${failCount} 件`);
    console.log('');

    // 同期後の確認
    console.log('📋 同期後の確認...\n');

    const { data: after2026, error: afterError } = await supabase
      .from('property_listings')
      .select('property_number, distribution_date')
      .gte('distribution_date', '2026-01-01')
      .order('distribution_date', { ascending: false })
      .limit(20);

    if (afterError) {
      console.error('❌ 確認クエリでエラー:', afterError.message);
    } else {
      console.log(`📊 2026年の配信日を持つ物件（データベース）: ${after2026?.length || 0} 件`);
      if (after2026 && after2026.length > 0) {
        console.log('   例:');
        after2026.slice(0, 10).forEach(p => {
          console.log(`   - ${p.property_number}: ${p.distribution_date}`);
        });
      }
    }

    console.log('\n✅ 同期が完了しました！');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

syncDistributionDates().catch(console.error);
