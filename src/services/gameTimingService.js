import arenaApi from './arenaApi';

class GameTimingService {
  constructor() {
    this.gameTimers = new Map();
    this.globalGameQueue = [];
    this.currentGlobalGame = null;
    this.gameEndCallbacks = new Map();
    this.listeners = new Map();
    
    // Game timing constants
    this.GAME_INTERVAL = 30000; // 30 seconds between games
    this.WAIT_PERIOD = 4000;    // 4 seconds wait period
    this.GAME_DURATION = {
      crash: 15000,    // 15 seconds max
      roulette: 20000, // 20 seconds
      cards: 25000     // 25 seconds
    };

    // Initialize global game timer
    this.initializeGlobalTimer();
    
    // Listen to Arena API events
    this.setupArenaListeners();
  }

  initializeGlobalTimer() {
    // Start the global game cycle
    this.startGlobalGameCycle();
  }

  setupArenaListeners() {
    arenaApi.on('gameSessionStart', (session) => {
      this.handleGameSessionStart(session);
    });

    arenaApi.on('gameSessionEnd', (data) => {
      this.handleGameSessionEnd(data);
    });

    arenaApi.on('gameTiming', (timing) => {
      this.handleGlobalTiming(timing);
    });
  }

  // Global Game Cycle Management
  startGlobalGameCycle() {
    const runCycle = () => {
      // Check if there are players waiting
      if (this.globalGameQueue.length > 0) {
        this.startNextGlobalGame();
      }
      
      // Schedule next cycle
      setTimeout(runCycle, this.GAME_INTERVAL);
    };

    // Start first cycle after initial wait
    setTimeout(runCycle, this.WAIT_PERIOD);
  }

  startNextGlobalGame() {
    if (this.currentGlobalGame) {
      console.log('Global game already in progress');
      return;
    }

    if (this.globalGameQueue.length === 0) {
      console.log('No games in queue');
      return;
    }

    // Get next game from queue
    const nextGame = this.globalGameQueue.shift();
    this.currentGlobalGame = nextGame;

    console.log(`Starting global ${nextGame.type} game`);

    // Notify all listeners about game start
    this.emit('globalGameStart', {
      type: nextGame.type,
      gameId: nextGame.id,
      startTime: Date.now(),
      duration: this.GAME_DURATION[nextGame.type]
    });

    // Set game end timer
    const gameTimer = setTimeout(() => {
      this.endGlobalGame(nextGame);
    }, this.GAME_DURATION[nextGame.type]);

    this.gameTimers.set(nextGame.id, gameTimer);
  }

  endGlobalGame(game) {
    console.log(`Ending global ${game.type} game`);

    // Clear timer
    if (this.gameTimers.has(game.id)) {
      clearTimeout(this.gameTimers.get(game.id));
      this.gameTimers.delete(game.id);
    }

    // Notify all listeners about game end
    this.emit('globalGameEnd', {
      type: game.type,
      gameId: game.id,
      endTime: Date.now()
    });

    // Clear current game
    this.currentGlobalGame = null;

    // Start wait period before next game
    setTimeout(() => {
      this.emit('waitPeriodStart', {
        duration: this.WAIT_PERIOD,
        nextGameTime: Date.now() + this.WAIT_PERIOD
      });
    }, 100);
  }

  // Player Game Session Management
  async requestGameSession(gameType, playerId) {
    try {
      // Check if player already has active session
      if (this.hasActiveSession(playerId)) {
        return {
          success: false,
          error: 'You already have an active game session. Please finish your current game first.',
          code: 'ACTIVE_SESSION_EXISTS'
        };
      }

      // Start session with Arena API
      const sessionResult = await arenaApi.startGameSession(gameType);
      
      if (!sessionResult.success) {
        return sessionResult;
      }

      // Add to global queue if not already in progress
      const gameId = `${gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!this.isGameTypeInQueue(gameType) && (!this.currentGlobalGame || this.currentGlobalGame.type !== gameType)) {
        this.globalGameQueue.push({
          id: gameId,
          type: gameType,
          players: [playerId],
          createdAt: Date.now()
        });
      } else {
        // Add player to existing game in queue or current game
        this.addPlayerToGame(gameType, playerId);
      }

      // Set up player-specific timer
      this.setupPlayerTimer(playerId, gameType, gameId);

      return {
        success: true,
        gameId,
        session: sessionResult.session,
        timing: this.getGameTiming(gameType)
      };

    } catch (error) {
      console.error('Failed to request game session:', error);
      return {
        success: false,
        error: 'Failed to start game session',
        code: 'SESSION_START_FAILED'
      };
    }
  }

  async endGameSession(playerId, gameResult) {
    try {
      // End session with Arena API
      const endResult = await arenaApi.endGameSession(gameResult);
      
      if (!endResult.success) {
        return endResult;
      }

      // Clean up player timer
      this.cleanupPlayerTimer(playerId);

      // Remove player from current game
      this.removePlayerFromGame(playerId);

      return {
        success: true,
        result: endResult
      };

    } catch (error) {
      console.error('Failed to end game session:', error);
      return {
        success: false,
        error: 'Failed to end game session',
        code: 'SESSION_END_FAILED'
      };
    }
  }

  // Player Timer Management
  setupPlayerTimer(playerId, gameType, gameId) {
    const maxDuration = this.GAME_DURATION[gameType];
    
    const timer = setTimeout(() => {
      // Force end player session if they exceed time limit
      this.forceEndPlayerSession(playerId, 'TIME_LIMIT_EXCEEDED');
    }, maxDuration + 5000); // 5 second grace period

    this.gameTimers.set(`player_${playerId}`, timer);
  }

  cleanupPlayerTimer(playerId) {
    const timerKey = `player_${playerId}`;
    if (this.gameTimers.has(timerKey)) {
      clearTimeout(this.gameTimers.get(timerKey));
      this.gameTimers.delete(timerKey);
    }
  }

  async forceEndPlayerSession(playerId, reason) {
    console.log(`Force ending session for player ${playerId}: ${reason}`);
    
    try {
      await this.endGameSession(playerId, {
        forced: true,
        reason,
        balanceChange: 0 // No win/loss for forced end
      });

      // Notify player
      this.emit('sessionForceEnded', {
        playerId,
        reason,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to force end session:', error);
    }
  }

  // Game Queue Management
  isGameTypeInQueue(gameType) {
    return this.globalGameQueue.some(game => game.type === gameType);
  }

  addPlayerToGame(gameType, playerId) {
    // Add to current game if it matches
    if (this.currentGlobalGame && this.currentGlobalGame.type === gameType) {
      if (!this.currentGlobalGame.players.includes(playerId)) {
        this.currentGlobalGame.players.push(playerId);
      }
      return;
    }

    // Add to queued game
    const queuedGame = this.globalGameQueue.find(game => game.type === gameType);
    if (queuedGame && !queuedGame.players.includes(playerId)) {
      queuedGame.players.push(playerId);
    }
  }

  removePlayerFromGame(playerId) {
    // Remove from current game
    if (this.currentGlobalGame) {
      const index = this.currentGlobalGame.players.indexOf(playerId);
      if (index > -1) {
        this.currentGlobalGame.players.splice(index, 1);
      }
    }

    // Remove from queued games
    this.globalGameQueue.forEach(game => {
      const index = game.players.indexOf(playerId);
      if (index > -1) {
        game.players.splice(index, 1);
      }
    });
  }

  // Utility Methods
  hasActiveSession(playerId) {
    return this.gameTimers.has(`player_${playerId}`);
  }

  getGameTiming(gameType) {
    const now = Date.now();
    let nextGameStart = now;

    if (this.currentGlobalGame) {
      // Game in progress, calculate when next game starts
      const gameStartTime = this.currentGlobalGame.startTime || now;
      const gameDuration = this.GAME_DURATION[this.currentGlobalGame.type];
      nextGameStart = gameStartTime + gameDuration + this.GAME_INTERVAL;
    } else {
      // No current game, next game starts after wait period
      nextGameStart = now + this.WAIT_PERIOD;
    }

    return {
      currentTime: now,
      nextGameStart,
      timeUntilNextGame: Math.max(0, nextGameStart - now),
      gameDuration: this.GAME_DURATION[gameType],
      gameInterval: this.GAME_INTERVAL,
      waitPeriod: this.WAIT_PERIOD
    };
  }

  getCurrentGameStatus() {
    return {
      currentGame: this.currentGlobalGame,
      queueLength: this.globalGameQueue.length,
      activePlayerSessions: this.gameTimers.size,
      timing: this.getGameTiming('crash') // Default timing
    };
  }

  // Session Conflict Resolution
  handleGameSessionStart(session) {
    console.log('Game session started:', session);
    // Additional logic for session start
  }

  handleGameSessionEnd(data) {
    console.log('Game session ended:', data);
    // Additional logic for session end
  }

  handleGlobalTiming(timing) {
    console.log('Global timing update:', timing);
    this.emit('timingUpdate', timing);
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

  // Cleanup
  destroy() {
    // Clear all timers
    this.gameTimers.forEach(timer => clearTimeout(timer));
    this.gameTimers.clear();
    
    // Clear listeners
    this.listeners.clear();
    
    // Reset state
    this.globalGameQueue = [];
    this.currentGlobalGame = null;
  }
}

// Create singleton instance
const gameTimingService = new GameTimingService();

export default gameTimingService;
