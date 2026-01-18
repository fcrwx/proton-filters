import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1a1a2e',
      paper: '#1a1a2e',
    },
    primary: {
      main: '#6c63ff',
    },
    text: {
      primary: '#eee',
      secondary: '#a0a0a0',
    },
    error: {
      main: '#ff6b6b',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#1a1a2e',
        },
      },
    },
  },
});

export default theme;
