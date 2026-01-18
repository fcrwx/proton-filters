import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  Snackbar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Filter } from '../types';
import { generateSieveScript } from '../utils/generateSieveScript';

interface ScriptDialogProps {
  open: boolean;
  filter: Filter | null;
  onClose: () => void;
}

export default function ScriptDialog({ open, filter, onClose }: ScriptDialogProps) {
  const [copied, setCopied] = useState(false);
  const script = filter ? generateSieveScript(filter) : '';

  useEffect(() => {
    if (open && filter) {
      navigator.clipboard.writeText(script).then(() => {
        setCopied(true);
      });
    }
  }, [open, filter, script]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
    });
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const handleSnackbarClose = () => {
    setCopied(false);
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Sieve Script: {filter?.name}</DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {script}
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Labels and folders must exist in Proton Mail before the filter can apply them. Create them in Settings → Folders and labels.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyClick} startIcon={<ContentCopyIcon />}>
            Copy to Clipboard
          </Button>
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" variant="filled">
          Script copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
}
