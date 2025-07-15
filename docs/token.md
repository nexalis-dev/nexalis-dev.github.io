# Nexalis Token System

## Token Overview

Nexalis Token (NXL) er det centrale ERC20 token der driver hele gaming økosystemet. Tokenet fungerer som universal valuta på tværs af alle spil og giver adgang til premium features.

### Token Specifications
- **Name**: Nexalis Token
- **Symbol**: NXL
- **Decimals**: 18
- **Total Supply**: 1,000,000,000 NXL (1 billion)
- **Network**: Avalanche C-Chain
- **Standard**: ERC20 with extensions

## Tokenomics

### Distribution Model
```javascript
const tokenDistribution = {
  gameRewards: {
    allocation: 400000000, // 40%
    description: 'Player rewards and incentives',
    vestingPeriod: 'None - distributed through gameplay'
  },
  liquidityPool: {
    allocation: 200000000, // 20%
    description: 'DEX liquidity on Trader Joe',
    lockPeriod: '2 years'
  },
  development: {
    allocation: 150000000, // 15%
    description: 'Platform development and maintenance',
    vestingPeriod: '4 years linear'
  },
  marketing: {
    allocation: 100000000, // 10%
    description: 'Marketing and partnerships',
    vestingPeriod: '2 years linear'
  },
  team: {
    allocation: 100000000, // 10%
    description: 'Core team allocation',
    vestingPeriod: '4 years with 1 year cliff'
  },
  reserve: {
    allocation: 50000000, // 5%
    description: 'Emergency reserve fund',
    lockPeriod: 'Multisig controlled'
  }
};
```

### Token Utility
1. **Gaming Currency**: Primary currency for all games
2. **Staking Rewards**: Stake tokens for platform benefits
3. **Governance**: Vote on platform decisions
4. **Premium Access**: Unlock exclusive features
5. **Tournament Entry**: Entry fees for competitions

## Smart Contract Architecture

### Main Token Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NexalisToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    
    mapping(address => bool) public gameContracts;
    mapping(address => uint256) public stakingBalances;
    
    event GameContractAdded(address indexed gameContract);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    
    constructor() ERC20("Nexalis Token", "NXL") {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
    
    function addGameContract(address _gameContract) external onlyOwner {
        gameContracts[_gameContract] = true;
        emit GameContractAdded(_gameContract);
    }
    
    function stake(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), amount);
        stakingBalances[msg.sender] += amount;
        
        emit TokensStaked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external {
        require(stakingBalances[msg.sender] >= amount, "Insufficient staked balance");
        
        stakingBalances[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        
        emit TokensUnstaked(msg.sender, amount);
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
```

### Game Manager Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./NexalisToken.sol";

contract GameManager {
    NexalisToken public nexalisToken;
    
    struct Game {
        string name;
        address gameContract;
        uint256 houseEdge; // Basis points (100 = 1%)
        bool isActive;
    }
    
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerBalances;
    
    uint256 public gameCount;
    address public treasury;
    
    event GameAdded(uint256 indexed gameId, string name, address gameContract);
    event TokensDeposited(address indexed player, uint256 amount);
    event TokensWithdrawn(address indexed player, uint256 amount);
    event GameResult(address indexed player, uint256 gameId, uint256 amount, bool won);
    
    constructor(address _nexalisToken, address _treasury) {
        nexalisToken = NexalisToken(_nexalisToken);
        treasury = _treasury;
    }
    
    function depositTokens(uint256 amount) external {
        require(nexalisToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        playerBalances[msg.sender] += amount;
        emit TokensDeposited(msg.sender, amount);
    }
    
    function withdrawTokens(uint256 amount) external {
        require(playerBalances[msg.sender] >= amount, "Insufficient balance");
        playerBalances[msg.sender] -= amount;
        require(nexalisToken.transfer(msg.sender, amount), "Transfer failed");
        emit TokensWithdrawn(msg.sender, amount);
    }
    
    function placeBet(uint256 gameId, uint256 amount) external {
        require(games[gameId].isActive, "Game not active");
        require(playerBalances[msg.sender] >= amount, "Insufficient balance");
        
        playerBalances[msg.sender] -= amount;
        // Game-specific logic handled by individual game contracts
    }
}
```

## Liquidity & DEX Integration

### Trader Joe Integration
```javascript
const traderJoeConfig = {
  router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // Trader Joe Router
  factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10', // Trader Joe Factory
  wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Wrapped AVAX
  
  // Liquidity Pool Configuration
  liquidityPool: {
    token0: 'NXL', // Nexalis Token
    token1: 'WAVAX', // Wrapped AVAX
    fee: 3000, // 0.3% fee tier
    initialLiquidity: {
      nxl: '10000000', // 10M NXL
      avax: '1000' // 1000 AVAX
    }
  }
};

// Liquidity Addition Script
async function addLiquidity(nxlAmount, avaxAmount) {
  const router = new ethers.Contract(
    traderJoeConfig.router,
    traderJoeABI,
    signer
  );
  
  // Approve tokens
  await nexalisToken.approve(router.address, nxlAmount);
  
  // Add liquidity
  const tx = await router.addLiquidityAVAX(
    nexalisToken.address,
    nxlAmount,
    nxlAmount.mul(95).div(100), // 5% slippage
    ethers.utils.parseEther(avaxAmount).mul(95).div(100),
    deployer.address,
    Math.floor(Date.now() / 1000) + 1800, // 30 minutes deadline
    { value: ethers.utils.parseEther(avaxAmount) }
  );
  
  return tx;
}
```

### LP Token Management
```javascript
// LP Token Burn/Lock Logic
const lpTokenManagement = {
  // Burn LP tokens permanently
  async burnLPTokens(lpTokenAmount) {
    const lpToken = new ethers.Contract(lpTokenAddress, erc20ABI, signer);
    
    // Transfer to burn address
    const burnAddress = '0x000000000000000000000000000000000000dEaD';
    const tx = await lpToken.transfer(burnAddress, lpTokenAmount);
    
    console.log(`Burned ${lpTokenAmount} LP tokens: ${tx.hash}`);
    return tx;
  },
  
  // Lock LP tokens in time-locked contract
  async lockLPTokens(lpTokenAmount, lockDuration) {
    const lockContract = new ethers.Contract(lockContractAddress, lockABI, signer);
    
    const lpToken = new ethers.Contract(lpTokenAddress, erc20ABI, signer);
    await lpToken.approve(lockContract.address, lpTokenAmount);
    
    const unlockTime = Math.floor(Date.now() / 1000) + lockDuration;
    const tx = await lockContract.lock(lpTokenAddress, lpTokenAmount, unlockTime);
    
    console.log(`Locked ${lpTokenAmount} LP tokens until ${new Date(unlockTime * 1000)}`);
    return tx;
  }
};
```

## Wallet Integration

### Auto-Generated Wallets
```javascript
const walletGenerator = {
  // Generate new wallet for user
  generateWallet() {
    const wallet = ethers.Wallet.createRandom();
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      publicKey: wallet.publicKey
    };
  },
  
  // Store wallet securely (encrypted)
  async storeWallet(userId, walletData, password) {
    const encrypted = await ethers.utils.encrypt(password, walletData.privateKey);
    
    const walletInfo = {
      userId,
      address: walletData.address,
      encryptedPrivateKey: encrypted,
      createdAt: new Date().toISOString()
    };
    
    // Store in secure database or encrypted JSON
    return this.saveToStorage(walletInfo);
  },
  
  // Retrieve and decrypt wallet
  async retrieveWallet(userId, password) {
    const walletInfo = await this.getFromStorage(userId);
    const privateKey = await ethers.utils.decrypt(password, walletInfo.encryptedPrivateKey);
    
    return new ethers.Wallet(privateKey);
  }
};
```

### Token Operations
```javascript
const tokenOperations = {
  // Get user token balance
  async getBalance(address) {
    const balance = await nexalisToken.balanceOf(address);
    return ethers.utils.formatEther(balance);
  },
  
  // Transfer tokens
  async transferTokens(fromWallet, toAddress, amount) {
    const tokenContract = nexalisToken.connect(fromWallet);
    const tx = await tokenContract.transfer(
      toAddress,
      ethers.utils.parseEther(amount.toString())
    );
    
    return tx;
  },
  
  // Approve spending
  async approveSpending(wallet, spenderAddress, amount) {
    const tokenContract = nexalisToken.connect(wallet);
    const tx = await tokenContract.approve(
      spenderAddress,
      ethers.utils.parseEther(amount.toString())
    );
    
    return tx;
  }
};
```

## Deployment Configuration

### Hardhat Configuration
```javascript
// hardhat.config.js
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 43114,
      gasPrice: 25000000000 // 25 gwei
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 43113
    }
  },
  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY
    }
  }
};
```

### Deployment Script
```javascript
// scripts/deploy.js
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Deploy Nexalis Token
  const NexalisToken = await ethers.getContractFactory("NexalisToken");
  const nexalisToken = await NexalisToken.deploy();
  await nexalisToken.deployed();
  
  console.log("Nexalis Token deployed to:", nexalisToken.address);
  
  // Deploy Game Manager
  const GameManager = await ethers.getContractFactory("GameManager");
  const gameManager = await GameManager.deploy(
    nexalisToken.address,
    deployer.address // Treasury address
  );
  await gameManager.deployed();
  
  console.log("Game Manager deployed to:", gameManager.address);
  
  // Add liquidity to Trader Joe
  await addInitialLiquidity(nexalisToken.address, deployer);
  
  // Verify contracts
  if (network.name !== "hardhat") {
    await verifyContract(nexalisToken.address, []);
    await verifyContract(gameManager.address, [nexalisToken.address, deployer.address]);
  }
}

async function verifyContract(contractAddress, constructorArguments) {
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
  } catch (error) {
    console.log("Verification failed:", error.message);
  }
}
```

## Security Considerations

### Smart Contract Security
- **Reentrancy Protection**: Using OpenZeppelin's ReentrancyGuard
- **Access Control**: Role-based permissions
- **Pausable**: Emergency pause functionality
- **Upgradeable**: Proxy pattern for future updates

### Wallet Security
- **Encryption**: All private keys encrypted at rest
- **Secure Generation**: Cryptographically secure randomness
- **Key Management**: Never expose private keys to frontend
- **Backup**: Secure mnemonic phrase storage

### Operational Security
- **Multi-sig**: Treasury controlled by multi-signature wallet
- **Time Locks**: Critical functions have time delays
- **Audit**: Regular security audits
- **Monitoring**: Real-time transaction monitoring

---

*The Nexalis token system provides a robust foundation for the gaming ecosystem while maintaining security and decentralization principles.*
