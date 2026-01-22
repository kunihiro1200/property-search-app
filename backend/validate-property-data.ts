import { PropertyDataValidator } from './src/services/PropertyDataValidator';
import { DataIntegrityDiagnosticService } from './src/services/DataIntegrityDiagnosticService';
import pool from './src/config/database';

async function main() {
  console.log('='.repeat(80));
  console.log('物件データ検証レポート');
  console.log('='.repeat(80));
  console.log();

  const validator = new PropertyDataValidator(pool);
  const diagnosticService = new DataIntegrityDiagnosticService();

  try {
    // 1. Generate validation summary
    console.log('📊 検証サマリーを生成中...');
    const summary = await validator.generateSummary();
    
    console.log();
    console.log('総物件数:', summary.total);
    console.log('Google Map URL未設定:', summary.missingGoogleMapUrl);
    console.log('市フィールド未設定:', summary.missingCity);
    console.log('物件リスト未作成:', summary.missingPropertyListing);
    console.log('完全なデータ:', summary.completeData);
    console.log();

    // 2. Find properties with issues
    console.log('🔍 問題のある物件を検索中...');
    const issues = await validator.findPropertiesWithIssues();
    
    console.log();
    console.log('--- Google Map URL未設定の物件 ---');
    if (issues.missingGoogleMapUrl.length === 0) {
      console.log('なし');
    } else {
      console.log(`${issues.missingGoogleMapUrl.length}件の物件`);
      issues.missingGoogleMapUrl.slice(0, 10).forEach(prop => {
        console.log(`  ${prop.seller_number}: ${prop.address}`);
      });
      if (issues.missingGoogleMapUrl.length > 10) {
        console.log(`  ... 他${issues.missingGoogleMapUrl.length - 10}件`);
      }
    }
    console.log();

    console.log('--- 市フィールド未設定の物件 ---');
    if (issues.missingCity.length === 0) {
      console.log('なし');
    } else {
      console.log(`${issues.missingCity.length}件の物件`);
      issues.missingCity.slice(0, 10).forEach(prop => {
        console.log(`  ${prop.seller_number}: ${prop.address}`);
      });
      if (issues.missingCity.length > 10) {
        console.log(`  ... 他${issues.missingCity.length - 10}件`);
      }
    }
    console.log();

    console.log('--- 物件リスト未作成の物件 ---');
    if (issues.missingPropertyListing.length === 0) {
      console.log('なし');
    } else {
      console.log(`${issues.missingPropertyListing.length}件の物件`);
      issues.missingPropertyListing.slice(0, 10).forEach(prop => {
        console.log(`  ${prop.seller_number}: ${prop.address}`);
      });
      if (issues.missingPropertyListing.length > 10) {
        console.log(`  ... 他${issues.missingPropertyListing.length - 10}件`);
      }
    }
    console.log();

    // 3. Generate distribution area report
    console.log('📍 配信エリアレポートを生成中...');
    const distributionReport = await diagnosticService.generateDistributionAreaReport();
    
    console.log();
    console.log('--- 配信エリアサマリー ---');
    console.log('総物件数:', distributionReport.summary.totalProperties);
    console.log('Google Map URL設定済み:', distributionReport.summary.propertiesWithGoogleMapUrl);
    console.log('市フィールド設定済み:', distributionReport.summary.propertiesWithCity);
    console.log('完全なデータ:', distributionReport.summary.propertiesWithCompleteData);
    console.log('配信エリア不一致:', distributionReport.summary.propertiesWithIncorrectAreas);
    console.log();

    // 4. Show distribution area issues
    const distributionIssues = distributionReport.issues.filter(
      issue => issue.issueType === 'incorrect_calculation'
    );
    
    if (distributionIssues.length > 0) {
      console.log('--- 配信エリア不一致の物件 ---');
      console.log(`${distributionIssues.length}件の物件`);
      distributionIssues.slice(0, 10).forEach(issue => {
        console.log(`  ${issue.propertyNumber}: ${issue.details}`);
      });
      if (distributionIssues.length > 10) {
        console.log(`  ... 他${distributionIssues.length - 10}件`);
      }
      console.log();
    }

    // 5. Test specific property (AA13129)
    console.log('🧪 特定物件のテスト: AA13129');
    try {
      const diagnostic = await diagnosticService.diagnoseDistributionAreas('AA13129');
      console.log();
      console.log('物件番号:', diagnostic.propertyNumber);
      console.log('住所:', diagnostic.address);
      console.log('Google Map URL:', diagnostic.googleMapUrl ? '設定済み' : '未設定');
      console.log('市:', diagnostic.city || '未設定');
      console.log('現在の配信エリア:', diagnostic.currentDistributionAreas.join(',') || 'なし');
      console.log('計算された配信エリア:', diagnostic.calculatedDistributionAreas.join(',') || 'なし');
      console.log('不一致:', diagnostic.discrepancy ? 'あり' : 'なし');
      
      if (diagnostic.discrepancy) {
        console.log('不足しているエリア:', diagnostic.missingAreas.join(',') || 'なし');
        console.log('余分なエリア:', diagnostic.unexpectedAreas.join(',') || 'なし');
      }
      
      if (diagnostic.distanceDebugInfo) {
        console.log();
        console.log('--- デバッグ情報 ---');
        console.log('物件座標:', diagnostic.distanceDebugInfo.propertyCoords 
          ? `${diagnostic.distanceDebugInfo.propertyCoords.lat}, ${diagnostic.distanceDebugInfo.propertyCoords.lng}`
          : '取得できず');
        console.log('市全体マッチ:', diagnostic.distanceDebugInfo.cityWideMatches.join(', ') || 'なし');
        console.log();
        console.log('距離計算:');
        diagnostic.distanceDebugInfo.distanceCalculations
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10)
          .forEach(calc => {
            const status = calc.withinRadius ? '✓' : '✗';
            console.log(`  ${status} ${calc.areaNumber}: ${calc.distance.toFixed(2)}km`);
          });
      }
    } catch (error) {
      console.error('AA13129の診断に失敗:', error);
    }
    console.log();

    // 6. Recommendations
    console.log('='.repeat(80));
    console.log('📋 推奨アクション');
    console.log('='.repeat(80));
    console.log();
    
    if (issues.missingGoogleMapUrl.length > 0) {
      console.log(`1. ${issues.missingGoogleMapUrl.length}件の物件にGoogle Map URLを設定してください`);
    }
    
    if (issues.missingCity.length > 0) {
      console.log(`2. ${issues.missingCity.length}件の物件に市フィールドを設定してください`);
      console.log('   → batch-extract-cities.tsスクリプトで自動抽出できます');
    }
    
    if (issues.missingPropertyListing.length > 0) {
      console.log(`3. ${issues.missingPropertyListing.length}件の物件リストを作成してください`);
    }
    
    if (distributionIssues.length > 0) {
      console.log(`4. ${distributionIssues.length}件の配信エリアを再計算してください`);
      console.log('   → recalculate-distribution-areas.tsスクリプトで再計算できます');
    }
    
    console.log();
    console.log('検証完了');

  } catch (error) {
    console.error('検証中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
