import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Chip, 
  Box, 
  Stack, 
  Button 
} from '@mui/material';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SmartToyIcon from '@mui/icons-material/SmartToy';

export default function Header() {
  const navigate = useNavigate();

  return (
    <AppBar 
      position="static" 
      elevation={0} 
      sx={{ 
        bgcolor: 'rgba(10, 25, 41, 0.8)', 
        backdropFilter: 'blur(16px)', 
        borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
        px: { xs: 2, md: 4 }
      }}
    >
      <Toolbar disableGutters sx={{ justifyContent: 'space-between', height: 70 }}>
        
        {/* Logo & Network Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box 
            onClick={() => navigate('/dashboard')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          >
            <ElectricBoltIcon sx={{ color: '#00e5ff', fontSize: 28 }} />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 800, 
                letterSpacing: '0.5px',
                background: 'linear-gradient(135deg, #ffffff 0%, #00e5ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              ProxyProof402
            </Typography>
          </Box>

          <Chip 
            icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 8px #4caf50', ml: '8px !important' }} />}
            label="HCS MAINNET OPERATIONAL" 
            size="small" 
            sx={{ 
              bgcolor: 'rgba(76, 175, 80, 0.1)', 
              color: '#4caf50', 
              border: '1px solid rgba(76, 175, 80, 0.3)',
              fontWeight: 700,
              fontSize: '0.65rem',
              display: { xs: 'none', sm: 'flex' }
            }} 
          />
        </Box>

        {/* User & Navigation Actions */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button 
            size="small" 
            startIcon={<SmartToyIcon />}
            onClick={() => navigate('/agents')}
            sx={{ color: '#00e5ff', fontWeight: 600, textTransform: 'none' }}
          >
            Fleet Manager
          </Button>

          <Chip 
            icon={<VerifiedUserIcon sx={{ color: '#00e5ff !important', fontSize: '18px !important' }} />} 
            label="World ID Verified" 
            variant="outlined" 
            sx={{ 
              borderColor: 'rgba(0, 229, 255, 0.3)', 
              color: '#fff', 
              bgcolor: 'rgba(0, 229, 255, 0.05)',
              fontWeight: 600 
            }} 
          />
        </Stack>

      </Toolbar>
    </AppBar>
  );
}