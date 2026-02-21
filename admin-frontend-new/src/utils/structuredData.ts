/**
 * 構造化データ（JSON-LD）生成ユーティリティ
 * 
 * Google検索結果でリッチスニペットを表示するための構造化データを生成します。
 */

/**
 * 市区町村を住所から抽出
 */
const extractCity = (address: string | undefined): string => {
  // addressがundefinedまたは空文字列の場合はデフォルト値を返す
  if (!address) {
    return '大分市';
  }
  
  // 大分県の市区町村を抽出
  const cityMatch = address.match(/(大分市|別府市|中津市|日田市|佐伯市|臼杵市|津久見市|竹田市|豊後高田市|杵築市|宇佐市|豊後大野市|由布市|国東市|姫島村|日出町|九重町|玖珠町)/);
  return cityMatch ? cityMatch[1] : '大分市';
};

/**
 * 物件リスト用の構造化データを生成
 */
export const generatePropertyListStructuredData = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '不動産物件サイト',
    description: '大分県の不動産物件を検索できます。戸建て、マンション、土地など、様々な物件情報を掲載しています。',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${typeof window !== 'undefined' ? window.location.origin : ''}/public/properties?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
};

/**
 * 物件詳細用の構造化データを生成
 */
export const generatePropertyStructuredData = (property: {
  id: string;
  propertyNumber: string;
  address: string;
  price: number;
  propertyType: string;
  description?: string;
  landArea?: number;
  buildingArea?: number;
  buildYear?: number;
  rooms?: string;
  images?: Array<{ url: string }>;
  latitude?: number;
  longitude?: number;
}) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const propertyUrl = `${baseUrl}/public/properties/${property.id}`;
  
  // 物件タイプを英語に変換
  const propertyTypeMap: Record<string, string> = {
    '戸建て': 'SingleFamilyResidence',
    'マンション': 'Apartment',
    '土地': 'LandParcel',
  };
  
  const schemaType = propertyTypeMap[property.propertyType] || 'RealEstateListing';
  
  // 基本的な構造化データ
  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: `${property.address} - ${property.propertyType}`,
    description: property.description || `${property.propertyType}の物件です。${property.address}に位置しています。`,
    url: propertyUrl,
    offers: {
      '@type': 'Offer',
      price: property.price * 10000, // 万円 → 円
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: extractCity(property.address),
      addressRegion: '大分県',
      addressCountry: 'JP',
      streetAddress: property.address,
    },
  };
  
  // 画像がある場合
  if (property.images && property.images.length > 0) {
    structuredData.image = property.images.map(img => img.url);
  }
  
  // 位置情報がある場合
  if (property.latitude && property.longitude) {
    structuredData.geo = {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }
  
  // 土地面積がある場合
  if (property.landArea) {
    structuredData.floorSize = {
      '@type': 'QuantitativeValue',
      value: property.landArea,
      unitCode: 'MTK', // 平方メートル
    };
  }
  
  // 建物面積がある場合
  if (property.buildingArea) {
    structuredData.floorSize = {
      '@type': 'QuantitativeValue',
      value: property.buildingArea,
      unitCode: 'MTK',
    };
  }
  
  // 築年数がある場合
  if (property.buildYear) {
    structuredData.yearBuilt = property.buildYear;
  }
  
  // 間取りがある場合
  if (property.rooms) {
    structuredData.numberOfRooms = property.rooms;
  }
  
  return structuredData;
};

/**
 * パンくずリスト用の構造化データを生成
 */
export const generateBreadcrumbStructuredData = (items: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * 組織情報用の構造化データを生成
 */
export const generateOrganizationStructuredData = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: '不動産物件サイト',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: '大分県の不動産物件を取り扱う不動産会社です。',
    address: {
      '@type': 'PostalAddress',
      addressLocality: '大分市',
      addressRegion: '大分県',
      addressCountry: 'JP',
    },
    areaServed: {
      '@type': 'State',
      name: '大分県',
    },
  };
};
