// Nexalis Gaming Platform - Wallet Service
// Handles wallet generation, management, and blockchain interactions

import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

// Avalanche network configuration
const AVALANCHE_CONFIG = {
  chainId: 43114,
  name: 'Avalanche Network',
  rpcUrl: process.env.REACT_APP_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
  explorerUrl: 'https://snowtrace.io',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18
  }
};

// Initialize provider
const provider = new ethers.JsonRpcProvider(AVALANCHE_CONFIG.rpcUrl);

// Wallet storage key prefix
const WALLET_STORAGE_PREFIX = 'nexalis_wallet_';

class WalletService {
  constructor() {
    this.provider = provider;
    this.wallets = new Map(); // In-memory wallet cache
  }

  // Generate new wallet
  generateWallet() {
    try {
      const wallet = ethers.Wallet.createRandom();
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase,
        publicKey: wallet.publicKey
      };
    } catch (error) {
      console.error('Generate wallet error:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  // Create wallet for user
  async createWallet(userId, password) {
    try {
      // Generate new wallet
      const walletData = this.generateWallet();
      
      // Encrypt private key and mnemonic
      const encryptedPrivateKey = CryptoJS.AES.encrypt(walletData.privateKey, password).toString();
      const encryptedMnemonic = CryptoJS.AES.encrypt(walletData.mnemonic, password).toString();
      
      // Prepare wallet info for storage
      const walletInfo = {
        userId,
        address: walletData.address,
        publicKey: walletData.publicKey,
        encryptedPrivateKey,
        encryptedMnemonic,
        createdAt: new Date().toISOString(),
        balance: '0'
      };
      
      // Store wallet info
      await this.storeWallet(userId, walletInfo);
      
      // Cache wallet instance
      const walletInstance = new ethers.Wallet(walletData.privateKey, this.provider);
      this.wallets.set(userId, walletInstance);
      
      return {
        address: walletData.address,
        publicKey: walletData.publicKey,
        balance: '0'
      };
    } catch (error) {
      console.error('Create wallet error:', error);
      throw new Error('Failed to create wallet');
    }
  }

  // Store wallet securely
  async storeWallet(userId, walletInfo) {
    try {
      const storageKey = `${WALLET_STORAGE_PREFIX}${userId}`;
      
      // Store in localStorage (in production, use secure backend storage)
      localStorage.setItem(storageKey, JSON.stringify(walletInfo));
      
      // Also store in IndexedDB for better security
      if ('indexedDB' in window) {
        await this.storeInIndexedDB(userId, walletInfo);
      }
      
      return true;
    } catch (error) {
      console.error('Store wallet error:', error);
      throw new Error('Failed to store wallet');
    }
  }

  // Store in IndexedDB
  async storeInIndexedDB(userId, walletInfo) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NexalisWallets', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['wallets'], 'readwrite');
        const store = transaction.objectStore('wallets');
        
        store.put({ ...walletInfo, id: userId });
        
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('wallets')) {
          db.createObjectStore('wallets', { keyPath: 'id' });
        }
      };
    });
  }

  // Get user wallet
  async getUserWallet(userId, password = null) {
    try {
      // Check cache first
      if (this.wallets.has(userId)) {
        return this.wallets.get(userId);
      }
      
      // Get from storage
      const walletInfo = await this.getStoredWallet(userId);
      if (!walletInfo) {
        throw new Error('Wallet not found');
      }
      
      // If password provided, decrypt and create wallet instance
      if (password) {
        const privateKeyBytes = CryptoJS.AES.decrypt(walletInfo.encryptedPrivateKey, password);
        const privateKey = privateKeyBytes.toString(CryptoJS.enc.Utf8);
        
        if (!privateKey) {
          throw new Error('Invalid password');
        }
        
        const walletInstance = new ethers.Wallet(privateKey, this.provider);
        this.wallets.set(userId, walletInstance);
        
        return walletInstance;
      }
      
      // Return wallet info without private key
      return {
        address: walletInfo.address,
        publicKey: walletInfo.publicKey,
        balance: walletInfo.balance || '0'
      };
    } catch (error) {
      console.error('Get user wallet error:', error);
      throw new Error('Failed to get wallet');
    }
  }

  // Get stored wallet info
  async getStoredWallet(userId) {
    try {
      const storageKey = `${WALLET_STORAGE_PREFIX}${userId}`;
      
      // Try localStorage first
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Try IndexedDB
      if ('indexedDB' in window) {
        return await this.getFromIndexedDB(userId);
      }
      
      return null;
    } catch (error) {
      console.error('Get stored wallet error:', error);
      return null;
    }
  }

  // Get from IndexedDB
  async getFromIndexedDB(userId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NexalisWallets', 1);
      
      request.onerror = () => resolve(null);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['wallets'], 'readonly');
        const store = transaction.objectStore('wallets');
        const getRequest = store.get(userId);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
        
        getRequest.onerror = () => resolve(null);
      };
    });
  }

  // Get wallet balance
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Get balance error:', error);
      return '0';
    }
  }

  // Send AVAX
  async sendAVAX(userId, toAddress, amount, password) {
    try {
      // Get wallet instance
      const wallet = await this.getUserWallet(userId, password);
      if (!wallet.privateKey) {
        throw new Error('Wallet not unlocked');
      }
      
      // Validate inputs
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }
      
      const amountWei = ethers.parseEther(amount.toString());
      
      // Check balance
      const balance = await wallet.provider.getBalance(wallet.address);
      if (balance < amountWei) {
        throw new Error('Insufficient balance');
      }
      
      // Get gas price
      const gasPrice = await wallet.provider.getFeeData();
      
      // Prepare transaction
      const tx = {
        to: toAddress,
        value: amountWei,
        gasLimit: 21000,
        gasPrice: gasPrice.gasPrice
      };
      
      // Send transaction
      const txResponse = await wallet.sendTransaction(tx);
      
      // Wait for confirmation
      const receipt = await txResponse.wait();
      
      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Send AVAX error:', error);
      throw new Error(error.message || 'Failed to send AVAX');
    }
  }

  // Get transaction history
  async getTransactionHistory(address, limit = 50) {
    try {
      // In a real implementation, you would query a blockchain indexer
      // For now, we'll return mock data or use a simple approach
      
      const transactions = [];
      
      // Get recent transactions (simplified approach)
      const latestBlock = await this.provider.getBlockNumber();
      const startBlock = Math.max(0, latestBlock - 1000); // Last 1000 blocks
      
      for (let i = latestBlock; i > startBlock && transactions.length < limit; i--) {
        try {
          const block = await this.provider.getBlock(i, true);
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              if (tx.from === address || tx.to === address) {
                transactions.push({
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: ethers.formatEther(tx.value || 0),
                  gasPrice: tx.gasPrice?.toString() || '0',
                  gasUsed: tx.gasLimit?.toString() || '0',
                  blockNumber: tx.blockNumber,
                  timestamp: block.timestamp,
                  type: tx.from === address ? 'sent' : 'received'
                });
                
                if (transactions.length >= limit) break;
              }
            }
          }
        } catch (blockError) {
          // Skip blocks that can't be fetched
          continue;
        }
      }
      
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Get transaction history error:', error);
      return [];
    }
  }

  // Get transaction details
  async getTransactionDetails(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!tx) {
        throw new Error('Transaction not found');
      }
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: tx.gasPrice?.toString() || '0',
        gasLimit: tx.gasLimit?.toString() || '0',
        gasUsed: receipt?.gasUsed?.toString() || '0',
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        status: receipt?.status === 1 ? 'success' : 'failed',
        confirmations: await tx.confirmations()
      };
    } catch (error) {
      console.error('Get transaction details error:', error);
      throw new Error('Failed to get transaction details');
    }
  }

  // Export wallet
  async exportWallet(userId, password) {
    try {
      const walletInfo = await this.getStoredWallet(userId);
      if (!walletInfo) {
        throw new Error('Wallet not found');
      }
      
      // Decrypt private key and mnemonic
      const privateKeyBytes = CryptoJS.AES.decrypt(walletInfo.encryptedPrivateKey, password);
      const privateKey = privateKeyBytes.toString(CryptoJS.enc.Utf8);
      
      const mnemonicBytes = CryptoJS.AES.decrypt(walletInfo.encryptedMnemonic, password);
      const mnemonic = mnemonicBytes.toString(CryptoJS.enc.Utf8);
      
      if (!privateKey || !mnemonic) {
        throw new Error('Invalid password');
      }
      
      return {
        address: walletInfo.address,
        privateKey,
        mnemonic,
        publicKey: walletInfo.publicKey
      };
    } catch (error) {
      console.error('Export wallet error:', error);
      throw new Error('Failed to export wallet');
    }
  }

  // Import wallet
  async importWallet(userId, privateKeyOrMnemonic, password) {
    try {
      let wallet;
      
      // Try to create wallet from private key or mnemonic
      if (privateKeyOrMnemonic.includes(' ')) {
        // Mnemonic phrase
        wallet = ethers.Wallet.fromPhrase(privateKeyOrMnemonic);
      } else {
        // Private key
        wallet = new ethers.Wallet(privateKeyOrMnemonic);
      }
      
      // Encrypt and store
      const encryptedPrivateKey = CryptoJS.AES.encrypt(wallet.privateKey, password).toString();
      const encryptedMnemonic = CryptoJS.AES.encrypt(wallet.mnemonic?.phrase || '', password).toString();
      
      const walletInfo = {
        userId,
        address: wallet.address,
        publicKey: wallet.publicKey,
        encryptedPrivateKey,
        encryptedMnemonic,
        createdAt: new Date().toISOString(),
        imported: true
      };
      
      await this.storeWallet(userId, walletInfo);
      
      // Cache wallet instance
      const walletInstance = new ethers.Wallet(wallet.privateKey, this.provider);
      this.wallets.set(userId, walletInstance);
      
      return {
        address: wallet.address,
        publicKey: wallet.publicKey
      };
    } catch (error) {
      console.error('Import wallet error:', error);
      throw new Error('Failed to import wallet');
    }
  }

  // Validate address
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  // Format address for display
  formatAddress(address, length = 8) {
    if (!address) return '';
    if (address.length <= length) return address;
    
    const start = address.slice(0, length / 2 + 2);
    const end = address.slice(-length / 2);
    return `${start}...${end}`;
  }

  // Get network info
  getNetworkInfo() {
    return AVALANCHE_CONFIG;
  }

  // Clear wallet cache
  clearCache(userId = null) {
    if (userId) {
      this.wallets.delete(userId);
    } else {
      this.wallets.clear();
    }
  }
}

// Create singleton instance
const walletService = new WalletService();

export { walletService };
export default walletService;
