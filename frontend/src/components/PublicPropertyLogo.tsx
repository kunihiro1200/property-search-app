import React from 'react';
import './PublicPropertyLogo.css';

const PublicPropertyLogo: React.FC = () => {
  const handleClick = () => {
    // いふうのホームページに遷移
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
      aria-label="いふうのホームページを開く"
    >
      <img 
        src="/comfortable-tenant-search-logo.png" 
        alt="comfortable TENANT SEARCH" 
        className="logo-image"
      />
      <span className="company-name">株式会社いふう</span>
    </div>
  );
};

export default PublicPropertyLogo;
