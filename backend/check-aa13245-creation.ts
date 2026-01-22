/**
 * AA13245の作成日時を確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function check() {
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, seller_number, created_at, updated_at')
    .eq('seller_number', 'AA13245')
    .single();
  
  console.log('AA13245:');
  console.log('  created_at:', seller?.created_at);
  console.log('  updated_at:', seller?.updated_at);
  
  // 最新の売主を確認
  const { data: latest } = await supabase
    .from('sellers')
    .select('seller_number, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n最新10件の売主:');
  latest?.forEach(s => console.log('  ' + s.seller_number + ': ' + s.created_at));
}

check().catch(console.error);
