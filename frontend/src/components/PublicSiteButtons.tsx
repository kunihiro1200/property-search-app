import { Box, Button } from '@mui/material';
import { Public as PublicIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { canManageSite } from './SiteManagementAccessGate';

export default function PublicSiteButtons() {
  const employee = useAuthStore(state => state.employee);
  const handleOpenPublicSite = () => {
    // 新しいタブで公開サイトを開く（本番環境のURL）
    window.open('https://property-site-frontend-kappa.vercel.app/public/properties', '_blank', 'noopener,noreferrer');
  };

  const handleOpenAdminSite = () => {
    // 新しいタブで管理者向け公開サイトを開く
    window.open('/public/properties?canHide=true', '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
      }}
    >
      <Button
        variant="outlined"
        color="primary"
        startIcon={<PublicIcon />}
        onClick={handleOpenPublicSite}
        aria-label="一般向け公開サイトを開く"
        sx={{ whiteSpace: 'nowrap' }}
      >
        一般向け公開サイト
      </Button>
      
      {canManageSite(employee) && <Button
        variant="contained"
        color="secondary"
        startIcon={<AdminIcon />}
        onClick={handleOpenAdminSite}
        aria-label="管理者向け公開サイトを開く"
        sx={{ whiteSpace: 'nowrap' }}
      >
        管理者向け公開サイト
      </Button>}
    </Box>
  );
}
