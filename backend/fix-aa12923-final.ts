import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA12923() {
  console.log('🔧 Fixing AA12923 with correct data...\n');

  const correctData = {
    name: '穴井 千暁',
    address: '大分県大分市豊饒３丁目11-17',
    phone_number: '08015353783',
    email: 'chiaki.19770801@icloud.com',
    site: 'ウ',
    comments: `10/20に除外申請願います。I10/18　仕事が忙しく、メールは見れていない。まだ売却するかもわからない。仕事の都合上、水曜日の夕方くらいでないとお話できないとのこと。K10/16　仕事中なのでメールで折り返すとのこと【以下自動転記（イエウール）】フリガナ: あないちあき年齢: 48歳希望連絡時間: 指定なし同時送信社数: 4コメント: :  予想価格: 2,000万円~ 周辺環境: バス停が徒歩5分以内、コンビニが徒歩5分以内、総合病院が近くにある、小学校が徒歩15分以内、中学校が徒歩15分以内、保育園・幼稚園が徒歩15分以内、公園が徒歩10分以内、警察署・交番が近くにある 住宅ローン残年数: 残り 〜10年 接面状況: 私道のみ 買取査定: 希望しない 「高く売った場合」と「早く売った場合」の査定額: 気になる 過去～将来の値動き: 気になる 査定額から税金を引いた手元に残る金額: 気にならない 建物構造: 木造`,
  };

  // Update seller
  const { error } = await supabase
    .from('sellers')
    .update({
      name: encrypt(correctData.name),
      address: encrypt(correctData.address),
      phone_number: encrypt(correctData.phone_number),
      email: encrypt(correctData.email),
      site: correctData.site,
      comments: correctData.comments,
      updated_at: new Date().toISOString(),
    })
    .eq('seller_number', 'AA12923');

  if (error) {
    console.error('❌ Error updating AA12923:', error);
    return;
  }

  console.log('✅ AA12923 updated successfully!\n');

  // Verify the update
  const { data: seller } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (seller) {
    const { decrypt } = await import('./src/utils/encryption');
    console.log('📊 Verified data:');
    console.log('  売主番号:', seller.seller_number);
    console.log('  名前:', decrypt(seller.name));
    console.log('  住所:', decrypt(seller.address));
    console.log('  電話番号:', decrypt(seller.phone_number));
    console.log('  メール:', decrypt(seller.email));
    console.log('  サイト:', seller.site);
    console.log('  コメント (first 100 chars):', seller.comments?.substring(0, 100) + '...');
    console.log('  コメント length:', seller.comments?.length);
  }
}

fixAA12923().catch(console.error);
