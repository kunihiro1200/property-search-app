import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProgress() {
  const { count: sellersCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  const { count: propertiesCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  const coverage = Math.round((propertiesCount || 0) / (sellersCount || 1) * 100);

  console.log('=== 物件情報同期の進捗 ===');
  console.log(`全売主数: ${sellersCount}`);
  console.log(`物件情報数: ${propertiesCount}`);
  console.log(`カバー率: ${coverage}%`);
  console.log(`残り: ${(sellersCount || 0) - (propertiesCount || 0)}件`);

  process.exit(0);
}

checkProgress();
