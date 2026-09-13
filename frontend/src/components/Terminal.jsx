import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Stack,
  Paper,
  IconButton,
  InputBase,
  CircularProgress,
  Chip,
  Grid,
  Alert
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HubIcon from '@mui/icons-material/Hub';
import LockIcon from '@mui/icons-material/Lock';

// Base URL for API calls. Uses VITE_API_URL if set, otherwise defaults to localhost:5000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Terminal({ provider }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Step-by-step progressive state
  const [discoveryData, setDiscoveryData] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [logs, setLogs] = useState([
    '====================================================',
    '  Autonomous Client AI Agent CLI (zkTLS + x402)  ',
    '===================================================='
  ]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, discoveryData, successData, loading]);

  const handleExecute = (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const currentPrompt = prompt;
    setPrompt('');
    setLoading(true);
    setError(null);
    setDiscoveryData(null);
    setSuccessData(null);

    // Create EventSource stream connection to Express Backend (Port 5000)
    const streamUrl = `${API_BASE_URL}/api/execute-agent-stream?prompt=${encodeURIComponent(currentPrompt)}`;
    const eventSource = new EventSource(streamUrl);

    // Listen for log lines dynamically as they arrive
    eventSource.addEventListener('log', (e) => {
      const logMessage = JSON.parse(e.data);
      setLogs((prev) => [...prev, logMessage]);
    });

    // Listen for Discovery Phase payload
    eventSource.addEventListener('discovery', (e) => {
      const data = JSON.parse(e.data);
      setDiscoveryData(data);
    });

    // Listen for Final Execution Success
    eventSource.addEventListener('success', (e) => {
      const data = JSON.parse(e.data);
      setSuccessData(data);
      setLoading(false);
      eventSource.close();
    });

    // Handle Errors
    eventSource.addEventListener('error', (e) => {
      let msg = 'Execution error occurred.';
      if (e.data) {
        try { msg = JSON.parse(e.data); } catch (_) {}
      }
      setError(msg);
      setLogs((prev) => [...prev, `❌ Error: ${msg}`]);
      setLoading(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setLoading(false);
      eventSource.close();
    };
  };

  return (
    <Card
      sx={{
        bgcolor: '#081420',
        borderRadius: 3,
        border: '1px solid rgba(0, 229, 255, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '650px',
        overflow: 'hidden'
      }}
    >
      {/* TERMINAL HEADER */}
      <Box
        sx={{
          p: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'rgba(10, 25, 41, 0.9)',
          borderBottom: '1px solid rgba(0, 229, 255, 0.15)'
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TerminalIcon sx={{ color: '#00e5ff' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>
            x402 zkTLS Autonomous Client Console
          </Typography>
        </Stack>
        <Chip
          icon={<LockIcon sx={{ '&&': { color: '#00e5ff', fontSize: 14 } }} />}
          label={provider?.name ? `Active: ${provider.name}` : 'HCS Auto Discovery Stream'}
          size="small"
          sx={{
            bgcolor: 'rgba(0, 229, 255, 0.1)',
            color: '#00e5ff',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            fontFamily: 'monospace'
          }}
        />
      </Box>

      {/* STREAMING WORKFLOW AREA */}
      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        
        {/* STEP 1: REAL-TIME CONSOLE LOG STREAM */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: '#03080f',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            borderRadius: 2,
            fontFamily: 'monospace',
            color: '#4caf50',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            maxHeight: '220px',
            overflowY: 'auto'
          }}
        >
          {logs.join('\n')}
          {loading && '\n⌛ Awaiting stream events...'}
          <div ref={bottomRef} />
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}

        {/* STEP 2: DISCOVERY CARDS APPEAR IN REAL TIME */}
        {discoveryData?.availableAgents && (
          <Box>
            <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <HubIcon fontSize="small" /> STEP 1: HCS DISCOVERY DIRECTORY (DISCOVERED AGENTS)
            </Typography>
            <Grid container spacing={2}>
              {discoveryData.availableAgents.map((agent, idx) => {
                const isSelected = agent.name === discoveryData.selectedAgent.name;
                return (
                  <Grid item xs={12} sm={4} key={idx}>
                    <Card
                      sx={{
                        p: 2,
                        bgcolor: isSelected ? 'rgba(0, 229, 255, 0.08)' : 'rgba(10, 25, 41, 0.5)',
                        border: isSelected ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 2,
                        position: 'relative',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {isSelected && (
                        <Chip
                          label="SELECTED VIA HCS"
                          size="small"
                          color="primary"
                          sx={{ position: 'absolute', top: 8, right: 8, height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      )}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <SmartToyIcon sx={{ color: isSelected ? '#00e5ff' : '#64748b', fontSize: 20 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                          {agent.name}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontFamily: 'monospace' }}>
                        ID: {agent.agentId}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', fontFamily: 'monospace', mt: 0.5 }}>
                        Rate: {agent.rateTinybars} tinybars
                      </Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* STEP 3: FINAL TRANSACTION & OUTPUT CARD APPEARS UPON COMPLETION */}
        {successData && (
          <Card
            sx={{
              p: 2.5,
              bgcolor: 'rgba(76, 175, 80, 0.05)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: 2.5
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 28 }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff' }}>
                  STEP 2: Transaction Verified & Escrow Settled
                </Typography>
                <Typography variant="caption" sx={{ color: '#4caf50', fontFamily: 'monospace' }}>
                  Reclaim zkTLS Witness: {successData.zkProofSummary.witness}
                </Typography>
              </Box>
            </Stack>

            <Paper
              elevation={0}
              sx={{ p: 2, bgcolor: 'rgba(6, 13, 23, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: 2 }}
            >
              <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 700, display: 'block', mb: 0.5 }}>
                AGENT OUTPUT RESPONSE:
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {successData.output}
              </Typography>
            </Paper>
          </Card>
        )}
      </Box>

      {/* INPUT FORM BAR */}
      <Box
        component="form"
        onSubmit={handleExecute}
        sx={{
          p: 2,
          bgcolor: 'rgba(6, 13, 23, 0.9)',
          borderTop: '1px solid rgba(0, 229, 255, 0.15)'
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(10, 25, 41, 0.8)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: 2,
            '&:focus-within': { borderColor: '#00e5ff', boxShadow: '0 0 10px rgba(0, 229, 255, 0.3)' }
          }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1, color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem' }}
            placeholder="Enter prompt to stream x402 + zkTLS task..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
          <IconButton type="submit" sx={{ p: '10px', color: '#00e5ff' }} disabled={loading}>
            {loading ? <CircularProgress size={20} sx={{ color: '#00e5ff' }} /> : <SendIcon />}
          </IconButton>
        </Paper>
      </Box>
    </Card>
  );
}