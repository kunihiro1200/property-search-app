import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Badge,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { SECTION_COLORS } from '../theme/sectionColors';

interface PropertyListing {
  id: string;
  property_number?: string;
  sidebar_status?: string;
  [key: string]: any;
}

interface PropertySidebarStatusProps {
  listings: PropertyListing[];
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  pendingPriceReductionProperties?: Set<string>;
  onCompletePriceReduction?: (propertyNumber: string) => void;
}

// ステータスの優先順位（表示順）
const STATUS_PRIORITY: Record<string, number> = {
  '値下げ未完了': 0, // 最優先
  '未報告': 1,
  '未完了': 2,
  '非公開予定（確認後）': 3,
  '一般媒介の掲載確認未': 4,
  '本日公開予定': 5,
  'SUUMO URL　要登録': 6,
  'レインズ登録＋SUUMO登録': 7,
  '買付申込み（内覧なし）２': 8,
  '公開前情報': 9,
  '非公開（配信メールのみ）': 10,
  '一般公開中物件': 11,
  'Y専任公開中': 12,
  '生・専任公開中': 13,
  '久・専任公開中': 14,
  'U専任公開中': 15,
  '林・専任公開中': 16,
  'K専任公開中': 17,
  'R専任公開中': 18,
  'I専任公開中': 19,
};

export default function PropertySidebarStatus({
  listings,
  selectedStatus,
  onStatusChange,
  pendingPriceReductionProperties,
  onCompletePriceReduction,
}: PropertySidebarStatusProps) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  
  // ステータスごとにグループ化してカウント
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    
    // 値下げ未完了のカウント
    if (pendingPriceReductionProperties && pendingPriceReductionProperties.size > 0) {
      counts['値下げ未完了'] = pendingPriceReductionProperties.size;
    }
    
    listings.forEach(listing => {
      const status = listing.sidebar_status || '';
      if (status && status !== '値下げ未完了') { // 値下げ未完了は既にカウント済み
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    
    return counts;
  }, [listings, pendingPriceReductionProperties]);
  
  // 値下げ未完了の物件リストを取得
  const pendingPriceReductionList = useMemo(() => {
    if (!pendingPriceReductionProperties) return [];
    return listings.filter(l => 
      l.property_number && pendingPriceReductionProperties.has(l.property_number)
    );
  }, [listings, pendingPriceReductionProperties]);
  
  // 完了ボタンクリック時の処理
  const handleComplete = async (propertyNumber: string) => {
    if (!onCompletePriceReduction) return;
    
    setCompleting(propertyNumber);
    try {
      await onCompletePriceReduction(propertyNumber);
    } finally {
      setCompleting(null);
    }
  };

  // ステータスリストを優先順位順にソート
  const statusList = useMemo(() => {
    const list = [{ key: 'all', label: 'すべて', count: statusCounts.all }];
    
    // ステータスを優先順位順にソート
    const sortedStatuses = Object.entries(statusCounts)
      .filter(([key]) => key !== 'all' && key !== '')
      .sort((a, b) => {
        const priorityA = STATUS_PRIORITY[a[0]] || 999;
        const priorityB = STATUS_PRIORITY[b[0]] || 999;
        return priorityA - priorityB;
      });
    
    sortedStatuses.forEach(([key, count]) => {
      list.push({ key, label: key, count });
    });
    
    return list;
  }, [statusCounts]);

  return (
    <>
      <Paper sx={{ width: 220, flexShrink: 0 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            サイドバーステータス
          </Typography>
        </Box>
        <List dense sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {statusList.map((item) => (
            <ListItemButton
              key={item.key}
              selected={selectedStatus === item.key || (!selectedStatus && item.key === 'all')}
              onClick={() => onStatusChange(item.key === 'all' ? null : item.key)}
              sx={{ py: 0.5 }}
            >
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <Badge 
                badgeContent={item.count} 
                max={9999} 
                sx={{ 
                  ml: 1,
                  '& .MuiBadge-badge': {
                    backgroundColor: SECTION_COLORS.property.main,
                    color: SECTION_COLORS.property.contrastText,
                  },
                }} 
              />
            </ListItemButton>
          ))}
        </List>
        
        {/* 値下げ未完了が選択されている場合、完了ボタンを表示 */}
        {selectedStatus === '値下げ未完了' && pendingPriceReductionList.length > 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => setShowCompleteDialog(true)}
            >
              完了ボタン
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* 完了ダイアログ */}
      <Dialog
        open={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>値下げ未完了の物件</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下の物件の値下げ通知が予約されています。完了ボタンを押すと、この一覧から削除されます。
          </Typography>
          <List>
            {pendingPriceReductionList.map((property) => (
              <Box
                key={property.property_number}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 1,
                  border: '1px solid #eee',
                  borderRadius: 1,
                }}
              >
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {property.property_number}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {property.address || property.display_address || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    担当: {property.sales_assignee || '-'}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={completing === property.property_number ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                  disabled={completing === property.property_number}
                  onClick={() => handleComplete(property.property_number!)}
                >
                  完了
                </Button>
              </Box>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompleteDialog(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
