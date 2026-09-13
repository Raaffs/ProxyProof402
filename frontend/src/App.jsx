import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme } from './theme';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AgentManagementPage from './pages/AgentManagement';
import AgentsDirectoryPage from './pages/AgentsDirectoryPage';
export default function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/providers" element={<AgentsDirectoryPage />} />
          <Route path="/agents" element={<AgentManagementPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}