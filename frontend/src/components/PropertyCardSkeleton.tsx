import React from 'react';
import { Card, Box, Skeleton } from '@mui/material';
import './PropertyCardSkeleton.css';

const PropertyCardSkeleton: React.FC = () => {
  return (
    <Card className="skeleton-card">
      <Skeleton
        variant="rectangular"
        height={240}
        animation="wave"
        className="skeleton-image"
      />
      <Box className="skeleton-content" sx={{ p: 2.5 }}>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Skeleton variant="text" width="30%" height={16} />
          <Skeleton variant="text" width="30%" height={16} />
          <Skeleton variant="text" width="30%" height={16} />
        </Box>
      </Box>
    </Card>
  );
};

export default PropertyCardSkeleton;
