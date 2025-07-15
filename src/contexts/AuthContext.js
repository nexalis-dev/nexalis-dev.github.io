import React, { createContext, useContext, useState, useEffect } from 'react';
import arenaApi from '../services/arenaApi';
import nexalisWallet from '../services/nexalisWallet';
import gameTimingService from '../services/gameTimingService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have a stored token
        const storedToken = localStorage.getItem('nexalis_token');
        
        if (storedToken) {
          // Verify token with Arena API
          const verifyResult = await arenaApi.verifyToken(storedToken);
          
          if (verifyResult.success) {
            // Set user data
            setUser(verifyResult.user);
            setIsAdmin(verifyResult.user.role === 'admin' || 
                      verifyResult.user.permissions?.includes('admin'));
            
            // Get or create Nexalis wallet for this user
            const userWallet = await getUserNexalisWallet(verifyResult.user.id);
            setWallet(userWallet);
            
            // Set connection status
            setConnectionStatus('connected');
            
            // Set up event listeners for real-time updates
            setupEventListeners();
          } else {
            // Invalid token, clear storage
            localStorage.removeItem('nexalis_token');
            localStorage.removeItem('nexalis_user');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    // Cleanup event listeners on unmount
    return () => {
      cleanupEventListeners();
    };
  }, []);

  // Set up event listeners for real-time updates
  const setupEventListeners = () => {
    // Connect to Arena API WebSocket for real-time updates
    arenaApi.connectWebSocket();
    
    // Listen for user updates
    arenaApi.on('user_update', (updatedUser) => {
      setUser(prevUser => ({ ...prevUser, ...updatedUser }));
    });
    
    // Listen for wallet updates
    arenaApi.on('wallet_update', (updatedWallet) => {
      setWallet(updatedWallet);
    });
    
    // Listen for game session updates
    arenaApi.on('game_session_update', (updatedSession) => {
      setGameSession(updatedSession);
    });
    
    // Listen for connection status changes
    arenaApi.on('connection_status', (status) => {
      setConnectionStatus(status);
    });
  };
  
  // Clean up event listeners
  const cleanupEventListeners = () => {
    arenaApi.disconnectWebSocket();
    arenaApi.removeAllListeners();
  };
  
  // Get or create Nexalis wallet for user
  const getUserNexalisWallet = async (userId) => {
    try {
      // Try to get existing wallet
      const existingWallet = await nexalisWallet.getWallet(userId);
      
      if (existingWallet) {
        return existingWallet;
      }
      
      // No wallet found, create a new one with a temporary password
      // (User will be prompted to set a permanent password later)
      const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const newWallet = await nexalisWallet.createWallet(userId, tempPassword);
      
      return newWallet;
    } catch (error) {
      console.error('Error getting/creating Nexalis wallet:', error);
      return null;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);

      // Authenticate with Arena API
      const authResponse = await arenaApi.login({ email, password });

      if (!authResponse.success) {
        throw new Error(authResponse.error || 'Authentication failed');
      }

      // Get or create Nexalis wallet for this user
      const userWallet = await getUserNexalisWallet(authResponse.user.id);
      
      // Update state
      setUser(authResponse.user);
      setWallet(userWallet);
      setIsAdmin(authResponse.user.role === 'admin' || 
                authResponse.user.permissions?.includes('admin'));
      setConnectionStatus('connected');
      
      // Set up event listeners for real-time updates
      setupEventListeners();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (username, email, password) => {
    try {
      setLoading(true);

      // Register with Arena API
      const registerResponse = await arenaApi.register({ username, email, password });

      if (!registerResponse.success) {
        throw new Error(registerResponse.error || 'Registration failed');
      }

      // Auto login after registration
      return await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Notify Arena API about logout
      await arenaApi.logout();
      
      // Clean up event listeners
      cleanupEventListeners();
      
      // Clear localStorage
      localStorage.removeItem('nexalis_token');

      // Reset state
      setUser(null);
      setWallet(null);
      setGameSession(null);
      setIsAdmin(false);
      setConnectionStatus('disconnected');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { 
        success: false, 
        message: error.message || 'Logout failed' 
      };
    }
  };

  // Refresh user wallet balance
  const refreshWalletBalance = async () => {
    try {
      if (!user) return null;

      // Get updated wallet from API
      const updatedWallet = await nexalisWallet.getWalletBalance(user.id);
      setWallet(updatedWallet);

      return updatedWallet;
    } catch (error) {
      console.error('Refresh wallet balance error:', error);
      return wallet;
    }
  };

  // Update user data
  const updateUser = async (updates) => {
    try {
      if (!user) return { success: false, message: 'No user logged in' };

      // Update user profile through API
      const response = await arenaApi.apiClient.post('/user/update', updates);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update user');
      }
      
      // Update local state
      const updatedUser = { ...user, ...response.data.user };
      setUser(updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update user error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to update user' 
      };
    }
  };

  // Check if user has admin privileges
  const checkAdminAccess = () => {
    return user && (user.role === 'admin' || user.permissions?.includes('admin'));
  };

  // Start a game session
  const startGameSession = async (gameType) => {
    try {
      if (!user) return { success: false, message: 'No user logged in' };
      
      // Request game session through timing service
      const sessionResult = await gameTimingService.requestGameSession(gameType, user.id);
      
      if (sessionResult.success) {
        setGameSession(sessionResult.session);
      }
      
      return sessionResult;
    } catch (error) {
      console.error('Start game session error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to start game session' 
      };
    }
  };
  
  // End a game session
  const endGameSession = async (gameResult) => {
    try {
      if (!gameSession) return { success: false, message: 'No active game session' };
      
      // End game session through timing service
      const endResult = await gameTimingService.endGameSession(user.id, gameResult);
      
      if (endResult.success) {
        setGameSession(null);
      }
      
      return endResult;
    } catch (error) {
      console.error('End game session error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to end game session' 
      };
    }
  };
  
  // Get current game timing information
  const getGameTiming = (gameType) => {
    return gameTimingService.getGameTiming(gameType || 'crash');
  };

  const value = {
    // State
    user,
    wallet,
    loading,
    isAdmin,
    gameSession,
    connectionStatus,
    
    // Authentication Actions
    login,
    register,
    logout,
    updateUser,
    
    // Wallet Actions
    refreshWalletBalance,
    
    // Game Session Actions
    startGameSession,
    endGameSession,
    getGameTiming,
    
    // Utilities
    checkAdminAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
