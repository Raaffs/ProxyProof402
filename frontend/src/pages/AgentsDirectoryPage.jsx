import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Collapse,
  IconButton,
  Divider,
  Stack,
  CircularProgress,
  Tooltip,
  Avatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedIcon from '@mui/icons-material/Verified';
import DataObjectIcon from '@mui/icons-material/DataObject';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShieldIcon from '@mui/icons-material/Shield';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import Header from '../components/Header';

// Contract Setup
const REPUTATION_CONTRACT_ADDRESS = "0x5aa4bdb31669C0806d5E64C46baA3B05F0D23020";

// FIX 1: Point to the public getter method `agentTrustPoints`
const REPUTATION_ABI = [
  "function agentTrustPoints(uint256 agentId) external view returns (uint256)"
];
const RPC_URL = "https://testnet.hashio.io/api";

export default function AgentsDirectoryPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgentsAndScores = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/hcs/providers');
        const data = await response.json();

        if (data.success && data.providers) {
          const provider = new ethers.JsonRpcProvider(RPC_URL);
          const reputationContract = new ethers.Contract(
            REPUTATION_CONTRACT_ADDRESS,
            REPUTATION_ABI,
            provider
          );

          const updatedAgents = await Promise.all(
            data.providers.map(async (agent) => {
              let onChainTrustPoints = 0;
              const tokenId = agent.identity?.token_id;

              if (tokenId !== undefined && tokenId !== null) {
                try {
                  // FIX 2: Call public function `agentTrustPoints` instead of private mapping `_agentTrustPoints`
                  const points = await reputationContract.agentTrustPoints(tokenId);
                  onChainTrustPoints = points.toString();
                } catch (err) {
                  console.error(`Error fetching trust points for token ${tokenId}:`, err);
                }
              }

              return {
                ...agent,
                onChainTrustPoints
              };
            })
          );

          setAgents(updatedAgents);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentsAndScores();
  }, []);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.agentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.capabilities?.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, #0d1b2a 0%, #040812 100%)',
        color: '#fff',
        pb: 10
      }}
    >
      <Header />

      <Container maxWidth="xl" sx={{ mt: 5 }}>
        {/* HERO / HEADER SECTION */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 4 }}>
          <IconButton
            onClick={() => navigate('/')}
            sx={{
              color: '#00e5ff',
              background: 'rgba(0, 229, 255, 0.05)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              '&:hover': { background: 'rgba(0, 229, 255, 0.15)', transform: 'scale(1.05)' },
              transition: 'all 0.2s'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
              Hedera HCS Agent Registry
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
              Explore and interact with verifiable decentralized AI providers directly on-chain.
            </Typography>
          </Box>
        </Box>

        {/* SEARCH BAR */}
        <TextField
          fullWidth
          placeholder="Search by agent name, capability, or account ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 5,
            bgcolor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 3,
            backdropFilter: 'blur(12px)',
            input: { color: '#fff', fontSize: '0.95rem' },
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(0, 229, 255, 0.4)' },
              '&.Mui-focused fieldset': { borderColor: '#00e5ff', boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)' }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#00e5ff' }} />
              </InputAdornment>
            )
          }}
        />

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
            <CircularProgress size={48} sx={{ color: '#00e5ff' }} />
            <Typography variant="body2" sx={{ color: '#64748b', letterSpacing: '0.5px' }}>
              Querying Consensus Topic & Smart Contract...
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredAgents.map((agent) => {
              const isExpanded = expandedId === agent.agentId;
              const tokenId = agent.identity?.token_id ?? 'N/A';

              return (
                <Grid item xs={12} md={6} lg={4} key={agent.agentId + agent.sequenceNumber}>
                  <Card
                    sx={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 4,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        borderColor: 'rgba(0, 229, 255, 0.4)',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 229, 255, 0.15)'
                      }
                    }}
                  >
                    {/* TOP ACCENT LINE */}
                    <Box
                      sx={{
                        height: 3,
                        width: '100%',
                        background: 'linear-gradient(90deg, #00e5ff, #7c3aed)'
                      }}
                    />

                    <CardContent sx={{ p: 3 }}>
                      {/* HEADER INFO */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: 'rgba(0, 229, 255, 0.1)',
                              color: '#00e5ff',
                              border: '1px solid rgba(0, 229, 255, 0.3)',
                              width: 42,
                              height: 42
                            }}
                          >
                            <AutoAwesomeIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                              {agent.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                              ID: {agent.agentId.slice(0, 10)}...{agent.agentId.slice(-6)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Chip
                          icon={<VerifiedIcon style={{ color: '#00e5ff', fontSize: 14 }} />}
                          label={`Seq #${agent.sequenceNumber}`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0, 229, 255, 0.08)',
                            color: '#00e5ff',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            border: '1px solid rgba(0, 229, 255, 0.2)'
                          }}
                        />
                      </Box>

                      {/* STATS STRIP (Trust Points & Token ID) */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 1.5,
                          p: 1.5,
                          mb: 2,
                          bgcolor: 'rgba(2, 6, 23, 0.5)',
                          borderRadius: 2.5,
                          border: '1px solid rgba(255, 255, 255, 0.04)'
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Trust Score
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <ShieldIcon sx={{ color: '#ffd700', fontSize: 16 }} />
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffd700' }}>
                              {agent.onChainTrustPoints} PTS
                            </Typography>
                          </Stack>
                        </Box>

                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            ERC-8004 Token
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
                            #{tokenId}
                          </Typography>
                        </Box>
                      </Box>

                      {/* ENDPOINT */}
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                        ENDPOINT
                      </Typography>
                      <Tooltip title={agent.endpoint} placement="top">
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{
                            color: '#94a3b8',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            bgcolor: 'rgba(255,255,255,0.02)',
                            p: 1,
                            borderRadius: 1.5,
                            border: '1px dashed rgba(255,255,255,0.1)',
                            mb: 2
                          }}
                        >
                          {agent.endpoint}
                        </Typography>
                      </Tooltip>

                      {/* CAPABILITIES */}
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                        CAPABILITIES
                      </Typography>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap" gap={0.8} sx={{ mb: 2.5 }}>
                        {agent.capabilities?.map((cap) => (
                          <Chip
                            key={cap}
                            label={`Capability: ${cap}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(124, 58, 237, 0.1)',
                              color: '#c084fc',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              border: '1px solid rgba(124, 58, 237, 0.2)'
                            }}
                          />
                        ))}
                      </Stack>

                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 2 }} />

                      {/* FOOTER RATE & TOGGLE */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.65rem' }}>
                            EXECUTION RATE
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 800, color: '#00e5ff' }}>
                            {agent.rateTinybars} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ℏ / req</span>
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => setExpandedId(isExpanded ? null : agent.agentId)}
                          endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          sx={{
                            color: '#94a3b8',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            '&:hover': { color: '#fff', background: 'rgba(255,255,255,0.05)' }
                          }}
                        >
                          {isExpanded ? 'Hide Spec' : 'View Spec'}
                        </Button>
                      </Box>

                      {/* PAYLOAD JSON COLLAPSE */}
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ mt: 2 }}>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: '#020617',
                            borderRadius: 2.5,
                            border: '1px solid rgba(0, 229, 255, 0.2)'
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ color: '#00e5ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                          >
                            <DataObjectIcon fontSize="small" /> Payload JSON
                          </Typography>
                          <Box
                            component="pre"
                            sx={{
                              color: '#6ee7b7',
                              fontSize: '0.72rem',
                              fontFamily: 'monospace',
                              overflowX: 'auto',
                              m: 0,
                              p: 1,
                              bgcolor: 'rgba(0,0,0,0.4)',
                              borderRadius: 1.5
                            }}
                          >
                            {JSON.stringify(agent, null, 2)}
                          </Box>
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Box>
  );
}