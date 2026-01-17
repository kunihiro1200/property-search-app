import { Box, Button, ButtonGroup } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  Public as PublicIcon,
} from '@mui/icons-material';

export default function PageNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '売主リスト', icon: <HomeIcon /> },
    { path: '/buyers', label: '買主リスト', icon: <PeopleIcon /> },
    { path: '/property-listings', label: '物件リスト', icon: <ShoppingCartIcon /> },
    { path: '/work-tasks', label: '業務依頼', icon: <AssignmentIcon /> },
  ];

  const handlePublicSiteClick = () => {
    window.open('/public/properties', '_blank');
  };

  return (
    <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
      <ButtonGroup variant="outlined" size="large">
        {navItems.map((item) => (
          <Button
            key={item.path}
            onClick={() => navigate(item.path)}
            variant={location.pathname === item.path ? 'contained' : 'outlined'}
            startIcon={item.icon}
            sx={{ minWidth: 150 }}
          >
            {item.label}
          </Button>
        ))}
      </ButtonGroup>
      <Button
        variant="outlined"
        color="secondary"
        startIcon={<PublicIcon />}
        onClick={handlePublicSiteClick}
        sx={{ minWidth: 150 }}
      >
        公開物件サイト
      </Button>
    </Box>
  );
}
