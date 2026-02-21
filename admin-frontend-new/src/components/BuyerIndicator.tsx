import { useState, useRef } from 'react';
import {
  Chip,
  Popover,
  Box,
  CircularProgress,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import api from '../services/api';
import BuyerList from './BuyerList';

export interface BuyerSummary {
  id: string;
  buyer_number: string;
  name: string;
  phone_number: string;
  email: string;
  latest_status: string;
  inquiry_confidence: string;
  reception_date: string;
  latest_viewing_date: string | null;
  next_call_date: string | null;
}

interface BuyerIndicatorProps {
  propertyNumber: string;
  buyerCount: number;
  hasHighConfidence: boolean;
}

export default function BuyerIndicator({
  propertyNumber,
  buyerCount,
  hasHighConfidence
}: BuyerIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [buyers, setBuyers] = useState<BuyerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const anchorEl = useRef<HTMLDivElement>(null);

  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!expanded && buyerCount > 0) {
      setLoading(true);
      try {
        const response = await api.get(`/api/property-listings/${propertyNumber}/buyers`);
        setBuyers(response.data);
      } catch (error) {
        console.error('Failed to fetch buyers:', error);
      } finally {
        setLoading(false);
      }
    }

    setExpanded(!expanded);
  };

  const handleClose = () => {
    setExpanded(false);
  };

  if (buyerCount === 0) {
    return null;
  }

  return (
    <Box ref={anchorEl}>
      <Chip
        icon={<PersonIcon />}
        label={buyerCount}
        size="small"
        color={hasHighConfidence ? 'error' : 'default'}
        onClick={handleExpand}
        sx={{ 
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8
          }
        }}
      />

      <Popover
        open={expanded}
        anchorEl={anchorEl.current}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <BuyerList buyers={buyers} />
        )}
      </Popover>
    </Box>
  );
}
