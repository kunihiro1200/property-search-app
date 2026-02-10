import { Box, Button, ButtonGroup } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { SECTION_COLORS } from '../theme/sectionColors';

export default function PageNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '売主リスト', icon: <HomeIcon />, color: SECTION_COLORS.seller.main },
    { path: '/buyers', label: '買主リスト', icon: <PeopleIcon />, color: SECTION_COLORS.buyer.main },
    { path: '/property-listings', label: '物件リスト', icon: <ShoppingCartIcon />, color: SECTION_COLORS.property.main },
    { path: '/work-tasks', label: '業務依頼', icon: <AssignmentIcon />, color: SECTION_COLORS.workTask.main },
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
            sx={{ 
              minWidth: 150,
              ...(location.pathname === item.path && {
                backgroundColor: item.color,
                borderColor: item.color,
                '&:hover': {
                  backgroundColor: item.color,
                  opacity: 0.9,
                },
              }),
              ...(!location.pathname.startsWith(item.path) && {
                borderColor: item.color,
                color: item.color,
                '&:hover': {
                  backgroundColor: `${item.color}15`,
                  borderColor: item.color,
                },
              }),
            }}
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
