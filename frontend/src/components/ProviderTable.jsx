import React from 'react';
import { 
  Box, 
  Card, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  Button, 
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const providers = [
  { id: 1, name: 'Nexus-AI', model: 'Claude 3.5 Sonnet', score: 98, price: '0.0004', type: 'TLS', ping: '12ms', status: 'Optimal' },
  { id: 2, name: 'ZK-Node', model: 'GPT-5 Ultra', score: 92, price: '0.0008', type: 'zkTLS', ping: '45ms', status: 'Optimal' },
  { id: 3, name: 'ShadowCompute', model: 'Gemini 1.5 Pro', score: 38, price: '0.0001', type: 'zkTLS Required', ping: '180ms', status: 'High Risk' },
];

export default function ProviderTable({ onSelect }) {
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
      {/* Header Bar */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0, 229, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ElectricBoltIcon sx={{ color: '#00e5ff' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
            HCS Provider Registry
          </Typography>
        </Box>
        <Chip 
          label="LIVE FEED" 
          size="small" 
          sx={{ 
            bgcolor: 'rgba(0, 229, 255, 0.1)', 
            color: '#00e5ff', 
            fontWeight: 700, 
            border: '1px solid rgba(0, 229, 255, 0.3)',
            '& .MuiChip-label': { px: 1.5 }
          }} 
        />
      </Box>

      {/* Table Container */}
      <TableContainer>
        <Table sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontWeight: 600 } }}>
              <TableCell>PROVIDER</TableCell>
              <TableCell>MODEL</TableCell>
              <TableCell>TRUST SCORE</TableCell>
              <TableCell>LATENCY</TableCell>
              <TableCell>PRICE (HBAR)</TableCell>
              <TableCell align="right">ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.map((row) => {
              const isHighTrust = row.score > 50;
              return (
                <TableRow 
                  key={row.id} 
                  hover
                  sx={{ 
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.03)' },
                    '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }
                  }}
                >
                  {/* Provider Name */}
                  <TableCell sx={{ fontWeight: 600, color: '#fff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {row.name}
                      <Chip 
                        label={row.type} 
                        size="small" 
                        sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8' }} 
                      />
                    </Box>
                  </TableCell>

                  {/* Model */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#00e5ff' }}>
                      {row.model}
                    </Typography>
                  </TableCell>

                  {/* Trust Score & Visual Metric */}
                  <TableCell>
                    <Box sx={{ width: 130 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isHighTrust ? (
                            <VerifiedIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                          ) : (
                            <WarningAmberIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                          )}
                          <Typography variant="caption" sx={{ fontWeight: 700, color: isHighTrust ? '#4caf50' : '#ff9800' }}>
                            {row.score}/100
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={row.score} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3, 
                          bgcolor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: isHighTrust ? '#4caf50' : '#ff9800'
                          }
                        }}
                      />
                    </Box>
                  </TableCell>

                  {/* Latency */}
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                      {row.ping}
                    </Typography>
                  </TableCell>

                  {/* Price */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                      {row.price}
                    </Typography>
                  </TableCell>

                  {/* Select Action */}
                  <TableCell align="right">
                    <Button 
                      variant={isHighTrust ? "contained" : "outlined"} 
                      size="small"
                      color={isHighTrust ? "primary" : "warning"}
                      onClick={() => onSelect(row)}
                      sx={{ 
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 2,
                        boxShadow: isHighTrust ? '0 0 10px rgba(0, 229, 255, 0.3)' : 'none'
                      }}
                    >
                      Connect
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}