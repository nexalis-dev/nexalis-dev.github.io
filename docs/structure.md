# Nexalis Project Structure

## Complete Folder and File Organization

```
project-root/
├── docs/                    # Master documentation library
│   ├── overview.md         # Project vision, goals, and features
│   ├── structure.md        # This file - detailed structure guide
│   ├── api.md              # Star Arena API documentation
│   ├── games.md            # Game specifications and mechanics
│   ├── token.md            # Tokenomics and smart contracts
│   ├── frontend.md         # Frontend architecture guide
│   ├── ci-cd.md            # GitHub Actions workflows
│   └── conversation.md     # Key decisions and Q&A digest
│
├── src/                     # React frontend source code
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Shared components
│   │   ├── auth/           # Authentication components
│   │   ├── wallet/         # Wallet management
│   │   └── navigation/     # Navigation components
│   ├── games/              # Game-specific components
│   │   ├── crash-out/      # Crash Out game implementation
│   │   ├── roulette/       # Roulette game implementation
│   │   └── card-game/      # Card game implementation
│   ├── services/           # API services and utilities
│   │   ├── api.js          # Star Arena API client
│   │   ├── wallet.js       # Wallet management service
│   │   └── storage.js      # Local storage utilities
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── utils/              # Utility functions
│   └── styles/             # Global styles and themes
│
├── api/                     # API wrappers and mocks
│   ├── star-arena/         # Star Arena API integration
│   │   ├── auth.js         # Authentication endpoints
│   │   ├── games.js        # Game management endpoints
│   │   └── users.js        # User management endpoints
│   ├── mocks/              # Mock implementations for development
│   └── index.js            # Main API entry point
│
├── contracts/               # Smart contracts and blockchain
│   ├── NexalisToken.sol    # Main Nexalis ERC20 token
│   ├── GameManager.sol     # Game state management
│   ├── scripts/            # Deployment scripts
│   │   ├── deploy.js       # Main deployment script
│   │   └── verify.js       # Contract verification
│   └── test/               # Contract tests
│
├── ui/                      # Additional UI resources
│   ├── assets/             # Static assets
│   │   ├── images/         # Game images and icons
│   │   ├── sounds/         # Game sound effects
│   │   └── fonts/          # Custom fonts
│   └── themes/             # UI theme configurations
│
├── scripts/                 # Development and deployment scripts
│   ├── build.js            # Custom build script
│   ├── deploy.js           # Deployment automation
│   ├── test.js             # Testing utilities
│   └── setup.js            # Initial project setup
│
├── .github/                 # GitHub-specific configurations
│   ├── workflows/          # GitHub Actions CI/CD
│   │   ├── deploy.yml      # Deployment workflow
│   │   ├── test.yml        # Testing workflow
│   │   └── contracts.yml   # Smart contract deployment
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
│
├── public/                  # Public static files
│   ├── index.html          # Main HTML template
│   ├── manifest.json       # PWA manifest
│   ├── favicon.ico         # Site favicon
│   └── robots.txt          # SEO robots file
│
├── config/                  # Configuration files
│   ├── hardhat.config.js   # Hardhat blockchain config
│   ├── webpack.config.js   # Custom webpack config
│   └── env.example         # Environment variables template
│
└── utils/                   # Utility modules
    ├── blockchain.js       # Blockchain utilities
    ├── crypto.js           # Cryptographic functions
    └── helpers.js          # General helper functions
```

## Key File Descriptions

### Core Application Files

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Project dependencies and scripts | ✅ Created |
| `src/index.js` | React application entry point | ✅ Created |
| `src/App.js` | Main application component | 🚧 In Progress |
| `public/index.html` | HTML template | ✅ Created |

### Game Implementation Files

| File | Purpose | Status |
|------|---------|--------|
| `src/games/crash-out/CrashOut.js` | Crash Out game component | 📋 Planned |
| `src/games/roulette/Roulette.js` | Roulette game component | 📋 Planned |
| `src/games/card-game/CardGame.js` | Card game component | 📋 Planned |

### API Integration Files

| File | Purpose | Status |
|------|---------|--------|
| `api/star-arena/auth.js` | Authentication API wrapper | 📋 Planned |
| `api/star-arena/games.js` | Game management API | 📋 Planned |
| `api/mocks/index.js` | Development API mocks | 📋 Planned |

### Smart Contract Files

| File | Purpose | Status |
|------|---------|--------|
| `contracts/NexalisToken.sol` | Main token contract | 📋 Planned |
| `contracts/scripts/deploy.js` | Deployment script | 📋 Planned |
| `config/hardhat.config.js` | Hardhat configuration | 📋 Planned |

### Documentation Files

| File | Purpose | Status |
|------|---------|--------|
| `docs/overview.md` | Project overview | ✅ Created |
| `docs/structure.md` | This structure guide | ✅ Created |
| `docs/api.md` | API documentation | 📋 Planned |
| `docs/games.md` | Game specifications | 📋 Planned |

## Development Workflow

### 1. Local Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

### 2. Building and Deployment
```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy

# Deploy smart contracts
npm run hardhat:deploy
```

### 3. Testing
```bash
# Run frontend tests
npm test

# Run contract tests
npx hardhat test

# Run integration tests
npm run test:integration
```

## File Naming Conventions

### React Components
- **PascalCase**: `GameHub.js`, `WalletManager.js`
- **Folder Structure**: Each major component gets its own folder
- **Index Files**: Use `index.js` for main exports

### Utility Files
- **camelCase**: `apiClient.js`, `walletUtils.js`
- **Descriptive Names**: Clear purpose indication

### Configuration Files
- **kebab-case**: `hardhat.config.js`, `webpack.config.js`
- **Standard Names**: Follow framework conventions

## Import/Export Patterns

### Component Exports
```javascript
// Default export for main component
export default GameHub;

// Named exports for utilities
export { gameUtils, playerStats };
```

### Service Imports
```javascript
// API services
import { authService, gameService } from '../services/api';

// Utilities
import { formatCurrency, validateAddress } from '../utils/helpers';
```

## Asset Organization

### Images
- `ui/assets/images/games/` - Game-specific images
- `ui/assets/images/icons/` - UI icons and symbols
- `ui/assets/images/backgrounds/` - Background images

### Sounds
- `ui/assets/sounds/effects/` - Sound effects
- `ui/assets/sounds/music/` - Background music
- `ui/assets/sounds/ui/` - UI interaction sounds

## Configuration Management

### Environment Variables
```bash
# Development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_NETWORK=testnet

# Production
REACT_APP_API_URL=https://api.stararena.com
REACT_APP_NETWORK=mainnet
```

### Build Configurations
- **Development**: Hot reload, source maps, debugging
- **Production**: Minification, optimization, PWA features
- **Testing**: Mock APIs, test utilities

## Deployment Structure

### GitHub Pages
- **Source**: `build/` folder
- **Domain**: Custom domain support
- **HTTPS**: Automatic SSL certificates

### GitHub Actions
- **Triggers**: Push to main branch
- **Steps**: Test → Build → Deploy
- **Secrets**: Environment variables and API keys

---

*This structure ensures scalability, maintainability, and clear separation of concerns across the entire Nexalis platform.*
