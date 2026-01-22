import React from 'react';
import { Card, CardContent, Box, Typography, Chip, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PublicProperty } from '../types/publicProperty';
import { NavigationState } from '../types/navigationState';
import { PROPERTY_FEATURE_ICONS } from '../utils/propertyIcons';
import { formatConstructionDate, shouldShowConstructionDate } from '../utils/constructionDateFormatter';
import { getBadgeType, BADGE_CONFIG, isPropertyClickable } from '../utils/propertyStatusUtils';
import { useImageLoader } from '../hooks/useImageLoader';
import { PLACEHOLDER_IMAGE_BASE64 } from '../utils/placeholderImage';
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

  // バッジタイプとクリック可能性を判定
  const badgeType = getBadgeType(property.atbb_status);
  const isClickable = property.is_clickable ?? isPropertyClickable(property.atbb_status);

  const handleClick = () => {
    // クリック不可の物件はクリック不可
    if (!isClickable) {
      return;
    }
    
    // navigationStateが渡されていない場合はデフォルト値を使用
    if (!navigationState) {
      navigate(`/public/properties/${property.property_number}`);
      return;
    }
    
    // 現在のスクロール位置を取得
    const currentScrollPosition = window.scrollY || window.pageYOffset;
    
    // ナビゲーション状態にスクロール位置を追加
    const fullNavigationState: NavigationState = {
      currentPage: navigationState.currentPage,
      scrollPosition: currentScrollPosition,
      filters: navigationState.filters
    };
    
    // 状態を保持してナビゲート
    navigate(`/public/properties/${property.property_number}`, {
      state: fullNavigationState
    });
  };

  const formatPrice = (price: number | undefined) => {
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
    ? property.images[0]
    : PLACEHOLDER_IMAGE_BASE64;
  
  // カスタムフックを使用して画像読み込みを管理
  const { imageSrc, isLoading, hasError } = useImageLoader({
    src: thumbnailUrl,
    fallbackSrc: PLACEHOLDER_IMAGE_BASE64,
    onError: (error) => {
      console.error('[Property Image Error]', {
        propertyNumber: property.property_number,
        url: thumbnailUrl,
        error,
        timestamp: new Date().toISOString()
      });
    }
  });
  
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
        {/* ローディングインジケーター */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              zIndex: 1
            }}
          >
            <CircularProgress size={40} sx={{ color: '#FFC107' }} />
          </Box>
        )}
        
        <img
          src={imageSrc}
          alt={`${property.display_address || property.address}の物件画像`}
          className="property-card-image"
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
        
        {/* エラー表示 */}
        {hasError && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            ⚠️ 画像を読み込めませんでした
          </Box>
        )}
        
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
