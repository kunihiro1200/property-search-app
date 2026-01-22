import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 別府市エリアマッピングデータ
const beppuAreaData = [
  // 青山中学校区 (⑨)
  { school_district: '青山中学校', region_name: '南立石一区', distribution_areas: '⑨㊷', other_region: '別府駅周辺' },
  { school_district: '青山中学校', region_name: '南立石二区', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '南立石八幡町', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '南荘園町', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '観海寺', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '鶴見園町', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '荘園', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '上野口町', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '天満町', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '南立石生目町', distribution_areas: '⑨㊸', other_region: '鉄輪線より下' },
  { school_district: '青山中学校', region_name: '板地町', distribution_areas: '⑨㊷', other_region: '別府駅周辺' },
  { school_district: '青山中学校', region_name: '本町', distribution_areas: '⑨㊷', other_region: '別府駅周辺' },
  { school_district: '青山中学校', region_name: '八幡町', distribution_areas: '⑨㊷', other_region: '別府駅周辺' },
  
  // 中部中学校区 (⑩)
  { school_district: '中部中学校', region_name: '荘園北町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '緑丘町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園1丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園2丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園3丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園4丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園5丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園6丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園7丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園8丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '東荘園9丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東1丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東2丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東3丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東4丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東5丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東6丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東7丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東8丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東9丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東10丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西1丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西2丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西3丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西4丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西5丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西6丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西7丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西8丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西9丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西10丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  
  // 北部中学校区 (⑪)
  { school_district: '北部中学校', region_name: '北中', distribution_areas: '㊶㊸', other_region: '鉄輪線より下' },
  { school_district: '北部中学校', region_name: '亀川四の湯町１区', distribution_areas: '⑪㊸', other_region: '鉄輪線より下' },
  { school_district: '北部中学校', region_name: '亀川四の湯町２区', distribution_areas: '⑪㊸', other_region: '鉄輪線より下' },
  { school_district: '北部中学校', region_name: '亀川中央町', distribution_areas: '⑪㊸', other_region: '鉄輪線より下' },
  { school_district: '北部中学校', region_name: '亀川東町', distribution_areas: '⑪㊸', other_region: '鉄輪線より下' },
  
  // 朝日中学校区 (⑫)
  { school_district: '朝日中学校', region_name: '朝見1丁目', distribution_areas: '⑫㊷', other_region: '別府駅周辺' },
  { school_district: '朝日中学校', region_name: '朝見2丁目', distribution_areas: '⑫㊷', other_region: '別府駅周辺' },
  { school_district: '朝日中学校', region_name: '朝見3丁目', distribution_areas: '⑫㊷', other_region: '別府駅周辺' },
  { school_district: '朝日中学校', region_name: '上人本町', distribution_areas: '⑫㊷', other_region: '別府駅周辺' },
  { school_district: '朝日中学校', region_name: '上人ヶ浜町', distribution_areas: '⑫㊷', other_region: '別府駅周辺' },
  { school_district: '朝日中学校', region_name: '北中', distribution_areas: '⑫㊸', other_region: '鉄輪線より下' },
  
  // 東山中学校区 (⑬)
  { school_district: '東山中学校', region_name: '鶴見', distribution_areas: '⑬㊸', other_region: '鉄輪線より下' },
  { school_district: '東山中学校', region_name: '鶴見台', distribution_areas: '⑬㊸', other_region: '鉄輪線より下' },
  { school_district: '東山中学校', region_name: '別府', distribution_areas: '⑬㊸', other_region: '鉄輪線より下' },
  
  // 鶴見台中学校区 (⑭)
  { school_district: '鶴見台中学校', region_name: '鶴見台東町', distribution_areas: '⑭㊸', other_region: '鉄輪線より下' },
  { school_district: '鶴見台中学校', region_name: '鶴見台西町', distribution_areas: '⑭㊸', other_region: '鉄輪線より下' },
  
  // 別府西中学校区 (⑮)
  { school_district: '別府西中学校', region_name: '観海寺', distribution_areas: '⑮', other_region: null },
  { school_district: '別府西中学校', region_name: '堀田', distribution_areas: '⑮', other_region: null },
  
  // 別府駅周辺エリア (㊷)
  { school_district: '別府駅周辺', region_name: '中央町', distribution_areas: '㊷', other_region: '別府駅周辺' },
  { school_district: '別府駅周辺', region_name: '駅前町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '駅前本町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '北浜1丁目', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '北浜2丁目', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '北浜3丁目', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '北的ヶ浜町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '京町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '幸町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '新港町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '野口中町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '野口元町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '富士見町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '南的ヶ浜町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '餅ヶ浜町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '元町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '弓ヶ浜町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府駅周辺', region_name: '若草町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 亀川エリア (㊸)
  { school_district: '亀川エリア', region_name: '亀川浜田町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '古市町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '関の江新町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: 'スパランド豊海', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '内竈', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '国立第1', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '国立第2', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '大所', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '小坂', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '平田町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '照波園町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '上平田町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '亀川エリア', region_name: '大観山町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 朝日・上人エリア (㊸)
  { school_district: '朝日・上人エリア', region_name: '上人ケ浜町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '朝日・上人エリア', region_name: '上人仲町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '朝日・上人エリア', region_name: '上人西', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 別府中央エリア (㊸)
  { school_district: '別府中央エリア', region_name: '新別府', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府中央エリア', region_name: '北中', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '別府中央エリア', region_name: '馬場', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 南須賀エリア (㊸)
  { school_district: '南須賀エリア', region_name: '南須賀', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '南須賀エリア', region_name: '上人南', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '南須賀エリア', region_name: '桜ケ丘', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 中須賀エリア (㊸)
  { school_district: '中須賀エリア', region_name: '中須賀元町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '中須賀エリア', region_name: '中須賀本町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '中須賀エリア', region_name: '中須賀東町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '中須賀エリア', region_name: '船小路町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '中須賀エリア', region_name: '汐見町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 実相寺・光町エリア (㊸)
  { school_district: '実相寺・光町エリア', region_name: '実相寺', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '実相寺・光町エリア', region_name: '光町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '実相寺・光町エリア', region_name: '中島町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '実相寺・光町エリア', region_name: '原町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 乙原エリア (㊸)
  { school_district: '乙原エリア', region_name: '乙原', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '中央町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '田の湯町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '上田の湯町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '青山町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '上原町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '山の手町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '西野口町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '立田町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '南町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '乙原エリア', region_name: '松原町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 浜脇エリア (㊸)
  { school_district: '浜脇エリア', region_name: '浜町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '浜脇エリア', region_name: '千代町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '浜脇エリア', region_name: '末広町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '浜脇エリア', region_name: '秋葉町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '浜脇エリア', region_name: '楠町', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '浜脇エリア', region_name: '浜脇1丁目', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '浜脇エリア', region_name: '浜脇2丁目', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '浜脇エリア', region_name: '浜脇3丁目', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  
  // 山間部エリア (㊸)
  { school_district: '山間部エリア', region_name: '浦田', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '田の口', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '河内', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '山家', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '両郡橋', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '赤松', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '柳', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '鳥越', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '古賀原', distribution_areas: '㊸', other_region: '鉄輪線より下' },
  { school_district: '山間部エリア', region_name: '内成', distribution_areas: '㊸', other_region: '鉄輪線より下' },
];

async function createTableIfNotExists() {
  console.log('Checking if beppu_area_mapping table exists...');
  
  // Try to query the table
  const { error } = await supabase
    .from('beppu_area_mapping')
    .select('id')
    .limit(1);
  
  if (error) {
    console.log('Table does not exist or is not accessible.');
    console.log('Please create the table manually using the SQL in migrations/048_add_beppu_area_mapping.sql');
    console.log('You can run it in the Supabase SQL Editor.');
    return false;
  }
  
  console.log('✓ Table exists');
  return true;
}

async function clearExistingData() {
  console.log('Clearing existing data...');
  
  const { error } = await supabase
    .from('beppu_area_mapping')
    .delete()
    .neq('id', 0); // Delete all rows
  
  if (error) {
    console.error('Error clearing data:', error.message);
    return false;
  }
  
  console.log('✓ Existing data cleared');
  return true;
}

async function insertData() {
  console.log(`Inserting ${beppuAreaData.length} records...`);
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < beppuAreaData.length; i += batchSize) {
    const batch = beppuAreaData.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('beppu_area_mapping')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      return false;
    }
    
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${beppuAreaData.length} records`);
  }
  
  console.log('✓ All data inserted successfully');
  return true;
}

async function verifyData() {
  console.log('Verifying inserted data...');
  
  // Count by school district
  const { data: countData, error: countError } = await supabase
    .from('beppu_area_mapping')
    .select('school_district');
  
  if (countError) {
    console.error('Error counting data:', countError.message);
    return false;
  }
  
  const counts: Record<string, number> = {};
  countData?.forEach((row: any) => {
    counts[row.school_district] = (counts[row.school_district] || 0) + 1;
  });
  
  console.log('\nData summary by school district:');
  Object.entries(counts).forEach(([district, count]) => {
    console.log(`  ${district}: ${count} regions`);
  });
  
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`\nTotal: ${total} regions`);
  
  console.log('✓ Data verification complete');
  return true;
}

async function main() {
  console.log('=== Beppu Area Mapping Data Population ===\n');
  
  // Step 1: Check if table exists
  const tableExists = await createTableIfNotExists();
  if (!tableExists) {
    console.error('\n❌ Cannot proceed without the table. Please create it first.');
    process.exit(1);
  }
  
  // Step 2: Clear existing data
  const cleared = await clearExistingData();
  if (!cleared) {
    console.error('\n❌ Failed to clear existing data');
    process.exit(1);
  }
  
  // Step 3: Insert new data
  const inserted = await insertData();
  if (!inserted) {
    console.error('\n❌ Failed to insert data');
    process.exit(1);
  }
  
  // Step 4: Verify data
  const verified = await verifyData();
  if (!verified) {
    console.error('\n❌ Failed to verify data');
    process.exit(1);
  }
  
  console.log('\n✅ Beppu area mapping data population completed successfully!');
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
