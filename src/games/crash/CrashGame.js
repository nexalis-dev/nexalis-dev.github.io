import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CrashGame.css';

const CrashGame = () => {
  // Game state
  const [gameState, setGameState] = useState('waiting'); // waiting, betting, flying, crashed
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(null);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(1000);
  const [autoCashOut, setAutoCashOut] = useState('');
  const [hasActiveBet, setHasActiveBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashOutMultiplier, setCashOutMultiplier] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [message, setMessage] = useState('Place your bet for the next round!');
  const [messageType, setMessageType] = useState('info');
  const [gameHistory, setGameHistory] = useState([]);

  // Statistics
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    totalWinnings: 0,
    biggestWin: 0,
    highestMultiplier: 1.00
  });

  // Animation refs
  const animationRef = useRef();
  const gameIntervalRef = useRef();

  // Generate crash point using provably fair algorithm
  const generateCrashPoint = useCallback(() => {
    // Simple crash point generation (in real implementation, use cryptographically secure method)
    const random = Math.random();
    if (random < 0.33) return 1 + Math.random() * 1.5; // 1.00 - 2.50
    if (random < 0.66) return 2.5 + Math.random() * 2.5; // 2.50 - 5.00
    if (random < 0.90) return 5 + Math.random() * 10; // 5.00 - 15.00
    return 15 + Math.random() * 85; // 15.00 - 100.00
  }, []);

  // Start new game
  const startNewGame = useCallback(() => {
    const newCrashPoint = generateCrashPoint();
    setCrashPoint(newCrashPoint);
    setMultiplier(1.00);
    setGameState('betting');
    setCashedOut(false);
    setCashOutMultiplier(null);
    setTimeLeft(10); // 10 seconds betting time
    setMessage('Place your bets! Game starting soon...');
    setMessageType('info');

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startFlying();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [generateCrashPoint]);

  // Start flying phase
  const startFlying = useCallback(() => {
    setGameState('flying');
    setMessage('🚀 Flying! Cash out before it crashes!');
    setMessageType('info');

    const startTime = Date.now();
    const duration = 10000; // Base duration in ms

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      // Exponential growth curve
      const currentMultiplier = 1 + (Math.pow(progress * 10, 1.5) * 0.1);
      
      if (currentMultiplier >= crashPoint) {
        // Game crashed
        setMultiplier(crashPoint);
        setGameState('crashed');
        setMessage(`💥 Crashed at ${crashPoint.toFixed(2)}x!`);
        setMessageType('lose');
        
        // Handle active bets
        if (hasActiveBet && !cashedOut) {
          // Player lost
          setStats(prev => ({
            ...prev,
            gamesPlayed: prev.gamesPlayed + 1,
            totalWinnings: prev.totalWinnings - bet
          }));
          
          setGameHistory(prev => [{
            id: Date.now(),
            crashPoint: crashPoint,
            bet: bet,
            cashOut: null,
            result: 'lost',
            timestamp: new Date().toLocaleTimeString()
          }, ...prev.slice(0, 9)]);
        }
        
        setHasActiveBet(false);
        
        // Start next game after delay
        setTimeout(() => {
          startNewGame();
        }, 3000);
        
        return;
      }
      
      setMultiplier(currentMultiplier);
      
      // Auto cash out
      if (hasActiveBet && !cashedOut && autoCashOut && currentMultiplier >= parseFloat(autoCashOut)) {
        cashOut();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [crashPoint, hasActiveBet, cashedOut, autoCashOut, bet, startNewGame]);

  // Place bet
  const placeBet = () => {
    if (gameState !== 'betting' || hasActiveBet || bet > balance) {
      if (bet > balance) {
        setMessage('Insufficient balance!');
        setMessageType('lose');
      }
      return;
    }

    setBalance(prev => prev - bet);
    setHasActiveBet(true);
    setMessage(`Bet placed: $${bet}. Good luck!`);
    setMessageType('info');
  };

  // Cash out
  const cashOut = () => {
    if (!hasActiveBet || cashedOut || gameState !== 'flying') return;

    const winnings = bet * multiplier;
    setBalance(prev => prev + winnings);
    setCashedOut(true);
    setCashOutMultiplier(multiplier);
    setHasActiveBet(false);
    
    const profit = winnings - bet;
    setMessage(`Cashed out at ${multiplier.toFixed(2)}x! Won $${winnings.toFixed(2)}!`);
    setMessageType('win');

    // Update stats
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + 1,
      totalWinnings: prev.totalWinnings + profit,
      biggestWin: Math.max(prev.biggestWin, winnings),
      highestMultiplier: Math.max(prev.highestMultiplier, multiplier)
    }));

    // Add to history
    setGameHistory(prev => [{
      id: Date.now(),
      crashPoint: crashPoint,
      bet: bet,
      cashOut: multiplier,
      result: 'won',
      winnings: winnings,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 9)]);
  };

  // Initialize game
  useEffect(() => {
    startNewGame();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, [startNewGame]);

  // Betting controls
  const adjustBet = (amount) => {
    setBet(Math.max(1, Math.min(bet + amount, balance + (hasActiveBet ? bet : 0))));
  };

  const setBetAmount = (amount) => {
    setBet(Math.min(amount, balance + (hasActiveBet ? bet : 0)));
  };

  return (
    <div className="crash-game">
      <div className="crash-header">
        <h1 className="crash-title">Crash Game</h1>
        
        <div className="game-stats">
          <div className="stat-item">
            <div className="stat-label">Balance</div>
            <div className="stat-value">${balance.toFixed(2)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Games Won</div>
            <div className="stat-value">{stats.gamesWon}/{stats.gamesPlayed}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">
              {stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Biggest Win</div>
            <div className="stat-value">${stats.biggestWin.toFixed(2)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Highest Multiplier</div>
            <div className="stat-value">{stats.highestMultiplier.toFixed(2)}x</div>
          </div>
        </div>
      </div>

      <div className="game-area">
        <div className="multiplier-display">
          <div className={`multiplier-value ${gameState === 'flying' ? 'flying' : gameState === 'crashed' ? 'crashed' : ''}`}>
            {multiplier.toFixed(2)}x
          </div>
          
          {gameState === 'betting' && timeLeft > 0 && (
            <div className="countdown">
              Starting in {timeLeft}s
            </div>
          )}
          
          {gameState === 'flying' && (
            <div className="rocket">
              🚀
            </div>
          )}
          
          {gameState === 'crashed' && (
            <div className="explosion">
              💥
            </div>
          )}
        </div>

        <div className="betting-panel">
          <div className="bet-controls">
            <div className="bet-amount-section">
              <label>Bet Amount:</label>
              <div className="bet-input-group">
                <button 
                  className="bet-adjust-btn"
                  onClick={() => adjustBet(-10)}
                  disabled={gameState === 'flying' || hasActiveBet}
                >
                  -$10
                </button>
                <input
                  type="number"
                  className="bet-input"
                  value={bet}
                  onChange={(e) => setBet(Math.max(1, Math.min(parseInt(e.target.value) || 1, balance + (hasActiveBet ? bet : 0))))}
                  disabled={gameState === 'flying' || hasActiveBet}
                  min="1"
                  max={balance + (hasActiveBet ? bet : 0)}
                />
                <button 
                  className="bet-adjust-btn"
                  onClick={() => adjustBet(10)}
                  disabled={gameState === 'flying' || hasActiveBet}
                >
                  +$10
                </button>
              </div>
              
              <div className="quick-bet-buttons">
                <button onClick={() => setBetAmount(10)} disabled={gameState === 'flying' || hasActiveBet}>$10</button>
                <button onClick={() => setBetAmount(25)} disabled={gameState === 'flying' || hasActiveBet}>$25</button>
                <button onClick={() => setBetAmount(50)} disabled={gameState === 'flying' || hasActiveBet}>$50</button>
                <button onClick={() => setBetAmount(100)} disabled={gameState === 'flying' || hasActiveBet}>$100</button>
              </div>
            </div>

            <div className="auto-cashout-section">
              <label>Auto Cash Out:</label>
              <input
                type="number"
                className="auto-cashout-input"
                placeholder="e.g., 2.00"
                value={autoCashOut}
                onChange={(e) => setAutoCashOut(e.target.value)}
                disabled={gameState === 'flying'}
                step="0.01"
                min="1.01"
              />
            </div>

            <div className="action-buttons">
              {gameState === 'betting' && !hasActiveBet && (
                <button 
                  className="place-bet-btn"
                  onClick={placeBet}
                  disabled={bet > balance}
                >
                  Place Bet
                </button>
              )}
              
              {gameState === 'betting' && hasActiveBet && (
                <button className="waiting-btn" disabled>
                  Bet Placed - Waiting...
                </button>
              )}
              
              {gameState === 'flying' && hasActiveBet && !cashedOut && (
                <button 
                  className="cash-out-btn"
                  onClick={cashOut}
                >
                  Cash Out ${(bet * multiplier).toFixed(2)}
                </button>
              )}
              
              {gameState === 'flying' && cashedOut && (
                <button className="cashed-out-btn" disabled>
                  Cashed Out at {cashOutMultiplier.toFixed(2)}x
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`game-message message-${messageType}`}>
        {message}
      </div>

      {gameHistory.length > 0 && (
        <div className="game-history">
          <div className="history-title">Recent Games</div>
          <div className="history-list">
            {gameHistory.map((game) => (
              <div key={game.id} className="history-item">
                <span className="history-time">{game.timestamp}</span>
                <span className="history-crash">Crashed: {game.crashPoint.toFixed(2)}x</span>
                <span className="history-bet">Bet: ${game.bet}</span>
                <span className={`history-result ${game.result}`}>
                  {game.result === 'won' 
                    ? `Won: $${game.winnings.toFixed(2)} (${game.cashOut.toFixed(2)}x)`
                    : 'Lost'
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrashGame;
