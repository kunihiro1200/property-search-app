import React from 'react';
import { Chip } from '@mui/material';
import { keyframes } from '@mui/system';

interface DuplicateIndicatorBadgeProps {
  duplicateCount: number;
  onClick: () => void;
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const DuplicateIndicatorBadge: React.FC<DuplicateIndicatorBadgeProps> = ({
  duplicateCount,
  onClick,
}) => {
  return (
    <Chip
      label={`重複 (${duplicateCount})`}
      color="warning"
      size="small"
      onClick={onClick}
      sx={{
        ml: 1,
        fontWeight: 'bold',
        cursor: 'pointer',
        animation: `${pulse} 2s infinite`,
        '&:hover': {
          opacity: 0.8,
        },
      }}
    />
  );
};

export default DuplicateIndicatorBadge;
