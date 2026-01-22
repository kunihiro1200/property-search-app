import { Box, Typography, Grid, TextField } from '@mui/material';

interface FrequentlyAskedSectionProps {
  data: {
    pre_viewing_notes?: string;
    property_tax?: number;
    management_fee?: number;
    reserve_fund?: number;
    parking?: string;
    delivery?: string;
  };
  editedData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  isEditMode: boolean;
}

export default function FrequentlyAskedSection({ data, editedData, onFieldChange, isEditMode }: FrequentlyAskedSectionProps) {
  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '';
    return price.toString();
  };

  const getValue = (field: string, defaultValue: any = '') => {
    return editedData[field] !== undefined ? editedData[field] : (data[field as keyof typeof data] || defaultValue);
  };

  // 全てのフィールドが空かチェック
  const hasContent = data.pre_viewing_notes || data.property_tax || data.management_fee || 
                     data.reserve_fund || data.parking || data.delivery;

  // 表示モードで内容がない場合は何も表示しない
  if (!isEditMode && !hasContent) {
    return null;
  }

  return (
    <>
      <Grid container spacing={2}>
        {/* 内覧前伝達事項 */}
        {(isEditMode || data.pre_viewing_notes) && (
          <Grid item xs={12}>
            <Box sx={{ bgcolor: '#fff3cd', p: 2, borderRadius: 1, border: '2px solid #ffc107' }}>
              <Typography variant="h6" color="warning.dark" fontWeight="bold" gutterBottom sx={{ fontSize: '1.25rem' }}>
                ⚠️ 内覧前伝達事項
              </Typography>
              {isEditMode ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={getValue('pre_viewing_notes')}
                  onChange={(e) => onFieldChange('pre_viewing_notes', e.target.value)}
                  placeholder="内覧前に伝えるべき事項を入力してください"
                  sx={{ 
                    bgcolor: 'white',
                    '& .MuiInputBase-input': { fontSize: '1.1rem', lineHeight: 1.8 }
                  }}
                />
              ) : (
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontSize: '1.1rem', 
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {data.pre_viewing_notes}
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* 固定資産税 */}
        {(isEditMode || data.property_tax) && (
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
                固定資産税
              </Typography>
              {isEditMode ? (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={formatPrice(getValue('property_tax'))}
                  onChange={(e) => onFieldChange('property_tax', e.target.value ? Number(e.target.value) : null)}
                  placeholder="円"
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>円</Typography>,
                  }}
                />
              ) : (
                <Typography variant="body1">
                  {data.property_tax ? `¥${data.property_tax.toLocaleString()}` : '-'}
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* 管理費 */}
        {(isEditMode || data.management_fee) && (
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
                管理費
              </Typography>
              {isEditMode ? (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={formatPrice(getValue('management_fee'))}
                  onChange={(e) => onFieldChange('management_fee', e.target.value ? Number(e.target.value) : null)}
                  placeholder="円"
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>円</Typography>,
                  }}
                />
              ) : (
                <Typography variant="body1">
                  {data.management_fee ? `¥${data.management_fee.toLocaleString()}` : '-'}
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* 積立金 */}
        {(isEditMode || data.reserve_fund) && (
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
                積立金
              </Typography>
              {isEditMode ? (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={formatPrice(getValue('reserve_fund'))}
                  onChange={(e) => onFieldChange('reserve_fund', e.target.value ? Number(e.target.value) : null)}
                  placeholder="円"
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>円</Typography>,
                  }}
                />
              ) : (
                <Typography variant="body1">
                  {data.reserve_fund ? `¥${data.reserve_fund.toLocaleString()}` : '-'}
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* 駐車場 */}
        {(isEditMode || data.parking) && (
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
                駐車場
              </Typography>
              {isEditMode ? (
                <TextField
                  fullWidth
                  size="small"
                  value={getValue('parking')}
                  onChange={(e) => onFieldChange('parking', e.target.value)}
                  placeholder="駐車場情報を入力してください"
                />
              ) : (
                <Typography variant="body1">{data.parking}</Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* 引渡し */}
        {(isEditMode || data.delivery) && (
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
                引渡し
              </Typography>
              {isEditMode ? (
                <TextField
                  fullWidth
                  size="small"
                  value={getValue('delivery')}
                  onChange={(e) => onFieldChange('delivery', e.target.value)}
                  placeholder="引渡し情報を入力してください"
                />
              ) : (
                <Typography variant="body1">{data.delivery}</Typography>
              )}
            </Box>
          </Grid>
        )}
      </Grid>
    </>
  );
}
