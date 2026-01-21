import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import './PublicPropertyLogo.css';

const PublicPropertyLogo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = () => {
    window.open('https://ifoo-oita.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="public-property-logo" 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label="株式会社いふうのウェブサイトを開く"
    >
      <img 
        src="/comfortable-tenant-search-logo.png" 
        alt="comfortable TENANT SEARCH" 
        className="logo-image"
      />
      {!isMobile && <span className="company-name">株式会社いふう</span>}
    </div>
  );
};

export default PublicPropertyLogo;
