import React, { useState } from 'react';
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

// Contract Configuration
const CONTRACT_ADDRESS = "0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1";
const HEDERA_TESTNET_CHAIN_ID = "0x128"; // 296 in decimal

const AgentRegistryABI = [
  "function registerAgent(address operationalKey, string uri, string thirdpartyEndpoint, bytes signature, uint128 tinyHbarRate) external returns (uint256)"
];

/**
 * Helper: Force MetaMask/Browser Wallet to switch or add Hedera Testnet RPC
 */
async function switchToHederaTestnet() {
  if (!window.ethereum) throw new Error("No EVM wallet detected");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HEDERA_TESTNET_CHAIN_ID }],
    });
  } catch (switchError) {
    // Code 4902 indicates that the chain has not been added to MetaMask
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
  const [agents, setAgents] = useState([
    { 
      id: '1', 
      name: 'ArbitrageBot-V2', 
      endpoint: 'http://localhost:8080', 
      hbar: 120.5, 
      status: 'Idle', 
      deployed: false, 
      privateKey: '',
      operationalKey: '',
      uri: 'https://api.example.com/agent-1.json',
      rate: '100000000'
    }
  ]);

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
  const [tinyHbarRate, setTinyHbarRate] = useState('100000000'); // 1 HBAR (10^8 tinybars)
  const [transferAmount, setTransferAmount] = useState('');

  const handleAddAgent = () => {
    if (!agentName || !apiPort || !agentPrivateKey) return;

    let derivedAddress = '';
    try {
      const wallet = new ethers.Wallet(agentPrivateKey);
      derivedAddress = wallet.address;
    } catch (e) {
      alert("Invalid Private Key format! Must be a valid 64-character hex string.");
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

    setAgents([...agents, newAgent]);

    // Format raw string for local .env setup
    const envOutput = `AGENT_PRIVATE_KEY=${agentPrivateKey}\nAGENT_ENDPOINT=${endpoint}\nAGENT_URI=${tokenURI}\nAGENT_RATE=${tinyHbarRate}`;
    console.log("--- RAW ENV CONFIG FOR DAEMON ---");
    console.log(envOutput);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(envOutput);
      alert("Agent registered locally! .env variables copied to clipboard.");
    }
    
    // Reset Form
    setAgentName('');
    setApiHost('http://localhost');
    setApiPort('8080');
    setAgentPrivateKey('');
    setTokenURI('https://api.example.com/agent.json');
    setTinyHbarRate('100000000');
    setOpenAdd(false);
  };

  /**
   * ON-CHAIN DEPLOYMENT ON HEDERA TESTNET
   */
  const handleDeployAgent = async (agent) => {
    if (!window.ethereum) {
      alert("MetaMask or compatible EVM wallet not detected.");
      return;
    }

    if (!agent.privateKey) {
      alert("Missing agent private key for signature generation.");
      return;
    }

    setLoadingDeployId(agent.id);

    try {
      // 1. Force network switch to Hedera Testnet (Chain ID 0x128 / 296)
      await switchToHederaTestnet();

      // 2. Get Human Wallet Signer via MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const humanSigner = await provider.getSigner();
      const humanAddress = await humanSigner.getAddress();

      // 3. Create Agent Wallet from Private Key to compute ECDSA signature locally
      const agentWallet = new ethers.Wallet(agent.privateKey);
      const operationalKeyAddress = agentWallet.address;

      // 4. Construct message hash matching contract: keccak256(abi.encodePacked(msg.sender, uri, thirdpartyEndpoint))
      const packedHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [humanAddress, agent.uri, agent.endpoint]
      );

      // 5. Sign message using Agent Key
      const agentSignature = await agentWallet.signMessage(ethers.getBytes(packedHash));

      // 6. Submit Transaction through Human Wallet on Hedera Testnet
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AgentRegistryABI, humanSigner);
      
      const tx = await contract.registerAgent(
        operationalKeyAddress,
        agent.uri,
        agent.endpoint,
        agentSignature,
        BigInt(agent.rate)
      );

      console.log("Hedera Tx submitted:", tx.hash);
      await tx.wait();

      // Update state to reflect deployment
      setAgents(agents.map(a => a.id === agent.id ? { 
        ...a, 
        deployed: true, 
        status: 'Active', 
        operationalKey: operationalKeyAddress 
      } : a));

      alert(`Agent registered on Hedera Testnet! Tx Hash: ${tx.hash}`);
    } catch (error) {
      console.error("Hedera registration failed:", error);
      alert(`Registration failed: ${error.reason || error.message}`);
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
              Manage local execution environments, fund agent gas wallets, or deploy agents directly on Hedera EVM.
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

        {/* Agent Cards Grid */}
        <Grid container spacing={3}>
          {agents.map((agent) => (
            <Grid item xs={12} md={6} key={agent.id}>
              <Card 
                sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(10, 25, 41, 0.75)', 
                  backdropFilter: 'blur(16px)', 
                  borderRadius: 3, 
                  border: '1px solid rgba(0, 229, 255, 0.2)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SmartToyIcon sx={{ color: '#00e5ff', fontSize: 32 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                        {agent.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#00e5ff', fontFamily: 'monospace' }}>
                        {agent.endpoint}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={agent.deployed ? "On-Chain Deployed" : "Local Only"} 
                    color={agent.deployed ? "success" : "default"} 
                    variant="outlined"
                    size="small"
                  />
                </Box>

                <Box sx={{ p: 2, bgcolor: 'rgba(19, 47, 76, 0.3)', borderRadius: 2, mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>HBAR Balance</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#00e5ff', fontFamily: 'monospace' }}>
                        {agent.hbar} HBAR
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Operational Key</Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                        {agent.operationalKey ? `${agent.operationalKey.substring(0, 8)}...` : 'Not Derived'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={1.5}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<SendIcon />}
                    onClick={() => { setSelectedAgent(agent); setOpenTransfer(true); }}
                    sx={{ borderColor: 'rgba(0, 229, 255, 0.3)', color: '#00e5ff' }}
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
                      sx={{ bgcolor: '#ff9800', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#e68a00' } }}
                    >
                      Deploy On-Chain
                    </Button>
                  )}
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* --- ADD AGENT MODAL --- */}
        <Dialog 
          open={openAdd} 
          onClose={() => setOpenAdd(false)}
          PaperProps={{ 
            sx: { 
              bgcolor: '#0a1929', 
              color: '#fff', 
              border: '1px solid rgba(0, 229, 255, 0.3)', 
              borderRadius: 4,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              maxWidth: 500,
              width: '100%'
            } 
          }}
        >
          <DialogTitle sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: 2, display: 'flex' }}>
                <SmartToyIcon sx={{ color: '#00e5ff' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  Add Agent
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Register local daemon & store parameters
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setOpenAdd(false)} sx={{ color: '#64748b', '&:hover': { color: '#fff' } }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3, pt: 2 }}>
            <Stack spacing={2.5}>
              
              {/* Agent Name */}
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                  AGENT NAME
                </Typography>
                <TextField 
                  fullWidth 
                  placeholder="e.g. Arbitrage-Daemon-01" 
                  variant="outlined" 
                  value={agentName} 
                  onChange={(e) => setAgentName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKeyIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2,
                      '& fieldset': { borderColor: 'rgba(0,229,255,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#00e5ff' }
                    } 
                  }}
                />
              </Box>

              {/* Private Key Input */}
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                  AGENT OPERATIONAL PRIVATE KEY (HEX)
                </Typography>
                <TextField 
                  fullWidth 
                  type="password"
                  placeholder="0x..." 
                  variant="outlined" 
                  value={agentPrivateKey} 
                  onChange={(e) => setAgentPrivateKey(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2,
                      '& fieldset': { borderColor: 'rgba(0,229,255,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#00e5ff' }
                    } 
                  }}
                />
              </Box>

              {/* Host & Port */}
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                    HOST URL
                  </Typography>
                  <TextField 
                    fullWidth 
                    placeholder="http://localhost" 
                    variant="outlined" 
                    value={apiHost} 
                    onChange={(e) => setApiHost(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DnsIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(0,229,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#00e5ff' }
                      } 
                    }}
                  />
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                    PORT
                  </Typography>
                  <TextField 
                    fullWidth 
                    placeholder="8080" 
                    variant="outlined" 
                    value={apiPort} 
                    onChange={(e) => setApiPort(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <NumbersIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(0,229,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#00e5ff' }
                      } 
                    }}
                  />
                </Grid>
              </Grid>

              {/* Token URI */}
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                  TOKEN METADATA URI
                </Typography>
                <TextField 
                  fullWidth 
                  placeholder="https://..." 
                  variant="outlined" 
                  value={tokenURI} 
                  onChange={(e) => setTokenURI(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2,
                      '& fieldset': { borderColor: 'rgba(0,229,255,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#00e5ff' }
                    } 
                  }}
                />
              </Box>

              {/* TinyHbar Rate */}
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                  TINYHBAR RATE (1 HBAR = 100000000)
                </Typography>
                <TextField 
                  fullWidth 
                  type="number"
                  placeholder="100000000" 
                  variant="outlined" 
                  value={tinyHbarRate} 
                  onChange={(e) => setTinyHbarRate(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2,
                      '& fieldset': { borderColor: 'rgba(0,229,255,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#00e5ff' }
                    } 
                  }}
                />
              </Box>

            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button 
              onClick={() => setOpenAdd(false)} 
              sx={{ color: '#94a3b8', fontWeight: 600, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleAddAgent}
              disabled={!agentName || !apiPort || !agentPrivateKey}
              sx={{ 
                bgcolor: '#00e5ff', 
                color: '#060d17', 
                fontWeight: 700, 
                px: 3,
                textTransform: 'none',
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
                '&:hover': { bgcolor: '#00b2cc' } 
              }}
            >
              Add Agent
            </Button>
          </DialogActions>
        </Dialog>

        {/* Transfer Modal */}
        <Dialog 
          open={openTransfer} 
          onClose={() => setOpenTransfer(false)} 
          PaperProps={{ sx: { bgcolor: '#0a1929', color: '#fff', border: '1px solid rgba(0,229,255,0.3)', borderRadius: 3 } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Transfer HBAR to {selectedAgent?.name}
            <IconButton onClick={() => setOpenTransfer(false)} sx={{ color: '#64748b' }}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent>
            <TextField 
              autoFocus 
              fullWidth 
              type="number"
              label="Amount (HBAR)" 
              variant="outlined" 
              value={transferAmount} 
              onChange={(e) => setTransferAmount(e.target.value)}
              sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(0,229,255,0.3)' } } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenTransfer(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
            <Button variant="contained" onClick={() => setOpenTransfer(false)} sx={{ bgcolor: '#00e5ff', color: '#000', fontWeight: 700 }}>Send Funds</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}

