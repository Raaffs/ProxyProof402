import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  Typography, 
  Button, 
  CircularProgress, 
  Grid, 
  Chip, 
  Container 
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SecurityIcon from '@mui/icons-material/Security';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleScan = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        bgcolor: '#060d17', 
        color: '#fff', 
        position: 'relative', 
        overflow: 'hidden', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        py: 6
      }}
    >
      {/* --- BACKGROUND ANIMATIONS & GLOWS --- */}
      {/* Glowing Orb 1 */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: '-10%', 
          left: '15%', 
          width: 500, 
          height: 500, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(60px)', 
          pointerEvents: 'none' 
        }} 
      />

      {/* Glowing Orb 2 */}
      <Box 
        sx={{ 
          position: 'absolute', 
          bottom: '-10%', 
          right: '15%', 
          width: 600, 
          height: 600, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(41,121,255,0.15) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(80px)', 
          pointerEvents: 'none' 
        }} 
      />

      {/* CSS Floating Particles & Animated Bots */}
      <Box 
        sx={{ 
          position: 'absolute', 
          inset: 0, 
          pointerEvents: 'none', 
          opacity: 0.6,
          '& .floating-bot': {
            position: 'absolute',
            color: 'rgba(0, 229, 255, 0.25)',
            animation: 'float 8s infinite ease-in-out',
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-25px) rotate(10deg)' },
          }
        }}
      >
        <SmartToyIcon className="floating-bot" sx={{ top: '15%', left: '10%', fontSize: 40, animationDelay: '0s !important' }} />
        <SmartToyIcon className="floating-bot" sx={{ top: '65%', left: '80%', fontSize: 50, animationDelay: '2s !important' }} />
        <SmartToyIcon className="floating-bot" sx={{ top: '75%', left: '15%', fontSize: 35, animationDelay: '4s !important' }} />
        <SmartToyIcon className="floating-bot" sx={{ top: '20%', left: '85%', fontSize: 45, animationDelay: '1s !important' }} />
      </Box>

      {/* --- MAIN CONTAINER --- */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          
          {/* LEFT COLUMN: Hero Description & Crypto Buzzwords */}
          <Grid item xs={12} md={7}>
            <Box sx={{ mb: 2 }}>
              <Chip 
                icon={<VerifiedUserIcon sx={{ fontSize: '16px !important' }} />} 
                label="Hedera x402 + Reclaim zkTLS Escrow" 
                color="primary" 
                variant="outlined" 
                sx={{ borderRadius: 2, bgcolor: 'rgba(0, 229, 255, 0.05)', borderColor: 'rgba(0, 229, 255, 0.3)' }}
              />
            </Box>

            <Typography 
              variant="h2" 
              component="h1" 
              sx={{ 
                fontWeight: 800, 
                letterSpacing: '-1px', 
                mb: 2, 
                background: 'linear-gradient(135deg, #ffffff 0%, #00e5ff 50%, #2979ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              ProxyProof402
            </Typography>

            <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 400, mb: 4, lineHeight: 1.6 }}>
              Verifiable, zero-knowledge AI proxy infrastructure. Clients pay-per-token via Hedera x402 micropayments while proving exact model signatures, token counts, and provider responses on-chain.
            </Typography>

            {/* Feature Cards Grid */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2, border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                  <SecurityIcon sx={{ color: '#00e5ff', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>zkTLS Proofs</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Reclaim protocol verifies exact provider outputs without leaking data.</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2, border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                  <CurrencyExchangeIcon sx={{ color: '#00e5ff', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>x402 Micropayments</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Automated escrow and settlement built natively on Hedera.</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2, border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                  <SmartToyIcon sx={{ color: '#00e5ff', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>Sybil Resistance</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>World ID selfie verification for automated trust score management.</Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* RIGHT COLUMN: Glassmorphic World ID Login Card */}
          <Grid item xs={12} md={5}>
            <Card 
              elevation={0}
              sx={{ 
                p: 4, 
                textAlign: 'center', 
                bgcolor: 'rgba(10, 25, 41, 0.75)', 
                backdropFilter: 'blur(16px)', 
                borderRadius: 4, 
                border: '1px solid rgba(0, 229, 255, 0.25)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
              }}
            >
              <Box sx={{ display: 'inline-flex', p: 2, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: 3, mb: 2 }}>
                <QrCodeScannerIcon sx={{ fontSize: 40, color: '#00e5ff' }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }} gutterBottom>
                World ID Verification
              </Typography>
              
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                Scan with World App to perform a human selfie check and authenticate your agent owner session.
              </Typography>

              {/* Styled Mock QR Code Frame */}
              <Box 
                sx={{ 
                  p: 3, 
                  bgcolor: '#000', 
                  borderRadius: 3, 
                  mb: 3, 
                  border: '2px solid #00e5ff', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)'
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#00e5ff', letterSpacing: 2 }}>
                  [ WORLD ID SCANNER ]
                </Typography>
              </Box>

              <Button 
                variant="contained" 
                fullWidth 
                size="large"
                onClick={handleScan}
                disabled={loading}
                sx={{ 
                  py: 1.5, 
                  fontWeight: 700, 
                  bgcolor: '#00e5ff', 
                  color: '#060d17',
                  '&:hover': { bgcolor: '#00b2cc' },
                  boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)'
                }}
              >
                {loading ? <CircularProgress size={26} sx={{ color: '#060d17' }} /> : 'Simulate Phone Scan'}
              </Button>
            </Card>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
}