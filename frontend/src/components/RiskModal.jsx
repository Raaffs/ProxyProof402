import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function RiskModal({ open, provider, onClose, onApprove }) {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onApprove();
    }, 2000);
  };

  if (!provider) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
        <WarningAmberIcon /> Low-Trust Gate Triggered
      </DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Target provider <strong>{provider.name}</strong> has a trust score of {provider.score}/100.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          A World ID Selfie Check is required to override the risk policy and proceed via zkTLS escrow.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleVerify} variant="contained" color="warning" disabled={verifying}>
          {verifying ? <CircularProgress size={24} color="inherit" /> : 'Complete Selfie Check'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}