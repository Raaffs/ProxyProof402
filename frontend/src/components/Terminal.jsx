import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  Typography, 
  Chip, 
  Stack, 
  LinearProgress, 
  Paper,
  Divider,
  Grid
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LockIcon from '@mui/icons-material/Lock';
import ShieldCheckIcon from '@mui/icons-material/Verified';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import TerminalIcon from '@mui/icons-material/Terminal';

export default function Terminal({ provider }) {
  const [packetCount, setPacketCount] = useState(142);
  const [hbarEscrow, setHbarEscrow] = useState(0.0052);
  const [activePulse, setActivePulse] = useState(false);

  // Trigger pulse animation periodically to simulate data flow
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePulse(true);
      setPacketCount((prev) => prev + 1);
      setHbarEscrow((prev) => parseFloat((prev + 0.0004).toFixed(4)));
      setTimeout(() => setActivePulse(false), 1200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeProvider = provider?.name || 'Nexus-AI';
  const activeModel = provider?.model || 'Claude 3.5 Sonnet';

  return (
    <Card 
      elevation={0}
      sx={{ 
        bgcolor: 'rgba(10, 25, 41, 0.75)', 
        backdropFilter: 'blur(16px)', 
        borderRadius: 3, 
        border: '1px solid rgba(0, 229, 255, 0.2)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}
    >
      {/* Top Header */}
      <Box sx={{ p: 2, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0, 229, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SyncAltIcon sx={{ color: '#00e5ff' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem' }}>
            P2P x402 Micropayment & zkTLS Exchange
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label="HTTP 402 PAYMENT REQUIRED" size="small" color="primary" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
          <Chip label="HCS ESCROW ACTIVE" size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: '1px solid rgba(76, 175, 80, 0.3)', fontWeight: 700 }} />
        </Stack>
      </Box>

      {/* Main Visual Exchange Area */}
      <Box sx={{ p: 4, position: 'relative', bgcolor: 'rgba(6, 13, 23, 0.6)' }}>
        
        {/* Network Nodes Grid */}
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          
          {/* CLIENT BOT (Local) */}
          <Grid item xs={12} sm={3.5}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2.5, 
                textAlign: 'center', 
                bgcolor: 'rgba(19, 47, 76, 0.5)', 
                border: '1px solid rgba(0, 229, 255, 0.3)', 
                borderRadius: 3,
                boxShadow: '0 0 20px rgba(0, 229, 255, 0.1)'
              }}
            >
              <Box sx={{ display: 'inline-flex', p: 1.5, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: '50%', mb: 1 }}>
                <SmartToyIcon sx={{ fontSize: 36, color: '#00e5ff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>
                Local Client Agent
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', display: 'block', mb: 1 }}>
                0x482f...a91e
              </Typography>
              <Chip label="Consumer" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.65rem' }} />
            </Paper>
          </Grid>

          {/* ANIMATED P2P CONNECTOR LINE */}
          <Grid item xs={12} sm={5}>
            <Box sx={{ position: 'relative', px: 1, textCenter: 'center' }}>
              
              {/* Status Text overlay above line */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#00e5ff', fontFamily: 'monospace', fontWeight: 600 }}>
                  x402 Header Attached
                </Typography>
                <Typography variant="caption" sx={{ color: '#4caf50', fontFamily: 'monospace', fontWeight: 600 }}>
                  zkTLS Verified
                </Typography>
              </Box>

              {/* Connecting Line Track */}
              <Box 
                sx={{ 
                  height: 4, 
                  width: '100%', 
                  bgcolor: 'rgba(0, 229, 255, 0.15)', 
                  borderRadius: 2, 
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Animated Moving Data Pulse */}
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    bottom: 0, 
                    width: '30%', 
                    background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
                    animation: activePulse ? 'pulseMove 1.2s ease-in-out' : 'none',
                    '@keyframes pulseMove': {
                      '0%': { left: '-30%' },
                      '100%': { left: '100%' }
                    }
                  }} 
                />
              </Box>

              {/* Central Lock / Settlement Shield */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: -1.5 }}>
                <Paper 
                  sx={{ 
                    px: 1.5, 
                    py: 0.5, 
                    bgcolor: '#0a1929', 
                    border: '1px solid #00e5ff', 
                    borderRadius: 4, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.8,
                    boxShadow: activePulse ? '0 0 15px #00e5ff' : 'none',
                    transition: 'box-shadow 0.3s ease'
                  }}
                >
                  <LockIcon sx={{ fontSize: 14, color: '#00e5ff' }} />
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>
                    {hbarEscrow} HBAR
                  </Typography>
                </Paper>
              </Box>

            </Box>
          </Grid>

          {/* PROVIDER BOT (Remote) */}
          <Grid item xs={12} sm={3.5}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2.5, 
                textAlign: 'center', 
                bgcolor: 'rgba(19, 47, 76, 0.5)', 
                border: '1px solid rgba(0, 229, 255, 0.3)', 
                borderRadius: 3,
                boxShadow: '0 0 20px rgba(0, 229, 255, 0.1)'
              }}
            >
              <Box sx={{ display: 'inline-flex', p: 1.5, bgcolor: 'rgba(41, 121, 255, 0.1)', borderRadius: '50%', mb: 1 }}>
                <SmartToyIcon sx={{ fontSize: 36, color: '#2979ff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>
                {activeProvider}
              </Typography>
              <Typography variant="caption" sx={{ color: '#00e5ff', fontFamily: 'monospace', display: 'block', mb: 1 }}>
                {activeModel}
              </Typography>
              <Chip label="HCS Provider" size="small" color="primary" sx={{ fontSize: '0.65rem' }} />
            </Paper>
          </Grid>

        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Live Network Stream Logs */}
        <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.5)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TerminalIcon sx={{ fontSize: 16, color: '#64748b' }} />
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>
              REALTIME PROOF STREAM
            </Typography>
          </Box>

          <Stack spacing={0.8} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            <Box sx={{ color: '#4caf50', display: 'flex', gap: 1 }}>
              <span>[OK]</span>
              <span>HTTP 402 Settlement verified on Hedera Consensus Service (HCS Topic #0.0.48192)</span>
            </Box>
            <Box sx={{ color: '#00e5ff', display: 'flex', gap: 1 }}>
              <span>[PROOF]</span>
              <span>Reclaim zkTLS TLS-session signed: TLS_AES_256_GCM_SHA384 (packet #{packetCount})</span>
            </Box>
            <Box sx={{ color: '#94a3b8', display: 'flex', gap: 1 }}>
              <span>[STREAM]</span>
              <span>Tokens streaming: 1,420 tokens delivered | Escrow unlocked: {hbarEscrow} HBAR</span>
            </Box>
          </Stack>
        </Box>

      </Box>
    </Card>
  );
}