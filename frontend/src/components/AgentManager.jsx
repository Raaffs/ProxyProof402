import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  Typography, 
  Button, 
  Chip, 
  IconButton, 
  Stack, 
  Avatar, 
  Tooltip,
  Divider
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

const initialAgents = [
  { id: 'agent-1', name: 'ArbitrageBot-V2', type: 'Local', hbarBalance: 120.5, status: 'Running', deployed: false },
  { id: 'agent-2', name: 'zkTLS-Inference-Relay', type: 'On-Chain', hbarBalance: 450.0, status: 'Active', deployed: true },
];

export default function AgentManager({ onTransfer, onDeploy }) {
  const navigate = useNavigate();
  const [agents] = useState(initialAgents);

  return (
    <Card 
      elevation={0}
      sx={{ 
        p: 3, 
        bgcolor: 'rgba(10, 25, 41, 0.75)', 
        backdropFilter: 'blur(16px)', 
        borderRadius: 3, 
        border: '1px solid rgba(0, 229, 255, 0.2)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon sx={{ color: '#00e5ff' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
            Local Agents
          </Typography>
        </Box>
        <Button 
          size="small" 
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/agents')}
          sx={{ color: '#00e5ff', textTransform: 'none', fontWeight: 600 }}
        >
          View All
        </Button>
      </Box>

      {/* Agent List */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {agents.map((agent) => (
          <Box 
            key={agent.id}
            sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              bgcolor: 'rgba(19, 47, 76, 0.4)', 
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'rgba(0, 229, 255, 0.3)' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: agent.deployed ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: '#00e5ff', width: 36, height: 36 }}>
                <SmartToyIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                  {agent.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                  {agent.hbarBalance} HBAR
                </Typography>
              </Box>
            </Box>

            {/* Quick Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Transfer HBAR">
                <IconButton size="small" onClick={() => onTransfer && onTransfer(agent)} sx={{ color: '#00e5ff' }}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {!agent.deployed ? (
                <Tooltip title="Deploy On-Chain">
                  <IconButton size="small" onClick={() => onDeploy && onDeploy(agent)} sx={{ color: '#ff9800' }}>
                    <RocketLaunchIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Chip label="On-Chain" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
            </Box>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Action Button */}
      <Button 
        fullWidth 
        variant="outlined" 
        startIcon={<AddIcon />}
        onClick={() => navigate('/agents')}
        sx={{ 
          borderColor: 'rgba(0, 229, 255, 0.4)', 
          color: '#00e5ff', 
          fontWeight: 600,
          '&:hover': { borderColor: '#00e5ff', bgcolor: 'rgba(0, 229, 255, 0.05)' }
        }}
      >
        Create New Agent
      </Button>
    </Card>
  );
}