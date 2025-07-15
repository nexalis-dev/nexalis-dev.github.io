// Nexalis Gaming Platform - Game Service
// Handles all game logic and interactions

import { tokenService } from './token';
import { starArenaAPI } from './api';

class GameService {
  constructor() {
    this.gameHistory = new Map();
    this.activeGames = new Map();
  }

  // GENERAL GAME FUNCTIONS

  // Get game history for user
  async getGameHistory(userId, gameType = null, limit = 50) {
    try {
      // Try to get from API first
      const apiResponse = await starArenaAPI.getGameHistory(userId, gameType, limit);
      if (apiResponse.success) {
        return apiResponse.games;
      }

      // Fallback to local storage
      const storageKey = `game_history_${userId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const history = JSON.parse(stored);
        return gameType ? 
          history.filter(game => game.type === gameType).slice(0, limit) :
          history.slice(0, limit);
      }

      return [];
    } catch (error) {
      console.error('Get game history error:', error);
      return [];
    }
  }

  // Get game statistics
  async getGameStats(userId) {
    try {
      // Try API first
      const apiResponse = await starArenaAPI.getGameStats(userId);
      if (apiResponse.success) {
        return apiResponse.stats;
      }

      // Calculate from local history
      const history = await this.getGameHistory(userId);
      
      const stats = {
        totalGames: history.length,
        totalWins: history.filter(game => game.result === 'win').length,
        totalLosses: history.filter(game => game.result === 'loss').length,
        totalWagered: history.reduce((sum, game) => sum + parseFloat(game.wager || 0), 0).toString(),
        totalWon: history.reduce((sum, game) => sum + parseFloat(game.winAmount || 0), 0).toString(),
        winRate: 0
      };

      stats.winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames * 100) : 0;

      return stats;
    } catch (error) {
      console.error('Get game stats error:', error);
      return {
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        totalWagered: '0',
        totalWon: '0',
        winRate: 0
      };
    }
  }

  // Save game result
  async saveGameResult(userId, gameData) {
    try {
      const storageKey = `game_history_${userId}`;
      const stored = localStorage.getItem(storageKey);
      const history = stored ? JSON.parse(stored) : [];

      const gameResult = {
        id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        timestamp: new Date().toISOString(),
        ...gameData
      };

      history.unshift(gameResult);
      
      // Keep only last 1000 games
      if (history.length > 1000) {
        history.splice(1000);
      }

      localStorage.setItem(storageKey, JSON.stringify(history));

      // Try to sync with API
      try {
        await starArenaAPI.saveGameResult?.(gameResult);
      } catch (apiError) {
        console.log('API sync failed, saved locally');
      }

      return gameResult;
    } catch (error) {
      console.error('Save game result error:', error);
      throw new Error('Failed to save game result');
    }
  }

  // CRASH OUT GAME

  // Start crash game
  async startCrashGame(userId, betAmount) {
    try {
      const gameId = `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate crash multiplier (server-side logic simulation)
      const crashMultiplier = this.generateCrashMultiplier();
      
      const gameData = {
        gameId,
        type: 'crash-out',
        betAmount: betAmount.toString(),
        crashMultiplier,
        startTime: Date.now(),
        status: 'active'
      };

      this.activeGames.set(gameId, gameData);

      return { gameId, crashMultiplier };
    } catch (error) {
      console.error('Start crash game error:', error);
      throw new Error('Failed to start crash game');
    }
  }

  // Generate crash multiplier using provably fair algorithm
  generateCrashMultiplier() {
    // Simple crash multiplier generation (in production, use provably fair algorithm)
    const random = Math.random();
    
    // 1% chance of instant crash
    if (random < 0.01) return 1.0;
    
    // Exponential distribution for crash multiplier
    const crashPoint = Math.floor((99 / (100 - random * 99)) * 100) / 100;
    return Math.max(1.0, Math.min(crashPoint, 1000.0));
  }

  // Cash out from crash game
  async cashOutCrash(gameId, multiplier) {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        throw new Error('Game not found');
      }

      if (multiplier >= gameData.crashMultiplier) {
        throw new Error('Game already crashed');
      }

      const betAmount = parseFloat(gameData.betAmount);
      const winAmount = betAmount * multiplier;

      // Update game data
      gameData.status = 'cashed_out';
      gameData.cashOutMultiplier = multiplier;
      gameData.winAmount = winAmount;
      gameData.result = 'win';

      // Save result
      await this.saveGameResult(gameData.userId, {
        type: 'crash-out',
        wager: gameData.betAmount,
        winAmount: winAmount.toString(),
        multiplier: multiplier,
        result: 'win',
        gameId
      });

      this.activeGames.delete(gameId);

      return { winAmount };
    } catch (error) {
      console.error('Cash out crash error:', error);
      throw new Error('Failed to cash out');
    }
  }

  // End crash game (when crashed)
  async endCrashGame(gameId, playerWon, crashMultiplier) {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        return;
      }

      const betAmount = parseFloat(gameData.betAmount);
      const winAmount = playerWon ? betAmount * crashMultiplier : 0;

      // Save result
      await this.saveGameResult(gameData.userId, {
        type: 'crash-out',
        wager: gameData.betAmount,
        winAmount: winAmount.toString(),
        multiplier: crashMultiplier,
        result: playerWon ? 'win' : 'loss',
        gameId
      });

      this.activeGames.delete(gameId);
    } catch (error) {
      console.error('End crash game error:', error);
    }
  }

  // Get crash game history
  async getCrashHistory(userId, limit = 20) {
    const history = await this.getGameHistory(userId, 'crash-out', limit);
    return history;
  }

  // ROULETTE GAME

  // Spin roulette
  async spinRoulette(userId, bets) {
    try {
      const gameId = `roulette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate winning number (0-36)
      const winningNumber = Math.floor(Math.random() * 37);
      
      // Calculate results for each bet
      let totalWager = 0;
      let totalWin = 0;
      const betResults = [];

      for (const bet of bets) {
        totalWager += bet.amount;
        const isWin = this.checkRouletteBet(bet, winningNumber);
        const winAmount = isWin ? this.calculateRouletteWin(bet) : 0;
        
        totalWin += winAmount;
        
        betResults.push({
          ...bet,
          isWin,
          winAmount
        });
      }

      // Save game result
      await this.saveGameResult(userId, {
        type: 'roulette',
        wager: totalWager.toString(),
        winAmount: totalWin.toString(),
        result: totalWin > 0 ? 'win' : 'loss',
        gameId,
        winningNumber,
        bets: betResults
      });

      return {
        gameId,
        winningNumber,
        totalWager,
        totalWin,
        betResults
      };
    } catch (error) {
      console.error('Spin roulette error:', error);
      throw new Error('Failed to spin roulette');
    }
  }

  // Check if roulette bet wins
  checkRouletteBet(bet, winningNumber) {
    switch (bet.type) {
      case 'straight':
        return bet.numbers.includes(winningNumber);
      case 'red':
        return this.isRedNumber(winningNumber);
      case 'black':
        return this.isBlackNumber(winningNumber);
      case 'even':
        return winningNumber !== 0 && winningNumber % 2 === 0;
      case 'odd':
        return winningNumber !== 0 && winningNumber % 2 === 1;
      case 'low':
        return winningNumber >= 1 && winningNumber <= 18;
      case 'high':
        return winningNumber >= 19 && winningNumber <= 36;
      case 'dozen1':
        return winningNumber >= 1 && winningNumber <= 12;
      case 'dozen2':
        return winningNumber >= 13 && winningNumber <= 24;
      case 'dozen3':
        return winningNumber >= 25 && winningNumber <= 36;
      case 'column1':
        return winningNumber % 3 === 1 && winningNumber !== 0;
      case 'column2':
        return winningNumber % 3 === 2 && winningNumber !== 0;
      case 'column3':
        return winningNumber % 3 === 0 && winningNumber !== 0;
      default:
        return false;
    }
  }

  // Calculate roulette win amount
  calculateRouletteWin(bet) {
    const payouts = {
      straight: 35,
      red: 1,
      black: 1,
      even: 1,
      odd: 1,
      low: 1,
      high: 1,
      dozen1: 2,
      dozen2: 2,
      dozen3: 2,
      column1: 2,
      column2: 2,
      column3: 2
    };

    const payout = payouts[bet.type] || 0;
    return bet.amount * (payout + 1); // Include original bet
  }

  // Check if number is red
  isRedNumber(number) {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(number);
  }

  // Check if number is black
  isBlackNumber(number) {
    return number !== 0 && !this.isRedNumber(number);
  }

  // Get roulette history
  async getRouletteHistory(userId, limit = 20) {
    const history = await this.getGameHistory(userId, 'roulette', limit);
    return history;
  }

  // CARD GAME

  // Start card game
  async startCardGame(userId) {
    try {
      const gameId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate initial hands
      const playerHand = this.generateInitialHand();
      const opponentHand = this.generateInitialHand();

      const gameData = {
        gameId,
        userId,
        type: 'card-game',
        playerHand,
        opponentHand,
        playerMana: 1,
        opponentMana: 1,
        playerHealth: 30,
        opponentHealth: 30,
        currentTurn: 'player',
        turnNumber: 1,
        status: 'active',
        startTime: Date.now()
      };

      this.activeGames.set(gameId, gameData);

      return {
        gameId,
        playerHand,
        opponentHand: opponentHand.map(card => ({ ...card, hidden: true }))
      };
    } catch (error) {
      console.error('Start card game error:', error);
      throw new Error('Failed to start card game');
    }
  }

  // Generate initial hand
  generateInitialHand() {
    const cards = [];
    const cardPool = this.getCardPool();
    
    for (let i = 0; i < 3; i++) {
      const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
      cards.push({
        ...randomCard,
        id: `card_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`
      });
    }
    
    return cards;
  }

  // Get card pool
  getCardPool() {
    return [
      { name: 'Fire Bolt', cost: 1, attack: 3, health: 0, type: 'spell' },
      { name: 'Warrior', cost: 2, attack: 2, health: 3, type: 'minion' },
      { name: 'Mage', cost: 3, attack: 2, health: 4, type: 'minion' },
      { name: 'Lightning', cost: 2, attack: 4, health: 0, type: 'spell' },
      { name: 'Knight', cost: 4, attack: 4, health: 5, type: 'minion' },
      { name: 'Archer', cost: 3, attack: 3, health: 2, type: 'minion' },
      { name: 'Heal', cost: 1, attack: 0, health: 5, type: 'spell' },
      { name: 'Dragon', cost: 8, attack: 8, health: 8, type: 'minion' },
      { name: 'Goblin', cost: 1, attack: 1, health: 1, type: 'minion' },
      { name: 'Wizard', cost: 5, attack: 4, health: 6, type: 'minion' }
    ];
  }

  // Play card
  async playCard(gameId, cardId, targetId = null) {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData || gameData.status !== 'active') {
        throw new Error('Game not found or not active');
      }

      if (gameData.currentTurn !== 'player') {
        throw new Error('Not player turn');
      }

      // Find card in player hand
      const cardIndex = gameData.playerHand.findIndex(card => card.id === cardId);
      if (cardIndex === -1) {
        throw new Error('Card not found in hand');
      }

      const card = gameData.playerHand[cardIndex];

      // Check if player has enough mana
      if (card.cost > gameData.playerMana) {
        throw new Error('Not enough mana');
      }

      // Play the card
      gameData.playerMana -= card.cost;
      gameData.playerHand.splice(cardIndex, 1);

      // Apply card effect
      if (card.type === 'spell') {
        if (card.name === 'Fire Bolt' || card.name === 'Lightning') {
          gameData.opponentHealth -= card.attack;
        } else if (card.name === 'Heal') {
          gameData.playerHealth = Math.min(30, gameData.playerHealth + card.health);
        }
      }

      // Check for game end
      let gameEnded = false;
      if (gameData.opponentHealth <= 0) {
        gameData.status = 'ended';
        gameData.winner = 'player';
        gameEnded = true;

        await this.saveGameResult(gameData.userId, {
          type: 'card-game',
          result: 'win',
          gameId,
          duration: Date.now() - gameData.startTime
        });
      }

      return {
        playerHand: gameData.playerHand,
        opponentHand: gameData.opponentHand.map(card => ({ ...card, hidden: true })),
        playerMana: gameData.playerMana,
        opponentMana: gameData.opponentMana,
        playerHealth: gameData.playerHealth,
        opponentHealth: gameData.opponentHealth,
        currentTurn: gameData.currentTurn,
        gameEnded
      };
    } catch (error) {
      console.error('Play card error:', error);
      throw new Error(error.message || 'Failed to play card');
    }
  }

  // End turn
  async endTurn(gameId) {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData || gameData.status !== 'active') {
        throw new Error('Game not found or not active');
      }

      gameData.currentTurn = 'opponent';
      gameData.turnNumber++;
      gameData.playerMana = Math.min(10, gameData.turnNumber);

      return { success: true };
    } catch (error) {
      console.error('End turn error:', error);
      throw new Error('Failed to end turn');
    }
  }

  // Opponent turn (AI)
  async opponentTurn(gameId) {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        throw new Error('Game not found');
      }

      // Simple AI: play random card if possible
      const playableCards = gameData.opponentHand.filter(card => card.cost <= gameData.opponentMana);
      
      if (playableCards.length > 0) {
        const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
        const cardIndex = gameData.opponentHand.findIndex(card => card.id === cardToPlay.id);
        
        gameData.opponentMana -= cardToPlay.cost;
        gameData.opponentHand.splice(cardIndex, 1);

        // Apply card effect
        if (cardToPlay.type === 'spell') {
          if (cardToPlay.name === 'Fire Bolt' || cardToPlay.name === 'Lightning') {
            gameData.playerHealth -= cardToPlay.attack;
          } else if (cardToPlay.name === 'Heal') {
            gameData.opponentHealth = Math.min(30, gameData.opponentHealth + cardToPlay.health);
          }
        }
      }

      // End opponent turn
      gameData.currentTurn = 'player';
      gameData.opponentMana = Math.min(10, gameData.turnNumber);

      // Check for game end
      let gameEnded = false;
      if (gameData.playerHealth <= 0) {
        gameData.status = 'ended';
        gameData.winner = 'opponent';
        gameEnded = true;

        await this.saveGameResult(gameData.userId, {
          type: 'card-game',
          result: 'loss',
          gameId,
          duration: Date.now() - gameData.startTime
        });
      }

      return {
        playerHand: gameData.playerHand,
        opponentHand: gameData.opponentHand.map(card => ({ ...card, hidden: true })),
        playerHealth: gameData.playerHealth,
        opponentHealth: gameData.opponentHealth,
        gameEnded
      };
    } catch (error) {
      console.error('Opponent turn error:', error);
      throw new Error('Failed to process opponent turn');
    }
  }

  // Get card game history
  async getCardGameHistory(userId, limit = 20) {
    const history = await this.getGameHistory(userId, 'card-game', limit);
    return history;
  }

  // UTILITY FUNCTIONS

  // Clear game cache
  clearCache() {
    this.activeGames.clear();
  }

  // Get active game
  getActiveGame(gameId) {
    return this.activeGames.get(gameId);
  }
}

// Create singleton instance
const gameService = new GameService();

export { gameService };
export default gameService;
