import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';

// 物件タイプの型定義
export type PropertyType = 'detached_house' | 'apartment' | 'land' | 'income';

// 物件タイプのラベルマッピング
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  detached_house: '戸建て',
  apartment: 'マンション',
  land: '土地',
  income: '収益物件',
};

interface PropertyTypeFilterButtonsProps {
  selectedTypes: PropertyType[];
  onTypeToggle: (type: PropertyType) => void;
  disabled?: boolean;
}

export const PropertyTypeFilterButtons: React.FC<PropertyTypeFilterButtonsProps> = ({
  selectedTypes,
  onTypeToggle,
  disabled = false,
}) => {
  const propertyTypes: PropertyType[] = ['detached_house', 'apartment', 'land', 'income'];

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          color: 'text.secondary',
          mb: 1.5,
        }}
      >
        物件タイプ
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {propertyTypes.map((type) => {
          const isSelected = selectedTypes.includes(type);
          return (
            <Button
              key={type}
              variant={isSelected ? 'contained' : 'outlined'}
              onClick={() => onTypeToggle(type)}
              disabled={disabled}
              sx={{
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: 1,
                transition: 'all 0.2s',
                ...(isSelected
                  ? {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }
                  : {
                      bgcolor: 'white',
                      color: 'text.primary',
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'primary.main',
                      },
                    }),
              }}
              aria-pressed={isSelected}
              aria-label={`${PROPERTY_TYPE_LABELS[type]}で絞り込む`}
            >
              {PROPERTY_TYPE_LABELS[type]}
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
};
