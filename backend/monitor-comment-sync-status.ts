/**
 * コメントデータ同期状況の監視スクリプト
 * 
 * 目的: property_detailsテーブルでコメントデータがnullの物件を検出
 * 実行: npx ts-node backend/monitor-comment-sync-status.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MonitorResult {
  totalProperties: number;
  propertiesWithNullComments: number;
  nullCommentProperties: string[];
  syncSuccessRate: number;
  needsAttention: boolean;
}

async function monitorCommentSyncStatus(): Promise<MonitorResult> {
  console.log('🔍 Monitoring comment sync status...\n');

  // 1. 全物件数を取得
  const { data: allProperties, error: allError } = await supabase
    .from('property_details')
    .select('property_number');

  if (allError) {
    console.error('❌ Error fetching all properties:', allError.message);
    throw allError;
  }

  const totalProperties = allProperties?.length || 0;
  console.log(`📊 Total properties in property_details: ${totalProperties}`);

  // 2. コメントデータがnullの物件を取得
  const { data: nullCommentProperties, error: nullError } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comments, property_about')
    .or('favorite_comment.is.null,recommended_comments.is.null');

  if (nullError) {
    console.error('❌ Error fetching null comment properties:', nullError.message);
    throw nullError;
  }

  const propertiesWithNullComments = nullCommentProperties?.length || 0;
  const nullPropertyNumbers = nullCommentProperties?.map(p => p.property_number) || [];

  console.log(`\n⚠️  Properties with null comments: ${propertiesWithNullComments}`);
  
  if (propertiesWithNullComments > 0) {
    console.log('\n📋 List of properties with null comments:');
    nullCommentProperties?.forEach((property, index) => {
      console.log(`  ${index + 1}. ${property.property_number}`);
      console.log(`     - favorite_comment: ${property.favorite_comment ? '✅' : '❌ null'}`);
      console.log(`     - recommended_comments: ${property.recommended_comments ? '✅' : '❌ null'}`);
      console.log(`     - property_about: ${property.property_about ? '✅' : '❌ null'}`);
    });
  }

  // 3. 同期成功率を計算
  const syncSuccessRate = totalProperties > 0 
    ? ((totalProperties - propertiesWithNullComments) / totalProperties) * 100 
    : 100;

  console.log(`\n📈 Sync success rate: ${syncSuccessRate.toFixed(2)}%`);

  // 4. アラート判定
  const needsAttention = propertiesWithNullComments >= 10 || syncSuccessRate < 90;

  if (needsAttention) {
    console.log('\n🚨 ALERT: Attention required!');
    if (propertiesWithNullComments >= 10) {
      console.log('   - More than 10 properties have null comments');
    }
    if (syncSuccessRate < 90) {
      console.log('   - Sync success rate is below 90%');
    }
    console.log('\n💡 Recommended actions:');
    console.log('   1. Check EnhancedAutoSyncService logs');
    console.log('   2. Verify spreadsheet access permissions');
    console.log('   3. Run manual sync for affected properties');
  } else {
    console.log('\n✅ All systems normal');
  }

  return {
    totalProperties,
    propertiesWithNullComments,
    nullCommentProperties: nullPropertyNumbers,
    syncSuccessRate,
    needsAttention,
  };
}

// 実行
monitorCommentSyncStatus()
  .then((result) => {
    console.log('\n✅ Monitoring completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Monitoring failed:', error.message);
    process.exit(1);
  });
