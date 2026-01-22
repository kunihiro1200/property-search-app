/**
 * 最終データ整合性チェックスクリプト（全データ対応）
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getAllData(table: string, select: string): Promise<any[]> {
  const pageSize = 1000;
  let page = 0;
  let allData: any[] = [];
  
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error(`${table}取得エラー:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    page++;
  }
  
  return allData;
}

async function runFinalCheck() {
  console.log('=== 最終データ整合性チェック ===\n');
  console.log(`実行日時: ${new Date().toISOString()}\n`);

  // 1. 基本カウント
  console.log('📊 基本データカウント取得中...');
  
  const sellers = await getAllData('sellers', 'id, seller_number, status, inquiry_date');
  const properties = await getAllData('properties', 'id, seller_id, address, property_type');
  const valuations = await getAllData('valuations', 'id, seller_id');
  
  console.log(`  売主数: ${sellers.length}`);
  console.log(`  物件数: ${properties.length}`);
  console.log(`  査定数: ${valuations.length}`);

  // 2. 売主-物件の整合性
  console.log('\n🔍 売主-物件の整合性チェック...');
  
  const sellerIds = new Set(sellers.map(s => s.id));
  const propertySellerIds = new Set(properties.map(p => p.seller_id));
  
  // 物件なし売主
  const sellersWithoutProperty = sellers.filter(s => !propertySellerIds.has(s.id));
  console.log(`  物件なし売主: ${sellersWithoutProperty.length}件`);
  
  if (sellersWithoutProperty.length > 0 && sellersWithoutProperty.length <= 10) {
    sellersWithoutProperty.forEach(s => {
      console.log(`    - ${s.seller_number}`);
    });
  }

  // 孤立物件
  const orphanedProperties = properties.filter(p => !sellerIds.has(p.seller_id));
  console.log(`  孤立物件: ${orphanedProperties.length}件`);

  // 重複物件
  const propertyCountBySeller = new Map<string, number>();
  properties.forEach(p => {
    propertyCountBySeller.set(p.seller_id, (propertyCountBySeller.get(p.seller_id) || 0) + 1);
  });
  
  const sellersWithMultipleProps = Array.from(propertyCountBySeller.entries())
    .filter(([_, count]) => count > 1);
  console.log(`  複数物件を持つ売主: ${sellersWithMultipleProps.length}件`);

  // 3. ステータス分布
  console.log('\n📊 ステータス分布:');
  const statusCounts = new Map<string, number>();
  sellers.forEach(s => {
    const status = s.status || '未設定';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });
  
  Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count}件`);
    });

  // 4. 問い合わせ日チェック
  console.log('\n📊 問い合わせ日チェック:');
  const sellersWithoutInquiryDate = sellers.filter(s => !s.inquiry_date);
  console.log(`  問い合わせ日なし: ${sellersWithoutInquiryDate.length}件`);

  // 5. サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📋 サマリー');
  console.log('='.repeat(50));
  
  const issues: string[] = [];
  
  if (sellersWithoutProperty.length > 0) {
    issues.push(`🔴 物件なし売主: ${sellersWithoutProperty.length}件`);
  }
  if (orphanedProperties.length > 0) {
    issues.push(`🔴 孤立物件: ${orphanedProperties.length}件`);
  }
  if (sellersWithMultipleProps.length > 0) {
    issues.push(`🟡 複数物件売主: ${sellersWithMultipleProps.length}件（重複の可能性）`);
  }
  if (sellersWithoutInquiryDate.length > 0) {
    issues.push(`🔵 問い合わせ日なし: ${sellersWithoutInquiryDate.length}件`);
  }
  
  if (issues.length === 0) {
    console.log('✅ 重大な問題は検出されませんでした');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  console.log('\n総売主数:', sellers.length);
  console.log('総物件数:', properties.length);
  console.log('物件を持つ売主数:', propertySellerIds.size);
}

runFinalCheck().catch(console.error);
