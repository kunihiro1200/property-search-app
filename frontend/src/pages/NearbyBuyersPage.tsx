import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NearbyBuyersList from '../components/NearbyBuyersList';

const NearbyBuyersPage = () => {
  const { sellerId } = useParams<{ sellerId: string }>();

  const handleBack = () => {
    window.close();
  };

  if (!sellerId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          売主IDが指定されていません
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            variant="outlined"
          >
            閉じる
          </Button>
          <Typography variant="h5">
            近隣買主リスト
          </Typography>
        </Box>
      </Paper>

      {/* 近隣買主リスト */}
      <NearbyBuyersList sellerId={sellerId} />
    </Box>
  );
};

export default NearbyBuyersPage;
