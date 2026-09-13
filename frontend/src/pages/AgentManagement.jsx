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
  CircularProgress,
  Alert
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
import TagIcon from '@mui/icons-material/Tag';
import HubIcon from '@mui/icons-material/Hub';
import { ethers } from 'ethers';
import Header from '../components/Header';

const BACKEND_URL = "http://localhost:5000/api/agents";
const CONTRACT_ADDRESS = "0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1";
const HEDERA_TESTNET_CHAIN_ID = "0x128"; // 296 in decimal
const HCS_TOPIC_ID = "0.0.10402297";

const AgentRegistryABI = [
  "function registerAgent(address operationalKey, string uri, string thirdpartyEndpoint, bytes signature, uint128 tinyHbarRate) external returns (uint256)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed owner, address operationalKey, string uri, string thirdpartyEndpoint)"
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

// Backend call to derive the native 0.0.xxxxx Account ID using agent private key
async function deriveHederaAccountId(privateKey) {
  try {
    const res = await fetch("http://localhost:5000/api/agents/derive-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privateKey })
    });
    const data = await res.json();
    return data.accountId || "0.0.000000";
  } catch (err) {
    console.error("Failed to derive Hedera Account ID via backend:", err);
    return "0.0.000000";
  }
}

export default function AgentManagementPage() {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loadingDeployId, setLoadingDeployId] = useState(null);

  // HCS Registration Dialog State
  const [openHcsModal, setOpenHcsModal] = useState(false);
  const [hcsPayload, setHcsPayload] = useState('');
  const [isSubmittingHcs, setIsSubmittingHcs] = useState(false);
  const [hcsTags, setHcsTags] = useState('60101, 60201, 90101');
  const [hcsMemo, setHcsMemo] = useState('Agent Registration via Fleet Manager');
  const [hcsDescription, setHcsDescription] = useState('Autonomous AI Agent on Hedera');
  
  // Modal Form State
  const [agentName, setAgentName] = useState('');
  const [apiHost, setApiHost] = useState('http://localhost');
  const [apiPort, setApiPort] = useState('8080');
  const [thirdPartyEndpointUrl, setThirdPartyEndpointUrl] = useState('https://my-agent-service.com/api');
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
      thirdpartyEndpoint: thirdPartyEndpointUrl,
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

      const envOutput = `AGENT_PRIVATE_KEY=${agentPrivateKey}\nAGENT_OPERATIONAL_KEY=${derivedAddress}\nAGENT_ENDPOINT=${endpoint}\nAGENT_THIRDPARTY_ENDPOINT=${thirdPartyEndpointUrl}\nAGENT_URI=${tokenURI}\nAGENT_RATE=${tinyHbarRate}`;
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
    setThirdPartyEndpointUrl('https://my-agent-service.com/api');
    setAgentPrivateKey('');
    setTokenURI('https://api.example.com/agent.json');
    setTinyHbarRate('100000000');
    setOpenAdd(false);
  };

  const buildHcsPayload = (agent, tokenId, accountId, tagsStr, descriptionStr, memoStr) => {
    const parsedTags = tagsStr
      .split(',')
      .map((t) => parseInt(t.trim(), 10))
      .filter((n) => !isNaN(n));

    const payloadObj = {
      p: "hcs-26",
      op: "register",
      t_id: HCS_TOPIC_ID,
      account_id: accountId,
      metadata: {
        name: agent.name,
        description: descriptionStr,
        tags: parsedTags.length > 0 ? parsedTags : [60101, 60201, 90101],
        thirdPartyUri: agent.thirdpartyEndpoint || agent.endpoint,
        identity: {
          standard: "ERC-8004",
          uaid: `eip155:296:${CONTRACT_ADDRESS.toLowerCase()}:${tokenId}`,
          chain_id: "eip155:296",
          contract: CONTRACT_ADDRESS.toLowerCase(),
          token_id: String(tokenId)
        }
      },
      m: memoStr
    };

    return JSON.stringify(payloadObj, null, 2);
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

      const effectiveThirdpartyEndpoint = agent.thirdpartyEndpoint || agent.endpoint;

      const packedHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [humanAddress, agent.uri, effectiveThirdpartyEndpoint]
      );

      const agentSignature = await agentWallet.signMessage(ethers.getBytes(packedHash));

      const contract = new ethers.Contract(CONTRACT_ADDRESS, AgentRegistryABI, humanSigner);
      
      const tx = await contract.registerAgent(
        operationalKeyAddress,
        agent.uri,
        effectiveThirdpartyEndpoint,
        agentSignature,
        BigInt(agent.rate)
      );

      const receipt = await tx.wait();

      // Extract tokenId from AgentRegistered Event
      let mintedTokenId = "0";
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "AgentRegistered") {
              mintedTokenId = parsedLog.args.tokenId.toString();
              break;
            }
          } catch (_) {}
        }
      }

      // Update agent status in backend
      await fetch(`${BACKEND_URL}/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployed: true,
          status: 'Active',
          operationalKey: operationalKeyAddress,
          tokenId: mintedTokenId
        })
      });

      await fetchAgents();

      // Derive Account ID via backend using the agent private key
      const derivedAccountId = await deriveHederaAccountId(agent.privateKey);

      setSelectedAgent({ ...agent, tokenId: mintedTokenId, accountId: derivedAccountId });

      // Build JSON payload for HCS
      const initialJson = buildHcsPayload(
        agent,
        mintedTokenId,
        derivedAccountId,
        hcsTags,
        hcsDescription,
        hcsMemo
      );

      setHcsPayload(initialJson);
      setOpenHcsModal(true);

    } catch (error) {
      console.error("Deployment failed:", error);
      alert(`Deployment Failed: ${error.reason || error.message}`);
    } finally {
      setLoadingDeployId(null);
    }
  };

  const handlePublishHcsMessage = async () => {
    setIsSubmittingHcs(true);
    try {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(hcsPayload);
      } catch (err) {
        throw new Error("Invalid JSON format in payload field.");
      }

      const response = await fetch("http://localhost:5000/api/hcs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: HCS_TOPIC_ID,
          message: parsedMessage
        })
      });

      if (!response.ok) {
        const errorRes = await response.json();
        throw new Error(errorRes.message || "Failed to post message to HCS Topic");
      }

      const result = await response.json();
      alert(`Successfully published Agent Skills to Hedera HCS Topic ${HCS_TOPIC_ID}!\nSequence Number: ${result.sequenceNumber}`);
      setOpenHcsModal(false);
    } catch (err) {
      console.error("HCS Submit Error:", err);
      alert(`HCS Submission Error: ${err.message}`);
    } finally {
      setIsSubmittingHcs(false);
    }
  };

  const handleHcsFormChange = (newTags, newDesc, newMemo) => {
    if (!selectedAgent) return;
    const updatedPayload = buildHcsPayload(
      selectedAgent,
      selectedAgent.tokenId || "1",
      selectedAgent.accountId || "0.0.000000",
      newTags,
      newDesc,
      newMemo
    );
    setHcsPayload(updatedPayload);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#060d17', color: '#fff', py: 5 }}>
      <Header />
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
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>THIRD-PARTY ENDPOINT URL</Typography>
                <TextField 
                  fullWidth 
                  placeholder="https://my-agent-service.com/api" 
                  variant="outlined" 
                  value={thirdPartyEndpointUrl} 
                  onChange={(e) => setThirdPartyEndpointUrl(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 20 }} /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                />
              </Box>

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

        {/* Modal: HCS Topic Skills Registration */}
        <Dialog 
          open={openHcsModal} 
          onClose={() => setOpenHcsModal(false)}
          PaperProps={{ 
            sx: { 
              bgcolor: '#0a1929', 
              color: '#fff', 
              border: '1px solid rgba(0, 229, 255, 0.4)', 
              borderRadius: 3, 
              maxWidth: 650, 
              width: '100%' 
            } 
          }}
        >
          <DialogTitle sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HubIcon sx={{ color: '#00e5ff' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                Publish Agent Skills to HCS
              </Typography>
            </Box>
            <IconButton onClick={() => setOpenHcsModal(false)} sx={{ color: '#64748b' }}><CloseIcon /></IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Alert severity="success" sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                Contract Minted Successfully! Token ID: <strong>#{selectedAgent?.tokenId || "1"}</strong> | Account ID: <strong>{selectedAgent?.accountId || "0.0.000000"}</strong>
              </Alert>

              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Post agent metadata and skills to Hedera Consensus Topic: <code>{HCS_TOPIC_ID}</code> (hcs-26 standard format).
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>TAGS (Comma separated)</Typography>
                  <TextField 
                    fullWidth 
                    variant="outlined" 
                    value={hcsTags} 
                    onChange={(e) => {
                      setHcsTags(e.target.value);
                      handleHcsFormChange(e.target.value, hcsDescription, hcsMemo);
                    }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><TagIcon sx={{ color: 'rgba(0, 229, 255, 0.5)', fontSize: 18 }} /></InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>MEMO</Typography>
                  <TextField 
                    fullWidth 
                    variant="outlined" 
                    value={hcsMemo} 
                    onChange={(e) => {
                      setHcsMemo(e.target.value);
                      handleHcsFormChange(hcsTags, hcsDescription, e.target.value);
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>

              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>DESCRIPTION</Typography>
                <TextField 
                  fullWidth 
                  variant="outlined" 
                  value={hcsDescription} 
                  onChange={(e) => {
                    setHcsDescription(e.target.value);
                    handleHcsFormChange(hcsTags, e.target.value, hcsMemo);
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(19, 47, 76, 0.4)', borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 700, mb: 0.5, display: 'block', fontFamily: 'monospace' }}>
                  HCS-26 PAYLOAD PREVIEW
                </Typography>
                <TextField 
                  fullWidth 
                  multiline 
                  rows={10} 
                  value={hcsPayload} 
                  onChange={(e) => setHcsPayload(e.target.value)}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      color: '#4caf50', 
                      fontFamily: 'monospace', 
                      fontSize: '0.8rem', 
                      bgcolor: '#03080f', 
                      borderRadius: 2,
                      border: '1px solid rgba(0, 229, 255, 0.2)'
                    } 
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setOpenHcsModal(false)} sx={{ color: '#94a3b8' }}>Skip</Button>
            <Button 
              variant="contained" 
              onClick={handlePublishHcsMessage}
              disabled={isSubmittingHcs}
              startIcon={isSubmittingHcs ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              sx={{ bgcolor: '#00e5ff', color: '#060d17', fontWeight: 700, '&:hover': { bgcolor: '#00b2cc' } }}
            >
              {isSubmittingHcs ? "Publishing..." : "Submit to Hedera HCS"}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}