import React from 'react';
import { Box, Typography } from '@mui/material';

interface PropertyMapSectionProps {
  sellerNumber: string;
  propertyAddress?: string;
}

const PropertyMapSection: React.FC<PropertyMapSectionProps> = ({
  sellerNumber,
  propertyAddress,
}) => {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        地図セクション（売主番号: {sellerNumber}）
      </Typography>
      {propertyAddress && (
        <Typography variant="body2" color="text.secondary">
          住所: {propertyAddress}
        </Typography>
      )}
    </Box>
  );
};

export default PropertyMapSection;
