/**
 * 包括的なデータ整合性チェックスクリプト
 * 売主、物件、査定などの関連データの整合性を確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface IntegrityReport {
  timestamp: string;
  summary: {
    totalSellers: number;
    totalProperties: number;
    totalValuations: number;
    sellersWithoutProperty: number;
    sellersWithMultipleProperties: number;
    orphanedProperties: number;
    orphanedValuations: number;
  };
  issues: {
    category: string;
    severity: 'critical' | 'warning' | 'info';
    count: number;
    details: any[];
  }[];
}

async function runComprehensiveCheck(): Promise<IntegrityReport> {
  console.log('=== 包括的データ整合性チェック ===\n');
  console.log(`実行日時: ${new Date().toISOString()}\n`);

  const report: IntegrityReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSellers: 0,
      totalProperties: 0,
      totalValuations: 0,
      sellersWithoutProperty: 0,
      sellersWithMultipleProperties: 0,
      orphanedProperties: 0,
      orphanedValuations: 0,
    },
    issues: [],
  };

  // 1. 基本カウント取得
  console.log('📊 基本データカウント取得中...');
  
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, status, inquiry_date');
  
  if (sellersError) {
    console.error('売主取得エラー:', sellersError.message);
    return report;
  }
  report.summary.totalSellers = sellers?.length || 0;
  console.log(`  売主数: ${report.summary.totalSellers}`);

  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('id, seller_id, address, property_type');
  
  if (propsError) {
    console.error('物件取得エラー:', propsError.message);
    return report;
  }
  report.summary.totalProperties = properties?.length || 0;
  console.log(`  物件数: ${report.summary.totalProperties}`);

  const { data: valuations } = await supabase
    .from('valuations')
    .select('id, seller_id');
  
  report.summary.totalValuations = valuations?.length || 0;
  console.log(`  査定数: ${report.summary.totalValuations}`);

  // 2. 売主-物件の整合性チェック
  console.log('\n🔍 売主-物件の整合性チェック...');
  
  const sellerIds = new Set(sellers?.map(s => s.id) || []);
  const propertySellerIds = new Set(properties?.map(p => p.seller_id) || []);
  
  // 物件が存在しない売主
  const sellersWithoutProperty = sellers?.filter(s => !propertySellerIds.has(s.id)) || [];
  report.summary.sellersWithoutProperty = sellersWithoutProperty.length;
  
  if (sellersWithoutProperty.length > 0) {
    report.issues.push({
      category: '物件なし売主',
      severity: 'critical',
      count: sellersWithoutProperty.length,
      details: sellersWithoutProperty.slice(0, 20).map(s => ({
        seller_number: s.seller_number,
        id: s.id,
        name: s.name ? '***' : null,
      })),
    });
    console.log(`  ❌ 物件なし売主: ${sellersWithoutProperty.length}件`);
  } else {
    console.log(`  ✅ 全売主に物件が紐付いています`);
  }

  // 複数物件を持つ売主（重複の可能性）
  const propertyCountBySeller = new Map<string, number>();
  properties?.forEach(p => {
    const count = propertyCountBySeller.get(p.seller_id) || 0;
    propertyCountBySeller.set(p.seller_id, count + 1);
  });
  
  const sellersWithMultipleProps = Array.from(propertyCountBySeller.entries())
    .filter(([_, count]) => count > 1);
  report.summary.sellersWithMultipleProperties = sellersWithMultipleProps.length;
  
  if (sellersWithMultipleProps.length > 0) {
    const details = sellersWithMultipleProps.map(([sellerId, count]) => {
      const seller = sellers?.find(s => s.id === sellerId);
      return {
        seller_number: seller?.seller_number,
        property_count: count,
      };
    });
    report.issues.push({
      category: '複数物件売主',
      severity: 'warning',
      count: sellersWithMultipleProps.length,
      details: details.slice(0, 20),
    });
    console.log(`  ⚠️ 複数物件を持つ売主: ${sellersWithMultipleProps.length}件`);
  } else {
    console.log(`  ✅ 重複物件なし`);
  }

  // 孤立した物件（売主が存在しない）
  const orphanedProperties = properties?.filter(p => !sellerIds.has(p.seller_id)) || [];
  report.summary.orphanedProperties = orphanedProperties.length;
  
  if (orphanedProperties.length > 0) {
    report.issues.push({
      category: '孤立物件',
      severity: 'critical',
      count: orphanedProperties.length,
      details: orphanedProperties.slice(0, 20).map(p => ({
        property_id: p.id,
        seller_id: p.seller_id,
      })),
    });
    console.log(`  ❌ 孤立物件: ${orphanedProperties.length}件`);
  } else {
    console.log(`  ✅ 孤立物件なし`);
  }

  // 3. 査定データの整合性チェック
  console.log('\n🔍 査定データの整合性チェック...');
  
  const orphanedValuations = valuations?.filter(v => !sellerIds.has(v.seller_id)) || [];
  report.summary.orphanedValuations = orphanedValuations.length;
  
  if (orphanedValuations.length > 0) {
    report.issues.push({
      category: '孤立査定',
      severity: 'warning',
      count: orphanedValuations.length,
      details: orphanedValuations.slice(0, 10),
    });
    console.log(`  ⚠️ 孤立査定: ${orphanedValuations.length}件`);
  } else {
    console.log(`  ✅ 孤立査定なし`);
  }

  // 4. 必須フィールドチェック
  console.log('\n🔍 必須フィールドチェック...');
  
  // seller_numberが空の売主
  const sellersWithoutNumber = sellers?.filter(s => !s.seller_number) || [];
  if (sellersWithoutNumber.length > 0) {
    report.issues.push({
      category: '売主番号なし',
      severity: 'critical',
      count: sellersWithoutNumber.length,
      details: sellersWithoutNumber.slice(0, 10).map(s => ({ id: s.id })),
    });
    console.log(`  ❌ 売主番号なし: ${sellersWithoutNumber.length}件`);
  } else {
    console.log(`  ✅ 全売主に売主番号あり`);
  }

  // 住所が「未入力」または空の物件
  const propertiesWithoutAddress = properties?.filter(
    p => !p.address || p.address === '未入力'
  ) || [];
  if (propertiesWithoutAddress.length > 0) {
    report.issues.push({
      category: '住所未入力物件',
      severity: 'info',
      count: propertiesWithoutAddress.length,
      details: [],
    });
    console.log(`  ℹ️ 住所未入力物件: ${propertiesWithoutAddress.length}件`);
  }

  // 5. ステータスチェック
  console.log('\n🔍 ステータス分布チェック...');
  
  const statusCounts = new Map<string, number>();
  sellers?.forEach(s => {
    const status = s.status || '未設定';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });
  
  console.log('  ステータス分布:');
  statusCounts.forEach((count, status) => {
    console.log(`    ${status}: ${count}件`);
  });

  // 6. 問い合わせ日チェック
  console.log('\n🔍 問い合わせ日チェック...');
  
  const sellersWithoutInquiryDate = sellers?.filter(s => !s.inquiry_date) || [];
  if (sellersWithoutInquiryDate.length > 0) {
    report.issues.push({
      category: '問い合わせ日なし',
      severity: 'info',
      count: sellersWithoutInquiryDate.length,
      details: [],
    });
    console.log(`  ℹ️ 問い合わせ日なし: ${sellersWithoutInquiryDate.length}件`);
  } else {
    console.log(`  ✅ 全売主に問い合わせ日あり`);
  }

  // レポートサマリー出力
  console.log('\n' + '='.repeat(50));
  console.log('📋 整合性チェックサマリー');
  console.log('='.repeat(50));
  console.log(`総売主数: ${report.summary.totalSellers}`);
  console.log(`総物件数: ${report.summary.totalProperties}`);
  console.log(`総査定数: ${report.summary.totalValuations}`);
  console.log('');
  
  const criticalIssues = report.issues.filter(i => i.severity === 'critical');
  const warningIssues = report.issues.filter(i => i.severity === 'warning');
  const infoIssues = report.issues.filter(i => i.severity === 'info');
  
  if (criticalIssues.length > 0) {
    console.log('🔴 重大な問題:');
    criticalIssues.forEach(i => console.log(`   - ${i.category}: ${i.count}件`));
  }
  
  if (warningIssues.length > 0) {
    console.log('🟡 警告:');
    warningIssues.forEach(i => console.log(`   - ${i.category}: ${i.count}件`));
  }
  
  if (infoIssues.length > 0) {
    console.log('🔵 情報:');
    infoIssues.forEach(i => console.log(`   - ${i.category}: ${i.count}件`));
  }
  
  if (report.issues.length === 0) {
    console.log('✅ 問題は検出されませんでした');
  }

  return report;
}

runComprehensiveCheck()
  .then(report => {
    console.log('\n\n📄 詳細レポート (JSON):');
    console.log(JSON.stringify(report, null, 2));
  })
  .catch(console.error);
