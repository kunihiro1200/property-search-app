import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Box, useMediaQuery, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PublicPropertyLogo from './PublicPropertyLogo';
import { getBadgeType, BADGE_CONFIG } from '../utils/propertyStatusUtils';
import './PublicPropertyHeader.css';

interface PublicPropertyHeaderProps {
  showBackButton?: boolean;
  atbbStatus?: string | null;
  navigationState?: any; // NavigationState型
  showInquiryButton?: boolean; // お問合せボタンを表示するか
}

const PublicPropertyHeader: React.FC<PublicPropertyHeaderProps> = ({ 
  showBackButton = false,
  atbbStatus,
  navigationState,
  showInquiryButton = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const badgeType = getBadgeType(atbbStatus);

  const handleBackClick = () => {
    // 現在のURLからcanHideパラメータを取得
    const searchParams = new URLSearchParams(location.search);
    const canHide = searchParams.get('canHide');
    
    console.log('[PublicPropertyHeader] handleBackClick - canHide:', canHide);
    console.log('[PublicPropertyHeader] handleBackClick - location.search:', location.search);
    
    // canHideパラメータを保持したURLを構築
    const backUrl = canHide === 'true' 
      ? '/public/properties?canHide=true' 
      : '/public/properties';
    
    console.log('[PublicPropertyHeader] handleBackClick - backUrl:', backUrl);
    
    // ⚠️ 重要: 一覧画面から一覧画面に戻る場合はnavigationStateを渡さない
    // これにより、フィルターがリセットされず、表示も遅くならない
    // navigationStateは詳細画面から戻る場合のみ使用される
    navigate(backUrl);
  };

  const handleInquiryClick = () => {
    // お問合せフォームまでスムーズにスクロール
    const inquiryForm = document.querySelector('.public-inquiry-form');
    if (inquiryForm) {
      inquiryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePhoneClick = () => {
    // 電話をかける
    window.location.href = 'tel:0975332022';
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
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#FFB300',
                  borderColor: '#000',
                },
                '& .MuiButton-startIcon': {
                  marginRight: '4px',
                },
              }}
            >
              {isMobile ? '一覧' : '物件一覧'}
            </Button>
          )}
          {/* スマホ版のみお問合せボタンを表示 */}
          {isMobile && showInquiryButton && (
            <Button
              startIcon={<EmailIcon />}
              onClick={handleInquiryClick}
              sx={{ 
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: '1px solid #000',
                ml: showBackButton ? 1 : 0,
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#45a049',
                  borderColor: '#000',
                },
                '& .MuiButton-startIcon': {
                  marginRight: '4px',
                },
              }}
            >
              お問合せ
            </Button>
          )}
          {/* スマホ版のみTELボタンを表示 */}
          {isMobile && showInquiryButton && (
            <Button
              startIcon={<PhoneIcon />}
              onClick={handlePhoneClick}
              sx={{ 
                backgroundColor: '#2196F3',
                color: '#fff',
                border: '1px solid #000',
                ml: 1,
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#1976D2',
                  borderColor: '#000',
                },
                '& .MuiButton-startIcon': {
                  marginRight: '4px',
                },
              }}
            >
              TEL
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
