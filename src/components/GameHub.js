import React, { useState, useEffect } from 'react';
import { GameProvider } from '../contexts/GameContext';
import { WalletProvider } from '../contexts/WalletContext';
import Header from './common/Header';
import GameSelector from './common/GameSelector';
import RouletteGame from '../games/roulette/RouletteGame';
import CardGame from '../games/cards/CardGame';
import CrashGame from '../games/crash/CrashGame';
import './GameHub.css';

const GameHub = () => {
  const [currentGame, setCurrentGame] = useState('selector');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState({
    username: 'Player',
    balance: 1000,
    level: 1,
    experience: 0,
    achievements: []
  });

  // Game statistics
  const [gameStats, setGameStats] = useState({
    totalGamesPlayed: 0,
    totalWinnings: 0,
    favoriteGame: null,
    winRate: 0,
    biggestWin: 0,
    currentStreak: 0,
    longestStreak: 0
  });

  // Handle game selection
  const handleGameSelect = (gameId) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentGame(gameId);
      setIsLoading(false);
    }, 500);
  };

  // Handle returning to game selector
  const handleBackToSelector = () => {
    setCurrentGame('selector');
  };

  // Update user balance
  const updateBalance = (newBalance) => {
    setUser(prev => ({
      ...prev,
      balance: newBalance
    }));
  };

  // Update game statistics
  const updateGameStats = (gameType, result) => {
    setGameStats(prev => {
      const newStats = { ...prev };
      newStats.totalGamesPlayed += 1;
      
      if (result.won) {
        newStats.totalWinnings += result.winnings;
        newStats.biggestWin = Math.max(newStats.biggestWin, result.winnings);
        newStats.currentStreak += 1;
        newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
      } else {
        newStats.currentStreak = 0;
      }
      
      newStats.winRate = newStats.totalGamesPlayed > 0 
        ? Math.round((newStats.totalWinnings / newStats.totalGamesPlayed) * 100) / 100
        : 0;
      
      // Update favorite game based on play frequency
      if (!newStats.favoriteGame || Math.random() > 0.7) {
        newStats.favoriteGame = gameType;
      }
      
      return newStats;
    });
  };

  // Add experience and level up
  const addExperience = (amount) => {
    setUser(prev => {
      const newExp = prev.experience + amount;
      const newLevel = Math.floor(newExp / 100) + 1;
      
      return {
        ...prev,
        experience: newExp,
        level: newLevel
      };
    });
  };

  // Achievement system
  const checkAchievements = () => {
    const newAchievements = [];
    
    if (gameStats.totalGamesPlayed >= 10 && !user.achievements.includes('novice')) {
      newAchievements.push('novice');
    }
    
    if (gameStats.totalGamesPlayed >= 50 && !user.achievements.includes('experienced')) {
      newAchievements.push('experienced');
    }
    
    if (gameStats.biggestWin >= 500 && !user.achievements.includes('big_winner')) {
      newAchievements.push('big_winner');
    }
    
    if (gameStats.longestStreak >= 5 && !user.achievements.includes('streak_master')) {
      newAchievements.push('streak_master');
    }
    
    if (newAchievements.length > 0) {
      setUser(prev => ({
        ...prev,
        achievements: [...prev.achievements, ...newAchievements]
      }));
    }
  };

  // Check for achievements when stats change
  useEffect(() => {
    checkAchievements();
  }, [gameStats]);

  // Render current game component
  const renderCurrentGame = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Game...</div>
        </div>
      );
    }

    switch (currentGame) {
      case 'roulette':
        return (
          <RouletteGame 
            onBalanceUpdate={updateBalance}
            onGameResult={(result) => updateGameStats('roulette', result)}
            onExperienceGain={addExperience}
            initialBalance={user.balance}
          />
        );
      case 'cards':
        return (
          <CardGame 
            onBalanceUpdate={updateBalance}
            onGameResult={(result) => updateGameStats('cards', result)}
            onExperienceGain={addExperience}
            initialBalance={user.balance}
          />
        );
      case 'crash':
        return (
          <CrashGame 
            onBalanceUpdate={updateBalance}
            onGameResult={(result) => updateGameStats('crash', result)}
            onExperienceGain={addExperience}
            initialBalance={user.balance}
          />
        );
      case 'selector':
      default:
        return (
          <GameSelector 
            onGameSelect={handleGameSelect}
            gameStats={gameStats}
            userLevel={user.level}
          />
        );
    }
  };

  return (
    <WalletProvider>
      <GameProvider>
        <div className="game-hub">
          <Header 
            user={user}
            gameStats={gameStats}
            currentGame={currentGame}
            onBackToSelector={currentGame !== 'selector' ? handleBackToSelector : null}
          />
          
          <main className="game-content">
            {renderCurrentGame()}
          </main>
          
          {/* Background Effects */}
          <div className="background-effects">
            <div className="floating-particles">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 10}s`,
                    animationDuration: `${10 + Math.random() * 20}s`
                  }}
                />
              ))}
            </div>
            
            <div className="gradient-orbs">
              <div className="orb orb-1"></div>
              <div className="orb orb-2"></div>
              <div className="orb orb-3"></div>
            </div>
          </div>
          
          {/* Achievement Notifications */}
          {user.achievements.length > 0 && (
            <div className="achievement-notification">
              <div className="achievement-icon">🏆</div>
              <div className="achievement-text">
                Achievement Unlocked: {user.achievements[user.achievements.length - 1]}
              </div>
            </div>
          )}
        </div>
      </GameProvider>
    </WalletProvider>
  );
};

export default GameHub;
