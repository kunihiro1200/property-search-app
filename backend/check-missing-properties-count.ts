/**
 * 物件情報がない売主の数を確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function check() {
  const { data: sellers } = await supabase.from('sellers').select('id');
  const { data: properties } = await supabase.from('properties').select('seller_id');
  
  const sellersWithProperty = new Set(properties?.map(p => p.seller_id) || []);
  const sellersWithoutProperty = sellers?.filter(s => !sellersWithProperty.has(s.id)) || [];
  
  console.log('全売主数:', sellers?.length || 0);
  console.log('物件情報がある売主:', sellersWithProperty.size);
  console.log('物件情報がない売主:', sellersWithoutProperty.length);
}

check().catch(console.error);
