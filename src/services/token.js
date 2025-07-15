// Nexalis Gaming Platform - Token Service
// Handles NXL token operations and smart contract interactions

import { ethers } from 'ethers';
import { walletService } from './wallet';

// Token contract configuration
const TOKEN_CONFIG = {
  address: process.env.REACT_APP_NXL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
  decimals: 18,
  symbol: 'NXL',
  name: 'Nexalis Token'
};

// ERC20 ABI (simplified)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

// Nexalis Token ABI (extended)
const NEXALIS_TOKEN_ABI = [
  ...ERC20_ABI,
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function stakingBalances(address account) view returns (uint256)',
  'function gameContracts(address account) view returns (bool)',
  'function addGameContract(address gameContract)',
  'event TokensStaked(address indexed user, uint256 amount)',
  'event TokensUnstaked(address indexed user, uint256 amount)'
];

class TokenService {
  constructor() {
    this.provider = walletService.provider;
    this.tokenContract = null;
    this.initializeContract();
  }

  // Initialize token contract
  initializeContract() {
    try {
      if (TOKEN_CONFIG.address !== '0x0000000000000000000000000000000000000000') {
        this.tokenContract = new ethers.Contract(
          TOKEN_CONFIG.address,
          NEXALIS_TOKEN_ABI,
          this.provider
        );
      }
    } catch (error) {
      console.error('Token contract initialization error:', error);
    }
  }

  // Get token balance
  async getBalance(address) {
    try {
      if (!this.tokenContract) {
        // Return mock balance if contract not deployed
        return this.getMockBalance(address);
      }

      const balance = await this.tokenContract.balanceOf(address);
      return ethers.formatUnits(balance, TOKEN_CONFIG.decimals);
    } catch (error) {
      console.error('Get token balance error:', error);
      return '0';
    }
  }

  // Get mock balance for development
  getMockBalance(address) {
    // Return different mock balances based on address
    const mockBalances = {
      default: '1000.0'
    };
    
    const stored = localStorage.getItem(`mock_nxl_balance_${address}`);
    return stored || mockBalances.default;
  }

  // Set mock balance for development
  setMockBalance(address, balance) {
    localStorage.setItem(`mock_nxl_balance_${address}`, balance.toString());
  }

  // Transfer tokens
  async transfer(userId, toAddress, amount, password) {
    try {
      // Get user wallet
      const wallet = await walletService.getUserWallet(userId, password);
      if (!wallet.privateKey) {
        throw new Error('Wallet not unlocked');
      }

      if (!this.tokenContract) {
        // Mock transfer for development
        return this.mockTransfer(wallet.address, toAddress, amount);
      }

      // Validate inputs
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }

      const amountWei = ethers.parseUnits(amount.toString(), TOKEN_CONFIG.decimals);

      // Check balance
      const balance = await this.tokenContract.balanceOf(wallet.address);
      if (balance < amountWei) {
        throw new Error('Insufficient token balance');
      }

      // Connect wallet to contract
      const tokenWithSigner = this.tokenContract.connect(wallet);

      // Send transaction
      const tx = await tokenWithSigner.transfer(toAddress, amountWei);
      const receipt = await tx.wait();

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Transfer tokens error:', error);
      throw new Error(error.message || 'Failed to transfer tokens');
    }
  }

  // Mock transfer for development
  async mockTransfer(fromAddress, toAddress, amount) {
    try {
      // Get current balances
      const fromBalance = parseFloat(this.getMockBalance(fromAddress));
      const toBalance = parseFloat(this.getMockBalance(toAddress));
      const transferAmount = parseFloat(amount);

      if (fromBalance < transferAmount) {
        throw new Error('Insufficient token balance');
      }

      // Update balances
      this.setMockBalance(fromAddress, fromBalance - transferAmount);
      this.setMockBalance(toAddress, toBalance + transferAmount);

      // Mock transaction receipt
      return {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: '21000',
        status: 'success'
      };
    } catch (error) {
      console.error('Mock transfer error:', error);
      throw error;
    }
  }

  // Approve spending
  async approve(userId, spenderAddress, amount, password) {
    try {
      const wallet = await walletService.getUserWallet(userId, password);
      if (!wallet.privateKey) {
        throw new Error('Wallet not unlocked');
      }

      if (!this.tokenContract) {
        // Mock approval for development
        return this.mockApproval(wallet.address, spenderAddress, amount);
      }

      const amountWei = ethers.parseUnits(amount.toString(), TOKEN_CONFIG.decimals);
      const tokenWithSigner = this.tokenContract.connect(wallet);

      const tx = await tokenWithSigner.approve(spenderAddress, amountWei);
      const receipt = await tx.wait();

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Approve tokens error:', error);
      throw new Error(error.message || 'Failed to approve tokens');
    }
  }

  // Mock approval for development
  async mockApproval(ownerAddress, spenderAddress, amount) {
    const approvalKey = `mock_approval_${ownerAddress}_${spenderAddress}`;
    localStorage.setItem(approvalKey, amount.toString());

    return {
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: '45000',
      status: 'success'
    };
  }

  // Get allowance
  async getAllowance(ownerAddress, spenderAddress) {
    try {
      if (!this.tokenContract) {
        // Mock allowance for development
        const approvalKey = `mock_approval_${ownerAddress}_${spenderAddress}`;
        const stored = localStorage.getItem(approvalKey);
        return stored || '0';
      }

      const allowance = await this.tokenContract.allowance(ownerAddress, spenderAddress);
      return ethers.formatUnits(allowance, TOKEN_CONFIG.decimals);
    } catch (error) {
      console.error('Get allowance error:', error);
      return '0';
    }
  }

  // Stake tokens
  async stake(userId, amount, password) {
    try {
      const wallet = await walletService.getUserWallet(userId, password);
      if (!wallet.privateKey) {
        throw new Error('Wallet not unlocked');
      }

      if (!this.tokenContract) {
        // Mock staking for development
        return this.mockStake(wallet.address, amount);
      }

      const amountWei = ethers.parseUnits(amount.toString(), TOKEN_CONFIG.decimals);

      // Check balance
      const balance = await this.tokenContract.balanceOf(wallet.address);
      if (balance < amountWei) {
        throw new Error('Insufficient token balance');
      }

      const tokenWithSigner = this.tokenContract.connect(wallet);
      const tx = await tokenWithSigner.stake(amountWei);
      const receipt = await tx.wait();

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Stake tokens error:', error);
      throw new Error(error.message || 'Failed to stake tokens');
    }
  }

  // Mock staking for development
  async mockStake(address, amount) {
    try {
      const balance = parseFloat(this.getMockBalance(address));
      const stakeAmount = parseFloat(amount);

      if (balance < stakeAmount) {
        throw new Error('Insufficient token balance');
      }

      // Update balances
      this.setMockBalance(address, balance - stakeAmount);
      
      const currentStaked = parseFloat(this.getMockStakedBalance(address));
      this.setMockStakedBalance(address, currentStaked + stakeAmount);

      return {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: '65000',
        status: 'success'
      };
    } catch (error) {
      console.error('Mock stake error:', error);
      throw error;
    }
  }

  // Unstake tokens
  async unstake(userId, amount, password) {
    try {
      const wallet = await walletService.getUserWallet(userId, password);
      if (!wallet.privateKey) {
        throw new Error('Wallet not unlocked');
      }

      if (!this.tokenContract) {
        // Mock unstaking for development
        return this.mockUnstake(wallet.address, amount);
      }

      const amountWei = ethers.parseUnits(amount.toString(), TOKEN_CONFIG.decimals);

      // Check staked balance
      const stakedBalance = await this.tokenContract.stakingBalances(wallet.address);
      if (stakedBalance < amountWei) {
        throw new Error('Insufficient staked balance');
      }

      const tokenWithSigner = this.tokenContract.connect(wallet);
      const tx = await tokenWithSigner.unstake(amountWei);
      const receipt = await tx.wait();

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Unstake tokens error:', error);
      throw new Error(error.message || 'Failed to unstake tokens');
    }
  }

  // Mock unstaking for development
  async mockUnstake(address, amount) {
    try {
      const stakedBalance = parseFloat(this.getMockStakedBalance(address));
      const unstakeAmount = parseFloat(amount);

      if (stakedBalance < unstakeAmount) {
        throw new Error('Insufficient staked balance');
      }

      // Update balances
      const currentBalance = parseFloat(this.getMockBalance(address));
      this.setMockBalance(address, currentBalance + unstakeAmount);
      this.setMockStakedBalance(address, stakedBalance - unstakeAmount);

      return {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: '55000',
        status: 'success'
      };
    } catch (error) {
      console.error('Mock unstake error:', error);
      throw error;
    }
  }

  // Get staked balance
  async getStakedBalance(address) {
    try {
      if (!this.tokenContract) {
        // Mock staked balance for development
        return this.getMockStakedBalance(address);
      }

      const stakedBalance = await this.tokenContract.stakingBalances(address);
      return ethers.formatUnits(stakedBalance, TOKEN_CONFIG.decimals);
    } catch (error) {
      console.error('Get staked balance error:', error);
      return '0';
    }
  }

  // Get mock staked balance
  getMockStakedBalance(address) {
    const stored = localStorage.getItem(`mock_nxl_staked_${address}`);
    return stored || '0';
  }

  // Set mock staked balance
  setMockStakedBalance(address, balance) {
    localStorage.setItem(`mock_nxl_staked_${address}`, balance.toString());
  }

  // Get token info
  async getTokenInfo() {
    try {
      if (!this.tokenContract) {
        return {
          name: TOKEN_CONFIG.name,
          symbol: TOKEN_CONFIG.symbol,
          decimals: TOKEN_CONFIG.decimals,
          totalSupply: '1000000000',
          address: TOKEN_CONFIG.address
        };
      }

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.tokenContract.name(),
        this.tokenContract.symbol(),
        this.tokenContract.decimals(),
        this.tokenContract.totalSupply()
      ]);

      return {
        name,
        symbol,
        decimals: decimals.toString(),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        address: TOKEN_CONFIG.address
      };
    } catch (error) {
      console.error('Get token info error:', error);
      return {
        name: TOKEN_CONFIG.name,
        symbol: TOKEN_CONFIG.symbol,
        decimals: TOKEN_CONFIG.decimals,
        totalSupply: '1000000000',
        address: TOKEN_CONFIG.address
      };
    }
  }

  // Format token amount
  formatAmount(amount, decimals = 4) {
    if (!amount || amount === '0') return '0';
    
    const num = parseFloat(amount);
    if (num < 0.0001) return '< 0.0001';
    
    return num.toFixed(decimals);
  }

  // Parse token amount
  parseAmount(amount) {
    return ethers.parseUnits(amount.toString(), TOKEN_CONFIG.decimals);
  }

  // Format token amount from wei
  formatFromWei(amountWei) {
    return ethers.formatUnits(amountWei, TOKEN_CONFIG.decimals);
  }

  // Get token contract address
  getTokenAddress() {
    return TOKEN_CONFIG.address;
  }

  // Update token contract address
  updateTokenAddress(address) {
    TOKEN_CONFIG.address = address;
    this.initializeContract();
  }
}

// Create singleton instance
const tokenService = new TokenService();

export { tokenService, TOKEN_CONFIG };
export default tokenService;
