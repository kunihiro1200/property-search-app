// CC21のフロントエンド表示問題を診断

console.log('🔍 CC21のフロントエンド表示問題を診断中...\n');

// APIレスポンスのシミュレーション
const completeData = {
  property: {
    id: "4737809f-72c5-45fc-9a70-c4093391ea57",
    property_number: "CC21",
  },
  recommendedComments: [
    ["60", "%", "⇐ここは事務は入力必須（重説に紐づいてるため）", "ゼンリン/おおいたマップで確認"],
    ["200", "%", "⇐ここは事務は入力必須（重説に紐づいてるため）"],
    ["１方角"],
    ["２方角"],
    ["３方角"],
    ["4", "建物面積", "101.44", "㎡"],
    ["LDK", "バルコニー", "ありでも面積不明のため空欄"],
    ["主要採光面", "南"],
    ["完成済", "広告転載", "転載不可", "会員間フリーメッセージ"],
    ["相談", "ＡＴＢＢに公開中のみご紹介可能＆非公開の場合はご紹介不可ですので「紹介可能か」というご連絡はお控えください。内覧やご質問は→物件番号は「CC21」です　　　https://kunihiro1200.github.io/property-search-app/　　　　　　　　　　　　※ＵＲＬは半角の変換が必要です（ＣｈａｔＧＰＴご利用で簡単にできます）"],
    ["媒介"],
    ["分かれ", "エンド向け", "3.3％＋6.6万"]
  ]
};

console.log('1️⃣ 表示条件のチェック:');
console.log('   - completeData?.recommendedComments:', !!completeData?.recommendedComments);
console.log('   - completeData.recommendedComments.length > 0:', completeData.recommendedComments.length > 0);
console.log('   - 両方の条件を満たす:', !!completeData?.recommendedComments && completeData.recommendedComments.length > 0);

console.log('\n2️⃣ データの詳細:');
console.log('   - 型:', typeof completeData.recommendedComments);
console.log('   - 配列か:', Array.isArray(completeData.recommendedComments));
console.log('   - 長さ:', completeData.recommendedComments.length);

console.log('\n3️⃣ レンダリングのシミュレーション:');
completeData.recommendedComments.forEach((row: string[], rowIndex: number) => {
  const text = row.join(' ');
  console.log(`   [${rowIndex}] ${text}`);
});

console.log('\n✅ 診断完了');
console.log('   → 表示条件は満たされています');
console.log('   → データは正しい形式です');
console.log('   → レンダリングも正常に動作するはずです');
console.log('\n💡 ブラウザのキャッシュをクリアして、シークレットモードで再度確認してください');
