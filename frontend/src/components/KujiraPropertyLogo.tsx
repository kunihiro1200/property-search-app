import React from 'react';
import './KujiraPropertyLogo.css';

const LOGO_URL = '/kujira-logo.png';

const KujiraPropertyLogo: React.FC = () => {
  return (
    <div className="kujira-property-logo" aria-label="株式会社くじら不動産">
      <img
        src={LOGO_URL}
        alt="KUJIRA REAL ESTATE"
        className="kujira-logo-image"
      />
    </div>
  );
};

export default KujiraPropertyLogo;
