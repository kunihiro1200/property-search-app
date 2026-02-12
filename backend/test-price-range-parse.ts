function parsePriceRange(priceRange: string): { min: number; max: number } {
  let min = 0;
  let max = Number.MAX_SAFE_INTEGER;

  console.log('入力:', priceRange);

  const cleanedRange = priceRange
    .replace(/,/g, '')
    .replace(/円/g, '')
    .replace(/万/g, '0000')
    .replace(/億/g, '00000000')
    .trim();

  console.log('クリーニング後:', cleanedRange);

  // 範囲パターン（〜、-、～、~）
  const rangeMatch = cleanedRange.match(/(\d+)?\s*[〜～\-~]\s*(\d+)?/);
  if (rangeMatch) {
    console.log('範囲パターンマッチ:', rangeMatch);
    if (rangeMatch[1]) {
      min = parseInt(rangeMatch[1], 10);
    }
    if (rangeMatch[2]) {
      max = parseInt(rangeMatch[2], 10);
    }
    console.log('結果:', { min, max });
    return { min, max };
  }

  // 以上/以下パターン
  const aboveMatch = cleanedRange.match(/(\d+)\s*以上/);
  if (aboveMatch) {
    console.log('以上パターンマッチ:', aboveMatch);
    min = parseInt(aboveMatch[1], 10);
    console.log('結果:', { min, max });
    return { min, max };
  }

  const belowMatch = cleanedRange.match(/(\d+)\s*以下/);
  if (belowMatch) {
    console.log('以下パターンマッチ:', belowMatch);
    max = parseInt(belowMatch[1], 10);
    console.log('結果:', { min, max });
    return { min, max };
  }

  // 単一値パターン
  const singleMatch = cleanedRange.match(/^(\d+)$/);
  if (singleMatch) {
    console.log('単一値パターンマッチ:', singleMatch);
    const value = parseInt(singleMatch[1], 10);
    min = value * 0.8;
    max = value * 1.2;
    console.log('結果:', { min, max });
    return { min, max };
  }

  console.log('パターンマッチなし - デフォルト値:', { min, max });
  return { min, max };
}

console.log('=== 価格帯パーステスト ===\n');

console.log('テスト1: 1000万円~2999万円');
const result1 = parsePriceRange('1000万円~2999万円');
console.log('最終結果:', result1.min.toLocaleString(), '円 ～', result1.max.toLocaleString(), '円');
console.log('');

console.log('テスト2: 2000万円以上');
const result2 = parsePriceRange('2000万円以上');
console.log('最終結果:', result2.min.toLocaleString(), '円 ～', result2.max.toLocaleString(), '円');
console.log('');

console.log('テスト3: 3000万円以下');
const result3 = parsePriceRange('3000万円以下');
console.log('最終結果:', result3.min.toLocaleString(), '円 ～', result3.max.toLocaleString(), '円');
console.log('');

console.log('テスト4: 物件価格2790万円が範囲内か確認');
const propertyPrice = 27900000;
console.log('物件価格:', propertyPrice.toLocaleString(), '円');
console.log('');

console.log('範囲1（1000万円~2999万円）に含まれるか:');
console.log('  ', propertyPrice >= result1.min && propertyPrice <= result1.max ? '✅ 範囲内' : '❌ 範囲外');
console.log('');

console.log('範囲2（2000万円以上）に含まれるか:');
console.log('  ', propertyPrice >= result2.min && propertyPrice <= result2.max ? '✅ 範囲内' : '❌ 範囲外');
