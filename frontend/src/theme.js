import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00e5ff' }, // Cyan
    secondary: { main: '#2979ff' }, // Blue
    background: { default: '#0a1929', paper: '#132f4c' },
    warning: { main: '#ffb74d' },
    success: { main: '#4caf50' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12, backgroundImage: 'none' } },
    },
  },
});