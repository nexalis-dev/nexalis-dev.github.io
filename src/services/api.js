// Nexalis Gaming Platform - API Service
// Handles all API communications with Star Arena and blockchain services

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.star-arena.com';
const BLOCKCHAIN_RPC_URL = process.env.REACT_APP_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';

// API Configuration
const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// HTTP Client with error handling
class APIClient {
  constructor(config) {
    this.config = config;
    this.token = null;
  }

  setAuthToken(token) {
    this.token = token;
  }

  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.config.baseURL}${endpoint}`;
    
    const requestOptions = {
      method: method.toUpperCase(),
      headers: {
        ...this.config.headers,
        ...options.headers
      },
      ...options
    };

    // Add auth token if available
    if (this.token) {
      requestOptions.headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add body for POST/PUT requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }
}

// Initialize API client
const apiClient = new APIClient(apiConfig);

// Star Arena API Service
export const starArenaAPI = {
  // Authentication endpoints
  async authenticate(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });

      if (response.token) {
        apiClient.setAuthToken(response.token);
      }

      return {
        success: true,
        user: response.user,
        token: response.token
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: error.message || 'Authentication failed'
      };
    }
  },

  async register(email, password, username) {
    try {
      const response = await apiClient.post('/auth/register', {
        email,
        password,
        username
      });

      return {
        success: true,
        user: response.user,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  },

  async verifyToken(token) {
    try {
      apiClient.setAuthToken(token);
      const response = await apiClient.get('/auth/verify');
      return response.valid === true;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
      apiClient.setAuthToken(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: error.message };
    }
  },

  // User management
  async getUserProfile(userId) {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return {
        success: true,
        user: response.user
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  async updateUserProfile(userId, updates) {
    try {
      const response = await apiClient.put(`/users/${userId}`, updates);
      return {
        success: true,
        user: response.user
      };
    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  // Game data endpoints
  async getGameHistory(userId, gameType = null, limit = 50) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });
      
      if (gameType) {
        params.append('type', gameType);
      }

      const response = await apiClient.get(`/games/history/${userId}?${params}`);
      return {
        success: true,
        games: response.games
      };
    } catch (error) {
      console.error('Get game history error:', error);
      return {
        success: false,
        message: error.message,
        games: []
      };
    }
  },

  async getGameStats(userId) {
    try {
      const response = await apiClient.get(`/games/stats/${userId}`);
      return {
        success: true,
        stats: response.stats
      };
    } catch (error) {
      console.error('Get game stats error:', error);
      return {
        success: false,
        message: error.message,
        stats: {
          totalGames: 0,
          totalWins: 0,
          totalLosses: 0,
          totalWagered: '0',
          totalWon: '0',
          winRate: 0
        }
      };
    }
  },

  // Leaderboard
  async getLeaderboard(gameType = 'all', period = 'all', limit = 100) {
    try {
      const params = new URLSearchParams({
        type: gameType,
        period,
        limit: limit.toString()
      });

      const response = await apiClient.get(`/leaderboard?${params}`);
      return {
        success: true,
        leaderboard: response.leaderboard
      };
    } catch (error) {
      console.error('Get leaderboard error:', error);
      return {
        success: false,
        message: error.message,
        leaderboard: []
      };
    }
  }
};

// Blockchain API Service
export const blockchainAPI = {
  // Network configuration
  getNetworkConfig() {
    return {
      chainId: 43114, // Avalanche Mainnet
      chainName: 'Avalanche Network',
      nativeCurrency: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 18
      },
      rpcUrls: [BLOCKCHAIN_RPC_URL],
      blockExplorerUrls: ['https://snowtrace.io/']
    };
  },

  // Get transaction details
  async getTransaction(txHash) {
    try {
      const response = await fetch(BLOCKCHAIN_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        success: true,
        transaction: data.result
      };
    } catch (error) {
      console.error('Get transaction error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  // Get transaction receipt
  async getTransactionReceipt(txHash) {
    try {
      const response = await fetch(BLOCKCHAIN_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        success: true,
        receipt: data.result
      };
    } catch (error) {
      console.error('Get transaction receipt error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  // Get account balance
  async getBalance(address) {
    try {
      const response = await fetch(BLOCKCHAIN_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Convert from wei to AVAX
      const balanceWei = parseInt(data.result, 16);
      const balanceAVAX = balanceWei / Math.pow(10, 18);

      return {
        success: true,
        balance: balanceAVAX.toString()
      };
    } catch (error) {
      console.error('Get balance error:', error);
      return {
        success: false,
        message: error.message,
        balance: '0'
      };
    }
  },

  // Get gas price
  async getGasPrice() {
    try {
      const response = await fetch(BLOCKCHAIN_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        success: true,
        gasPrice: data.result
      };
    } catch (error) {
      console.error('Get gas price error:', error);
      return {
        success: false,
        message: error.message,
        gasPrice: '0x0'
      };
    }
  }
};

// GitHub Actions API (for serverless backend simulation)
export const githubActionsAPI = {
  // Trigger workflow
  async triggerWorkflow(workflowName, inputs = {}) {
    try {
      // This would typically trigger a GitHub Actions workflow
      // For now, we'll simulate the API call
      console.log(`Triggering workflow: ${workflowName}`, inputs);
      
      // Simulate API response
      return {
        success: true,
        workflowId: `workflow_${Date.now()}`,
        message: 'Workflow triggered successfully'
      };
    } catch (error) {
      console.error('Trigger workflow error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  // Get workflow status
  async getWorkflowStatus(workflowId) {
    try {
      // Simulate workflow status check
      console.log(`Checking workflow status: ${workflowId}`);
      
      return {
        success: true,
        status: 'completed',
        conclusion: 'success'
      };
    } catch (error) {
      console.error('Get workflow status error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
};

// Application initialization
export const initializeApp = async () => {
  try {
    console.log('Initializing Nexalis Gaming Platform...');
    
    // Check API connectivity
    const healthCheck = await apiClient.get('/health').catch(() => ({
      status: 'offline',
      message: 'API server not available - running in offline mode'
    }));
    
    console.log('API Health:', healthCheck);
    
    // Initialize blockchain connection
    const networkConfig = blockchainAPI.getNetworkConfig();
    console.log('Blockchain Network:', networkConfig.chainName);
    
    // Load cached data if available
    const cachedData = localStorage.getItem('nexalis_cache');
    if (cachedData) {
      console.log('Loading cached data...');
    }
    
    console.log('Nexalis Gaming Platform initialized successfully');
    
    return {
      success: true,
      apiStatus: healthCheck.status || 'online',
      networkConfig
    };
  } catch (error) {
    console.error('App initialization error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// Export API client for direct use
export { apiClient };

// Default export
export default {
  starArenaAPI,
  blockchainAPI,
  githubActionsAPI,
  initializeApp,
  apiClient
};
