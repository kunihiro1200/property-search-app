// 買主6951のbroker_surveyフィールドを確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrokerSurvey() {
  console.log('買主6951のbroker_surveyフィールドを確認中...\n');

  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('buyer_number, name, broker_survey')
    .eq('buyer_number', '6951')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!buyer) {
    console.log('買主6951が見つかりません');
    return;
  }

  console.log('買主番号:', buyer.buyer_number);
  console.log('氏名:', buyer.name);
  console.log('broker_survey:', buyer.broker_survey);
  console.log('broker_surveyの型:', typeof buyer.broker_survey);
  console.log('broker_surveyの値（JSON）:', JSON.stringify(buyer.broker_survey));
  
  if (buyer.broker_survey === null) {
    console.log('\n❌ broker_surveyはnullです');
  } else if (buyer.broker_survey === undefined) {
    console.log('\n❌ broker_surveyはundefinedです');
  } else if (buyer.broker_survey === '') {
    console.log('\n❌ broker_surveyは空文字列です');
  } else {
    console.log('\n✅ broker_surveyに値があります:', buyer.broker_survey);
  }
}

checkBrokerSurvey()
  .then(() => {
    console.log('\n確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
