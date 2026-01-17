import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import SenderAddressSelector from './SenderAddressSelector';

interface FilteredBuyer {
  buyer_number: string;
  email: string;
  desired_area: string | null;
  distribution_type: string | null;
  latest_status: string | null;
  property_type: string | null;
  price_range_text: string | null;
  filterResults: {
    geography: boolean;
    distribution: boolean;
    status: boolean;
    priceRange: boolean;
  };
  geographicMatch?: {
    matched: boolean;
    matchedAreas: string[];
    matchType: 'radius' | 'city-wide' | 'none';
  };
}

interface BuyerFilterSummaryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedEmails: string[]) => void;
  buyers: FilteredBuyer[];
  totalBuyers: number;
  senderAddress?: string;
  onSenderAddressChange?: (address: string) => void;
  employees?: any[];
}

export default function BuyerFilterSummaryModal({
  open,
  onClose,
  onConfirm,
  buyers,
  totalBuyers,
  senderAddress,
  onSenderAddressChange,
  employees = []
}: BuyerFilterSummaryModalProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // 初期化: 全ての条件を満たす買主を選択
  useEffect(() => {
    if (open) {
      const qualifiedEmails = buyers
        .filter(b => 
          b.filterResults.geography &&
          b.filterResults.distribution &&
          b.filterResults.status &&
          b.filterResults.priceRange &&
          b.email
        )
        .map(b => b.email);
      setSelectedEmails(new Set(qualifiedEmails));
    }
  }, [open, buyers]);

  const handleToggle = (email: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedEmails(newSelected);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedEmails));
  };

  const qualifiedBuyers = buyers.filter(b => 
    b.filterResults.geography &&
    b.filterResults.distribution &&
    b.filterResults.status &&
    b.filterResults.priceRange
  );

  const disqualifiedBuyers = buyers.filter(b => 
    !(b.filterResults.geography &&
      b.filterResults.distribution &&
      b.filterResults.status &&
      b.filterResults.priceRange)
  );

  const getFailedCriteria = (buyer: FilteredBuyer): string[] => {
    const failed: string[] = [];
    if (!buyer.filterResults.geography) failed.push('地理的条件');
    if (!buyer.filterResults.distribution) failed.push('配信フラグ');
    if (!buyer.filterResults.status) failed.push('ステータス');
    if (!buyer.filterResults.priceRange) failed.push('価格帯');
    return failed;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        買主フィルタリング結果
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          {/* 送信元アドレス選択 */}
          {senderAddress && onSenderAddressChange && (
            <Box sx={{ mb: 2 }}>
              <SenderAddressSelector
                value={senderAddress}
                onChange={onSenderAddressChange}
                employees={employees}
              />
            </Box>
          )}

          {/* 送信情報サマリー */}
          {senderAddress && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                送信元アドレス: {senderAddress}
              </Typography>
              <Typography variant="body2">
                送信先: {selectedEmails.size}件選択中
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            全{totalBuyers}件中、{qualifiedBuyers.length}件の買主が条件を満たしています。
            メールアドレスを選択して次へ進むと、送信内容の確認画面が表示されます。
          </Alert>

          {qualifiedBuyers.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                適格買主 ({qualifiedBuyers.length}件)
              </Typography>
              <List dense>
                {qualifiedBuyers.map((buyer) => (
                  <ListItem
                    key={buyer.buyer_number}
                    button
                    onClick={() => handleToggle(buyer.email)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedEmails.has(buyer.email)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {buyer.buyer_number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {buyer.email}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon />}
                            label="地理"
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon />}
                            label="配信"
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon />}
                            label="ステータス"
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon />}
                            label="価格"
                            color="success"
                            variant="outlined"
                          />
                          {buyer.geographicMatch?.matchType === 'city-wide' && (
                            <Chip
                              size="small"
                              label="市全域"
                              color="info"
                              variant="outlined"
                            />
                          )}
                          {buyer.geographicMatch?.matchType === 'radius' && (
                            <Chip
                              size="small"
                              label={`エリア: ${buyer.geographicMatch.matchedAreas.join(', ')}`}
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {disqualifiedBuyers.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                除外された買主 ({disqualifiedBuyers.length}件)
              </Typography>
              <List dense>
                {disqualifiedBuyers.slice(0, 10).map((buyer) => {
                  const failedCriteria = getFailedCriteria(buyer);
                  return (
                    <ListItem
                      key={buyer.buyer_number}
                      sx={{
                        border: '1px solid',
                        borderColor: 'error.light',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: 'error.lighter'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {buyer.buyer_number}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {buyer.email || '(メールなし)'}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                            {failedCriteria.map((criteria) => (
                              <Chip
                                key={criteria}
                                size="small"
                                icon={<CancelIcon />}
                                label={criteria}
                                color="error"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
                {disqualifiedBuyers.length > 10 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    ...他{disqualifiedBuyers.length - 10}件
                  </Typography>
                )}
              </List>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={<EmailIcon />}
          disabled={selectedEmails.size === 0}
        >
          次へ ({selectedEmails.size}件)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
