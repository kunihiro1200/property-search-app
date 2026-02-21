import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Grid,
  Paper,
  Divider,
  Link as MuiLink,
} from '@mui/material';
import { DuplicateMatch, Activity } from '../types';
import ActivityItem from './ActivityItem';

interface DuplicateWithDetails extends DuplicateMatch {
  comments?: string;
  activities?: Activity[];
}

interface DuplicateCardProps {
  duplicate: DuplicateWithDetails;
}

const DuplicateCard: React.FC<DuplicateCardProps> = ({ duplicate }) => {
  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'phone':
        return '電話番号';
      case 'email':
        return 'メールアドレス';
      case 'both':
        return '電話番号・メールアドレス';
      default:
        return matchType;
    }
  };

  const getMatchTypeColor = (matchType: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (matchType) {
      case 'both':
        return 'error';
      case 'phone':
        return 'warning';
      case 'email':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            <MuiLink
              href={`/sellers/${duplicate.sellerId}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: 'none', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
            >
              {duplicate.sellerInfo.sellerNumber || duplicate.sellerId}
            </MuiLink>
          </Typography>
          <Chip
            label={getMatchTypeLabel(duplicate.matchType)}
            color={getMatchTypeColor(duplicate.matchType)}
            size="small"
          />
        </Box>

        {/* Seller Info */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              名前
            </Typography>
            <Typography variant="body1">{duplicate.sellerInfo.name}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              反響日
            </Typography>
            <Typography variant="body1">
              {duplicate.sellerInfo.inquiryDate
                ? new Date(duplicate.sellerInfo.inquiryDate).toLocaleDateString('ja-JP')
                : '-'}
            </Typography>
          </Grid>
        </Grid>

        {/* Property Info */}
        {duplicate.propertyInfo && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              物件情報
            </Typography>
            <Typography variant="body1">
              {duplicate.propertyInfo.address} ({duplicate.propertyInfo.propertyType})
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Spreadsheet Comments */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            スプレッドシートコメント
          </Typography>
          {duplicate.comments ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {duplicate.comments}
              </Typography>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              コメントはありません
            </Typography>
          )}
        </Box>

        {/* Communication History */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            コミュニケーション履歴（最新20件）
          </Typography>
          {duplicate.activities && duplicate.activities.length > 0 ? (
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {duplicate.activities.slice(0, 20).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              履歴はありません
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DuplicateCard;
