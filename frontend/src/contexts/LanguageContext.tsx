import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'ja' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

// 翻訳データ
const translations: Record<Language, Record<string, string>> = {
  ja: {
    // ヘッダー
    'header.backToList': '物件一覧',
    'header.backToListMobile': '一覧',
    'header.inquiry': 'お問合せ',
    'header.tel': 'TEL',
    'header.switchToEnglish': 'ENGLISH',
    'header.switchToJapanese': '日本語',
    
    // ステータスバッジ
    'status.preRelease': '公開前情報！！',
    'status.contracted': '成約済み',
    'status.negotiating': '交渉中',
    
    // 検索バー
    'search.placeholder': '物件番号・住所・駅名で検索',
    'search.button': '検索',
    'search.clearFilters': 'すべてを条件クリア',
    
    // 物件タイプ
    'propertyType.all': 'すべて',
    'propertyType.mansion': 'マンション',
    'propertyType.land': '土地',
    'propertyType.house': '一戸建て',
    'propertyType.income': '収益物件',
    
    // フィルター
    'filter.priceRange': '価格帯の絞込',
    'filter.minPrice': '最小価格（万円）',
    'filter.maxPrice': '最大価格（万円）',
    'filter.ageRange': '築年数の絞込',
    'filter.minAge': '最小築年数',
    'filter.maxAge': '最大築年数',
    'filter.publicOnly': '一般公開物件のみ表示',
    'filter.apply': '絞込を適用',
    'filter.propertyType': '物件タイプ',
    'filter.filterBy': 'で絞り込む',
    
    // 表示切替
    'view.switchToMap': '地図で見る',
    'view.switchToList': '一覧で見る',
    
    // 物件情報
    'property.price': '万円',
    'property.priceUnit': '万円',
    'property.age': '築',
    'property.ageUnit': '年',
    'property.landArea': '土地',
    'property.buildingArea': '建物',
    'property.floorPlan': '間取り',
    
    // ページネーション
    'pagination.showing': '件中',
    'pagination.of': '件を表示',
    'pagination.prev': '前へ',
    'pagination.next': '次へ',
    'pagination.retry': '再試行',
    'pagination.total': '全',
    'pagination.properties': '件の物件',
    
    // メッセージ
    'message.loading': '物件情報を読み込んでいます...',
    'message.noResults': '条件に合う物件が見つかりませんでした。',
    'message.error': 'エラーが発生しました: ',
    'message.loadingAll': '全物件データを取得中...',
    'message.loadingNext': '次のページを読み込み中...',
    
    // ページタイトル
    'page.propertyList': '物件一覧',
    
    // 検索
    'search.byPropertyNumber': '物件番号で検索中',
    'search.byLocation': '所在地で検索中',
    
    // フィルター
    'filter.title': '物件を絞り込む',
    'filter.publicOnlyActive': '公開中のみ表示',
    'filter.clearActive': '条件をクリア',
    'filter.applying': 'フィルター適用中...',
    
    // ビュー切替
    'view.mapSearching': '地図で検索中',
    
    // お問い合わせフォーム
    'inquiry.title': 'お問い合わせ',
    'inquiry.name': 'お名前',
    'inquiry.email': 'メールアドレス',
    'inquiry.phone': '電話番号',
    'inquiry.message': 'お問い合わせ内容',
    'inquiry.submit': 'お問い合わせを送信',
    'inquiry.submitting': '送信中...',
    'inquiry.aboutThisProperty': 'この物件についてお問い合わせ',
    'inquiry.success': 'お問い合わせを受け付けました。担当者より折り返しご連絡いたします。',
    'inquiry.submitError': 'お問い合わせの送信に失敗しました。入力内容をご確認の上、再度お試しください。',
    'inquiry.rateLimit': '送信回数の上限に達しました。しばらくしてから再度お試しください。',
    'inquiry.phonePrompt': 'お急ぎの方はお電話でもお問い合わせいただけます',
    
    // 物件詳細ページ
    'detail.priceNegotiable': '価格応談',
    'detail.other': 'その他',
    'detail.notFound': 'お探しの物件が見つかりませんでした',
    'detail.loadError': '物件の読み込みに失敗しました',
    'detail.propertyImages': '物件画像',
    'detail.panorama': '360°パノラマビュー',
    'detail.constructionDate': '新築年月',
    'detail.buildingAge': '築年数',
    'detail.description': '物件の説明',
    'detail.map': '地図',
    'detail.viewOnGoogleMap': 'Google Mapで見る',
    'detail.contractInfo': '成約情報',
    'detail.propertyNumber': '物件番号',
    'detail.contractDate': '成約日',
    'detail.highlights': 'おすすめポイント',
    'detail.estimate': '概算書',
    'detail.viewEstimate': '概算書を表示',
    'detail.estimateGenerating': '生成中...',
    'detail.estimateWait': '概算書を生成しています。10秒ほどお待ちください...',
  },
  en: {
    // Header
    'header.backToList': 'Property List',
    'header.backToListMobile': 'List',
    'header.inquiry': 'Contact',
    'header.tel': 'CALL',
    'header.switchToEnglish': 'ENGLISH',
    'header.switchToJapanese': '日本語',
    
    // Status badges
    'status.preRelease': 'Pre-Release Info!!',
    'status.contracted': 'Sold',
    'status.negotiating': 'Under Negotiation',
    
    // Search bar
    'search.placeholder': 'Search by property number, address, or station',
    'search.button': 'Search',
    'search.clearFilters': 'Clear All Filters',
    
    // Property types
    'propertyType.all': 'All',
    'propertyType.mansion': 'Apartment',
    'propertyType.land': 'Land',
    'propertyType.house': 'House',
    'propertyType.income': 'Investment Property',
    
    // Filters
    'filter.priceRange': 'Price Range',
    'filter.minPrice': 'Min Price (10K ¥)',
    'filter.maxPrice': 'Max Price (10K ¥)',
    'filter.ageRange': 'Building Age',
    'filter.minAge': 'Min Age (years)',
    'filter.maxAge': 'Max Age (years)',
    'filter.publicOnly': 'Show Public Properties Only',
    'filter.apply': 'Apply Filters',
    'filter.propertyType': 'Property Type',
    'filter.filterBy': ' filter',
    
    // View toggle
    'view.switchToMap': 'Map View',
    'view.switchToList': 'List View',
    
    // Property info
    'property.price': '0K ¥',
    'property.priceUnit': '0K ¥',
    'property.age': '',
    'property.ageUnit': ' years old',
    'property.landArea': 'Land',
    'property.buildingArea': 'Building',
    'property.floorPlan': 'Layout',
    
    // Pagination
    'pagination.showing': ' of ',
    'pagination.of': ' properties',
    'pagination.prev': 'Previous',
    'pagination.next': 'Next',
    'pagination.retry': 'Retry',
    'pagination.total': 'Total: ',
    'pagination.properties': ' properties',
    
    // Messages
    'message.loading': 'Loading properties...',
    'message.noResults': 'No properties found matching your criteria.',
    'message.error': 'An error occurred: ',
    'message.loadingAll': 'Loading all properties...',
    'message.loadingNext': 'Loading next page...',
    
    // Page titles
    'page.propertyList': 'Property List',
    
    // Search
    'search.byPropertyNumber': 'Searching by property number',
    'search.byLocation': 'Searching by location',
    
    // Filters
    'filter.title': 'Filter Properties',
    'filter.publicOnlyActive': 'Show Public Only',
    'filter.clearActive': 'Clear Filters',
    'filter.applying': 'Applying filters...',
    
    // View toggle
    'view.mapSearching': 'Searching on Map',
    
    // Contact form
    'inquiry.title': 'Contact Us',
    'inquiry.name': 'Name',
    'inquiry.email': 'Email',
    'inquiry.phone': 'Phone',
    'inquiry.message': 'Message',
    'inquiry.submit': 'Submit Inquiry',
    'inquiry.submitting': 'Submitting...',
    'inquiry.aboutThisProperty': 'Inquire About This Property',
    'inquiry.success': 'Your inquiry has been received. We will contact you shortly.',
    'inquiry.submitError': 'Failed to submit inquiry. Please check your input and try again.',
    'inquiry.rateLimit': 'Rate limit exceeded. Please try again later.',
    'inquiry.phonePrompt': 'For urgent inquiries, please call us',
    
    // Property detail page
    'detail.priceNegotiable': 'Price Negotiable',
    'detail.other': 'Other',
    'detail.notFound': 'Property not found',
    'detail.loadError': 'Failed to load property',
    'detail.propertyImages': 'Property Images',
    'detail.panorama': '360° Panorama View',
    'detail.constructionDate': 'Construction Date',
    'detail.buildingAge': 'Building Age',
    'detail.description': 'Description',
    'detail.map': 'Map',
    'detail.viewOnGoogleMap': 'View on Google Map',
    'detail.contractInfo': 'Contract Information',
    'detail.propertyNumber': 'Property Number',
    'detail.contractDate': 'Contract Date',
    'detail.highlights': 'Highlights',
    'detail.estimate': 'Cost Estimate',
    'detail.viewEstimate': 'View Estimate',
    'detail.estimateGenerating': 'Generating...',
    'detail.estimateWait': 'Generating cost estimate. Please wait 10 seconds...',
  },
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ja');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
