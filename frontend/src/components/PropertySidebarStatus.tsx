import { useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Badge,
  Paper,
} from '@mui/material';
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
}

// ステータスの優先順位（表示順）
const STATUS_PRIORITY: Record<string, number> = {
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
}: PropertySidebarStatusProps) {
  // ステータスごとにグループ化してカウント
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    
    listings.forEach(listing => {
      const status = listing.sidebar_status || '';
      if (status) {
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    
    return counts;
  }, [listings]);

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
    </Paper>
  );
}
