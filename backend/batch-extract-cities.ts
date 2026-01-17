import { CityNameExtractor } from './src/services/CityNameExtractor';
import pool from './src/config/database';

interface Property {
  id: string;
  seller_number: string;
  address: string;
  city: string | null;
}

async function main() {
  console.log('='.repeat(80));
  console.log('市名一括抽出スクリプト');
  console.log('='.repeat(80));
  console.log();

  const extractor = new CityNameExtractor();
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const errors: Array<{ propertyNumber: string; error: string }> = [];

  try {
    // 1. Find all properties with missing city
    console.log('🔍 市フィールドが未設定の物件を検索中...');
    const result = await pool.query<Property>(`
      SELECT id, seller_number, address, city
      FROM properties
      WHERE city IS NULL OR city = ''
      ORDER BY seller_number
    `);

    const properties = result.rows;
    console.log(`${properties.length}件の物件が見つかりました`);
    console.log();

    if (properties.length === 0) {
      console.log('処理する物件がありません');
      return;
    }

    // 2. Process each property
    console.log('📝 市名を抽出中...');
    console.log();

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const progress = `[${i + 1}/${properties.length}]`;

      try {
        // Skip if no address
        if (!property.address || property.address.trim() === '') {
          console.log(`${progress} ${property.seller_number}: スキップ (住所なし)`);
          skippedCount++;
          continue;
        }

        // Extract city from address
        const extraction = extractor.extractCityFromAddress(property.address);

        if (!extraction.city) {
          console.log(`${progress} ${property.seller_number}: 抽出失敗 - ${property.address}`);
          failureCount++;
          errors.push({
            propertyNumber: property.seller_number,
            error: '市名を抽出できませんでした'
          });
          continue;
        }

        // Update city field
        await pool.query(
          'UPDATE properties SET city = $1 WHERE id = $2',
          [extraction.city, property.id]
        );

        console.log(`${progress} ${property.seller_number}: ${extraction.city} (信頼度: ${extraction.confidence})`);
        successCount++;

      } catch (error) {
        console.error(`${progress} ${property.seller_number}: エラー -`, error);
        failureCount++;
        errors.push({
          propertyNumber: property.seller_number,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 3. Summary
    console.log();
    console.log('='.repeat(80));
    console.log('処理結果');
    console.log('='.repeat(80));
    console.log();
    console.log('総物件数:', properties.length);
    console.log('成功:', successCount);
    console.log('失敗:', failureCount);
    console.log('スキップ:', skippedCount);
    console.log();

    // 4. Show errors
    if (errors.length > 0) {
      console.log('--- エラー詳細 ---');
      errors.forEach(err => {
        console.log(`${err.propertyNumber}: ${err.error}`);
      });
      console.log();
    }

    // 5. Recommendations
    if (failureCount > 0) {
      console.log('📋 推奨アクション');
      console.log('失敗した物件については、手動で市フィールドを設定してください');
      console.log();
    }

    console.log('処理完了');

  } catch (error) {
    console.error('処理中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
