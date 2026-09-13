import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Stack,
  Paper,
  IconButton,
  InputBase,
  CircularProgress
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LockIcon from '@mui/icons-material/Lock';
import SendIcon from '@mui/icons-material/Send';
import TerminalIcon from '@mui/icons-material/Terminal';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';

export default function ChatInterface({ provider, onClose, isStandalone = false }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'system',
      text: 'x402 Micropayment Channel Initialized with Hedera Consensus Service.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [packetCount, setPacketCount] = useState(142);
  const [hbarEscrow, setHbarEscrow] = useState(0.0052);
  const chatEndRef = useRef(null);

  const activeProvider = provider?.name || 'Nexus-AI';
  const activeModel = provider?.model || 'Claude 3.5 Sonnet';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = () => {
    if (!inputPrompt.trim() || isStreaming) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputPrompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsStreaming(true);

    setTimeout(() => {
      setPacketCount((prev) => prev + 12);
      setHbarEscrow((prev) => parseFloat((prev + 0.0004).toFixed(4)));

      const botMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: `[zkTLS Validated] Processed query via ${activeModel}. Result stream verified on HCS Topic #0.0.48192.`,
        proof: `TLS_AES_256_GCM_SHA384 (Hash: 0x8f3a...b219)`,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsStreaming(false);
    }, 1800);
  };

  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: '#081420',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid rgba(0, 229, 255, 0.3)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        height: isStandalone ? 'calc(100vh - 40px)' : '680px',
        overflow: 'hidden'
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          p: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          bgcolor: 'rgba(10, 25, 41, 0.9)',
          borderBottom: '1px solid rgba(0, 229, 255, 0.15)'
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TerminalIcon sx={{ color: '#00e5ff' }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {activeProvider} Terminal
            </Typography>
            <Typography variant="caption" sx={{ color: '#00e5ff', fontStyle: 'monospace' }}>
              {activeModel}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<LockIcon sx={{ '&&': { color: '#00e5ff', fontSize: 14 } }} />}
            label={`${hbarEscrow} HBAR`}
            size="small"
            sx={{
              bgcolor: 'rgba(0, 229, 255, 0.1)',
              color: '#00e5ff',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              fontFamily: 'monospace',
              fontWeight: 700
            }}
          />
          <Chip
            label="HTTP 402 ACTIVE"
            size="small"
            sx={{
              bgcolor: 'rgba(76, 175, 80, 0.15)',
              color: '#4caf50',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              fontWeight: 700,
              fontSize: '0.65rem'
            }}
          />
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ color: '#64748b', '&:hover': { color: '#fff' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Realtime Stream Metrics Bar */}
      <Box
        sx={{
          py: 0.8,
          px: 3,
          bgcolor: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
          SESSION PACKETS: <span style={{ color: '#fff' }}>#{packetCount}</span>
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
          PROOF VERIFIER: <span style={{ color: '#4caf50' }}>Reclaim zkTLS Engine</span>
        </Typography>
      </Box>

      {/* Message Output Area */}
      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              justify: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              gap: 1.5
            }}
          >
            {msg.sender !== 'user' && (
              <Box sx={{ p: 1, height: 'fit-content', bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: '50%' }}>
                <SmartToyIcon sx={{ fontSize: 18, color: '#00e5ff' }} />
              </Box>
            )}

            <Paper
              elevation={0}
              sx={{
                p: 2,
                maxWidth: '75%',
                bgcolor:
                  msg.sender === 'user'
                    ? '#00e5ff15'
                    : msg.sender === 'system'
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(19, 47, 76, 0.6)',
                border:
                  msg.sender === 'user'
                    ? '1px solid rgba(0, 229, 255, 0.4)'
                    : msg.sender === 'system'
                    ? '1px dashed rgba(255,255,255,0.1)'
                    : '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: 2
              }}
            >
              <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </Typography>
              {msg.proof && (
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ color: '#4caf50', fontFamily: 'monospace', display: 'block' }}>
                    ✔ zkTLS Proof: {msg.proof}
                  </Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                {msg.timestamp}
              </Typography>
            </Paper>

            {msg.sender === 'user' && (
              <Box sx={{ p: 1, height: 'fit-content', bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%' }}>
                <PersonIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
            )}
          </Box>
        ))}

        {isStreaming && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: '50%' }}>
              <SmartToyIcon sx={{ fontSize: 18, color: '#00e5ff' }} />
            </Box>
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'rgba(19, 47, 76, 0.6)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={14} sx={{ color: '#00e5ff' }} />
                <Typography variant="caption" sx={{ color: '#00e5ff', fontFamily: 'monospace' }}>
                  Verifying HTTP 402 Escrow & Streaming Tokens...
                </Typography>
              </Stack>
            </Paper>
          </Box>
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* Terminal Input Bar */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'rgba(6, 13, 23, 0.9)',
          borderTop: '1px solid rgba(0, 229, 255, 0.15)'
        }}
      >
        <Paper
          elevation={0}
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          sx={{
            p: '4px 8px',
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
            placeholder="Type prompt to execute x402 zkTLS query..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
          />
          <IconButton type="submit" sx={{ p: '10px', color: '#00e5ff' }} disabled={isStreaming}>
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
    </Card>
  );
}