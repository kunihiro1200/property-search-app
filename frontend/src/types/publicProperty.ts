// 公開物件の型定義

// 物件タイプの型定義
export type PropertyType = 'detached_house' | 'apartment' | 'land' | 'income';

export interface PublicProperty {
  id: string;
  property_number: string;
  property_type: string;
  address: string;
  display_address?: string;
  price?: number;
  land_area?: number;
  building_area?: number;
  building_age?: number;
  floor_plan?: string;
  construction_year_month?: string;  // 新築年月（YYYY-MM, YYYY/MM, YYYYMM, YYYY年MM月など）
  description?: string;
  features?: string[];
  images?: string[];
  google_map_url?: string;
  latitude?: number;  // 緯度（地図表示用）
  longitude?: number;  // 経度（地図表示用）
  atbb_status: string;  // atbb_statusを追加
  badge_type?: 'none' | 'pre_release' | 'email_only' | 'sold';  // バッジタイプを追加
  is_clickable?: boolean;  // クリック可能フラグを追加
  created_at: string;
  updated_at: string;
}

// 物件画像の型定義
export interface PropertyImage {
  id: string;
  name: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}

// 物件画像取得結果の型定義
export interface PropertyImagesResult {
  images: PropertyImage[];
  folderId: string | null;
  cached: boolean;
  totalCount?: number;
  visibleCount?: number;
  hiddenCount?: number;
  hiddenImages?: string[];
}

export interface PublicPropertyListResponse {
  properties: PublicProperty[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicPropertyFilters {
  propertyType?: string;
  types?: PropertyType[]; // 複数の物件タイプフィルター
  minPrice?: number;
  maxPrice?: number;
  areas?: string[];
  location?: string;
  propertyNumber?: string;
  q?: string; // 統一検索クエリ（物件番号または所在地）
  minAge?: number;
  maxAge?: number;
  page?: number;
  limit?: number;
}

export interface PropertyInquiry {
  property_id?: string; // オプショナルに変更
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface PropertyInquiryResponse {
  success: boolean;
  message: string;
  inquiry_id?: string;
}

export interface SitemapEntry {
  property_id: string;
  property_number: string;
  updated_at: string;
}

export interface SitemapResponse {
  properties: SitemapEntry[];
}

// エラーレスポンスの型
export interface ApiError {
  message: string;
  type: 'network' | 'server' | 'client';
  status?: number;
  details?: any;
}
