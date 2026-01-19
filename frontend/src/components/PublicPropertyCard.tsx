import React from 'react';
import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PublicProperty } from '../types/publicProperty';
import { NavigationState } from '../types/navigationState';
import { PROPERTY_FEATURE_ICONS } from '../utils/propertyIcons';
import { formatConstructionDate, shouldShowConstructionDate } from '../utils/constructionDateFormatter';
import { getBadgeType, BADGE_CONFIG } from '../utils/propertyStatusUtils';
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
    : '/placeholder-property.jpg';
  
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

// ヘルパー関数
function isPropertyClickable(atbbStatus: string | null | undefined): boolean {
  if (!atbbStatus) return false;
  // Only "公開中", "公開前", and "非公開（配信メールのみ）" are clickable
  // "非公開案件" is NOT clickable
  return atbbStatus.includes('公開中') || 
         atbbStatus.includes('公開前') || 
         atbbStatus.includes('非公開（配信メールのみ）');
}

export default PublicPropertyCard;
