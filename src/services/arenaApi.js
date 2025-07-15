import axios from 'axios';

// Arena API Configuration
const ARENA_API_BASE_URL = process.env.REACT_APP_ARENA_API_URL || 'https://api.star-arena.com/v1';
const ARENA_WS_URL = process.env.REACT_APP_ARENA_WS_URL || 'wss://ws.star-arena.com';

class ArenaApiService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: ARENA_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.websocket = null;
    this.authToken = localStorage.getItem('arena_auth_token');
    this.refreshToken = localStorage.getItem('arena_refresh_token');
    this.user = null;
    this.wallet = null;
    this.gameSession = null;
    this.listeners = new Map();

    // Setup request interceptor for auth
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add auth token
    this.apiClient.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshAuthToken();
            originalRequest.headers.Authorization = `Bearer ${this.authToken}`;
            return this.apiClient(originalRequest);
          } catch (refreshError) {
            this.logout();
            throw refreshError;
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Authentication Methods
  async login(credentials) {
    try {
      const response = await this.apiClient.post('/auth/login', credentials);
      const { token, refreshToken, user, wallet } = response.data;

      this.authToken = token;
      this.refreshToken = refreshToken;
      this.user = user;
      this.wallet = wallet;

      // Store tokens
      localStorage.setItem('arena_auth_token', token);
      localStorage.setItem('arena_refresh_token', refreshToken);
      localStorage.setItem('arena_user', JSON.stringify(user));
      localStorage.setItem('arena_wallet', JSON.stringify(wallet));

      // Setup wallet if not exists
      if (!wallet) {
        await this.setupWallet();
      }

      // Connect to WebSocket
      await this.connectWebSocket();

      return { success: true, user: this.user, wallet: this.wallet };
    } catch (error) {
      console.error('Arena login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  }

  async register(userData) {
    try {
      const response = await this.apiClient.post('/auth/register', userData);
      const { token, refreshToken, user } = response.data;

      this.authToken = token;
      this.refreshToken = refreshToken;
      this.user = user;

      // Store tokens
      localStorage.setItem('arena_auth_token', token);
      localStorage.setItem('arena_refresh_token', refreshToken);
      localStorage.setItem('arena_user', JSON.stringify(user));

      // Auto-setup wallet for new users
      await this.setupWallet();

      // Connect to WebSocket
      await this.connectWebSocket();

      return { success: true, user: this.user, wallet: this.wallet };
    } catch (error) {
      console.error('Arena registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  }

  async refreshAuthToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${ARENA_API_BASE_URL}/auth/refresh`, {
        refreshToken: this.refreshToken
      });

      const { token, refreshToken: newRefreshToken } = response.data;
      
      this.authToken = token;
      this.refreshToken = newRefreshToken;

      localStorage.setItem('arena_auth_token', token);
      localStorage.setItem('arena_refresh_token', newRefreshToken);

      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  logout() {
    this.authToken = null;
    this.refreshToken = null;
    this.user = null;
    this.wallet = null;
    this.gameSession = null;

    localStorage.removeItem('arena_auth_token');
    localStorage.removeItem('arena_refresh_token');
    localStorage.removeItem('arena_user');
    localStorage.removeItem('arena_wallet');

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  // Wallet Methods
  async setupWallet() {
    try {
      const response = await this.apiClient.post('/wallet/setup', {
        userId: this.user.id,
        currency: 'ARENA'
      });

      this.wallet = response.data.wallet;
      localStorage.setItem('arena_wallet', JSON.stringify(this.wallet));

      return this.wallet;
    } catch (error) {
      console.error('Wallet setup failed:', error);
      throw error;
    }
  }

  async getWalletBalance() {
    try {
      const response = await this.apiClient.get('/wallet/balance');
      this.wallet = { ...this.wallet, ...response.data };
      localStorage.setItem('arena_wallet', JSON.stringify(this.wallet));
      return this.wallet;
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  async updateBalance(amount, type = 'game_result', gameId = null) {
    try {
      const response = await this.apiClient.post('/wallet/update', {
        amount,
        type,
        gameId,
        timestamp: Date.now()
      });

      this.wallet = { ...this.wallet, ...response.data.wallet };
      localStorage.setItem('arena_wallet', JSON.stringify(this.wallet));

      // Emit balance update event
      this.emit('balanceUpdate', this.wallet);

      return this.wallet;
    } catch (error) {
      console.error('Failed to update balance:', error);
      throw error;
    }
  }

  // Game Session Methods
  async startGameSession(gameType) {
    try {
      // Check if user already has active session
      if (this.gameSession && this.gameSession.status === 'active') {
        return { 
          success: false, 
          error: 'You already have an active game session. Please finish your current game first.' 
        };
      }

      const response = await this.apiClient.post('/game/session/start', {
        gameType,
        userId: this.user.id,
        timestamp: Date.now()
      });

      this.gameSession = response.data.session;
      
      // Emit session start event
      this.emit('gameSessionStart', this.gameSession);

      return { success: true, session: this.gameSession };
    } catch (error) {
      console.error('Failed to start game session:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to start game session' 
      };
    }
  }

  async endGameSession(result) {
    try {
      if (!this.gameSession) {
        return { success: false, error: 'No active game session' };
      }

      const response = await this.apiClient.post('/game/session/end', {
        sessionId: this.gameSession.id,
        result,
        timestamp: Date.now()
      });

      const endedSession = this.gameSession;
      this.gameSession = null;

      // Update balance if there's a win/loss
      if (result.balanceChange) {
        await this.updateBalance(result.balanceChange, 'game_result', endedSession.id);
      }

      // Emit session end event
      this.emit('gameSessionEnd', { session: endedSession, result });

      return { success: true, session: response.data.session };
    } catch (error) {
      console.error('Failed to end game session:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to end game session' 
      };
    }
  }

  async getActiveSession() {
    try {
      const response = await this.apiClient.get('/game/session/active');
      this.gameSession = response.data.session;
      return this.gameSession;
    } catch (error) {
      if (error.response?.status === 404) {
        this.gameSession = null;
        return null;
      }
      console.error('Failed to get active session:', error);
      throw error;
    }
  }

  // WebSocket Methods
  async connectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
    }

    try {
      this.websocket = new WebSocket(`${ARENA_WS_URL}?token=${this.authToken}`);

      this.websocket.onopen = () => {
        console.log('Arena WebSocket connected');
        this.emit('wsConnected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Arena WebSocket disconnected');
        this.emit('wsDisconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.authToken) {
            this.connectWebSocket();
          }
        }, 5000);
      };

      this.websocket.onerror = (error) => {
        console.error('Arena WebSocket error:', error);
        this.emit('wsError', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  handleWebSocketMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'balance_update':
        this.wallet = { ...this.wallet, ...payload };
        localStorage.setItem('arena_wallet', JSON.stringify(this.wallet));
        this.emit('balanceUpdate', this.wallet);
        break;

      case 'game_timing':
        this.emit('gameTiming', payload);
        break;

      case 'session_conflict':
        this.emit('sessionConflict', payload);
        break;

      case 'system_message':
        this.emit('systemMessage', payload);
        break;

      default:
        this.emit('wsMessage', data);
    }
  }

  sendWebSocketMessage(type, payload) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ type, payload }));
    }
  }

  // Event System
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility Methods
  isAuthenticated() {
    return !!this.authToken && !!this.user;
  }

  hasActiveGameSession() {
    return !!this.gameSession && this.gameSession.status === 'active';
  }

  getUser() {
    return this.user;
  }

  getWallet() {
    return this.wallet;
  }

  getGameSession() {
    return this.gameSession;
  }

  // Initialize from stored data
  async initializeFromStorage() {
    try {
      const storedToken = localStorage.getItem('arena_auth_token');
      const storedUser = localStorage.getItem('arena_user');
      const storedWallet = localStorage.getItem('arena_wallet');

      if (storedToken && storedUser) {
        this.authToken = storedToken;
        this.user = JSON.parse(storedUser);
        
        if (storedWallet) {
          this.wallet = JSON.parse(storedWallet);
        }

        // Verify token is still valid
        await this.getWalletBalance();
        
        // Check for active session
        await this.getActiveSession();

        // Connect WebSocket
        await this.connectWebSocket();

        return true;
      }
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
      this.logout();
    }
    
    return false;
  }
}

// Create singleton instance
const arenaApi = new ArenaApiService();

export default arenaApi;
