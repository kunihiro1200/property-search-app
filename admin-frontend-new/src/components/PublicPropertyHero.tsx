import React, { useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import UnifiedSearchBar from './UnifiedSearchBar';
import './PublicPropertyHero.css';

interface PublicPropertyHeroProps {
  onSearch?: (query: string) => void;
}

const PublicPropertyHero: React.FC<PublicPropertyHeroProps> = ({ onSearch }) => {
  const [searchValue, setSearchValue] = useState<string>('');

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  return (
    <Box className="hero-section">
      <Container maxWidth="lg">
        <Typography variant="h1" className="hero-title">
          物件をお探しですか？
        </Typography>
        <Typography variant="h5" className="hero-subtitle">
          理想の住まいを見つけるお手伝いをします
        </Typography>
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <UnifiedSearchBar 
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearch}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default PublicPropertyHero;
