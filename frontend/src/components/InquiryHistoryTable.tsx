import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Typography,
  Chip,
  Box,
  TableSortLabel,
} from '@mui/material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface InquiryHistoryItem {
  buyerNumber: string;
  propertyNumber: string;
  propertyAddress: string;
  inquiryDate: string;
  status: 'current' | 'past';
  propertyId: string;
  propertyListingId: string;
}

interface InquiryHistoryTableProps {
  inquiryHistory: InquiryHistoryItem[];
  selectedPropertyIds: Set<string>;
  onSelectionChange: (propertyIds: Set<string>) => void;
  onBuyerClick?: (buyerNumber: string) => void;
}

type SortColumn = 'inquiryDate' | 'propertyNumber';
type SortOrder = 'asc' | 'desc';

const InquiryHistoryTable: React.FC<InquiryHistoryTableProps> = ({
  inquiryHistory,
  selectedPropertyIds,
  onSelectionChange,
  onBuyerClick,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('inquiryDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = new Set(inquiryHistory.map(item => item.propertyListingId));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (propertyListingId: string) => {
    const newSelected = new Set(selectedPropertyIds);
    if (newSelected.has(propertyListingId)) {
      newSelected.delete(propertyListingId);
    } else {
      newSelected.add(propertyListingId);
    }
    onSelectionChange(newSelected);
  };

  const handleSort = (column: SortColumn) => {
    const isAsc = sortColumn === column && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortColumn(column);
  };

  const sortedHistory = [...inquiryHistory].sort((a, b) => {
    let comparison = 0;
    
    if (sortColumn === 'inquiryDate') {
      comparison = new Date(a.inquiryDate).getTime() - new Date(b.inquiryDate).getTime();
    } else if (sortColumn === 'propertyNumber') {
      comparison = a.propertyNumber.localeCompare(b.propertyNumber);
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const isAllSelected = inquiryHistory.length > 0 && 
    selectedPropertyIds.size === inquiryHistory.length;
  const isSomeSelected = selectedPropertyIds.size > 0 && 
    selectedPropertyIds.size < inquiryHistory.length;

  const getRowStyle = (item: InquiryHistoryItem, isSelected: boolean) => {
    if (isSelected) {
      return { backgroundColor: '#bbdefb', cursor: 'pointer' };
    }
    if (item.status === 'current') {
      return { backgroundColor: '#e3f2fd', cursor: 'pointer' };
    }
    return { backgroundColor: '#f5f5f5', cursor: 'pointer' };
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy/MM/dd', { locale: ja });
    } catch (error) {
      return dateString;
    }
  };

  if (inquiryHistory.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          問い合わせ履歴がありません
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={2}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={isSomeSelected}
                checked={isAllSelected}
                onChange={handleSelectAll}
                inputProps={{ 'aria-label': 'すべて選択' }}
              />
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === 'propertyNumber'}
                direction={sortColumn === 'propertyNumber' ? sortOrder : 'asc'}
                onClick={() => handleSort('propertyNumber')}
              >
                物件番号
              </TableSortLabel>
            </TableCell>
            <TableCell>住所</TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === 'inquiryDate'}
                direction={sortColumn === 'inquiryDate' ? sortOrder : 'asc'}
                onClick={() => handleSort('inquiryDate')}
              >
                受付日
              </TableSortLabel>
            </TableCell>
            <TableCell>買主番号</TableCell>
            <TableCell>ステータス</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedHistory.map((item) => {
            const isSelected = selectedPropertyIds.has(item.propertyListingId);
            
            return (
              <TableRow
                key={item.propertyListingId}
                hover
                sx={getRowStyle(item, isSelected)}
                onClick={() => {
                  if (onBuyerClick && item.buyerNumber) {
                    onBuyerClick(item.buyerNumber);
                  }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleSelectOne(item.propertyListingId)}
                    onClick={(e) => e.stopPropagation()}
                    inputProps={{ 'aria-label': `物件 ${item.propertyNumber} を選択` }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {item.propertyNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                    {item.propertyAddress}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(item.inquiryDate)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.buyerNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status === 'current' ? '今回' : '過去'}
                    size="small"
                    sx={{
                      backgroundColor: item.status === 'current' ? '#2196f3' : '#9e9e9e',
                      color: 'white',
                      fontWeight: 'medium',
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default InquiryHistoryTable;
