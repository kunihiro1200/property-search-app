import React, { useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { LOGO_FALLBACK_BASE64 } from '../utils/placeholderImage';
import './PublicPropertyLogo.css';

const PublicPropertyLogo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = () => {
    window.open('https://ifoo-oita.com/', '_blank', 'noopener,noreferrer');
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[Logo Error] Failed to load logo image:', e);
    setImageError(true);
    setImageLoaded(false);
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
      {!imageError ? (
        <img 
          src="/comfortable-tenant-search-logo.png" 
          alt="comfortable TENANT SEARCH" 
          className="logo-image"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      ) : (
        <img 
          src={LOGO_FALLBACK_BASE64}
          alt="株式会社いふう" 
          className="logo-image logo-fallback"
          style={{ opacity: 1 }}
        />
      )}
      {!isMobile && <span className="company-name">株式会社いふう</span>}
    </div>
  );
};

export default PublicPropertyLogo;
