import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuyersWithContactInfo() {
  console.log('=== 連絡先情報を持つ買主の確認 ===\n');

  // 電話番号を持つ買主
  const { data: withPhone, error: phoneError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name, phone_number, email, property_number')
    .not('phone_number', 'is', null)
    .neq('phone_number', '')
    .limit(10);

  if (phoneError) {
    console.log('❌ 電話番号を持つ買主の取得エラー:', phoneError.message);
  } else {
    console.log(`✅ 電話番号を持つ買主: ${withPhone?.length || 0}件`);
    if (withPhone && withPhone.length > 0) {
      console.log('\nサンプル:');
      withPhone.slice(0, 3).forEach(b => {
        console.log(`  - ${b.name} (${b.buyer_number})`);
        console.log(`    電話: ${b.phone_number}`);
        console.log(`    メール: ${b.email || 'なし'}`);
        console.log(`    物件: ${b.property_number || 'なし'}`);
      });
    }
  }

  // メールアドレスを持つ買主
  const { data: withEmail, error: emailError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name, phone_number, email, property_number')
    .not('email', 'is', null)
    .neq('email', '')
    .limit(10);

  if (emailError) {
    console.log('\n❌ メールアドレスを持つ買主の取得エラー:', emailError.message);
  } else {
    console.log(`\n✅ メールアドレスを持つ買主: ${withEmail?.length || 0}件`);
    if (withEmail && withEmail.length > 0) {
      console.log('\nサンプル:');
      withEmail.slice(0, 3).forEach(b => {
        console.log(`  - ${b.name} (${b.buyer_number})`);
        console.log(`    電話: ${b.phone_number || 'なし'}`);
        console.log(`    メール: ${b.email}`);
        console.log(`    物件: ${b.property_number || 'なし'}`);
      });
    }
  }

  // 同じ電話番号を持つ買主のペアを探す
  console.log('\n=== 重複する電話番号の確認 ===\n');
  
  if (withPhone && withPhone.length > 0) {
    const phoneMap = new Map<string, any[]>();
    
    // 全ての買主を取得して電話番号でグループ化
    const { data: allBuyers } = await supabase
      .from('buyers')
      .select('id, buyer_number, name, phone_number, email, property_number')
      .not('phone_number', 'is', null)
      .neq('phone_number', '');
    
    if (allBuyers) {
      allBuyers.forEach(buyer => {
        if (buyer.phone_number) {
          if (!phoneMap.has(buyer.phone_number)) {
            phoneMap.set(buyer.phone_number, []);
          }
          phoneMap.get(buyer.phone_number)!.push(buyer);
        }
      });
      
      // 重複を探す
      const duplicates = Array.from(phoneMap.entries())
        .filter(([_, buyers]) => buyers.length > 1);
      
      if (duplicates.length > 0) {
        console.log(`✅ 重複する電話番号: ${duplicates.length}件\n`);
        duplicates.slice(0, 3).forEach(([phone, buyers]) => {
          console.log(`電話番号: ${phone} (${buyers.length}件)`);
          buyers.forEach(b => {
            console.log(`  - ${b.name} (${b.buyer_number}) - 物件: ${b.property_number || 'なし'}`);
          });
          console.log('');
        });
      } else {
        console.log('⚠️  重複する電話番号が見つかりませんでした');
      }
    }
  }

  // 同じメールアドレスを持つ買主のペアを探す
  console.log('\n=== 重複するメールアドレスの確認 ===\n');
  
  if (withEmail && withEmail.length > 0) {
    const emailMap = new Map<string, any[]>();
    
    // 全ての買主を取得してメールアドレスでグループ化
    const { data: allBuyers } = await supabase
      .from('buyers')
      .select('id, buyer_number, name, phone_number, email, property_number')
      .not('email', 'is', null)
      .neq('email', '');
    
    if (allBuyers) {
      allBuyers.forEach(buyer => {
        if (buyer.email) {
          if (!emailMap.has(buyer.email)) {
            emailMap.set(buyer.email, []);
          }
          emailMap.get(buyer.email)!.push(buyer);
        }
      });
      
      // 重複を探す
      const duplicates = Array.from(emailMap.entries())
        .filter(([_, buyers]) => buyers.length > 1);
      
      if (duplicates.length > 0) {
        console.log(`✅ 重複するメールアドレス: ${duplicates.length}件\n`);
        duplicates.slice(0, 3).forEach(([email, buyers]) => {
          console.log(`メールアドレス: ${email} (${buyers.length}件)`);
          buyers.forEach(b => {
            console.log(`  - ${b.name} (${b.buyer_number}) - 物件: ${b.property_number || 'なし'}`);
          });
          console.log('');
        });
      } else {
        console.log('⚠️  重複するメールアドレスが見つかりませんでした');
      }
    }
  }

  console.log('\n=== 診断完了 ===');
  console.log('\n結論:');
  console.log('- 連絡先情報（電話番号・メールアドレス）を持つ買主がいない場合、関連買主機能は表示されません');
  console.log('- 重複する連絡先情報がない場合も、関連買主機能は表示されません');
  console.log('- これは正常な動作です');
}

checkBuyersWithContactInfo().catch(console.error);
