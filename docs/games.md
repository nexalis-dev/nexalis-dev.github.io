# Nexalis Game Specifications

## Game Hub Overview

Nexalis Gaming Platform indeholder tre hovedspil, hver med unikke mekanikker og fælles token integration:

1. **Crash Out** - Multiplayer crash gambling spil
2. **Roulette** - Klassisk casino roulette med crypto
3. **Card Game** - Hearthstone-inspireret kortspil

## 🚀 Crash Out Game

### Game Mechanics
- **Multiplier System**: Starter på 1.00x og stiger eksponentielt
- **Crash Point**: Tilfældigt punkt hvor multiplikatoren "crasher"
- **Betting Window**: 10 sekunder til at placere bets
- **Auto Cash-Out**: Spillere kan sætte automatisk cash-out punkt
- **Live Multiplayer**: Se andre spilleres bets og cash-outs i real-time

### Technical Implementation
```javascript
// Crash Out Game State
const crashGameState = {
  phase: 'betting', // 'betting', 'flying', 'crashed'
  multiplier: 1.00,
  crashPoint: null, // Hidden until crash
  bets: [],
  activePlayers: [],
  timeRemaining: 10
};

// Betting Logic
function placeBet(playerId, amount, autoCashOut = null) {
  if (gameState.phase !== 'betting') return false;
  
  const bet = {
    playerId,
    amount,
    autoCashOut,
    cashedOut: false,
    multiplier: null
  };
  
  gameState.bets.push(bet);
  return true;
}

// Cash Out Logic
function cashOut(playerId) {
  const bet = gameState.bets.find(b => b.playerId === playerId);
  if (!bet || bet.cashedOut) return false;
  
  bet.cashedOut = true;
  bet.multiplier = gameState.multiplier;
  
  const winAmount = bet.amount * bet.multiplier;
  return winAmount;
}
```

### UI Components
- **Betting Panel**: Amount input, auto cash-out slider
- **Multiplier Display**: Large animated multiplier counter
- **Player List**: Live list of active bets and cash-outs
- **History Chart**: Graph of previous crash points
- **Statistics**: Personal and global statistics

### Provably Fair System
```javascript
// Server seed (hidden until after crash)
const serverSeed = generateSecureRandom();

// Client seed (provided by player)
const clientSeed = playerProvidedSeed || generateClientSeed();

// Crash point calculation
function calculateCrashPoint(serverSeed, clientSeed, nonce) {
  const hash = sha256(serverSeed + clientSeed + nonce);
  const hex = hash.substring(0, 8);
  const decimal = parseInt(hex, 16);
  
  // Convert to crash multiplier (1.00x to 100.00x range)
  const crashPoint = Math.max(1.00, decimal / 42949672.95);
  return Math.round(crashPoint * 100) / 100;
}
```

## 🎰 Roulette Game

### Game Variants
- **European Roulette**: Single zero (0), house edge 2.7%
- **American Roulette**: Double zero (0, 00), house edge 5.26%
- **French Roulette**: En prison rule, reduced house edge

### Betting Options
```javascript
const bettingOptions = {
  // Inside Bets
  straight: { payout: 35, description: 'Single number' },
  split: { payout: 17, description: 'Two adjacent numbers' },
  street: { payout: 11, description: 'Three numbers in a row' },
  corner: { payout: 8, description: 'Four numbers in a square' },
  sixLine: { payout: 5, description: 'Six numbers in two rows' },
  
  // Outside Bets
  red: { payout: 1, description: 'Red numbers' },
  black: { payout: 1, description: 'Black numbers' },
  odd: { payout: 1, description: 'Odd numbers' },
  even: { payout: 1, description: 'Even numbers' },
  low: { payout: 1, description: '1-18' },
  high: { payout: 1, description: '19-36' },
  dozen1: { payout: 2, description: '1-12' },
  dozen2: { payout: 2, description: '13-24' },
  dozen3: { payout: 2, description: '25-36' },
  column1: { payout: 2, description: 'First column' },
  column2: { payout: 2, description: 'Second column' },
  column3: { payout: 2, description: 'Third column' }
};
```

### Game Flow
1. **Betting Phase**: 30 seconds to place bets
2. **Spinning Phase**: Wheel animation (3-5 seconds)
3. **Result Phase**: Winning number announcement
4. **Payout Phase**: Automatic winnings distribution

### Technical Implementation
```javascript
// Roulette Game State
const rouletteState = {
  phase: 'betting', // 'betting', 'spinning', 'result'
  currentBets: [],
  winningNumber: null,
  wheelPosition: 0,
  timeRemaining: 30,
  history: []
};

// Spin Logic
function spinWheel() {
  const randomNumber = generateSecureRandom(0, 36);
  const spins = Math.floor(Math.random() * 5) + 8; // 8-12 full spins
  const finalPosition = (randomNumber / 37) * 360;
  
  return {
    winningNumber: randomNumber,
    totalRotation: (spins * 360) + finalPosition,
    duration: 4000 // 4 seconds
  };
}

// Payout Calculation
function calculatePayouts(bets, winningNumber) {
  return bets.map(bet => {
    const isWinner = checkWinningBet(bet, winningNumber);
    const payout = isWinner ? bet.amount * bettingOptions[bet.type].payout : 0;
    
    return {
      ...bet,
      isWinner,
      payout
    };
  });
}
```

## 🃏 Card Game (Hearthstone-Style)

### Core Mechanics
- **Turn-Based**: Alternating player turns
- **Mana System**: Increasing mana each turn (1-10)
- **Deck Building**: 30-card decks with card limits
- **Hero Powers**: Unique abilities per class
- **Minion Combat**: Creature-based battlefield

### Card Types
```javascript
const cardTypes = {
  minion: {
    properties: ['attack', 'health', 'cost', 'abilities'],
    mechanics: ['battlecry', 'deathrattle', 'taunt', 'charge']
  },
  spell: {
    properties: ['cost', 'effect', 'target'],
    mechanics: ['instant', 'conditional', 'aoe', 'buff']
  },
  weapon: {
    properties: ['attack', 'durability', 'cost'],
    mechanics: ['equip', 'deathrattle', 'special']
  }
};

// Example Card
const exampleCard = {
  id: 'nexalis_warrior',
  name: 'Nexalis Warrior',
  type: 'minion',
  cost: 3,
  attack: 3,
  health: 4,
  rarity: 'common',
  abilities: ['taunt'],
  description: 'A stalwart defender of the Nexalis realm.'
};
```

### Game Flow
1. **Mulligan Phase**: Replace starting cards
2. **Turn Phases**: Draw → Play → Attack → End
3. **Win Conditions**: Reduce opponent hero to 0 health
4. **Special Mechanics**: Fatigue damage, card draw limits

### Deck Building System
```javascript
const deckRules = {
  totalCards: 30,
  maxCopies: {
    legendary: 1,
    epic: 2,
    rare: 2,
    common: 2
  },
  classRestrictions: true,
  neutralCards: true
};

function validateDeck(deck) {
  const validation = {
    isValid: true,
    errors: []
  };
  
  // Check total cards
  if (deck.cards.length !== 30) {
    validation.errors.push('Deck must contain exactly 30 cards');
    validation.isValid = false;
  }
  
  // Check card limits
  const cardCounts = {};
  deck.cards.forEach(card => {
    cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
    
    if (cardCounts[card.id] > deckRules.maxCopies[card.rarity]) {
      validation.errors.push(`Too many copies of ${card.name}`);
      validation.isValid = false;
    }
  });
  
  return validation;
}
```

## Cross-Game Features

### Token Integration
- **Nexalis Token**: Universal currency across all games
- **Betting System**: Token-based wagering in all games
- **Rewards**: Token rewards for achievements and wins
- **Tournaments**: Token entry fees and prize pools

### Social Features
- **Leaderboards**: Global and game-specific rankings
- **Achievements**: Unlockable badges and rewards
- **Friends System**: Add friends and view their progress
- **Chat System**: In-game communication

### Analytics & Statistics
```javascript
const playerStats = {
  crashOut: {
    gamesPlayed: 0,
    totalWagered: 0,
    totalWon: 0,
    biggestWin: 0,
    averageMultiplier: 0,
    winRate: 0
  },
  roulette: {
    spinsPlayed: 0,
    favoriteNumbers: [],
    totalWagered: 0,
    totalWon: 0,
    longestStreak: 0
  },
  cardGame: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    favoriteClass: '',
    averageGameLength: 0,
    cardsPlayed: 0
  }
};
```

## Game Balance & Economy

### Token Economics
- **House Edge**: Built into each game for sustainability
- **Rakeback**: Percentage return to active players
- **VIP Levels**: Increased benefits for high-volume players
- **Daily Bonuses**: Free tokens for regular players

### Fair Play Measures
- **Provably Fair**: Cryptographic verification for all RNG
- **Anti-Cheat**: Client-side validation and server verification
- **Rate Limiting**: Prevent spam and abuse
- **Audit Logs**: Complete game history tracking

---

*Each game is designed to provide engaging gameplay while maintaining fair and transparent mechanics through blockchain integration.*
