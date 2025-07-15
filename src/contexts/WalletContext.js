import React, { createContext, useContext, useState, useEffect } from 'react';
import { walletService } from '../services/wallet';
import { tokenService } from '../services/token';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize wallet when user changes
  useEffect(() => {
    if (user && user.wallet) {
      initializeWallet();
    } else {
      resetWallet();
    }
  }, [user]);

  // Initialize wallet data
  const initializeWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user || !user.wallet) return;

      // Get wallet instance
      const walletInstance = await walletService.getUserWallet(user.id);
      setWallet(walletInstance);

      // Get balances
      await refreshBalances();

      // Get transaction history
      await refreshTransactions();
    } catch (error) {
      console.error('Wallet initialization error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset wallet state
  const resetWallet = () => {
    setWallet(null);
    setBalance('0');
    setTokenBalance('0');
    setTransactions([]);
    setError(null);
  };

  // Refresh all balances
  const refreshBalances = async () => {
    try {
      if (!user || !user.wallet) return;

      // Get AVAX balance
      const avaxBalance = await walletService.getBalance(user.wallet.address);
      setBalance(avaxBalance);

      // Get NXL token balance
      const nxlBalance = await tokenService.getBalance(user.wallet.address);
      setTokenBalance(nxlBalance);

      return { avax: avaxBalance, nxl: nxlBalance };
    } catch (error) {
      console.error('Balance refresh error:', error);
      setError(error.message);
      return { avax: balance, nxl: tokenBalance };
    }
  };

  // Refresh transaction history
  const refreshTransactions = async () => {
    try {
      if (!user || !user.wallet) return;

      const txHistory = await walletService.getTransactionHistory(user.wallet.address);
      setTransactions(txHistory);

      return txHistory;
    } catch (error) {
      console.error('Transaction refresh error:', error);
      setError(error.message);
      return transactions;
    }
  };

  // Send AVAX
  const sendAVAX = async (toAddress, amount, password) => {
    try {
      setLoading(true);
      setError(null);

      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      // Validate inputs
      if (!toAddress || !amount || !password) {
        throw new Error('Missing required parameters');
      }

      if (parseFloat(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (parseFloat(amount) > parseFloat(balance)) {
        throw new Error('Insufficient AVAX balance');
      }

      // Send transaction
      const tx = await walletService.sendAVAX(
        user.id,
        toAddress,
        amount,
        password
      );

      // Refresh balances after successful transaction
      await refreshBalances();
      await refreshTransactions();

      return {
        success: true,
        transaction: tx,
        message: 'AVAX sent successfully'
      };
    } catch (error) {
      console.error('Send AVAX error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message || 'Failed to send AVAX'
      };
    } finally {
      setLoading(false);
    }
  };

  // Send NXL tokens
  const sendTokens = async (toAddress, amount, password) => {
    try {
      setLoading(true);
      setError(null);

      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      // Validate inputs
      if (!toAddress || !amount || !password) {
        throw new Error('Missing required parameters');
      }

      if (parseFloat(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (parseFloat(amount) > parseFloat(tokenBalance)) {
        throw new Error('Insufficient NXL token balance');
      }

      // Send tokens
      const tx = await tokenService.transfer(
        user.id,
        toAddress,
        amount,
        password
      );

      // Refresh balances after successful transaction
      await refreshBalances();
      await refreshTransactions();

      return {
        success: true,
        transaction: tx,
        message: 'NXL tokens sent successfully'
      };
    } catch (error) {
      console.error('Send tokens error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message || 'Failed to send tokens'
      };
    } finally {
      setLoading(false);
    }
  };

  // Stake tokens
  const stakeTokens = async (amount, password) => {
    try {
      setLoading(true);
      setError(null);

      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      if (parseFloat(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (parseFloat(amount) > parseFloat(tokenBalance)) {
        throw new Error('Insufficient NXL token balance');
      }

      // Stake tokens
      const tx = await tokenService.stake(user.id, amount, password);

      // Refresh balances
      await refreshBalances();
      await refreshTransactions();

      return {
        success: true,
        transaction: tx,
        message: 'Tokens staked successfully'
      };
    } catch (error) {
      console.error('Stake tokens error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message || 'Failed to stake tokens'
      };
    } finally {
      setLoading(false);
    }
  };

  // Unstake tokens
  const unstakeTokens = async (amount, password) => {
    try {
      setLoading(true);
      setError(null);

      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      if (parseFloat(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get staked balance
      const stakedBalance = await tokenService.getStakedBalance(user.wallet.address);
      
      if (parseFloat(amount) > parseFloat(stakedBalance)) {
        throw new Error('Insufficient staked balance');
      }

      // Unstake tokens
      const tx = await tokenService.unstake(user.id, amount, password);

      // Refresh balances
      await refreshBalances();
      await refreshTransactions();

      return {
        success: true,
        transaction: tx,
        message: 'Tokens unstaked successfully'
      };
    } catch (error) {
      console.error('Unstake tokens error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message || 'Failed to unstake tokens'
      };
    } finally {
      setLoading(false);
    }
  };

  // Get staked balance
  const getStakedBalance = async () => {
    try {
      if (!user || !user.wallet) return '0';

      const stakedBalance = await tokenService.getStakedBalance(user.wallet.address);
      return stakedBalance;
    } catch (error) {
      console.error('Get staked balance error:', error);
      return '0';
    }
  };

  // Export wallet (private key/mnemonic)
  const exportWallet = async (password) => {
    try {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      const walletData = await walletService.exportWallet(user.id, password);
      
      return {
        success: true,
        data: walletData,
        message: 'Wallet exported successfully'
      };
    } catch (error) {
      console.error('Export wallet error:', error);
      return {
        success: false,
        message: error.message || 'Failed to export wallet'
      };
    }
  };

  // Import wallet
  const importWallet = async (privateKeyOrMnemonic, password) => {
    try {
      setLoading(true);
      setError(null);

      const walletData = await walletService.importWallet(
        user.id,
        privateKeyOrMnemonic,
        password
      );

      // Reinitialize wallet
      await initializeWallet();

      return {
        success: true,
        data: walletData,
        message: 'Wallet imported successfully'
      };
    } catch (error) {
      console.error('Import wallet error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message || 'Failed to import wallet'
      };
    } finally {
      setLoading(false);
    }
  };

  // Get transaction details
  const getTransactionDetails = async (txHash) => {
    try {
      const details = await walletService.getTransactionDetails(txHash);
      return {
        success: true,
        data: details
      };
    } catch (error) {
      console.error('Get transaction details error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get transaction details'
      };
    }
  };

  // Format balance for display
  const formatBalance = (balance, decimals = 4) => {
    if (!balance || balance === '0') return '0';
    
    const num = parseFloat(balance);
    if (num < 0.0001) return '< 0.0001';
    
    return num.toFixed(decimals);
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const value = {
    // State
    wallet,
    balance,
    tokenBalance,
    transactions,
    loading,
    error,

    // Actions
    refreshBalances,
    refreshTransactions,
    sendAVAX,
    sendTokens,
    stakeTokens,
    unstakeTokens,
    exportWallet,
    importWallet,

    // Utilities
    getStakedBalance,
    getTransactionDetails,
    formatBalance,
    formatAddress,

    // Constants
    walletAddress: user?.wallet?.address || null
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
