import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  Button, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Stack,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloseIcon from '@mui/icons-material/Close';
import DnsIcon from '@mui/icons-material/Dns';
import NumbersIcon from '@mui/icons-material/Numbers';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { ethers } from 'ethers';

const BACKEND_URL = "http://localhost:5000/api/agents";
const CONTRACT_ADDRESS = "0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1";
const HEDERA_TESTNET_CHAIN_ID = "0x128";

const AgentRegistryABI = [
  "function registerAgent(address operationalKey, string uri, string thirdpartyEndpoint, bytes signature, uint128 tinyHbarRate) external returns (uint256)"
];

async function switchToHederaTestnet() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HEDERA_TESTNET_CHAIN_ID }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: HEDERA_TESTNET_CHAIN_ID,
            chainName: "Hedera Testnet",
            nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
            rpcUrls: ["https://testnet.hashio.io/api"],
            blockExplorerUrls: ["https://hashscan.io/testnet"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export default function AgentManagementPage() {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loadingDeployId, setLoadingDeployId] = useState(null);
  
  // Modal Form State
  const [agentName, setAgentName] = useState('');
  const [apiHost, setApiHost] = useState('http://localhost');
  const [apiPort, setApiPort] = useState('8080');
  const [agentPrivateKey, setAgentPrivateKey] = useState('');
  const [tokenURI, setTokenURI] = useState('https://api.example.com/agent.json');
  const [tinyHbarRate, setTinyHbarRate] = useState('100000000');
  const [transferAmount, setTransferAmount] = useState('');

  const fetchAgents = async () => {
    try {
      const res = await fetch(BACKEND_URL);
      const data = await res.json();
      setAgents(data);
    } catch (err) {
      console.error("Failed to fetch agents from backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleAddAgent = async () => {
    if (!agentName || !apiPort || !agentPrivateKey) return;

    let derivedAddress = '';
    try {
      const wallet = new ethers.Wallet(agentPrivateKey);
      derivedAddress = wallet.address;
    } catch (e) {
      alert("Invalid Private Key format!");
      return;
    }

    const endpoint = `${apiHost.replace(/\/$/, '')}:${apiPort}`;
    
    const newAgent = {
      id: Date.now().toString(),
      name: agentName,
      endpoint: endpoint,
      hbar: 0.0,
      status: 'Idle',
      deployed: false,
      privateKey: agentPrivateKey,
      operationalKey: derivedAddress,
      uri: tokenURI,
      rate: tinyHbarRate
    };

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });

      if (!response.ok) throw new Error("Failed to persist agent");

      await fetchAgents();

      const envOutput = `AGENT_PRIVATE_KEY=${agentPrivateKey}\nAGENT_OPERATIONAL_KEY=${derivedAddress}\nAGENT_ENDPOINT=${endpoint}\nAGENT_URI=${tokenURI}\nAGENT_RATE=${tinyHbarRate}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(envOutput);
        alert("Agent saved to config.json! Configuration copied to clipboard.");
      }
    } catch (err) {
      alert(`Error saving agent: ${err.message}`);
    }

    setAgentName('');
    setApiHost('http://localhost');
    setApiPort('8080');
    setAgentPrivateKey('');
    setTokenURI('https://api.example.com/agent.json');
    setTinyHbarRate('100000000');
    setOpenAdd(false);
  };

  const handleDeployAgent = async (agent) => {
    if (!window.ethereum) {
      alert("No EVM wallet detected. Please install MetaMask.");
      return;
    }

    if (!agent.privateKey) {
      alert("Missing Agent Private Key! Please re-add the agent with its key.");
      return;
    }

    setLoadingDeployId(agent.id);

    try {
      await switchToHederaTestnet();

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const humanSigner = await provider.getSigner();
      const humanAddress = await humanSigner.getAddress();

      const agentWallet = new ethers.Wallet(agent.privateKey);
      const operationalKeyAddress = agentWallet.address;

      const packedHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [humanAddress, agent.uri, agent.endpoint]
      );

      const agentSignature = await agentWallet.signMessage(ethers.getBytes(packedHash));

      const contract = new ethers.Contract(CONTRACT_ADDRESS, AgentRegistryABI, humanSigner);
      
      const tx = await contract.registerAgent(
        operationalKeyAddress,
        agent.uri,
        agent.endpoint,
        agentSignature,
        BigInt(agent.rate)
      );

      await tx.wait();

      await fetch(`${BACKEND_URL}/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployed: true,
          status: 'Active',
          operationalKey: operationalKeyAddress
        })
      });

      await fetchAgents();
      alert(`Agent registered on Hedera Testnet!\nTx Hash: ${tx.hash}`);
    } catch (error) {
      console.error("Deployment failed:", error);
      alert(`Deployment Failed: ${error.reason || error.message}`);
    } finally {
      setLoadingDeployId(null);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#060d17', color: '#fff', py: 5 }}>
      <Container maxWidth="lg">
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
              Agent Fleet Manager
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Manage agents, sync daemon configurations, and deploy to Hedera EVM Testnet.
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setOpenAdd(true)}
            sx={{ 
              bgcolor: '#00e5ff', 
              color: '#060d17', 
              fontWeight: 700, 
              boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
              '&:hover': { bgcolor: '#00b2cc' } 
            }}
          >
            Add Agent
          </Button>
        </Box>

        {/* Content Section */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
            <CircularProgress sx={{ color: '#00e5ff' }} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {agents.map((agent) => (
              <Grid item xs={12} sm={6} md={6} key={agent.id} sx={{ display: 'flex' }}>
                <Card 
                  sx={{ 
                    p: 3, 
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    bgcolor: 'rgba(10, 25, 41, 0.75)', 
                    backdropFilter: 'blur(16px)', 
                    borderRadius: 3, 
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SmartToyIcon sx={{ color: '#00e5ff', fontSize: 32 }} />
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                            {agent.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#00e5ff', fontFamily: 'monospace' }}>
                            {agent.endpoint}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={agent.deployed ? "On-Chain" : "Local"} 
                        color={agent.deployed ? "success" : "default"} 
                        variant="outlined"
                        size="small"
                      />
                    </Box>

                    <Box sx={{ p: 2, bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2, mb: 3 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>HBAR Balance</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#00e5ff', fontFamily: 'monospace' }}>
                            {agent.hbar} HBAR
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Operational Key</Typography>
                          <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                            {agent.operationalKey ? `${agent.operationalKey.substring(0, 6)}...${agent.operationalKey.substring(agent.operationalKey.length - 4)}` : 'Not Set'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1.5} sx={{ mt: 'auto' }}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      startIcon={<SendIcon />}
                      onClick={() => { setSelectedAgent(agent); setOpenTransfer(true); }}
                      sx={{ borderColor: 'rgba(0, 229, 255, 0.3)', color: '#00e5ff', textTransform: 'none' }}
                    >
                      Transfer HBAR
                    </Button>

                    {!agent.deployed && (
                      <Button 
                        fullWidth 
                        variant="contained" 
                        startIcon={loadingDeployId === agent.id ? <CircularProgress size={20} color="inherit" /> : <RocketLaunchIcon />}
                        disabled={loadingDeployId === agent.id}
                        onClick={() => handleDeployAgent(agent)}
                        sx={{ bgcolor: '#ff9800', color: '#000', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#e68a00' } }}
                      >
                        Deploy
                      </Button>
                    )}
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Modal: Add Agent */}
        <Dialog 
          open={openAdd} 
          onClose={() => setOpenAdd(false)}
          PaperProps={{ 
            sx: { 
              bgcolor: '#0a1929', 
              color: '#fff', 
              border: '1px solid rgba(0, 229, 255, 0.3)', 
              borderRadius: 3, 
              maxWidth: 520, 
              width: '100%' 
            } 
          }}
        >
          <DialogTitle sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SmartToyIcon sx={{ color: '#00e5ff' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>Add New Agent</Typography>
            </Box>
            <IconButton onClick={() => setOpenAdd(false)} sx={{ color: '#64748b' }}><CloseIcon /></IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>AGENT NAME</Typography>
                <TextField 
                  fullWidth 
                  placeholder="e.g. Arbitrage-Daemon-01" 
                  variant="outlined" 
                  value={agentName} 
                  onChange={(e) => setAgentName(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><VpnKeyIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>PRIVATE KEY (HEX)</Typography>
                <TextField 
                  fullWidth 
                  type="password" 
                  placeholder="0x..." 
                  variant="outlined" 
                  value={agentPrivateKey} 
                  onChange={(e) => setAgentPrivateKey(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><KeyIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>HOST</Typography>
                  <TextField 
                    fullWidth 
                    placeholder="http://localhost" 
                    variant="outlined" 
                    value={apiHost} 
                    onChange={(e) => setApiHost(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><DnsIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} /></InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>PORT</Typography>
                  <TextField 
                    fullWidth 
                    placeholder="8080" 
                    variant="outlined" 
                    value={apiPort} 
                    onChange={(e) => setApiPort(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><NumbersIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 18 }} /></InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>

              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>METADATA URI</Typography>
                <TextField 
                  fullWidth 
                  placeholder="https://..." 
                  variant="outlined" 
                  value={tokenURI} 
                  onChange={(e) => setTokenURI(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>TINYHBAR RATE</Typography>
                <TextField 
                  fullWidth 
                  type="number" 
                  placeholder="100000000" 
                  variant="outlined" 
                  value={tinyHbarRate} 
                  onChange={(e) => setTinyHbarRate(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                />
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setOpenAdd(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleAddAgent}
              disabled={!agentName || !apiPort || !agentPrivateKey}
              sx={{ bgcolor: '#00e5ff', color: '#060d17', fontWeight: 700, '&:hover': { bgcolor: '#00b2cc' } }}
            >
              Add Agent
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal: Transfer Funds */}
        <Dialog 
          open={openTransfer} 
          onClose={() => setOpenTransfer(false)} 
          PaperProps={{ sx: { bgcolor: '#0a1929', color: '#fff', border: '1px solid rgba(0,229,255,0.3)', borderRadius: 3, maxWidth: 400, width: '100%' } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Transfer HBAR</Typography>
            <IconButton onClick={() => setOpenTransfer(false)} sx={{ color: '#64748b' }}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
              Send funds to target wallet for {selectedAgent?.name}.
            </Typography>
            <TextField 
              autoFocus 
              fullWidth 
              type="number" 
              label="Amount (HBAR)" 
              variant="outlined" 
              value={transferAmount} 
              onChange={(e) => setTransferAmount(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(0,229,255,0.3)' } }, '& label': { color: '#94a3b8' } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenTransfer(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
            <Button variant="contained" onClick={() => setOpenTransfer(false)} sx={{ bgcolor: '#00e5ff', color: '#000', fontWeight: 700 }}>Send</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}