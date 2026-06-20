// ナビゲーション状態の型定義
// 詳細画面から一覧画面に戻る際のスクロール位置とフィルター状態を保持

export interface NavigationState {
  // スクロール位置（Y座標）
  scrollPosition: number;
  
  // 現在のページ番号
  currentPage: number;
  
  // 表示モード（リスト or 地図）
  viewMode?: 'list' | 'map';
  
  // フィルター設定
  filters: {
    // 物件タイプフィルター
    propertyTypes?: string[];
    
    // 価格範囲フィルター
    priceRange?: {
      min?: string;
      max?: string;
    };
    
    // 築年数範囲フィルター
    buildingAgeRange?: {
      min?: string;
      max?: string;
    };
    
    // 検索クエリ（所在地または物件番号）
    searchQuery?: string;
    
    // 検索タイプ
    searchType?: 'property_number' | 'location' | null;
    
    // 公開中のみ表示フラグ
    showPublicOnly?: boolean;
  };
}
