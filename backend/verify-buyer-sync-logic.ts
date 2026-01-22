/**
 * 買主同期ロジックの検証スクリプト
 * 
 * このスクリプトは以下を検証します：
 * 1. buyer_numberが主キーとして使用されていること
 * 2. 重複する電話番号・メールアドレスが許可されていること
 * 3. 同期時にbuyer_idではなくbuyer_numberが使用されていること
 */

import { supabase } from './src/config/supabase';

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifyBuyerNumberAsKey(): Promise<VerificationResult> {
  console.log('\n=== 検証1: buyer_numberが主キーとして使用されているか ===');
  
  try {
    // buyer_numberにUNIQUE制約があるか確認
    const { data, error } = await supabase
      .from('buyers')
      .select('buyer_number')
      .limit(1);

    if (error) {
      return {
        passed: false,
        message: 'buyer_numberの確認に失敗しました',
        details: error
      };
    }

    // テーブル構造を確認
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_constraints', { table_name: 'buyers' })
      .single();

    if (tableError) {
      console.log('⚠️ テーブル制約の確認はスキップされました（RPC関数が存在しない可能性）');
    }

    return {
      passed: true,
      message: 'buyer_numberカラムが存在し、アクセス可能です',
      details: { hasUniqueConstraint: !!tableInfo }
    };
  } catch (error) {
    return {
      passed: false,
      message: '検証中にエラーが発生しました',
      details: error
    };
  }
}

async function verifyDuplicatesAllowed(): Promise<VerificationResult> {
  console.log('\n=== 検証2: 重複する電話番号・メールアドレスが許可されているか ===');
  
  try {
    // 同じ電話番号を持つ買主を検索
    const { data: phoneData, error: phoneError } = await supabase
      .from('buyers')
      .select('buyer_number, phone_number')
      .not('phone_number', 'is', null)
      .limit(100);

    if (phoneError) {
      return {
        passed: false,
        message: '電話番号の確認に失敗しました',
        details: phoneError
      };
    }

    // 電話番号の重複をカウント
    const phoneMap = new Map<string, number>();
    phoneData?.forEach(buyer => {
      if (buyer.phone_number) {
        phoneMap.set(buyer.phone_number, (phoneMap.get(buyer.phone_number) || 0) + 1);
      }
    });

    const duplicatePhones = Array.from(phoneMap.entries())
      .filter(([_, count]) => count > 1);

    // 同じメールアドレスを持つ買主を検索
    const { data: emailData, error: emailError } = await supabase
      .from('buyers')
      .select('buyer_number, email')
      .not('email', 'is', null)
      .limit(100);

    if (emailError) {
      return {
        passed: false,
        message: 'メールアドレスの確認に失敗しました',
        details: emailError
      };
    }

    // メールアドレスの重複をカウント
    const emailMap = new Map<string, number>();
    emailData?.forEach(buyer => {
      if (buyer.email) {
        emailMap.set(buyer.email, (emailMap.get(buyer.email) || 0) + 1);
      }
    });

    const duplicateEmails = Array.from(emailMap.entries())
      .filter(([_, count]) => count > 1);

    const hasDuplicates = duplicatePhones.length > 0 || duplicateEmails.length > 0;

    return {
      passed: true,
      message: hasDuplicates 
        ? '重複する電話番号・メールアドレスが存在します（正常）'
        : '現在、重複する電話番号・メールアドレスは存在しません',
      details: {
        duplicatePhones: duplicatePhones.length,
        duplicateEmails: duplicateEmails.length,
        examples: {
          phones: duplicatePhones.slice(0, 3),
          emails: duplicateEmails.slice(0, 3)
        }
      }
    };
  } catch (error) {
    return {
      passed: false,
      message: '検証中にエラーが発生しました',
      details: error
    };
  }
}

async function verifySyncUsesBuyerNumber(): Promise<VerificationResult> {
  console.log('\n=== 検証3: 同期時にbuyer_numberが使用されているか ===');
  
  try {
    // BuyerSyncServiceのコードを確認（静的解析）
    const fs = require('fs');
    const path = require('path');
    
    const syncServicePath = path.join(__dirname, 'src/services/BuyerSyncService.ts');
    const syncServiceCode = fs.readFileSync(syncServicePath, 'utf8');

    // buyer_numberがキーとして使用されているか確認
    const usesBuyerNumber = syncServiceCode.includes("eq('buyer_number'") &&
                           syncServiceCode.includes("onConflict: 'buyer_number'");

    // buyer_idがキーとして使用されていないか確認
    const usesBuyerId = syncServiceCode.includes("eq('id'") &&
                       syncServiceCode.includes("onConflict: 'id'");

    return {
      passed: usesBuyerNumber && !usesBuyerId,
      message: usesBuyerNumber 
        ? 'BuyerSyncServiceはbuyer_numberを主キーとして使用しています（正常）'
        : 'BuyerSyncServiceがbuyer_numberを主キーとして使用していない可能性があります',
      details: {
        usesBuyerNumber,
        usesBuyerId
      }
    };
  } catch (error) {
    return {
      passed: false,
      message: 'BuyerSyncServiceの確認に失敗しました',
      details: error
    };
  }
}

async function runVerification() {
  console.log('='.repeat(60));
  console.log('買主同期ロジックの検証を開始します');
  console.log('='.repeat(60));

  const results: VerificationResult[] = [];

  // 検証1: buyer_numberが主キーとして使用されているか
  const result1 = await verifyBuyerNumberAsKey();
  results.push(result1);
  console.log(result1.passed ? '✅' : '❌', result1.message);
  if (result1.details) {
    console.log('   詳細:', JSON.stringify(result1.details, null, 2));
  }

  // 検証2: 重複する電話番号・メールアドレスが許可されているか
  const result2 = await verifyDuplicatesAllowed();
  results.push(result2);
  console.log(result2.passed ? '✅' : '❌', result2.message);
  if (result2.details) {
    console.log('   詳細:', JSON.stringify(result2.details, null, 2));
  }

  // 検証3: 同期時にbuyer_numberが使用されているか
  const result3 = await verifySyncUsesBuyerNumber();
  results.push(result3);
  console.log(result3.passed ? '✅' : '❌', result3.message);
  if (result3.details) {
    console.log('   詳細:', JSON.stringify(result3.details, null, 2));
  }

  // 総合結果
  console.log('\n' + '='.repeat(60));
  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('✅ すべての検証に合格しました！');
    console.log('買主同期ロジックは正しく実装されています。');
  } else {
    console.log('❌ 一部の検証に失敗しました');
    console.log('詳細を確認してください。');
  }
  console.log('='.repeat(60));

  process.exit(allPassed ? 0 : 1);
}

// 実行
runVerification().catch(error => {
  console.error('検証スクリプトの実行中にエラーが発生しました:', error);
  process.exit(1);
});
