import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import pool from './src/config/database';

interface Property {
  id: string;
  seller_number: string;
  address: string;
  city: string | null;
  google_map_url: string | null;
}

interface PropertyListing {
  id: string;
  property_id: string;
  distribution_areas: string[];
}

async function main() {
  console.log('='.repeat(80));
  console.log('配信エリア再計算スクリプト');
  console.log('='.repeat(80));
  console.log();

  const calculator = new PropertyDistributionAreaCalculator();
  let successCount = 0;
  let failureCount = 0;
  let unchangedCount = 0;
  let updatedCount = 0;
  const errors: Array<{ propertyNumber: string; error: string }> = [];

  try {
    // 1. Get all properties with property listings
    console.log('🔍 物件を検索中...');
    const result = await pool.query<Property & { listing_id: string; current_areas: string[] }>(`
      SELECT 
        p.id,
        p.seller_number,
        p.address,
        p.city,
        p.google_map_url,
        pl.id as listing_id,
        pl.distribution_areas as current_areas
      FROM properties p
      INNER JOIN property_listings pl ON p.id = pl.property_id
      ORDER BY p.seller_number
    `);

    const properties = result.rows;
    console.log(`${properties.length}件の物件が見つかりました`);
    console.log();

    if (properties.length === 0) {
      console.log('処理する物件がありません');
      return;
    }

    // 2. Process each property
    console.log('📍 配信エリアを再計算中...');
    console.log();

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const progress = `[${i + 1}/${properties.length}]`;

      try {
        // Calculate distribution areas
        const result = await calculator.calculateDistributionAreas(
          property.google_map_url,
          property.city
        );

        const newAreas = result.areas;
        const currentAreas = property.current_areas || [];

        // Compare with current areas
        const areasChanged = 
          newAreas.length !== currentAreas.length ||
          !newAreas.every(area => currentAreas.includes(area));

        if (!areasChanged) {
          console.log(`${progress} ${property.seller_number}: 変更なし - ${result.formatted}`);
          unchangedCount++;
        } else {
          // Update distribution areas
          await pool.query(
            'UPDATE property_listings SET distribution_areas = $1 WHERE id = $2',
            [newAreas, property.listing_id]
          );

          const oldFormatted = currentAreas.join(',') || '(なし)';
          console.log(`${progress} ${property.seller_number}: 更新 - ${oldFormatted} → ${result.formatted}`);
          updatedCount++;
        }

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
    console.log('  - 更新:', updatedCount);
    console.log('  - 変更なし:', unchangedCount);
    console.log('失敗:', failureCount);
    console.log();

    // 4. Show errors
    if (errors.length > 0) {
      console.log('--- エラー詳細 ---');
      errors.forEach(err => {
        console.log(`${err.propertyNumber}: ${err.error}`);
      });
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
