import { Card, CardContent, Box, Typography, Chip } from '@mui/material';

interface PropertyListing {
  id: string;
  property_number: string;
  address: string;
  display_address?: string;
  property_type: string;
  price: number;
  status: string;
  sales_assignee?: string;
  contract_date?: string;
  settlement_date?: string;
}

interface PropertyCardProps {
  property: PropertyListing;
  isLinked: boolean;
  onClick: () => void;
}

// シンプルなステータスカラーマッピング
const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    '販売中': '#4caf50',
    '商談中': '#ff9800',
    '契約済': '#2196f3',
    '引渡済': '#9e9e9e',
    '販売停止': '#f44336',
    '取下げ': '#757575',
  };
  return statusMap[status] || '#9e9e9e';
};

export default function PropertyCard({ property, isLinked, onClick }: PropertyCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        mb: 1,
        bgcolor: isLinked ? 'action.selected' : 'background.paper',
        border: isLinked ? 2 : 1,
        borderColor: isLinked ? 'primary.main' : 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
          boxShadow: 2,
        },
        transition: 'all 0.2s',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* 物件番号と紐づきインジケーター */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={isLinked ? 'bold' : 'medium'}
            color={isLinked ? 'primary' : 'text.primary'}
          >
            {property.property_number}
          </Typography>
          {isLinked && (
            <Chip
              label="紐づき"
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* 所在地 */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {property.display_address || property.address || '-'}
        </Typography>

        {/* 価格、種別、ステータス */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {property.price && (
            <Typography variant="body2" fontWeight="medium">
              {(property.price / 10000).toLocaleString()}万円
            </Typography>
          )}
          {property.property_type && (
            <Chip label={property.property_type} size="small" variant="outlined" sx={{ height: 22 }} />
          )}
          {property.status && (
            <Chip
              label={property.status}
              size="small"
              sx={{
                height: 22,
                bgcolor: getStatusColor(property.status),
                color: 'white',
                fontWeight: 'medium',
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
