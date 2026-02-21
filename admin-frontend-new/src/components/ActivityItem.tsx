import React from 'react';
import { Box, Typography } from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon, Sms as SmsIcon, Info as InfoIcon } from '@mui/icons-material';
import { Activity } from '../types';

interface ActivityItemProps {
  activity: Activity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'phone_call':
        return <PhoneIcon fontSize="small" />;
      case 'email':
        return <EmailIcon fontSize="small" />;
      case 'sms':
        return <SmsIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'phone_call':
        return '電話';
      case 'email':
        return 'メール';
      case 'sms':
        return 'SMS';
      case 'hearing':
        return 'ヒアリング';
      case 'appointment':
        return '訪問予約';
      default:
        return type;
    }
  };

  return (
    <Box
      display="flex"
      alignItems="flex-start"
      gap={1}
      p={1}
      sx={{
        borderLeft: 2,
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ color: 'text.secondary', mt: 0.5 }}>
        {getActivityIcon(activity.type)}
      </Box>
      <Box flex={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {getActivityTypeLabel(activity.type)}
            {activity.employee && ` - ${activity.employee.name}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(activity.createdAt).toLocaleString('ja-JP')}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 100,
            overflow: 'auto',
          }}
        >
          {activity.content}
        </Typography>
      </Box>
    </Box>
  );
};

export default ActivityItem;
