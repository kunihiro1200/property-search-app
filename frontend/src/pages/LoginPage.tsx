import { Box, Button, Container, Paper, Typography, Alert, Link } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import HomeIcon from '@mui/icons-material/Home';
import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';

export default function LoginPage() {
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (errorParam === 'auth_failed') {
      setError('認証に失敗しました。もう一度お試しください。');
    } else if (errorParam) {
      setError(errorDescription || errorParam);
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);
      console.log('🔵 Starting Google login...');
      
      await loginWithGoogle();
      
      console.log('✅ Login initiated successfully');
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'ログインに失敗しました。もう一度お試しください。';
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            売主リスト管理システム
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Googleアカウントでログインしてください
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={!isLoading && <GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={isLoading}
            sx={{ py: 1.5 }}
          >
            {isLoading ? 'ログイン中...' : 'Googleでログイン'}
          </Button>
          
          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Link
              component={RouterLink}
              to="/public/properties"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <HomeIcon fontSize="small" />
              公開物件サイトを見る
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
