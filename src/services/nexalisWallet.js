import { ethers } from 'ethers';
import arenaApi from './arenaApi';

// Constants
const NEXALIS_NETWORK = process.env.REACT_APP_NEXALIS_NETWORK || 'testnet';
const NEXALIS_API_URL = process.env.REACT_APP_NEXALIS_API_URL || 'https://api.nexalis.io';
const NEXALIS_EXPLORER_URL = process.env.REACT_APP_NEXALIS_EXPLORER_URL || 'https://explorer.nexalis.io';

class NexalisWalletService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(NEXALIS_API_URL);
    this.walletCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the wallet service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Check if provider is connected
      await this.provider.getNetwork();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Nexalis wallet service:', error);
      throw new Error('Failed to connect to Nexalis network');
    }
  }

  /**
   * Create a new wallet for an Arena user
   * @param {string} userId - Arena user ID
   * @param {string} password - Password to encrypt the wallet
   * @returns {Object} - Wallet information
   */
  async createWallet(userId, password) {
    await this.initialize();
    
    try {
      // Generate a new random wallet
      const wallet = ethers.Wallet.createRandom();
      
      // Encrypt the wallet with the password
      const encryptedWallet = await wallet.encrypt(password);
      
      // Store encrypted wallet in secure storage
      const walletInfo = {
        address: wallet.address,
        encryptedWallet,
        userId,
        createdAt: new Date().toISOString(),
        balance: '0',
        transactions: []
      };
      
      // Store wallet info in Arena API user metadata
      await arenaApi.apiClient.post('/user/wallet/create', {
        userId,
        walletInfo: {
          address: wallet.address,
          encryptedWallet,
          createdAt: walletInfo.createdAt
        }
      });
      
      // Cache wallet info
      this.walletCache.set(userId, walletInfo);
      
      return {
        address: wallet.address,
        balance: '0',
        network: NEXALIS_NETWORK
      };
    } catch (error) {
      console.error('Failed to create Nexalis wallet:', error);
      throw new Error('Failed to create Nexalis wallet');
    }
  }

  /**
   * Get wallet for an Arena user
   * @param {string} userId - Arena user ID
   * @returns {Object} - Wallet information
   */
  async getWallet(userId) {
    await this.initialize();
    
    try {
      // Check cache first
      if (this.walletCache.has(userId)) {
        const cachedWallet = this.walletCache.get(userId);
        
        // Refresh balance
        const balance = await this.getBalance(cachedWallet.address);
        cachedWallet.balance = balance;
        
        return {
          address: cachedWallet.address,
          balance,
          network: NEXALIS_NETWORK
        };
      }
      
      // Get wallet from Arena API user metadata
      const response = await arenaApi.apiClient.get(`/user/wallet/${userId}`);
      
      if (!response.data.success || !response.data.wallet) {
        // No wallet found, create a new one
        return null;
      }
      
      const walletInfo = response.data.wallet;
      
      // Get current balance
      const balance = await this.getBalance(walletInfo.address);
      
      // Cache wallet info
      this.walletCache.set(userId, {
        ...walletInfo,
        balance
      });
      
      return {
        address: walletInfo.address,
        balance,
        network: NEXALIS_NETWORK
      };
    } catch (error) {
      console.error('Failed to get Nexalis wallet:', error);
      throw new Error('Failed to get Nexalis wallet');
    }
  }

  /**
   * Get wallet balance
   * @param {string} address - Wallet address
   * @returns {string} - Balance in ETH
   */
  async getBalance(address) {
    await this.initialize();
    
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Send transaction
   * @param {string} userId - Arena user ID
   * @param {string} password - Password to decrypt the wallet
   * @param {string} toAddress - Recipient address
   * @param {string} amount - Amount to send in ETH
   * @returns {Object} - Transaction information
   */
  async sendTransaction(userId, password, toAddress, amount) {
    await this.initialize();
    
    try {
      // Get wallet info
      let walletInfo;
      
      if (this.walletCache.has(userId)) {
        walletInfo = this.walletCache.get(userId);
      } else {
        const response = await arenaApi.apiClient.get(`/user/wallet/${userId}`);
        
        if (!response.data.success || !response.data.wallet) {
          throw new Error('Wallet not found');
        }
        
        walletInfo = response.data.wallet;
      }
      
      // Decrypt wallet
      const wallet = await ethers.Wallet.fromEncryptedJson(
        walletInfo.encryptedWallet,
        password
      );
      
      // Connect wallet to provider
      const connectedWallet = wallet.connect(this.provider);
      
      // Check balance
      const balance = await this.getBalance(wallet.address);
      const amountInEth = parseFloat(amount);
      
      if (parseFloat(balance) < amountInEth) {
        throw new Error('Insufficient balance');
      }
      
      // Send transaction
      const tx = await connectedWallet.sendTransaction({
        to: toAddress,
        value: ethers.utils.parseEther(amount.toString())
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update transaction history
      const txInfo = {
        hash: receipt.transactionHash,
        from: wallet.address,
        to: toAddress,
        amount: amount.toString(),
        timestamp: new Date().toISOString(),
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'confirmed' : 'failed'
      };
      
      // Update transaction history in Arena API
      await arenaApi.apiClient.post('/user/wallet/transaction', {
        userId,
        transaction: txInfo
      });
      
      // Update cache
      if (this.walletCache.has(userId)) {
        const cachedWallet = this.walletCache.get(userId);
        cachedWallet.transactions = [txInfo, ...(cachedWallet.transactions || [])];
        cachedWallet.balance = await this.getBalance(wallet.address);
      }
      
      return {
        success: true,
        transaction: txInfo,
        explorerUrl: `${NEXALIS_EXPLORER_URL}/tx/${txInfo.hash}`
      };
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw new Error(error.message || 'Failed to send transaction');
    }
  }

  /**
   * Get transaction history
   * @param {string} userId - Arena user ID
   * @returns {Array} - Transaction history
   */
  async getTransactionHistory(userId) {
    await this.initialize();
    
    try {
      const response = await arenaApi.apiClient.get(`/user/wallet/${userId}/transactions`);
      
      if (!response.data.success) {
        throw new Error('Failed to get transaction history');
      }
      
      return response.data.transactions || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw new Error('Failed to get transaction history');
    }
  }

  /**
   * Export wallet private key
   * @param {string} userId - Arena user ID
   * @param {string} password - Password to decrypt the wallet
   * @returns {Object} - Private key information
   */
  async exportPrivateKey(userId, password) {
    await this.initialize();
    
    try {
      // Get wallet info
      let walletInfo;
      
      if (this.walletCache.has(userId)) {
        walletInfo = this.walletCache.get(userId);
      } else {
        const response = await arenaApi.apiClient.get(`/user/wallet/${userId}`);
        
        if (!response.data.success || !response.data.wallet) {
          throw new Error('Wallet not found');
        }
        
        walletInfo = response.data.wallet;
      }
      
      // Decrypt wallet
      const wallet = await ethers.Wallet.fromEncryptedJson(
        walletInfo.encryptedWallet,
        password
      );
      
      return {
        success: true,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || null,
        address: wallet.address
      };
    } catch (error) {
      console.error('Failed to export private key:', error);
      throw new Error('Failed to export private key. Check your password.');
    }
  }

  /**
   * Import wallet from private key
   * @param {string} userId - Arena user ID
   * @param {string} privateKey - Private key
   * @param {string} password - Password to encrypt the wallet
   * @returns {Object} - Wallet information
   */
  async importWallet(userId, privateKey, password) {
    await this.initialize();
    
    try {
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);
      
      // Encrypt the wallet with the password
      const encryptedWallet = await wallet.encrypt(password);
      
      // Store wallet info in Arena API user metadata
      const walletInfo = {
        address: wallet.address,
        encryptedWallet,
        userId,
        createdAt: new Date().toISOString(),
        balance: await this.getBalance(wallet.address),
        transactions: []
      };
      
      await arenaApi.apiClient.post('/user/wallet/create', {
        userId,
        walletInfo: {
          address: wallet.address,
          encryptedWallet,
          createdAt: walletInfo.createdAt
        }
      });
      
      // Cache wallet info
      this.walletCache.set(userId, walletInfo);
      
      return {
        success: true,
        address: wallet.address,
        balance: walletInfo.balance,
        network: NEXALIS_NETWORK
      };
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw new Error('Failed to import wallet');
    }
  }

  /**
   * Format address for display
   * @param {string} address - Wallet address
   * @returns {string} - Formatted address
   */
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Format balance for display
   * @param {string} balance - Balance in ETH
   * @param {number} decimals - Number of decimal places
   * @returns {string} - Formatted balance
   */
  formatBalance(balance, decimals = 4) {
    if (!balance) return '0';
    
    const num = parseFloat(balance);
    if (isNaN(num)) return '0';
    
    if (num < 0.0001) return '< 0.0001';
    
    return num.toFixed(decimals);
  }

  /**
   * Get explorer URL for address
   * @param {string} address - Wallet address
   * @returns {string} - Explorer URL
   */
  getExplorerAddressUrl(address) {
    return `${NEXALIS_EXPLORER_URL}/address/${address}`;
  }

  /**
   * Get explorer URL for transaction
   * @param {string} txHash - Transaction hash
   * @returns {string} - Explorer URL
   */
  getExplorerTxUrl(txHash) {
    return `${NEXALIS_EXPLORER_URL}/tx/${txHash}`;
  }
}

// Create singleton instance
const nexalisWallet = new NexalisWalletService();

export default nexalisWallet;
