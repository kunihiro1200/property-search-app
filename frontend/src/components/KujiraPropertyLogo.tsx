import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import './KujiraPropertyLogo.css';

const LOGO_URL = '/kujira-logo.png';
const COMPANY_URL = 'https://kujira-fudosan.com/';

const KujiraPropertyLogo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = () => {
    window.open(COMPANY_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="kujira-property-logo"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      aria-label="株式会社くじら不動産のウェブサイトを開く"
    >
      <img
        src={LOGO_URL}
        alt="KUJIRA REAL ESTATE"
        className="kujira-logo-image"
      />
      {!isMobile && (
        <div className="kujira-company-info">
          <span className="kujira-company-name">株式会社くじら不動産</span>
          <span className="kujira-company-tel">092-401-5331</span>
        </div>
      )}
    </div>
  );
};

export default KujiraPropertyLogo;
