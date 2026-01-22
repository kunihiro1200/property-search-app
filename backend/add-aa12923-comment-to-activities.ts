import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addCommentToActivities() {
  console.log('📝 Adding comment to activities for AA12923...\n');

  // Get seller ID
  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA12923')
    .single();

  if (!seller) {
    console.error('❌ AA12923 not found');
    return;
  }

  const comment = `10/20に除外申請願います。I10/18　仕事が忙しく、メールは見れていない。まだ売却するかもわからない。仕事の都合上、水曜日の夕方くらいでないとお話できないとのこと。K10/16　仕事中なのでメールで折り返すとのこと【以下自動転記（イエウール）】フリガナ: あないちあき年齢: 48歳希望連絡時間: 指定なし同時送信社数: 4コメント: :  予想価格: 2,000万円~ 周辺環境: バス停が徒歩5分以内、コンビニが徒歩5分以内、総合病院が近くにある、小学校が徒歩15分以内、中学校が徒歩15分以内、保育園・幼稚園が徒歩15分以内、公園が徒歩10分以内、警察署・交番が近くにある 住宅ローン残年数: 残り 〜10年 接面状況: 私道のみ 買取査定: 希望しない 「高く売った場合」と「早く売った場合」の査定額: 気になる 過去～将来の値動き: 気になる 査定額から税金を引いた手元に残る金額: 気にならない 建物構造: 木造`;

  // Get first employee (system user)
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .limit(1)
    .single();

  if (!employee) {
    console.error('❌ No employee found');
    return;
  }

  // Check if activity already exists
  const { data: existing } = await supabase
    .from('activities')
    .select('id')
    .eq('seller_id', seller.id)
    .eq('type', 'hearing')
    .eq('content', comment)
    .maybeSingle();

  if (existing) {
    console.log('✅ Comment already exists in activities');
    return;
  }

  // Add activity
  const { error } = await supabase
    .from('activities')
    .insert({
      seller_id: seller.id,
      employee_id: employee.id,
      type: 'hearing',
      content: comment,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('❌ Error adding activity:', error);
    return;
  }

  console.log('✅ Comment added to activities successfully!\n');

  // Verify
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  console.log(`📊 Total activities for AA12923: ${activities?.length || 0}`);
  if (activities && activities.length > 0) {
    console.log('\n最新のアクティビティ:');
    activities.slice(0, 3).forEach((act, i) => {
      console.log(`  ${i + 1}. ${act.type} - ${act.content?.substring(0, 50)}...`);
    });
  }
}

addCommentToActivities().catch(console.error);
