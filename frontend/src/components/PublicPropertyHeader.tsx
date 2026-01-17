import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublicPropertyLogo from './PublicPropertyLogo';
import { getBadgeType, BADGE_CONFIG } from '../utils/propertyStatusUtils';
import './PublicPropertyHeader.css';

interface PublicPropertyHeaderProps {
  showBackButton?: boolean;
  atbbStatus?: string | null;
  navigationState?: any; // NavigationState型
}

const PublicPropertyHeader: React.FC<PublicPropertyHeaderProps> = ({ 
  showBackButton = false,
  atbbStatus,
  navigationState
}) => {
  const navigate = useNavigate();
  const badgeType = getBadgeType(atbbStatus);

  const handleBackClick = () => {
    // navigationStateを保持したまま一覧ページに戻る
    if (navigationState) {
      // stateを保持して一覧ページに戻る
      navigate('/public/properties', {
        state: navigationState,
        replace: false
      });
    } else {
      // stateがない場合は通常の戻る
      navigate('/public/properties');
    }
  };

  const renderBadge = () => {
    // atbbStatusが未定義の場合はバッジを表示しない（一覧画面など）
    if (!atbbStatus) return null;
    
    if (badgeType === 'none') return null;
    
    const config = BADGE_CONFIG[badgeType as keyof typeof BADGE_CONFIG];
    if (!config) return null;
    
    // 詳細画面では「公開前」を「公開前情報！！」に変更
    const displayText = badgeType === 'pre_release' ? '公開前情報！！' : config.text;
    
    return (
      <Box
        className="status-badge"
        sx={{
          backgroundColor: config.color,
          color: '#ffffff',
          padding: '12px 24px',
          fontSize: '18px',
          fontWeight: 700,
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          border: '2px solid #000000',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }}
        role="status"
        aria-label={`物件ステータス: ${displayText}`}
      >
        {displayText}
      </Box>
    );
  };

  return (
    <header className="public-property-header">
      <div className="header-container">
        <div className="header-left">
          {showBackButton && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackClick}
              sx={{ 
                backgroundColor: '#FFC107',
                color: '#000',
                border: '1px solid #000',
                '&:hover': {
                  backgroundColor: '#FFB300',
                  borderColor: '#000',
                },
              }}
            >
              物件一覧
            </Button>
          )}
        </div>
        <div className="header-center">
          {renderBadge()}
        </div>
        <div className="header-right">
          <PublicPropertyLogo />
        </div>
      </div>
    </header>
  );
};

export default PublicPropertyHeader;
