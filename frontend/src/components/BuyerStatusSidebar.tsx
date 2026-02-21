import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Badge,
  CircularProgress,
} from '@mui/material';
import api from '../services/api';

interface StatusCategory {
  status: string;
  count: number;
  priority: number;
  color: string;
}

interface BuyerStatusSidebarProps {
  selectedStatus: string | null;
  onStatusSelect: (status: string | null) => void;
}

export default function BuyerStatusSidebar({ selectedStatus, onStatusSelect }: BuyerStatusSidebarProps) {
  const [categories, setCategories] = useState<StatusCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchStatusCategories();
  }, []);

  const fetchStatusCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/buyers/status-categories');
      const data = res.data as StatusCategory[];
      
      // 総数を計算
      const total = data.reduce((sum, cat) => sum + cat.count, 0);
      setTotalCount(total);
      
      // カウントが0より大きいカテゴリーのみを表示
      const filteredCategories = data.filter(cat => cat.count > 0);
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Failed to fetch status categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (status: string) => {
    if (selectedStatus === status) {
      // 同じステータスをクリックした場合は選択解除
      onStatusSelect(null);
    } else {
      onStatusSelect(status);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ width: 280, flexShrink: 0, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: 280, flexShrink: 0 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1" fontWeight="bold">ステータス</Typography>
      </Box>
      
      <List dense sx={{ maxHeight: 'calc(80vh - 100px)', overflow: 'auto' }}>
        {/* All カテゴリー */}
        <ListItemButton
          selected={!selectedStatus}
          onClick={() => onStatusSelect(null)}
          sx={{ py: 1 }}
        >
          <ListItemText 
            primary="All" 
            primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Badge 
            badgeContent={totalCount} 
            color="primary" 
            max={9999} 
            sx={{ ml: 1 }}
          />
        </ListItemButton>

        {/* ステータスカテゴリー */}
        {categories.map((category) => (
          <ListItemButton
            key={category.status}
            selected={selectedStatus === category.status}
            onClick={() => handleStatusClick(category.status)}
            sx={{ 
              py: 1,
              borderLeft: `4px solid ${category.color}`,
              '&.Mui-selected': {
                backgroundColor: `${category.color}15`,
                borderLeft: `4px solid ${category.color}`,
              },
              '&:hover': {
                backgroundColor: `${category.color}10`,
              }
            }}
          >
            <ListItemText 
              primary={category.status || '（該当なし）'} 
              primaryTypographyProps={{ 
                variant: 'body2',
                noWrap: true,
                sx: { 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
              sx={{ flex: 1, minWidth: 0, mr: 1 }}
            />
            <Badge 
              badgeContent={category.count} 
              sx={{ 
                ml: 1,
                '& .MuiBadge-badge': {
                  backgroundColor: category.color,
                  color: '#fff'
                }
              }}
              max={9999}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
