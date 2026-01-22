import * as fs from 'fs';
import * as path from 'path';

/**
 * 提供された別府市エリアマッピングデータを解析し、
 * データベース投入用のJSON形式に変換するスクリプト
 */

// 提供されたデータ（エリア番号ごとに地域名をリスト化）
const rawData = {
  '⑨': [
    '南立石一区', '南立石二区', '南立石生目町', '南立石板地町', '南立石本町', '南立石八幡町',
    '堀田', '南荘園町', '観海寺', '鶴見園町', '扇山',
    '荘園（白菊寮を除く）',
    '鶴見（以下を除く：7組・9組・ルミエールの丘）'
  ],
  '⑩': [
    '荘園北町', '緑丘町',
    '東荘園4丁目', '東荘園5丁目', '東荘園6丁目', '東荘園7丁目', '東荘園8丁目', '東荘園9丁目',
    '鶴見（7組・9組・ルミエールの丘）',
    '荘園（白菊寮のみ）',
    '上野口町', '天満町',
    '東荘園1丁目', '東荘園２丁目', '東荘園3丁目',
    '石垣東１丁目', '石垣東２丁目', '石垣東3丁目',
    '石垣西1丁目', '石垣西２丁目', '石垣西3丁目',
    '駅前町', '駅前本町',
    '北浜1丁目', '北浜２丁目', '北浜3丁目',
    '北的ヶ浜町', '京町', '幸町', '新港町',
    '野口中町', '野口元町', '富士見町',
    '南的ヶ浜町', '餅ヶ浜町', '元町', '弓ヶ浜町', '若草町'
  ],
  '⑪': [
    '亀川四の湯町１区', '亀川中央町', '亀川東町', '亀川浜田町',
    '古市町', '関の江新町', 'スパランド豊海',
    '野田', '内竈',
    '国立第1', '国立第2', '大所', '小坂',
    '亀川四の湯町２区',
    '平田町', '照波園町', '上平田町', '大観山町',
    '上人ケ浜町', '上人本町', '上人仲町', '上人西'
  ],
  '⑫': [
    '明礬', '新別府', '馬場', '火売', '北中', '御幸', '風呂本',
    '井田', '鉄輪上', '北鉄輪', '鉄輪', '鉄輪東',
    '天間', '湯山', '竹の内', '大畑', '小倉',
    '朝日ケ丘町'
  ],
  '⑬': [
    '東山一区', '東山二区', '城島', '山の口', '枝郷'
  ],
  '⑭': [
    '南須賀',
    '石垣東4丁目', '石垣東5丁目', '石垣東6丁目', '石垣東7丁目',
    '石垣西4丁目', '石垣西5丁目', '石垣西6丁目', '石垣西7丁目', '石垣西8丁目', '石垣西9丁目', '石垣西10丁目',
    '春木', '上人南', '桜ケ丘',
    '中須賀元町', '中須賀本町', '中須賀東町', '船小路町', '汐見町',
    '石垣東8丁目', '石垣東9丁目', '石垣東10丁目',
    '実相寺'
  ],
  '⑮': [
    '光町', '中島町', '原町',
    '朝見1丁目', '朝見２丁目', '朝見3丁目',
    '乙原', '中央町', '田の湯町', '上田の湯町',
    '青山町', '上原町', '山の手町', '西野口町',
    '立田町', '南町', '松原町', '浜町', '千代町', '末広町', '秋葉町', '楠町',
    '浜脇1丁目', '浜脇２丁目', '浜脇3丁目',
    '浦田', '田の口', '河内', '山家', '両郡橋', '赤松', '柳', '鳥越', '古賀原', '内成'
  ],
  '㊷': [
    '中央町', '駅前本町', '上田の湯町', '野口中町', '西野口町', '駅前町'
  ],
  '㊸': [
    '南立石二区', '南立石八幡町', '南荘園町', '観海寺', '鶴見園町',
    '荘園（白菊寮を除く）',
    '荘園北町', '緑丘町',
    '東荘園4丁目', '東荘園5丁目', '東荘園6丁目', '東荘園7丁目', '東荘園8丁目', '東荘園9丁目',
    '鶴見（7組・9組・ルミエールの丘）',
    '荘園（白菊寮のみ）',
    '上野口町', '天満町',
    '東荘園1丁目', '東荘園２丁目', '東荘園3丁目',
    '石垣東１丁目', '石垣東２丁目', '石垣東3丁目',
    '石垣西1丁目', '石垣西２丁目', '石垣西3丁目',
    '駅前町', '駅前本町',
    '北浜1丁目', '北浜２丁目', '北浜3丁目',
    '北的ヶ浜町', '京町', '幸町', '新港町',
    '野口中町', '野口元町', '富士見町',
    '南的ヶ浜町', '餅ヶ浜町', '元町', '弓ヶ浜町', '若草町',
    '亀川四の湯町１区', '亀川中央町', '亀川東町', '亀川浜田町',
    '古市町', '関の江新町', 'スパランド豊海',
    '内竈',
    '国立第1', '国立第2', '大所', '小坂',
    '亀川四の湯町２区',
    '平田町', '照波園町', '上平田町', '大観山町',
    '上人ケ浜町', '上人本町', '上人仲町', '上人西',
    '新別府', '北中', '馬場',
    '南須賀',
    '石垣東4丁目', '石垣東5丁目', '石垣東6丁目', '石垣東7丁目',
    '石垣西4丁目', '石垣西5丁目', '石垣西6丁目', '石垣西7丁目', '石垣西8丁目', '石垣西9丁目', '石垣西10丁目',
    '春木', '上人南', '桜ケ丘',
    '中須賀元町', '中須賀本町', '中須賀東町', '船小路町', '汐見町',
    '石垣東8丁目', '石垣東9丁目', '石垣東10丁目',
    '実相寺',
    '光町', '中島町', '原町',
    '朝見1丁目', '朝見２丁目', '朝見3丁目',
    '乙原', '中央町', '田の湯町', '上田の湯町',
    '青山町', '上原町', '山の手町', '西野口町',
    '立田町', '南町', '松原町', '浜町', '千代町', '末広町', '秋葉町', '楠町',
    '浜脇1丁目', '浜脇２丁目', '浜脇3丁目',
    '浦田', '田の口', '河内', '山家', '両郡橋', '赤松', '柳', '鳥越', '古賀原', '内成'
  ]
};

// 学校区のマッピング
const schoolDistrictMapping: Record<string, string> = {
  '⑨': '青山中学校',
  '⑩': '中部中学校',
  '⑪': '北部中学校',
  '⑫': '朝日中学校',
  '⑬': '東山中学校',
  '⑭': '鶴見台中学校',
  '⑮': '別府西中学校',
  '㊷': '別府駅周辺',
  '㊸': '鉄輪線より下'
};

interface AreaMapping {
  school_district: string;
  region_name: string;
  distribution_areas: string;
  notes?: string;
}

/**
 * 地域名を正規化（表記揺れを統一）
 */
function normalizeRegionName(name: string): string {
  // 特殊な条件付き地域は簡略化
  if (name.includes('荘園（白菊寮を除く）')) {
    return '荘園';
  }
  if (name.includes('荘園（白菊寮のみ）')) {
    return '荘園';
  }
  if (name.includes('鶴見（以下を除く：')) {
    return '鶴見';
  }
  if (name.includes('鶴見（7組・9組・ルミエールの丘）')) {
    return '鶴見';
  }
  
  // 全角数字を半角に統一
  name = name.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  
  // 丁目の表記を統一（数字のみ抽出）
  name = name.replace(/(\d+)丁目/, '$1丁目');
  
  return name;
}

/**
 * データを解析してマッピングレコードを生成
 */
function parseData(): AreaMapping[] {
  const mappings: AreaMapping[] = [];
  const regionToAreas = new Map<string, Set<string>>();
  
  // 各エリアの地域名を収集
  for (const [areaNumber, regions] of Object.entries(rawData)) {
    for (const region of regions) {
      const normalized = normalizeRegionName(region);
      
      if (!regionToAreas.has(normalized)) {
        regionToAreas.set(normalized, new Set());
      }
      regionToAreas.get(normalized)!.add(areaNumber);
    }
  }
  
  // マッピングレコードを生成
  for (const [regionName, areaNumbers] of regionToAreas.entries()) {
    const sortedAreas = Array.from(areaNumbers).sort();
    const distributionAreas = sortedAreas.join('');
    
    // 主要なエリア番号（最初のもの）から学校区を決定
    const primaryArea = sortedAreas[0];
    const schoolDistrict = schoolDistrictMapping[primaryArea] || '不明';
    
    mappings.push({
      school_district: schoolDistrict,
      region_name: regionName,
      distribution_areas: distributionAreas,
      notes: sortedAreas.length > 1 ? `複数エリア: ${sortedAreas.join(', ')}` : undefined
    });
  }
  
  return mappings.sort((a, b) => {
    // 学校区でソート、次に地域名でソート
    if (a.school_district !== b.school_district) {
      return a.school_district.localeCompare(b.school_district, 'ja');
    }
    return a.region_name.localeCompare(b.region_name, 'ja');
  });
}

/**
 * 統計情報を表示
 */
function printStatistics(mappings: AreaMapping[]) {
  console.log('\n=== データ統計 ===\n');
  
  const bySchoolDistrict = new Map<string, number>();
  const byAreaCount = new Map<number, number>();
  
  for (const mapping of mappings) {
    // 学校区ごとのカウント
    const count = bySchoolDistrict.get(mapping.school_district) || 0;
    bySchoolDistrict.set(mapping.school_district, count + 1);
    
    // エリア数ごとのカウント
    const areaCount = mapping.distribution_areas.length;
    const areaCountStat = byAreaCount.get(areaCount) || 0;
    byAreaCount.set(areaCount, areaCountStat + 1);
  }
  
  console.log('学校区別の地域数:');
  for (const [district, count] of Array.from(bySchoolDistrict.entries()).sort()) {
    console.log(`  ${district}: ${count}地域`);
  }
  
  console.log('\n所属エリア数別の地域数:');
  for (const [areaCount, regionCount] of Array.from(byAreaCount.entries()).sort()) {
    console.log(`  ${areaCount}エリア: ${regionCount}地域`);
  }
  
  console.log(`\n合計: ${mappings.length}地域`);
}

/**
 * メイン処理
 */
function main() {
  console.log('=== 別府市エリアマッピングデータ解析 ===');
  
  const mappings = parseData();
  
  printStatistics(mappings);
  
  // JSONファイルに出力
  const outputPath = path.join(__dirname, 'beppu-area-mappings.json');
  fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2), 'utf-8');
  
  console.log(`\n✅ データを ${outputPath} に出力しました`);
  
  // サンプルを表示
  console.log('\n=== サンプルデータ（最初の10件） ===\n');
  mappings.slice(0, 10).forEach((mapping, index) => {
    console.log(`${index + 1}. ${mapping.region_name}`);
    console.log(`   学校区: ${mapping.school_district}`);
    console.log(`   配信エリア: ${mapping.distribution_areas}`);
    if (mapping.notes) {
      console.log(`   備考: ${mapping.notes}`);
    }
    console.log('');
  });
}

main();
