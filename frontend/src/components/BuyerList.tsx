import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Chip,
  Link,
} from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon } from '@mui/icons-material';
import { BuyerSummary } from './BuyerIndicator';

interface BuyerListProps {
  buyers: BuyerSummary[];
}

export default function BuyerList({ buyers }: BuyerListProps) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP');
    } catch {
      return dateStr;
    }
  };

  const isHighConfidence = (confidence: string) => {
    return ['A', 'S', 'A+', 'S+'].includes(confidence);
  };

  if (buyers.length === 0) {
    return (
      <Box sx={{ p: 2, width: 400 }}>
        <Typography variant="body2" color="text.secondary">
          この物件への問い合わせはまだありません
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: 400, maxHeight: 500, overflow: 'auto', p: 0 }}>
      {buyers.map((buyer) => (
        <ListItem
          key={buyer.id}
          button
          onClick={() => navigate(`/buyers/${buyer.buyer_number}`)}
          sx={{
            borderLeft: isHighConfidence(buyer.inquiry_confidence)
              ? '4px solid #f44336'
              : 'none',
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" fontWeight="bold">
                  {buyer.name || '名前未登録'}
                </Typography>
                {buyer.inquiry_confidence && (
                  <Chip
                    label={buyer.inquiry_confidence}
                    size="small"
                    color={isHighConfidence(buyer.inquiry_confidence) ? 'error' : 'default'}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="caption" display="block" color="text.secondary">
                  {buyer.buyer_number} | 受付: {formatDate(buyer.reception_date)}
                </Typography>
                {buyer.latest_status && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    {buyer.latest_status}
                  </Typography>
                )}
                {buyer.next_call_date && (
                  <Typography variant="caption" display="block" color="primary" sx={{ mt: 0.5 }}>
                    次電: {formatDate(buyer.next_call_date)}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  {buyer.phone_number && (
                    <Link
                      href={`tel:${buyer.phone_number}`}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}
                    >
                      <PhoneIcon fontSize="small" />
                    </Link>
                  )}
                  {buyer.email && (
                    <Link
                      href={`mailto:${buyer.email}`}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}
                    >
                      <EmailIcon fontSize="small" />
                    </Link>
                  )}
                  {!buyer.phone_number && !buyer.email && (
                    <Typography variant="caption" color="text.disabled">
                      連絡先未登録
                    </Typography>
                  )}
                </Box>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
