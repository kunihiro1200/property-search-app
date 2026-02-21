import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { GoogleCalendarConnect } from '../components/GoogleCalendarConnect';

const SettingsPage: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        設定
      </Typography>

      <Box sx={{ mt: 3 }}>
        <GoogleCalendarConnect />
      </Box>

      {/* 将来的に他の設定項目を追加できます */}
    </Container>
  );
};

export default SettingsPage;
