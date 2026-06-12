import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Box, useMediaQuery, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import KujiraPropertyLogo from './KujiraPropertyLogo';
import { getBadgeType, BADGE_CONFIG } from '../utils/propertyStatusUtils';
import './KujiraPropertyHeader.css';

interface KujiraPropertyHeaderProps {
  showBackButton?: boolean;
  atbbStatus?: string | null;
  navigationState?: any;
  showInquiryButton?: boolean;
}

const KujiraPropertyHeader: React.FC<KujiraPropertyHeaderProps> = ({
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
    const searchParams = new URLSearchParams(location.search);
    const canHide = searchParams.get('canHide');
    const viewMode = navigationState?.viewMode;

    const params = new URLSearchParams();
    if (canHide === 'true') params.set('canHide', 'true');
    if (viewMode === 'map') params.set('view', 'map');

    const queryString = params.toString();
    const backUrl = queryString ? `/kujira/properties?${queryString}` : '/kujira/properties';

    navigate(backUrl);
  };

  const handleInquiryClick = () => {
    const inquiryForm = document.querySelector('.public-inquiry-form');
    if (inquiryForm) {
      inquiryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePhoneClick = () => {
    window.location.href = 'tel:0924015331';
  };

  const renderBadge = () => {
    if (!atbbStatus) return null;
    if (badgeType === 'none') return null;

    const config = BADGE_CONFIG[badgeType as keyof typeof BADGE_CONFIG];
    if (!config) return null;

    const displayText = badgeType === 'pre_release' ? '公開前情報！！' : config.text;

    return (
      <Box
        className="kujira-status-badge"
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
    <header className="kujira-property-header">
      <div className="kujira-header-container">
        <div className="kujira-header-left">
          {showBackButton && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackClick}
              sx={{
                backgroundColor: '#1565C0',
                color: '#fff',
                border: '1px solid #0D47A1',
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#0D47A1',
                  borderColor: '#0D47A1',
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
                backgroundColor: '#1565C0',
                color: '#fff',
                border: '1px solid #0D47A1',
                ml: showBackButton ? 1 : 0,
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#0D47A1',
                  borderColor: '#0D47A1',
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
                backgroundColor: '#1976D2',
                color: '#fff',
                border: '1px solid #1565C0',
                ml: 1,
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#1565C0',
                  borderColor: '#0D47A1',
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
        <div className="kujira-header-center">
          {renderBadge()}
        </div>
        <div className="kujira-header-right">
          <KujiraPropertyLogo />
        </div>
      </div>
    </header>
  );
};

export default KujiraPropertyHeader;
