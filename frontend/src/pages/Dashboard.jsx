import React, { useState } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  Stack, 
  Container,
  Modal,
  IconButton,
  Tooltip
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import LockClockIcon from '@mui/icons-material/LockClock';
import SpeedIcon from '@mui/icons-material/Speed';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';

import Header from '../components/Header';
import AgentManager from '../components/AgentManager';
import ProviderTable from '../components/ProviderTable';
import Terminal from '../components/Terminal';
import RiskModal from '../components/RiskModal';

export default function Dashboard() {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProviderSelect = (provider) => {
    if (provider.score && provider.score < 50) {
      setSelectedProvider(provider);
      setShowRiskModal(true);
    } else {
      setSelectedProvider(provider);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#060d17', color: '#fff', pb: 6 }}>
      
      {/* HEADER */}
      <Header />

      {/* MAIN CONTAINER */}
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        
        {/* TOP METRICS RIBBON */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, bgcolor: 'rgba(10, 25, 41, 0.75)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>TOTAL PROOF QUERIES</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mt: 0.5 }}>14,289</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: 2 }}>
                  <StorageIcon sx={{ color: '#00e5ff' }} />
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, bgcolor: 'rgba(10, 25, 41, 0.75)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>ACTIVE HBAR</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#00e5ff', mt: 0.5 }}>570.5 <Typography component="span" variant="body2" sx={{ color: '#64748b' }}>HBAR</Typography></Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: 2 }}>
                  <LockClockIcon sx={{ color: '#00e5ff' }} />
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, bgcolor: 'rgba(10, 25, 41, 0.75)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>AVG LATENCY</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#4caf50', mt: 0.5 }}>18 <Typography component="span" variant="body2" sx={{ color: '#64748b' }}>ms</Typography></Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                  <SpeedIcon sx={{ color: '#4caf50' }} />
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, bgcolor: 'rgba(10, 25, 41, 0.75)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>REGISTERED PROVIDERS</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mt: 0.5 }}>24</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: 2 }}>
                  <ElectricBoltIcon sx={{ color: '#00e5ff' }} />
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* MAIN CONTENT GRID */}
        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              <AgentManager />
              <Card sx={{ p: 3, bgcolor: 'rgba(10, 25, 41, 0.75)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#00e5ff', mb: 1 }}>
                  x402 Execution Lifecycle
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', lineHeight: 1.6, display: 'block' }}>
                  1. Select an HCS provider from the registry.<br />
                  2. Initiate a query; client sends HBAR via x402 .<br />
                  3. Provider streams response along with signed Reclaim zkTLS proof.<br />
                  4. Proof validates on-chain and reputation is automatically modified.
                </Typography>
              </Card>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Stack spacing={3}>
              <ProviderTable 
                onSelect={handleProviderSelect} 
                selectedProviderId={selectedProvider?.agentId} 
              />

              {/* TERMINAL */}
              <Box sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: 12, right: 16, zIndex: 10 }}>
                  <Tooltip title="Expand Dedicated Window">
                    <IconButton 
                      onClick={() => setIsModalOpen(true)} 
                      size="small" 
                      sx={{ color: '#00e5ff', bgcolor: 'rgba(0, 229, 255, 0.1)', '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.2)' } }}
                    >
                      <OpenInFullIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Terminal provider={selectedProvider} />
              </Box>
            </Stack>
          </Grid>
        </Grid>

      </Container>

      {/* TERMINAL MODAL */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box 
          sx={{ 
            width: '90vw', 
            height: '85vh', 
            bgcolor: '#060d17', 
            borderRadius: 3,
            outline: 'none',
            p: 3,
            position: 'relative'
          }}
        >
          <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 100 }}>
            <IconButton 
              onClick={() => setIsModalOpen(false)} 
              size="medium" 
              sx={{ color: '#00e5ff', bgcolor: 'rgba(0, 229, 255, 0.1)' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ width: '100%', height: '100%' }}>
            <Terminal provider={selectedProvider} />
          </Box>
        </Box>
      </Modal>

      <RiskModal 
        open={showRiskModal} 
        provider={selectedProvider} 
        onClose={() => setShowRiskModal(false)}
        onApprove={() => setShowRiskModal(false)}
      />
    </Box>
  );
}