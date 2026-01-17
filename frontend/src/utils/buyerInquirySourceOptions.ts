export interface InquirySourceOption {
  value: string;
  label: string;
  category: string;
}

export const INQUIRY_SOURCE_CATEGORIES = [
  '電話系',
  'メール系',
  '配信系',
  '来店',
  '売主',
  'Pinrich系',
  'その他',
] as const;

export type InquirySourceCategory = typeof INQUIRY_SOURCE_CATEGORIES[number];

export const INQUIRY_SOURCE_OPTIONS: InquirySourceOption[] = [
  // 電話系
  { value: '電話(at home)', label: '電話(at home)', category: '電話系' },
  { value: '電話(スーモ)', label: '電話(スーモ)', category: '電話系' },
  { value: '電話(HOME\'S/goo)', label: '電話(HOME\'S/goo)', category: '電話系' },
  { value: '電話(いふうHP)', label: '電話(いふうHP)', category: '電話系' },
  { value: '電話(看板)', label: '電話(看板)', category: '電話系' },
  { value: '電話(チラシ)', label: '電話(チラシ)', category: '電話系' },
  { value: '電話(流入元不明)', label: '電話(流入元不明)', category: '電話系' },
  { value: '電話(業者)', label: '電話(業者)', category: '電話系' },
  
  // メール系
  { value: 'メール(at home)', label: 'メール(at home)', category: 'メール系' },
  { value: 'メール(スーモ)', label: 'メール(スーモ)', category: 'メール系' },
  { value: 'メール(いふうHP)', label: 'メール(いふうHP)', category: 'メール系' },
  { value: 'メール(チラシ)', label: 'メール(チラシ)', category: 'メール系' },
  { value: 'メール(看板)', label: 'メール(看板)', category: 'メール系' },
  { value: 'メール(流入元不明)', label: 'メール(流入元不明)', category: 'メール系' },
  
  // 配信系
  { value: '公開前配信メール', label: '公開前配信メール', category: '配信系' },
  { value: '値下げ配信メール', label: '値下げ配信メール', category: '配信系' },
  
  // 来店
  { value: '来店', label: '来店', category: '来店' },
  
  // 売主
  { value: '売主', label: '売主', category: '売主' },
  
  // Pinrich系
  { value: 'ピンリッチ(at home)', label: 'ピンリッチ(at home)', category: 'Pinrich系' },
  { value: 'ピンリッチ(スーモ)', label: 'ピンリッチ(スーモ)', category: 'Pinrich系' },
  { value: 'ピンリッチ(いふうHP)', label: 'ピンリッチ(いふうHP)', category: 'Pinrich系' },
  { value: 'ピンリッチ(内覧)', label: 'ピンリッチ(内覧)', category: 'Pinrich系' },
  { value: 'ピンリッチ(売主)', label: 'ピンリッチ(売主)', category: 'Pinrich系' },
  { value: 'ピンリッチ(チラシ)', label: 'ピンリッチ(チラシ)', category: 'Pinrich系' },
  { value: 'ピンリッチ(看板)', label: 'ピンリッチ(看板)', category: 'Pinrich系' },
  { value: 'ピンリッチ(電話)', label: 'ピンリッチ(電話)', category: 'Pinrich系' },
  { value: 'ピンリッチ(メール署名欄)', label: 'ピンリッチ(メール署名欄)', category: 'Pinrich系' },
  { value: 'ピンリッチ(物件問合せ)', label: 'ピンリッチ(物件問合せ)', category: 'Pinrich系' },
  { value: 'ピンリッチ(不明)', label: 'ピンリッチ(不明)', category: 'Pinrich系' },
  
  // その他
  { value: '全く不明', label: '全く不明', category: 'その他' },
  { value: '知合', label: '知合', category: 'その他' },
  { value: '配信希望', label: '配信希望', category: 'その他' },
  { value: 'アンケート', label: 'アンケート', category: 'その他' },
  { value: '2件目以降', label: '2件目以降', category: 'その他' },
  { value: '紹介', label: '紹介', category: 'その他' },
];

// カテゴリ別にグループ化されたオプションを取得
export const getGroupedInquirySourceOptions = (): InquirySourceOption[] => {
  return INQUIRY_SOURCE_OPTIONS;
};

// 特定のカテゴリのオプションを取得
export const getInquirySourceOptionsByCategory = (
  category: InquirySourceCategory
): InquirySourceOption[] => {
  return INQUIRY_SOURCE_OPTIONS.filter(option => option.category === category);
};
