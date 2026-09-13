import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';

export default function ProviderTable({ onSelect, selectedProviderId }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/hcs/providers');
      const data = await response.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error('Failed to load HCS providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        bgcolor: 'rgba(10, 25, 41, 0.75)',
        border: '1px solid rgba(0, 229, 255, 0.15)',
        borderRadius: 3
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff' }}>
            HCS Active Agents
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Consensus-verified provider network
          </Typography>
        </Box>

        {/* Replaced <Stack> with a flex Box */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh topic messages">
            <IconButton onClick={fetchProviders} size="small" sx={{ color: '#00e5ff' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/providers')}
            sx={{
              color: '#00e5ff',
              borderColor: 'rgba(0, 229, 255, 0.3)',
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            Full Directory
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ color: '#00e5ff' }} />
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.08)', color: '#64748b', fontWeight: 700 } }}>
                <TableCell>AGENT / ACCOUNT</TableCell>
                <TableCell>CAPABILITIES</TableCell>
                <TableCell>FEE (TINYBARS)</TableCell>
                <TableCell align="right">ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.slice(0, 5).map((provider) => {
                const isSelected = selectedProviderId === provider.agentId;
                return (
                  <TableRow
                    key={provider.agentId + provider.sequenceNumber}
                    hover
                    onClick={() => onSelect(provider)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                      '& td': { borderColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                        {provider.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#00e5ff', fontFamily: 'monospace' }}>
                        {provider.agentId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {provider.capabilities.slice(0, 3).map((cap) => (
                          <Chip
                            key={cap}
                            label={cap}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: 'rgba(0, 229, 255, 0.1)',
                              color: '#00e5ff',
                              border: '1px solid rgba(0, 229, 255, 0.2)'
                            }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {provider.rateTinybars} ℏ
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={isSelected ? "contained" : "outlined"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(provider);
                        }}
                        sx={{
                          fontSize: '0.75rem',
                          borderRadius: 2,
                          textTransform: 'none',
                          bgcolor: isSelected ? '#00e5ff' : 'transparent',
                          color: isSelected ? '#060d17' : '#00e5ff',
                          borderColor: 'rgba(0, 229, 255, 0.4)',
                          '&:hover': { bgcolor: '#00e5ff', color: '#060d17' }
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}