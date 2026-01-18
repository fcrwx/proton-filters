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

// Fallback for copying text when clipboard API is unavailable (non-HTTPS)
function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback using execCommand
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

export default function ScriptDialog({ open, filter, onClose }: ScriptDialogProps) {
  const [copied, setCopied] = useState(false);
  const script = filter ? generateSieveScript(filter) : '';

  useEffect(() => {
    if (open && filter) {
      copyToClipboard(script).then(() => {
        setCopied(true);
      }).catch(() => {});
    }
  }, [open, filter, script]);

  const handleCopyClick = () => {
    copyToClipboard(script).then(() => {
      setCopied(true);
    }).catch(() => {});
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
