import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function auditBeppuAreaMappings() {
  console.log('=== 別府市エリアマッピング監査 ===\n');

  // 1. 全てのマッピングを取得
  const { data: allMappings, error } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .order('school_district', { ascending: true })
    .order('region_name', { ascending: true });

  if (error) {
    console.error('マッピング取得エラー:', error);
    return;
  }

  console.log(`総マッピング数: ${allMappings.length}\n`);

  // 2. 学校区ごとに分類
  const bySchool: Record<string, any[]> = {};
  allMappings.forEach(mapping => {
    if (!bySchool[mapping.school_district]) {
      bySchool[mapping.school_district] = [];
    }
    bySchool[mapping.school_district].push(mapping);
  });

  // 3. 各学校区で㊶が含まれていない地域を確認
  console.log('=== ㊶（別府市全体）が欠けている可能性のある地域 ===\n');

  const issuesFound: Array<{
    school: string;
    region: string;
    current: string;
    suggested: string;
  }> = [];

  Object.entries(bySchool).forEach(([school, mappings]) => {
    console.log(`【${school}】`);
    
    mappings.forEach(mapping => {
      const areas = mapping.distribution_areas;
      const has36 = areas.includes('㊶');
      const hasOtherArea = /[⑨⑩⑪⑫⑬⑭⑮⑯]/.test(areas);
      
      // 学校区エリア（⑨-⑯）があるが㊶がない場合
      if (hasOtherArea && !has36) {
        console.log(`  ⚠️  ${mapping.region_name}: ${areas} → ${areas}㊶ を推奨`);
        issuesFound.push({
          school: school,
          region: mapping.region_name,
          current: areas,
          suggested: areas + '㊶'
        });
      }
    });
    
    console.log('');
  });

  // 4. サマリー
  console.log('=== 監査サマリー ===');
  console.log(`㊶が欠けている地域数: ${issuesFound.length}`);
  console.log('');

  if (issuesFound.length > 0) {
    console.log('修正が必要な地域:');
    issuesFound.forEach(issue => {
      console.log(`  ${issue.school} - ${issue.region}: ${issue.current} → ${issue.suggested}`);
    });
  } else {
    console.log('✓ 全ての地域に㊶が正しく設定されています');
  }

  return issuesFound;
}

auditBeppuAreaMappings().catch(console.error);
