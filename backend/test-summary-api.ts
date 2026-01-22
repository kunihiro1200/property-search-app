/**
 * 通話履歴サマリーAPI テストスクリプト
 * 
 * このスクリプトは、実装された通話履歴サマリー機能をテストします。
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

// テストデータ
const testData = {
  // テストケース1: 簡単なメモ配列（後方互換性）
  simpleMemosTest: {
    memos: [
      '3/2 12:00 訪問査定の日程調整を行った',
      '2/28 15:30 物件情報のヒアリング完了',
      '2/25 10:00 初回コンタクト、興味あり'
    ]
  },

  // テストケース2: 実際のデータ例1
  realDataTest1: {
    memos: [
      '10/1 売るのはもう少し様子を見たいとのこと',
      '9/7 今年中に売りたい　県外にいるので大分に来てから実際にいふうとあってから募集するようにしたいとのこと。土地を売ったとしても、買い主様には来年の4月以降に建物を建ててほしい。理由は相続で親戚の方がそこを売りたくないという思いが強いので、自分が今その近くに住んでいて、引っ越したら家を建てても文句を言われないからとのこと（少しあやしい）',
      '9/5 面積はだいたい　更地にしている。駐車場として月極で貸している。売却のご予定あり。土地への思いがあるので変な使い方はされたくない。当社が売買に強く、問合せが多いと伝えるとかなり興味津々でどんな方か？等くいついてきた。訪問査定はまだ考えるとのこと',
      '★★希望価格：/希望時期：/名義人：/P台数：/接道：/リフォーム：/太陽光：/購入時期：/ローン残：',
      '★希望連絡時間：9時～12時'
    ]
  },

  // テストケース3: 実際のデータ例2
  realDataTest2: {
    memos: [
      '10/19 いったんでるが切られる',
      '10/12 自分本人ではない　嫁のお母様が所有　1年後くらいにうる予定。　買いたいという人がいたら紹介してもよい。媒介契約に伺う日程は嫁のお母様と話し合うので来週また電話してほしいとのこと',
      '面積100坪　建物はこわす　土地として売却　机上査定メール希望　まだ売るかどうか不明な状態'
    ]
  },

  // テストケース4: 実際のデータ例3
  realDataTest3: {
    memos: [
      '2025/1/31 久光大分で買って専任媒介結んでしまった。3190万で募集中とのこと',
      '2024/11/29 13:09 状況変化なし。',
      '2024/10/4 17:21 訪問査定は他社含めまだ考えていない。引越も急いでいない、時期未定とのこと。ちなみに引越を検討した理由は？と聞くとまぁ、いろいろあるんですが…と言いよどむ。少し時間を置いてまた状況確認の連絡を入れるとお伝え済み。',
      '2024/9/30 17:49 金額的にもう少しといったところ。ほかの会社は3000万こえるとのこと。買取で2000万出してもいいと言っている会社もある。赤ちゃんが泣きだしたので電話切られる。',
      '2024/9/28 18:04 太陽光の売電期間は11月に終わる。ハウスメーカーは大和ハウス、次のお住まいは子供が小学校に通っていて、松岡小あたりで検討中',
      '2024/09/28 10:29 質問メール回答あり'
    ]
  }
};

async function testSummaryAPI() {
  console.log('🧪 通話履歴サマリーAPI テスト開始\n');

  // 認証トークンを取得（環境変数から、または手動で設定）
  const token = process.env.TEST_AUTH_TOKEN;
  
  if (!token) {
    console.log('⚠️  認証トークンが設定されていません');
    console.log('\n📋 トークンを取得する方法:');
    console.log('\n【方法1】ブラウザでテスト（推奨）');
    console.log('  1. http://localhost:5173 でログイン');
    console.log('  2. ブラウザのコンソール（F12）を開く');
    console.log('  3. BROWSER_TEST_GUIDE.md の手順に従ってテストを実行');
    console.log('\n【方法2】コマンドラインでテスト');
    console.log('  1. ブラウザで http://localhost:5173 にログイン');
    console.log('  2. ブラウザのコンソールで以下を実行:');
    console.log('     localStorage.getItem("session_token")');
    console.log('  3. 取得したトークンを使用:');
    console.log('     set TEST_AUTH_TOKEN=<your-token>');
    console.log('     npx ts-node test-summary-api.ts');
    console.log('\n詳細は BROWSER_TEST_GUIDE.md を参照してください。\n');
    return;
  }

  // テストケース1: 簡単なメモ配列
  console.log('📝 テストケース1: 簡単なメモ配列（後方互換性）');
  await runTest('simple-memos', testData.simpleMemosTest, token);

  // テストケース2: 実際のデータ例1
  console.log('\n📝 テストケース2: 実際のデータ例1（土地売却、相続）');
  await runTest('real-data-1', testData.realDataTest1, token);

  // テストケース3: 実際のデータ例2
  console.log('\n📝 テストケース3: 実際のデータ例2（建物解体、1年後売却）');
  await runTest('real-data-2', testData.realDataTest2, token);

  // テストケース4: 実際のデータ例3
  console.log('\n📝 テストケース4: 実際のデータ例3（他社専任媒介）');
  await runTest('real-data-3', testData.realDataTest3, token);

  console.log('\n✅ テスト完了\n');
  console.log('次のステップ:');
  console.log('1. 生成されたサマリーの品質を確認');
  console.log('2. 必要に応じてキーワードリストを調整');
  console.log('3. MANUAL_TESTING_GUIDE.md の品質チェックリストを確認');
}

async function runTest(testName: string, data: any, token: string) {
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/summarize/call-memos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const processingTime = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.json();
      console.log(`❌ テスト失敗: ${testName}`);
      console.log(`   ステータス: ${response.status}`);
      console.log(`   エラー: ${JSON.stringify(error, null, 2)}`);
      return;
    }

    const result = await response.json();
    
    console.log(`✅ テスト成功: ${testName}`);
    console.log(`   処理時間: ${processingTime}ms`);
    
    if (result.metadata) {
      console.log(`   通話回数: ${result.metadata.totalCalls}回`);
      console.log(`   セクション数: ${result.metadata.sectionsGenerated.length}`);
    }
    
    console.log('\n生成されたサマリー:');
    console.log('─────────────────────────────────────');
    console.log(result.summary);
    console.log('─────────────────────────────────────');
    
    if (result.metadata) {
      console.log('\nメタデータ:');
      console.log(`  - 通話回数（履歴）: ${result.metadata.callsFromHistory}回`);
      console.log(`  - 通話回数（コメント）: ${result.metadata.callsFromComments}回`);
      console.log(`  - 生成されたセクション: ${result.metadata.sectionsGenerated.join(', ')}`);
      if (result.metadata.oldestEntry) {
        console.log(`  - 最古のエントリー: ${result.metadata.oldestEntry}`);
      }
      if (result.metadata.newestEntry) {
        console.log(`  - 最新のエントリー: ${result.metadata.newestEntry}`);
      }
    }
  } catch (error) {
    console.log(`❌ テスト失敗: ${testName}`);
    console.log(`   エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// スクリプト実行
testSummaryAPI().catch(console.error);
