import React, { useState, useEffect, useCallback } from 'react';
import './RouletteGame.css';

const RouletteGame = () => {
  // Game state
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [bets, setBets] = useState({});
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [gameHistory, setGameHistory] = useState([]);
  const [message, setMessage] = useState('Place your bets!');
  const [messageType, setMessageType] = useState('info');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);

  // Statistics
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    totalWinnings: 0,
    biggestWin: 0
  });

  // Roulette numbers with colors (European roulette)
  const rouletteNumbers = [
    { number: 0, color: 'green' },
    { number: 32, color: 'red' }, { number: 15, color: 'black' }, { number: 19, color: 'red' },
    { number: 4, color: 'black' }, { number: 21, color: 'red' }, { number: 2, color: 'black' },
    { number: 25, color: 'red' }, { number: 17, color: 'black' }, { number: 34, color: 'red' },
    { number: 6, color: 'black' }, { number: 27, color: 'red' }, { number: 13, color: 'black' },
    { number: 36, color: 'red' }, { number: 11, color: 'black' }, { number: 30, color: 'red' },
    { number: 8, color: 'black' }, { number: 23, color: 'red' }, { number: 10, color: 'black' },
    { number: 5, color: 'red' }, { number: 24, color: 'black' }, { number: 16, color: 'red' },
    { number: 33, color: 'black' }, { number: 1, color: 'red' }, { number: 20, color: 'black' },
    { number: 14, color: 'red' }, { number: 31, color: 'black' }, { number: 9, color: 'red' },
    { number: 22, color: 'black' }, { number: 18, color: 'red' }, { number: 29, color: 'black' },
    { number: 7, color: 'red' }, { number: 28, color: 'black' }, { number: 12, color: 'red' },
    { number: 35, color: 'black' }, { number: 3, color: 'red' }, { number: 26, color: 'black' }
  ];

  // Betting options
  const bettingOptions = {
    // Single numbers (0-36)
    numbers: Array.from({ length: 37 }, (_, i) => i),
    // Colors
    red: 'red',
    black: 'black',
    // Even/Odd
    even: 'even',
    odd: 'odd',
    // High/Low
    low: '1-18',
    high: '19-36',
    // Dozens
    first12: '1st 12',
    second12: '2nd 12',
    third12: '3rd 12',
    // Columns
    column1: 'Column 1',
    column2: 'Column 2',
    column3: 'Column 3'
  };

  // Get number color
  const getNumberColor = (number) => {
    const found = rouletteNumbers.find(n => n.number === number);
    return found ? found.color : 'green';
  };

  // Check if number is red
  const isRed = (number) => {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(number);
  };

  // Check if number is black
  const isBlack = (number) => {
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
    return blackNumbers.includes(number);
  };

  // Place bet
  const placeBet = (betType, amount = betAmount) => {
    if (isSpinning) return;
    if (amount > balance) {
      setMessage('Insufficient balance!');
      setMessageType('lose');
      return;
    }

    setBets(prev => ({
      ...prev,
      [betType]: (prev[betType] || 0) + amount
    }));
    setBalance(prev => prev - amount);
    setMessage(`Bet placed: ${betType} - $${amount}`);
    setMessageType('info');
  };

  // Clear all bets
  const clearBets = () => {
    if (isSpinning) return;
    
    const totalBets = Object.values(bets).reduce((sum, bet) => sum + bet, 0);
    setBalance(prev => prev + totalBets);
    setBets({});
    setMessage('All bets cleared!');
    setMessageType('info');
  };

  // Spin the wheel
  const spinWheel = () => {
    if (isSpinning) return;
    if (Object.keys(bets).length === 0) {
      setMessage('Place at least one bet!');
      setMessageType('lose');
      return;
    }

    setIsSpinning(true);
    setMessage('Spinning...');
    setMessageType('info');

    // Generate random winning number
    const winningNumber = Math.floor(Math.random() * 37);
    
    // Calculate rotations for animation
    const spins = 5 + Math.random() * 5; // 5-10 full rotations
    const finalPosition = (winningNumber / 37) * 360;
    const totalRotation = spins * 360 + finalPosition;
    
    setWheelRotation(prev => prev + totalRotation);
    setBallRotation(prev => prev - totalRotation * 1.2); // Ball rotates opposite direction

    // Set winning number after animation
    setTimeout(() => {
      setCurrentNumber(winningNumber);
      calculateWinnings(winningNumber);
      setIsSpinning(false);
    }, 4000);
  };

  // Calculate winnings
  const calculateWinnings = (winningNumber) => {
    let totalWinnings = 0;
    const winningBets = [];
    const losingBets = [];

    Object.entries(bets).forEach(([betType, betAmount]) => {
      let isWinningBet = false;
      let payout = 0;

      // Check different bet types
      if (betType === winningNumber.toString()) {
        // Straight up bet (35:1)
        isWinningBet = true;
        payout = betAmount * 35;
      } else if (betType === 'red' && isRed(winningNumber)) {
        // Red bet (1:1)
        isWinningBet = true;
        payout = betAmount;
      } else if (betType === 'black' && isBlack(winningNumber)) {
        // Black bet (1:1)
        isWinningBet = true;
        payout = betAmount;
      } else if (betType === 'even' && winningNumber !== 0 && winningNumber % 2 === 0) {
        // Even bet (1:1)
        isWinningBet = true;
        payout = betAmount;
      } else if (betType === 'odd' && winningNumber % 2 === 1) {
        // Odd bet (1:1)
        isWinningBet = true;
        payout = betAmount;
      } else if (betType === 'low' && winningNumber >= 1 && winningNumber <= 18) {
        // Low bet (1:1)
        isWinningBet = true;
        payout = betAmount;
      } else if (betType === 'high' && winningNumber >= 19 && winningNumber <= 36) {
        // High bet (1:1)
        isWinningBet = true;
        payout = betAmount;
      } else if (betType === 'first12' && winningNumber >= 1 && winningNumber <= 12) {
        // First dozen (2:1)
        isWinningBet = true;
        payout = betAmount * 2;
      } else if (betType === 'second12' && winningNumber >= 13 && winningNumber <= 24) {
        // Second dozen (2:1)
        isWinningBet = true;
        payout = betAmount * 2;
      } else if (betType === 'third12' && winningNumber >= 25 && winningNumber <= 36) {
        // Third dozen (2:1)
        isWinningBet = true;
        payout = betAmount * 2;
      } else if (betType === 'column1' && winningNumber > 0 && (winningNumber - 1) % 3 === 0) {
        // First column (2:1)
        isWinningBet = true;
        payout = betAmount * 2;
      } else if (betType === 'column2' && winningNumber > 0 && (winningNumber - 2) % 3 === 0) {
        // Second column (2:1)
        isWinningBet = true;
        payout = betAmount * 2;
      } else if (betType === 'column3' && winningNumber > 0 && winningNumber % 3 === 0) {
        // Third column (2:1)
        isWinningBet = true;
        payout = betAmount * 2;
      }

      if (isWinningBet) {
        totalWinnings += payout + betAmount; // Include original bet
        winningBets.push({ type: betType, amount: betAmount, payout });
      } else {
        losingBets.push({ type: betType, amount: betAmount });
      }
    });

    // Update balance
    setBalance(prev => prev + totalWinnings);

    // Update stats
    setStats(prev => ({
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + (totalWinnings > 0 ? 1 : 0),
      totalWinnings: prev.totalWinnings + totalWinnings - Object.values(bets).reduce((sum, bet) => sum + bet, 0),
      biggestWin: Math.max(prev.biggestWin, totalWinnings)
    }));

    // Add to history
    setGameHistory(prev => [{
      id: Date.now(),
      number: winningNumber,
      color: getNumberColor(winningNumber),
      totalBet: Object.values(bets).reduce((sum, bet) => sum + bet, 0),
      totalWin: totalWinnings,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 9)]);

    // Set message
    if (totalWinnings > 0) {
      setMessage(`Number ${winningNumber} (${getNumberColor(winningNumber)})! You won $${totalWinnings}!`);
      setMessageType('win');
    } else {
      setMessage(`Number ${winningNumber} (${getNumberColor(winningNumber)}). Better luck next time!`);
      setMessageType('lose');
    }

    // Clear bets
    setBets({});
  };

  // Render number grid
  const renderNumberGrid = () => {
    const grid = [];
    
    // Zero
    grid.push(
      <div
        key="0"
        className={`number-cell zero ${bets['0'] ? 'has-bet' : ''}`}
        onClick={() => placeBet('0')}
      >
        0
        {bets['0'] && <div className="bet-chip">${bets['0']}</div>}
      </div>
    );

    // Numbers 1-36 in roulette layout
    for (let row = 0; row < 12; row++) {
      const rowNumbers = [3 - (row * 3), 2 - (row * 3), 1 - (row * 3)].map(n => n + 36);
      
      rowNumbers.forEach(num => {
        if (num >= 1 && num <= 36) {
          const color = isRed(num) ? 'red' : 'black';
          grid.push(
            <div
              key={num}
              className={`number-cell ${color} ${bets[num.toString()] ? 'has-bet' : ''}`}
              onClick={() => placeBet(num.toString())}
            >
              {num}
              {bets[num.toString()] && <div className="bet-chip">${bets[num.toString()]}</div>}
            </div>
          );
        }
      });
    }

    return grid;
  };

  return (
    <div className="roulette-game">
      <div className="roulette-header">
        <h1 className="roulette-title">European Roulette</h1>
        
        <div className="game-stats">
          <div className="stat-item">
            <div className="stat-label">Balance</div>
            <div className="stat-value">${balance}</div>
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
            <div className="stat-value">${stats.biggestWin}</div>
          </div>
        </div>
      </div>

      <div className="game-area">
        <div className="wheel-section">
          <div className="roulette-wheel">
            <div 
              className="wheel-inner"
              style={{ transform: `rotate(${wheelRotation}deg)` }}
            >
              {rouletteNumbers.map((item, index) => (
                <div
                  key={index}
                  className={`wheel-number ${item.color}`}
                  style={{
                    transform: `rotate(${(index * 360) / rouletteNumbers.length}deg)`
                  }}
                >
                  {item.number}
                </div>
              ))}
            </div>
            <div 
              className="wheel-ball"
              style={{ transform: `rotate(${ballRotation}deg)` }}
            />
            <div className="wheel-center">
              {currentNumber !== null && (
                <div className={`winning-number ${getNumberColor(currentNumber)}`}>
                  {currentNumber}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="betting-section">
          <div className="bet-controls">
            <div className="bet-amount-controls">
              <label>Bet Amount:</label>
              <div className="amount-buttons">
                <button onClick={() => setBetAmount(1)} className={betAmount === 1 ? 'active' : ''}>$1</button>
                <button onClick={() => setBetAmount(5)} className={betAmount === 5 ? 'active' : ''}>$5</button>
                <button onClick={() => setBetAmount(10)} className={betAmount === 10 ? 'active' : ''}>$10</button>
                <button onClick={() => setBetAmount(25)} className={betAmount === 25 ? 'active' : ''}>$25</button>
                <button onClick={() => setBetAmount(50)} className={betAmount === 50 ? 'active' : ''}>$50</button>
              </div>
            </div>

            <div className="game-controls">
              <button 
                className="spin-button"
                onClick={spinWheel}
                disabled={isSpinning || Object.keys(bets).length === 0}
              >
                {isSpinning ? 'Spinning...' : 'Spin'}
              </button>
              <button 
                className="clear-button"
                onClick={clearBets}
                disabled={isSpinning || Object.keys(bets).length === 0}
              >
                Clear Bets
              </button>
            </div>
          </div>

          <div className="betting-table">
            <div className="number-grid">
              {renderNumberGrid()}
            </div>

            <div className="outside-bets">
              <div className="bet-row">
                <div 
                  className={`bet-cell color-bet red ${bets.red ? 'has-bet' : ''}`}
                  onClick={() => placeBet('red')}
                >
                  Red
                  {bets.red && <div className="bet-chip">${bets.red}</div>}
                </div>
                <div 
                  className={`bet-cell color-bet black ${bets.black ? 'has-bet' : ''}`}
                  onClick={() => placeBet('black')}
                >
                  Black
                  {bets.black && <div className="bet-chip">${bets.black}</div>}
                </div>
              </div>

              <div className="bet-row">
                <div 
                  className={`bet-cell ${bets.even ? 'has-bet' : ''}`}
                  onClick={() => placeBet('even')}
                >
                  Even
                  {bets.even && <div className="bet-chip">${bets.even}</div>}
                </div>
                <div 
                  className={`bet-cell ${bets.odd ? 'has-bet' : ''}`}
                  onClick={() => placeBet('odd')}
                >
                  Odd
                  {bets.odd && <div className="bet-chip">${bets.odd}</div>}
                </div>
              </div>

              <div className="bet-row">
                <div 
                  className={`bet-cell ${bets.low ? 'has-bet' : ''}`}
                  onClick={() => placeBet('low')}
                >
                  1-18
                  {bets.low && <div className="bet-chip">${bets.low}</div>}
                </div>
                <div 
                  className={`bet-cell ${bets.high ? 'has-bet' : ''}`}
                  onClick={() => placeBet('high')}
                >
                  19-36
                  {bets.high && <div className="bet-chip">${bets.high}</div>}
                </div>
              </div>

              <div className="bet-row">
                <div 
                  className={`bet-cell ${bets.first12 ? 'has-bet' : ''}`}
                  onClick={() => placeBet('first12')}
                >
                  1st 12
                  {bets.first12 && <div className="bet-chip">${bets.first12}</div>}
                </div>
                <div 
                  className={`bet-cell ${bets.second12 ? 'has-bet' : ''}`}
                  onClick={() => placeBet('second12')}
                >
                  2nd 12
                  {bets.second12 && <div className="bet-chip">${bets.second12}</div>}
                </div>
                <div 
                  className={`bet-cell ${bets.third12 ? 'has-bet' : ''}`}
                  onClick={() => placeBet('third12')}
                >
                  3rd 12
                  {bets.third12 && <div className="bet-chip">${bets.third12}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`game-message message-${messageType}`}>
        {message}
      </div>

      {gameHistory.length > 0 && (
        <div className="game-history">
          <div className="history-title">Recent Spins</div>
          <div className="history-numbers">
            {gameHistory.map((game) => (
              <div key={game.id} className={`history-number ${game.color}`}>
                {game.number}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouletteGame;
