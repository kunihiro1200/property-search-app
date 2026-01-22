import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';

interface AthomeSectionProps {
  propertyId: string;
}

interface AthomeDataResponse {
  data: string[];
  propertyType: string;
  cached: boolean;
}

/**
 * Athome情報セクション
 * 
 * 公開物件詳細ページに表示される、業務リストスプレッドシートの
 * athomeシートから取得した物件詳細情報を表示するコンポーネント
 */
const AthomeSection: React.FC<AthomeSectionProps> = ({ propertyId }) => {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAthomeData();
  }, [propertyId]);

  const fetchAthomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 3秒タイムアウトを設定
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `/api/public/properties/${propertyId}/athome`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: AthomeDataResponse = await response.json();
      setData(result.data || []);
    } catch (error: any) {
      console.error('[AthomeSection] Failed to fetch data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ローディング中
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // エラーまたはデータなし（サイレントフェイル）
  if (error || data.length === 0) {
    return null;
  }

  return (
    <Paper elevation={2} className="athome-section" sx={{ p: 3, mb: 3 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: 'bold',
        }}
      >
        物件詳細情報
      </Typography>
      <Box component="ul" sx={{ pl: 2, m: 0 }}>
        {data.map((item, index) => (
          <Typography
            component="li"
            key={index}
            sx={{
              mb: 1,
              lineHeight: 1.8,
            }}
          >
            {item}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

export default AthomeSection;
