import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function listAllColumns() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]).sort();
    console.log('全カラム一覧:');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}`);
    });
  }
}

listAllColumns();
