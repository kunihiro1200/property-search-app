import { CityNameExtractor } from './src/services/CityNameExtractor';

const extractor = new CityNameExtractor();

console.log('=== CityNameExtractor テスト ===\n');

// テストケース
const testCases = [
  '大分県大分市田尻北3-14',
  '大分市中央町1-2-3',
  '別府市北浜2-10-1',
  '中津市豊田町14-38',
  '東京都渋谷区恵比寿1-2-3',
  '福岡県福岡市博多区博多駅前1-1-1',
  '',
  null,
  '無効な住所',
];

testCases.forEach((address) => {
  const city = extractor.extractCityFromAddress(address);
  console.log(`住所: "${address}"`);
  console.log(`抽出された市: ${city || '(抽出失敗)'}\n`);
});

// 正規化テスト
console.log('=== 正規化テスト ===\n');
const normalizeCases = ['大分市  ', '  別府市', '大分　市', '中津市'];

normalizeCases.forEach((city) => {
  const normalized = extractor.normalizeCityName(city);
  console.log(`元: "${city}" → 正規化: "${normalized}"\n`);
});

// バッチ抽出テスト
console.log('=== バッチ抽出テスト ===\n');
const batchData = [
  { id: 'AA13129', address: '大分県大分市田尻北3-14' },
  { id: 'AA13130', address: '別府市北浜2-10-1' },
  { id: 'AA13131', address: null },
];

const results = extractor.batchExtractCities(batchData);
results.forEach((result) => {
  console.log(`ID: ${result.id}`);
  console.log(`住所: ${result.address || '(なし)'}`);
  console.log(`市: ${result.city || '(抽出失敗)'}\n`);
});

console.log('テスト完了');
