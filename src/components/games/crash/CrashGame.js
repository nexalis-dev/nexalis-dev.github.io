import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useWallet } from '../../../contexts/WalletContext';
import './CrashGame.css';

const CrashGame = () => {
  const { 
    crashGame, 
    startCrashGame, 
    cashOutCrash, 
    updateCrashMultiplier,
    endCrashGame,
    loading,
    error 
  } = useGame();
  
  const { nxlBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('1.0');
  const [autoCashOut, setAutoCashOut] = useState('');
  const [gameHistory, setGameHistory] = useState([]);
  const intervalRef = useRef(null);

  // Simulate multiplier updates when game is active
  useEffect(() => {
    if (crashGame.isActive && !crashGame.crashed) {
      intervalRef.current = setInterval(() => {
        const newMultiplier = crashGame.multiplier + (Math.random() * 0.1);
        updateCrashMultiplier(newMultiplier);
        
        // Auto cash out if enabled
        if (autoCashOut && newMultiplier >= parseFloat(autoCashOut)) {
          handleCashOut();
        }
        
        // Random crash simulation
        if (Math.random() < 0.02) { // 2% chance per update
          endCrashGame(true);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [crashGame.isActive, crashGame.crashed, crashGame.multiplier, autoCashOut]);

  const handleStartGame = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    if (parseFloat(betAmount) > parseFloat(nxlBalance)) {
      alert('Insufficient balance');
      return;
    }

    const result = await startCrashGame(parseFloat(betAmount));
    if (result.success) {
      // Game started successfully
    }
  };

  const handleCashOut = async () => {
    if (!crashGame.isActive || crashGame.playerCashedOut) return;
    
    const result = await cashOutCrash();
    if (result.success) {
      setGameHistory(prev => [...prev, {
        multiplier: result.multiplier,
        winAmount: result.winAmount,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const getMultiplierColor = (multiplier) => {
    if (multiplier < 1.5) return '#4ecdc4';
    if (multiplier < 2.0) return '#45b7d1';
    if (multiplier < 5.0) return '#f39c12';
    if (multiplier < 10.0) return '#e67e22';
    return '#e74c3c';
  };

  return (
    <div className="crash-game">
      <div className="game-header">
        <h2>🚀 Crash Out</h2>
        <p>Watch the multiplier rise and cash out before it crashes!</p>
      </div>

      <div className="game-content">
        <div className="game-display">
          <div className="multiplier-display">
            <div 
              className={`multiplier-value ${crashGame.crashed ? 'crashed' : ''}`}
              style={{ color: getMultiplierColor(crashGame.multiplier) }}
            >
              {crashGame.multiplier.toFixed(2)}x
            </div>
            
            {crashGame.crashed && (
              <div className="crash-message">
                💥 CRASHED!
              </div>
            )}
            
            {crashGame.isActive && !crashGame.crashed && (
              <div className="game-status">
                <div className="status-indicator active"></div>
                Game in progress...
              </div>
            )}
          </div>

          <div className="game-chart">
            <div className="chart-container">
              <div 
                className="multiplier-line"
                style={{
                  height: `${Math.min(crashGame.multiplier * 20, 200)}px`,
                  background: `linear-gradient(to top, ${getMultiplierColor(crashGame.multiplier)}, transparent)`
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="game-controls">
          <div className="betting-section">
            <div className="input-group">
              <label>Bet Amount (NXL)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="0.01"
                max={nxlBalance}
                step="0.01"
                disabled={crashGame.isActive}
                className="bet-input"
              />
              <div className="balance-info">
                Balance: {nxlBalance} NXL
              </div>
            </div>

            <div className="input-group">
              <label>Auto Cash Out (Optional)</label>
              <input
                type="number"
                value={autoCashOut}
                onChange={(e) => setAutoCashOut(e.target.value)}
                min="1.01"
                step="0.01"
                placeholder="e.g., 2.00"
                disabled={crashGame.isActive}
                className="auto-cashout-input"
              />
            </div>

            <div className="quick-bet-buttons">
              <button onClick={() => setBetAmount('0.5')}>0.5</button>
              <button onClick={() => setBetAmount('1.0')}>1.0</button>
              <button onClick={() => setBetAmount('5.0')}>5.0</button>
              <button onClick={() => setBetAmount('10.0')}>10.0</button>
            </div>
          </div>

          <div className="action-buttons">
            {!crashGame.isActive ? (
              <button
                className="start-game-btn"
                onClick={handleStartGame}
                disabled={loading || !betAmount}
              >
                {loading ? 'Starting...' : 'Start Game'}
              </button>
            ) : (
              <button
                className={`cash-out-btn ${crashGame.playerCashedOut ? 'cashed-out' : ''}`}
                onClick={handleCashOut}
                disabled={crashGame.playerCashedOut || crashGame.crashed}
              >
                {crashGame.playerCashedOut 
                  ? `Cashed Out at ${crashGame.cashOutMultiplier?.toFixed(2)}x`
                  : 'Cash Out'
                }
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="game-info">
        <div className="info-section">
          <h3>Game Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Current Bet</span>
              <span className="stat-value">{betAmount} NXL</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Potential Win</span>
              <span className="stat-value">
                {(parseFloat(betAmount || 0) * crashGame.multiplier).toFixed(2)} NXL
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Games Played</span>
              <span className="stat-value">{gameHistory.length}</span>
            </div>
          </div>
        </div>

        <div className="history-section">
          <h3>Recent Games</h3>
          <div className="history-list">
            {gameHistory.slice(-5).reverse().map((game, index) => (
              <div key={index} className="history-item">
                <span className="history-multiplier">
                  {game.multiplier.toFixed(2)}x
                </span>
                <span className="history-win">
                  +{game.winAmount.toFixed(2)} NXL
                </span>
                <span className="history-time">
                  {new Date(game.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {gameHistory.length === 0 && (
              <div className="no-history">
                No games played yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrashGame;
