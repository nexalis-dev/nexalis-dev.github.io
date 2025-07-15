import React, { createContext, useContext, useState, useEffect } from 'react';
import { gameService } from '../services/game';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const { refreshBalances } = useWallet();

  // Game states
  const [currentGame, setCurrentGame] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [gameStats, setGameStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    totalWagered: '0',
    totalWon: '0',
    winRate: 0
  });

  // Crash Out game state
  const [crashGame, setCrashGame] = useState({
    isActive: false,
    multiplier: 1.0,
    crashed: false,
    playerBet: '0',
    playerCashedOut: false,
    cashOutMultiplier: 0,
    gameId: null,
    history: []
  });

  // Roulette game state
  const [rouletteGame, setRouletteGame] = useState({
    isSpinning: false,
    result: null,
    bets: [],
    totalBet: '0',
    winningNumber: null,
    gameId: null,
    history: []
  });

  // Card game state
  const [cardGame, setCardGame] = useState({
    gameState: 'waiting', // waiting, playing, ended
    playerHand: [],
    opponentHand: [],
    playerMana: 10,
    opponentMana: 10,
    playerHealth: 30,
    opponentHealth: 30,
    currentTurn: 'player',
    gameId: null,
    history: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize game data when user changes
  useEffect(() => {
    if (user) {
      loadGameData();
    } else {
      resetGameData();
    }
  }, [user]);

  // Load user's game data
  const loadGameData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load game history
      const history = await gameService.getGameHistory(user.id);
      setGameHistory(history);

      // Load game statistics
      const stats = await gameService.getGameStats(user.id);
      setGameStats(stats);

      // Load individual game histories
      const crashHistory = await gameService.getCrashHistory(user.id);
      setCrashGame(prev => ({ ...prev, history: crashHistory }));

      const rouletteHistory = await gameService.getRouletteHistory(user.id);
      setRouletteGame(prev => ({ ...prev, history: rouletteHistory }));

      const cardHistory = await gameService.getCardGameHistory(user.id);
      setCardGame(prev => ({ ...prev, history: cardHistory }));

    } catch (error) {
      console.error('Load game data error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset game data
  const resetGameData = () => {
    setCurrentGame(null);
    setGameHistory([]);
    setGameStats({
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      totalWagered: '0',
      totalWon: '0',
      winRate: 0
    });
    setCrashGame({
      isActive: false,
      multiplier: 1.0,
      crashed: false,
      playerBet: '0',
      playerCashedOut: false,
      cashOutMultiplier: 0,
      gameId: null,
      history: []
    });
    setRouletteGame({
      isSpinning: false,
      result: null,
      bets: [],
      totalBet: '0',
      winningNumber: null,
      gameId: null,
      history: []
    });
    setCardGame({
      gameState: 'waiting',
      playerHand: [],
      opponentHand: [],
      playerMana: 10,
      opponentMana: 10,
      playerHealth: 30,
      opponentHealth: 30,
      currentTurn: 'player',
      gameId: null,
      history: []
    });
  };

  // CRASH OUT GAME FUNCTIONS
  const startCrashGame = async (betAmount) => {
    try {
      setLoading(true);
      setError(null);

      if (parseFloat(betAmount) <= 0) {
        throw new Error('Bet amount must be greater than 0');
      }

      const gameResult = await gameService.startCrashGame(user.id, betAmount);

      setCrashGame({
        isActive: true,
        multiplier: 1.0,
        crashed: false,
        playerBet: betAmount,
        playerCashedOut: false,
        cashOutMultiplier: 0,
        gameId: gameResult.gameId,
        history: crashGame.history
      });

      setCurrentGame('crash-out');

      return { success: true, gameId: gameResult.gameId };
    } catch (error) {
      console.error('Start crash game error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const cashOutCrash = async () => {
    try {
      if (!crashGame.isActive || crashGame.playerCashedOut || crashGame.crashed) {
        throw new Error('Cannot cash out at this time');
      }

      const result = await gameService.cashOutCrash(crashGame.gameId, crashGame.multiplier);

      setCrashGame(prev => ({
        ...prev,
        playerCashedOut: true,
        cashOutMultiplier: prev.multiplier
      }));

      // Refresh balances after win
      await refreshBalances();
      await loadGameData();

      return { success: true, winAmount: result.winAmount };
    } catch (error) {
      console.error('Cash out crash error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  const updateCrashMultiplier = (multiplier) => {
    setCrashGame(prev => ({ ...prev, multiplier }));
  };

  const endCrashGame = (crashed = true) => {
    setCrashGame(prev => ({ ...prev, crashed, isActive: false }));
    setCurrentGame(null);
  };

  // ROULETTE GAME FUNCTIONS
  const placeBet = (betType, amount, numbers = []) => {
    const bet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: betType,
      amount: parseFloat(amount),
      numbers
    };

    setRouletteGame(prev => ({
      ...prev,
      bets: [...prev.bets, bet],
      totalBet: (parseFloat(prev.totalBet) + bet.amount).toString()
    }));

    return bet.id;
  };

  const removeBet = (betId) => {
    setRouletteGame(prev => {
      const betToRemove = prev.bets.find(bet => bet.id === betId);
      if (!betToRemove) return prev;

      return {
        ...prev,
        bets: prev.bets.filter(bet => bet.id !== betId),
        totalBet: (parseFloat(prev.totalBet) - betToRemove.amount).toString()
      };
    });
  };

  const clearBets = () => {
    setRouletteGame(prev => ({
      ...prev,
      bets: [],
      totalBet: '0'
    }));
  };

  const spinRoulette = async () => {
    try {
      setLoading(true);
      setError(null);

      if (rouletteGame.bets.length === 0) {
        throw new Error('No bets placed');
      }

      setRouletteGame(prev => ({ ...prev, isSpinning: true }));
      setCurrentGame('roulette');

      const result = await gameService.spinRoulette(user.id, rouletteGame.bets);

      setRouletteGame(prev => ({
        ...prev,
        isSpinning: false,
        result,
        winningNumber: result.winningNumber,
        gameId: result.gameId
      }));

      // Refresh balances after game
      await refreshBalances();
      await loadGameData();

      return { success: true, result };
    } catch (error) {
      console.error('Spin roulette error:', error);
      setError(error.message);
      setRouletteGame(prev => ({ ...prev, isSpinning: false }));
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resetRoulette = () => {
    setRouletteGame({
      isSpinning: false,
      result: null,
      bets: [],
      totalBet: '0',
      winningNumber: null,
      gameId: null,
      history: rouletteGame.history
    });
    setCurrentGame(null);
  };

  // CARD GAME FUNCTIONS
  const startCardGame = async () => {
    try {
      setLoading(true);
      setError(null);

      const gameResult = await gameService.startCardGame(user.id);

      setCardGame({
        gameState: 'playing',
        playerHand: gameResult.playerHand,
        opponentHand: gameResult.opponentHand,
        playerMana: 1,
        opponentMana: 1,
        playerHealth: 30,
        opponentHealth: 30,
        currentTurn: 'player',
        gameId: gameResult.gameId,
        history: cardGame.history
      });

      setCurrentGame('card-game');

      return { success: true, gameId: gameResult.gameId };
    } catch (error) {
      console.error('Start card game error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const playCard = async (cardId, targetId = null) => {
    try {
      if (cardGame.currentTurn !== 'player') {
        throw new Error('Not your turn');
      }

      const result = await gameService.playCard(cardGame.gameId, cardId, targetId);

      setCardGame(prev => ({
        ...prev,
        playerHand: result.playerHand,
        opponentHand: result.opponentHand,
        playerMana: result.playerMana,
        opponentMana: result.opponentMana,
        playerHealth: result.playerHealth,
        opponentHealth: result.opponentHealth,
        currentTurn: result.currentTurn,
        gameState: result.gameEnded ? 'ended' : 'playing'
      }));

      if (result.gameEnded) {
        await loadGameData();
        setCurrentGame(null);
      }

      return { success: true };
    } catch (error) {
      console.error('Play card error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  const endTurn = async () => {
    try {
      await gameService.endTurn(cardGame.gameId);
      
      // Process opponent turn
      const opponentResult = await gameService.opponentTurn(cardGame.gameId);
      
      setCardGame(prev => ({
        ...prev,
        playerHand: opponentResult.playerHand,
        opponentHand: opponentResult.opponentHand,
        playerHealth: opponentResult.playerHealth,
        opponentHealth: opponentResult.opponentHealth,
        currentTurn: 'player',
        gameState: opponentResult.gameEnded ? 'ended' : 'playing'
      }));

      if (opponentResult.gameEnded) {
        await loadGameData();
        setCurrentGame(null);
      }

      return { success: true };
    } catch (error) {
      console.error('End turn error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  const resetCardGame = () => {
    setCardGame({
      gameState: 'waiting',
      playerHand: [],
      opponentHand: [],
      playerMana: 10,
      opponentMana: 10,
      playerHealth: 30,
      opponentHealth: 30,
      currentTurn: 'player',
      gameId: null,
      history: cardGame.history
    });
    setCurrentGame(null);
  };

  // GENERAL FUNCTIONS
  const refreshGameData = async () => {
    await loadGameData();
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    // State
    currentGame,
    gameHistory,
    gameStats,
    crashGame,
    rouletteGame,
    cardGame,
    loading,
    error,

    // Crash Out functions
    startCrashGame,
    cashOutCrash,
    updateCrashMultiplier,
    endCrashGame,

    // Roulette functions
    placeBet,
    removeBet,
    clearBets,
    spinRoulette,
    resetRoulette,

    // Card Game functions
    startCardGame,
    playCard,
    endTurn,
    resetCardGame,

    // General functions
    refreshGameData,
    clearError
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export { GameContext, useGame };
        gameState: 'playing',
        playerHand: gameResult.playerHand,
        opponentHand: gameResult.opponentHand,
        playerMana: 10,
        opponentMana: 10,
        playerHealth: 30,
        opponentHealth: 30,
        currentTurn: 'player',
        gameId: gameResult.gameId,
        history: cardGame.history
      });

      setCurrentGame('card-game');

      return { success: true, gameId: gameResult.gameId };
    } catch (error) {
      console.error('Start card game error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const playCard = async (cardId, targetId = null) => {
    try {
      if (cardGame.gameState !== 'playing' || cardGame.currentTurn !== 'player') {
        throw new Error('Cannot play card at this time');
      }

      const result = await gameService.playCard(cardGame.gameId, cardId, targetId);

      setCardGame(prev => ({
        ...prev,
        playerHand: result.playerHand,
        opponentHand: result.opponentHand,
        playerMana: result.playerMana,
        opponentMana: result.opponentMana,
        playerHealth: result.playerHealth,
        opponentHealth: result.opponentHealth,
        currentTurn: result.currentTurn
      }));

      // Check for game end
      if (result.gameEnded) {
        setCardGame(prev => ({
          ...prev,
          gameState: 'ended'
        }));

        await loadGameData();
        await refreshBalances();
      }

      return { success: true, result };
    } catch (error) {
      console.error('Play card error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  const endTurn = async () => {
    try {
      if (cardGame.currentTurn !== 'player') {
        throw new Error('Not player turn');
      }

      const result = await gameService.endTurn(cardGame.gameId);

      setCardGame(prev => ({
        ...prev,
        currentTurn: 'opponent',
        playerMana: Math.min(prev.playerMana + 1, 10)
      }));

      // Simulate opponent turn
      setTimeout(async () => {
        const opponentResult = await gameService.opponentTurn(cardGame.gameId);
        
        setCardGame(prev => ({
          ...prev,
          playerHand: opponentResult.playerHand,
          opponentHand: opponentResult.opponentHand,
          playerHealth: opponentResult.playerHealth,
          opponentHealth: opponentResult.opponentHealth,
          currentTurn: 'player',
          opponentMana: Math.min(prev.opponentMana + 1, 10)
        }));

        if (opponentResult.gameEnded) {
          setCardGame(prev => ({ ...prev, gameState: 'ended' }));
          await loadGameData();
          await refreshBalances();
        }
      }, 2000);

      return { success: true };
    } catch (error) {
      console.error('End turn error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // UTILITY FUNCTIONS
  const clearError = () => {
    setError(null);
  };

  const getGameById = (gameId) => {
    return gameHistory.find(game => game.id === gameId);
  };

  const formatCurrency = (amount, decimals = 4) => {
    if (!amount || amount === '0') return '0';
    const num = parseFloat(amount);
    return num.toFixed(decimals);
  };

  const value = {
    // General state
    currentGame,
    gameHistory,
    gameStats,
    loading,
    error,

    // Game states
    crashGame,
    rouletteGame,
    cardGame,

    // Crash Out functions
    startCrashGame,
    cashOutCrash,
    updateCrashMultiplier,
    crashGameEnd,

    // Roulette functions
    placeBet,
    removeBet,
    spinRoulette,

    // Card Game functions
    startCardGame,
    playCard,
    endTurn,

    // Utility functions
    loadGameData,
    clearError,
    getGameById,
    formatCurrency,

    // Actions
    setCurrentGame
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
