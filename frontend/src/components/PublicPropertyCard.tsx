import React from 'react';
import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicProperty } from '../types/publicProperty';
import { NavigationState } from '../types/navigationState';
import { PROPERTY_FEATURE_ICONS } from '../utils/propertyIcons';
import { formatConstructionDate, shouldShowConstructionDate } from '../utils/constructionDateFormatter';
import { getBadgeType, BADGE_CONFIG, isPropertyClickable } from '../utils/propertyStatusUtils';
import './PublicPropertyCard.css';

interface PublicPropertyCardProps {
  property: PublicProperty;
  animationDelay?: number;
  // ナビゲーション状態（一覧画面から渡される）
  navigationState?: Omit<NavigationState, 'scrollPosition'>;
}

const PublicPropertyCard: React.FC<PublicPropertyCardProps> = ({ 
  property, 
  animationDelay = 0,
  navigationState
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 🔍 デバッグ: propertyオブジェクトをログ出力
  console.log('[PublicPropertyCard] Rendering:', {
    property_number: property.property_number,
    price: property.price,
    sales_price: (property as any).sales_price,
    listing_price: (property as any).listing_price,
    fullProperty: property,
  });

  // バッジタイプとクリック可能性を判定
  const badgeType = getBadgeType(property.atbb_status);
  const isClickable = property.is_clickable ?? isPropertyClickable(property.atbb_status);

  const handleClick = () => {
    // クリック不可の物件はクリック不可
    if (!isClickable) {
      return;
    }
    
    // useSearchParamsから確実にcanHideパラメータを取得
    const canHide = searchParams.get('canHide');
    
    console.log('[PublicPropertyCard] handleClick - canHide:', canHide);
    console.log('[PublicPropertyCard] handleClick - property:', property.property_number);
    console.log('[PublicPropertyCard] handleClick - current URL:', window.location.href);
    console.log('[PublicPropertyCard] handleClick - searchParams:', Object.fromEntries(searchParams.entries()));
    
    // navigationStateが渡されていない場合はデフォルト値を使用
    if (!navigationState) {
      // canHideパラメータを引き継ぐ
      const targetUrl = canHide === 'true' 
        ? `/public/properties/${property.property_number}?canHide=true`
        : `/public/properties/${property.property_number}`;
      console.log('[PublicPropertyCard] Navigating to (no state):', targetUrl);
      navigate(targetUrl);
      return;
    }
    
    // 現在のスクロール位置を取得
    const currentScrollPosition = window.scrollY || window.pageYOffset;
    
    // ナビゲーション状態にスクロール位置を追加
    const fullNavigationState: NavigationState = {
      currentPage: navigationState.currentPage,
      scrollPosition: currentScrollPosition,
      viewMode: navigationState.viewMode, // viewModeを保存
      filters: navigationState.filters
    };
    
    // sessionStorageに状態を保存（navigate(-1)で戻った時に復元するため）
    sessionStorage.setItem('publicPropertiesNavigationState', JSON.stringify(fullNavigationState));
    console.log('[PublicPropertyCard] Saved state to sessionStorage:', fullNavigationState);
    
    // canHideパラメータを引き継ぐ
    const targetUrl = canHide === 'true' 
      ? `/public/properties/${property.property_number}?canHide=true`
      : `/public/properties/${property.property_number}`;
    
    console.log('[PublicPropertyCard] Navigating to (with state):', targetUrl);
    
    // 状態を保持してナビゲート
    navigate(targetUrl, {
      state: fullNavigationState
    });
  };

  const formatPrice = (price: number | undefined) => {
    // 🔍 デバッグ: priceの値をログ出力
    console.log('[PublicPropertyCard] formatPrice:', {
      property_number: property.property_number,
      price: price,
      type: typeof price,
      isUndefined: price === undefined,
      isNull: price === null,
      isFalsy: !price,
    });
    
    if (!price) return '価格応談';
    return `${(price / 10000).toLocaleString()}万円`;
  };

  const getPropertyTypeConfig = (type: string) => {
    const configs = {
      'detached_house': { label: '一戸建て', color: '#8B5CF6', bgColor: '#EDE9FE' },
      'apartment': { label: 'マンション', color: '#EC4899', bgColor: '#FCE7F3' },
      'land': { label: '土地', color: '#14B8A6', bgColor: '#CCFBF1' },
      'other': { label: 'その他', color: '#6B7280', bgColor: '#F3F4F6' },
    };
    return configs[type as keyof typeof configs] || configs.other;
  };

  // バッジ表示用のコンポーネント
  const renderBadge = () => {
    if (badgeType === 'none') return null;
    
    const config = BADGE_CONFIG[badgeType as keyof typeof BADGE_CONFIG];
    if (!config) return null;
    
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: config.color,
          color: 'white',
          padding: '16px 32px',
          fontSize: '32px',
          fontWeight: 'bold',
          borderRadius: '8px',
          zIndex: 10,
        }}
      >
        {config.text}
      </Box>
    );
  };

  const thumbnailUrl = property.images && property.images.length > 0
    ? property.images[0].thumbnailUrl
    : 'https://via.placeholder.com/400x300?text=No+Image';
  
  const typeConfig = getPropertyTypeConfig(property.property_type);

  // 新築年月のフォーマット
  const formattedConstructionDate = formatConstructionDate(property.construction_year_month);
  const showConstructionDate = shouldShowConstructionDate(property.property_type) && formattedConstructionDate;

  const LandIcon = PROPERTY_FEATURE_ICONS.land_area;
  const BuildingIcon = PROPERTY_FEATURE_ICONS.building_area;
  const CalendarIcon = PROPERTY_FEATURE_ICONS.building_age;
  const LayoutIcon = PROPERTY_FEATURE_ICONS.floor_plan;

  return (
    <Card
      className={`property-card animate-fade-in-up ${!isClickable ? 'not-clickable' : ''}`}
      onClick={handleClick}
      style={{ 
        animationDelay: `${animationDelay}s`,
        cursor: isClickable ? 'pointer' : 'default',
        opacity: !isClickable ? 0.7 : 1
      }}
    >
      <Box className="property-card-image-container">
        <img
          src={thumbnailUrl}
          alt={`${property.display_address || property.address}の物件画像`}
          className="property-card-image"
          loading="lazy"
          crossOrigin="anonymous"
        />
        <Box className="property-card-image-overlay" />
        
        {/* バッジを表示 */}
        {renderBadge()}
        
        <Chip
          label={typeConfig.label}
          className="property-type-badge"
          sx={{
            bgcolor: typeConfig.bgColor,
            color: typeConfig.color,
            fontWeight: 600,
          }}
        />
      </Box>
      
      <CardContent className="property-card-content">
        <Typography className="property-price">
          {formatPrice(property.price)}
        </Typography>
        
        <Typography className="property-address">
          {property.display_address || property.address}
        </Typography>
        
        <Box className="property-features">
          {showConstructionDate && (
            <Box className="property-feature">
              <CalendarIcon className="property-feature-icon" size={16} />
              <span>{formattedConstructionDate}</span>
            </Box>
          )}
          {property.land_area && (
            <Box className="property-feature">
              <LandIcon className="property-feature-icon" size={16} />
              <span>土地: {property.land_area}㎡</span>
            </Box>
          )}
          {property.building_area && (
            <Box className="property-feature">
              <BuildingIcon className="property-feature-icon" size={16} />
              <span>建物: {property.building_area}㎡</span>
            </Box>
          )}
          {property.building_age !== undefined && property.building_age !== null && (
            <Box className="property-feature">
              <CalendarIcon className="property-feature-icon" size={16} />
              <span>築{property.building_age}年</span>
            </Box>
          )}
          {property.floor_plan && (
            <Box className="property-feature">
              <LayoutIcon className="property-feature-icon" size={16} />
              <span>{property.floor_plan}</span>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PublicPropertyCard;
