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
  Container,
  Alert
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SecurityIcon from '@mui/icons-material/Security';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';

import { IDKit, orbLegacy } from '@worldcoin/idkit-core';
import QRCode from 'qrcode';

// Vite environment variables
const WORLD_APP_ID = import.meta.env.VITE_WORLD_APP_ID;
const WORLD_RP_ID = import.meta.env.VITE_WORLD_RP_ID;

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [connectUri, setConnectUri] = useState('');
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartVerification = async () => {
    if (!WORLD_APP_ID || !WORLD_RP_ID) {
      setErrorMsg('Missing VITE_WORLD_APP_ID or VITE_WORLD_RP_ID in frontend .env file.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setQrUrl('');
    setConnectUri('');
    setStatusText('Requesting RP signature from server...');

    const action = 'demo-action';

    try {
      // 1. Request signature from backend
      const sigRes = await fetch('http://localhost:5000/api/rp-signature', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const sig = await sigRes.json();
      if (!sigRes.ok) throw new Error(sig.error || 'Failed to get RP signature');

      const rp_context = {
        rp_id: WORLD_RP_ID,
        nonce: sig.nonce,
        created_at: sig.created_at,
        expires_at: sig.expires_at,
        signature: sig.sig,
      };

      // 2. Build IDKit request with Sandbox environment
      const request = await IDKit.request({
        app_id: WORLD_APP_ID,
        action,
        rp_context,
        allow_legacy_proofs: true,
        environment: 'sandbox',
      }).preset(orbLegacy());

      // 3. Render QR Code for mobile scanning / deep linking
      const uri = request.connectorURI;
      setConnectUri(uri);
      const generatedQrSvg = await QRCode.toDataURL(uri, { width: 220, margin: 2 });
      setQrUrl(generatedQrSvg);

      setStatusText('Scan QR with your World ID Sandbox App...');

      // 4. Poll bridge until proof is signed in app
      const outcome = await request.pollUntilCompletion();

      if (!outcome.success) {
        throw new Error('Verification cancelled or failed: ' + outcome.error);
      }

      setStatusText('Proof received! Verifying on backend...');

      // 5. Send proof to backend for verification
      const verifyRes = await fetch('http://localhost:5000/api/verify-proof', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, idkitResponse: outcome.result }),
      });

      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyBody.error || 'Verification failed on server');
      }

      setStatusText('Verification successful! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      setErrorMsg(err.message || String(err));
      setStatusText('');
    } finally {
      setLoading(false);
    }
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
      {/* Background Glows */}
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

      {/* Floating Bots */}
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
        <SmartToyIcon className="floating-bot" sx={{ top: '15%', left: '10%', fontSize: 40 }} />
        <SmartToyIcon className="floating-bot" sx={{ top: '65%', left: '80%', fontSize: 50 }} />
        <SmartToyIcon className="floating-bot" sx={{ top: '75%', left: '15%', fontSize: 35 }} />
        <SmartToyIcon className="floating-bot" sx={{ top: '20%', left: '85%', fontSize: 45 }} />
      </Box>

      {/* MAIN CONTAINER */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          
          {/* LEFT COLUMN */}
          <Grid item xs={12} md={7}>
            <Box sx={{ mb: 2 }}>
              <Chip 
                icon={<VerifiedUserIcon sx={{ fontSize: '16px !important' }} />} 
                label="Hedera x402 using blocky402 + Reclaim zkTLS" 
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
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Automated zk-based reputation score built natively on Hedera.</Typography>
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

          {/* RIGHT COLUMN: World ID Login Card */}
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
                Scan with World App (Sandbox) to perform a human check and authenticate your session.
              </Typography>

              {errorMsg && (
                <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(248, 113, 113, 0.1)', color: '#f87171' }}>
                  {errorMsg}
                </Alert>
              )}

              {/* Dynamic QR Display */}
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: '#000', 
                  borderRadius: 3, 
                  mb: 3, 
                  border: '2px solid #00e5ff', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: 220,
                  boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)'
                }}
              >
                {qrUrl ? (
                  <img src={qrUrl} alt="World ID QR Code" style={{ borderRadius: 8 }} />
                ) : (
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#00e5ff', letterSpacing: 2 }}>
                    [ WORLD ID SCANNER ]
                  </Typography>
                )}
              </Box>

              {statusText && (
                <Typography variant="caption" sx={{ display: 'block', color: '#00e5ff', mb: 2 }}>
                  {statusText}
                </Typography>
              )}

              {connectUri && (
                <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mb: 2 }}>
                  Mobile testing? <a href={connectUri} target="_blank" rel="noopener noreferrer" style={{ color: '#00e5ff' }}>Tap here to open Sandbox App</a>
                </Typography>
              )}

              <Button 
                variant="contained" 
                fullWidth 
                size="large"
                onClick={handleStartVerification}
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
                {loading ? <CircularProgress size={26} sx={{ color: '#060d17' }} /> : 'Verify with World ID'}
              </Button>
            </Card>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
}