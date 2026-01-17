import dotenv from 'dotenv';
import { SellerService } from './src/services/SellerService.supabase';
import { EmailService } from './src/services/EmailService.supabase';

dotenv.config();

async function diagnoseValuationEmail() {
  try {
    console.log('🔍 査定メール送信機能の診断を開始します...\n');

    // 1. 環境変数の確認
    console.log('📋 Step 1: Gmail API環境変数の確認');
    console.log('  GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? '✓ 設定済み' : '✗ 未設定');
    console.log('  GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? '✓ 設定済み' : '✗ 未設定');
    console.log('  GMAIL_REDIRECT_URI:', process.env.GMAIL_REDIRECT_URI ? '✓ 設定済み' : '✗ 未設定');
    console.log('  GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? '✓ 設定済み' : '✗ 未設定');
    console.log('');

    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || 
        !process.env.GMAIL_REDIRECT_URI || !process.env.GMAIL_REFRESH_TOKEN) {
      console.log('❌ Gmail API認証情報が不足しています');
      console.log('   .envファイルに以下の環境変数を設定してください：');
      console.log('   - GMAIL_CLIENT_ID');
      console.log('   - GMAIL_CLIENT_SECRET');
      console.log('   - GMAIL_REDIRECT_URI');
      console.log('   - GMAIL_REFRESH_TOKEN');
      return;
    }

    // 2. 最近の査定メール送信ログを確認
    console.log('📋 Step 2: 最近の査定メール送信ログを確認');
    const sellerService = new SellerService();
    const { supabase } = sellerService as any;

    const { data: recentEmails, error: emailError } = await supabase
      .from('activities')
      .select('*')
      .eq('type', 'email')
      .ilike('content', '%査定%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (emailError) {
      console.log('❌ メール送信ログの取得に失敗:', emailError.message);
    } else {
      console.log(`✅ 最近の査定メール送信ログ: ${recentEmails.length}件`);
      if (recentEmails.length > 0) {
        console.log('\n最新の5件:');
        recentEmails.slice(0, 5).forEach((email: any, index: number) => {
          console.log(`  ${index + 1}. ${email.created_at}`);
          console.log(`     内容: ${email.content}`);
          console.log(`     結果: ${email.result}`);
          console.log(`     メタデータ:`, email.metadata);
          console.log('');
        });
      } else {
        console.log('⚠️ 査定メール送信ログが見つかりません');
      }
    }
    console.log('');

    // 3. テスト用の売主を検索（査定額が設定されている売主）
    console.log('📋 Step 3: テスト用の売主を検索（査定額が設定されている売主）');
    const { data: testSellers, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number, name, email, valuation_amount_1, valuation_amount_2, valuation_amount_3')
      .not('valuation_amount_1', 'is', null)
      .not('valuation_amount_2', 'is', null)
      .not('valuation_amount_3', 'is', null)
      .not('email', 'is', null)
      .limit(5);

    if (sellerError) {
      console.log('❌ 売主の取得に失敗:', sellerError.message);
    } else {
      console.log(`✅ 査定額が設定されている売主: ${testSellers.length}件`);
      if (testSellers.length > 0) {
        console.log('\nテスト可能な売主:');
        testSellers.forEach((seller: any, index: number) => {
          console.log(`  ${index + 1}. ${seller.seller_number} - ${seller.name}`);
          console.log(`     メール: ${seller.email}`);
          console.log(`     査定額1: ${seller.valuation_amount_1}`);
          console.log(`     査定額2: ${seller.valuation_amount_2}`);
          console.log(`     査定額3: ${seller.valuation_amount_3}`);
          console.log('');
        });
      } else {
        console.log('⚠️ 査定額が設定されている売主が見つかりません');
      }
    }
    console.log('');

    // 4. EmailServiceの初期化テスト
    console.log('📋 Step 4: EmailServiceの初期化テスト');
    try {
      const emailService = new EmailService();
      console.log('✅ EmailServiceの初期化に成功しました');
    } catch (error: any) {
      console.log('❌ EmailServiceの初期化に失敗:', error.message);
    }
    console.log('');

    // 5. 最近のエラーログを確認
    console.log('📋 Step 5: 最近のエラーログを確認（activitiesテーブル）');
    const { data: errorLogs, error: errorLogError } = await supabase
      .from('activities')
      .select('*')
      .eq('type', 'email')
      .ilike('result', '%失敗%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (errorLogError) {
      console.log('❌ エラーログの取得に失敗:', errorLogError.message);
    } else {
      console.log(`✅ 最近のメール送信エラー: ${errorLogs.length}件`);
      if (errorLogs.length > 0) {
        console.log('\n最新のエラー:');
        errorLogs.slice(0, 5).forEach((log: any, index: number) => {
          console.log(`  ${index + 1}. ${log.created_at}`);
          console.log(`     内容: ${log.content}`);
          console.log(`     結果: ${log.result}`);
          console.log(`     メタデータ:`, log.metadata);
          console.log('');
        });
      } else {
        console.log('✅ メール送信エラーは見つかりませんでした');
      }
    }
    console.log('');

    console.log('✅ 診断完了');
    console.log('');
    console.log('📝 次のステップ:');
    console.log('  1. Gmail API認証情報が正しく設定されているか確認');
    console.log('  2. リフレッシュトークンが期限切れでないか確認');
    console.log('  3. 実際に査定メール送信ボタンを押して、エラーメッセージを確認');
    console.log('  4. ブラウザの開発者ツール（Network タブ）でAPIレスポンスを確認');

  } catch (error: any) {
    console.error('❌ 診断中にエラーが発生しました:', error.message);
    console.error(error);
  }
}

diagnoseValuationEmail();
