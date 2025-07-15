import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Typography, Button } from '@mui/material';

// Components
import Navigation from './components/navigation/Navigation';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import GameHub from './components/GameHub';
import RouletteGame from './games/roulette/RouletteGame';
import CardGame from './games/cards/CardGame';
import CrashGame from './games/crash/CrashGame';
import WalletManager from './components/wallet/WalletManager';
import AdminPanel from './components/admin/AdminPanel';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import { GameProvider } from './contexts/GameContext';

// Services
import { initializeApp } from './services/api';
import securityService from './services/securityService';

// Styles
import './App.css';

// Theme Configuration
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#667eea',
      light: '#8fa4f3',
      dark: '#4c63d2',
    },
    secondary: {
      main: '#764ba2',
      light: '#9575cd',
      dark: '#512da8',
    },
    background: {
      default: '#0a0e27',
      paper: '#1a1f3a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
          boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(26, 31, 58, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          borderRadius: 12,
        },
      },
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <div className="loading-spinner">Loading...</div>
      </Box>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
}

// Admin Route Component
function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  
  return children;
}

// Main App Component
function AppContent() {
  const { user, loading } = useAuth();
  const [appInitialized, setAppInitialized] = useState(false);
  const [securityVerified, setSecurityVerified] = useState(false);
  const [securityError, setSecurityError] = useState(null);

  useEffect(() => {
    // Initialize application
    const initApp = async () => {
      try {
        // Initialize security service first
        const securityStatus = await securityService.initialize();
        
        if (!securityStatus) {
          setSecurityError('This application can only run on authorized domains. Unauthorized deployments are not permitted.');
          return;
        }
        
        setSecurityVerified(true);
        await initializeApp();
        setAppInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setSecurityError('Application initialization failed. Please try again later.');
      }
    };

    initApp();
  }, []);

  // Show security error if verification failed
  if (securityError) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: 3,
          textAlign: 'center'
        }}
      >
        <Typography variant="h2" component="h1" sx={{ color: '#fff', mb: 2 }}>
          Security Verification Failed
        </Typography>
        <Typography variant="body1" sx={{ color: '#fff', mb: 4, maxWidth: '600px' }}>
          {securityError}
        </Typography>
        <Typography variant="body2" sx={{ color: '#fff', mb: 2, maxWidth: '600px' }}>
          This application can only run on the official domain: nexalis-dev.github.io
        </Typography>
        <Button 
          variant="contained" 
          color="secondary"
          href="https://nexalis-dev.github.io"
          sx={{ mt: 2 }}
        >
          Go to Official Site
        </Button>
      </Box>
    );
  }

  // Show loading screen while initializing
  if (loading || !appInitialized) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div className="nexalis-loader">
          <div className="loader-ring"></div>
          <div className="loader-text">Nexalis</div>
        </div>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)' }}>
      <Router>
        {user && <Navigation />}
        
        <Container maxWidth="xl" sx={{ py: user ? 2 : 0 }}>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" /> : <Login />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/games" 
              element={
                <ProtectedRoute>
                  <GameHub />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/games/crash" 
              element={
                <ProtectedRoute>
                  <CrashGame />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/games/roulette" 
              element={
                <ProtectedRoute>
                  <RouletteGame />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/games/cards" 
              element={
                <ProtectedRoute>
                  <CardGame />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/wallet" 
              element={
                <ProtectedRoute>
                  <WalletManager />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              } 
            />
            
            {/* Default Routes */}
            <Route 
              path="/" 
              element={
                user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
              } 
            />
            
            {/* 404 Route */}
            <Route 
              path="*" 
              element={
                <Box textAlign="center" py={8}>
                  <h1>404 - Page Not Found</h1>
                  <p>The page you're looking for doesn't exist.</p>
                </Box>
              } 
            />
          </Routes>
        </Container>
      </Router>
    </Box>
  );
}

// Root App Component with Providers
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <WalletProvider>
          <GameProvider>
            <AppContent />
          </GameProvider>
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
