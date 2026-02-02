/**
 * Excelシリアル値の変換テスト
 */

function convertExcelSerial(serialNumber: number): string {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('🧪 Excelシリアル値の変換テスト\n');

// 46054 = 2026/1/31 または 2026/2/1?
console.log('46054 →', convertExcelSerial(46054));

// 検証: 2026/1/31 のシリアル値を計算
const date20260131 = new Date(2026, 0, 31); // 2026年1月31日
const excelEpoch = new Date(1899, 11, 30);
const serial20260131 = Math.floor((date20260131.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000));
console.log('2026/1/31 のシリアル値:', serial20260131);

// 検証: 2026/2/1 のシリアル値を計算
const date20260201 = new Date(2026, 1, 1); // 2026年2月1日
const serial20260201 = Math.floor((date20260201.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000));
console.log('2026/2/1 のシリアル値:', serial20260201);
