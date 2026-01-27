import { GyomuListService } from './src/services/GyomuListService';

async function checkCC6InGyomuList() {
  console.log('=== 業務リストのCC6を確認 ===\n');

  const gyomuListService = new GyomuListService();

  try {
    const gyomuData = await gyomuListService.getByPropertyNumber('CC6');
    
    if (!gyomuData) {
      console.log('❌ 業務リストにCC6が見つかりませんでした');
      return;
    }
    
    console.log('✅ 業務リストにCC6が見つかりました\n');
    
    console.log('物件番号:', gyomuData.propertyNumber);
    console.log('');
    console.log('格納先URL:');
    console.log(gyomuData.storageUrl || '(未設定)');
    console.log('');
    
    if (gyomuData.storageUrl) {
      // URLの形式を確認
      if (gyomuData.storageUrl.includes('1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX')) {
        console.log('❌ 間違ったURL（ふじが丘西1丁目フォルダ）が保存されています');
      } else if (gyomuData.storageUrl.includes('16p4voX2h3oqxWRnsaczu_ax85s_Je_NK')) {
        console.log('✅ 正しいURL（athome公開フォルダ）が保存されています');
      } else if (gyomuData.storageUrl.includes('1kXmrhesqayVV-i4zF8DznLK99tcCCauP')) {
        console.log('✅ 親フォルダのURLが保存されています');
        console.log('   → 自動同期時にathome公開フォルダを検索します');
      } else {
        console.log('⚠️ 不明なURLです');
      }
    } else {
      console.log('⚠️ 格納先URLが設定されていません');
    }
    
    console.log('');
    console.log('その他の情報:');
    console.log('- 物件名:', gyomuData.propertyName || '(未設定)');
    console.log('- 住所:', gyomuData.address || '(未設定)');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

checkCC6InGyomuList().catch(console.error);
