import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PublicPropertyLogo.css';

const PublicPropertyLogo: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/public/properties');
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
      aria-label="ホームページに戻る"
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
