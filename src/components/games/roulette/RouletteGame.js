import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useWallet } from '../../../contexts/WalletContext';
import './RouletteGame.css';

const RouletteGame = () => {
  const { 
    rouletteGame, 
    placeBet, 
    removeBet, 
    spinRoulette,
    loading,
    error 
  } = useGame();
  
  const { nxlBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('1.0');
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [betType, setBetType] = useState('number');

  // Roulette numbers with colors
  const rouletteNumbers = [
    { number: 0, color: 'green' },
    ...Array.from({ length: 36 }, (_, i) => ({
      number: i + 1,
      color: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(i + 1) ? 'red' : 'black'
    }))
  ];

  const betTypes = {
    number: { name: 'Single Number', payout: '35:1', description: 'Bet on a single number' },
    red: { name: 'Red', payout: '1:1', description: 'Bet on red numbers' },
    black: { name: 'Black', payout: '1:1', description: 'Bet on black numbers' },
    even: { name: 'Even', payout: '1:1', description: 'Bet on even numbers' },
    odd: { name: 'Odd', payout: '1:1', description: 'Bet on odd numbers' },
    low: { name: '1-18', payout: '1:1', description: 'Bet on numbers 1-18' },
    high: { name: '19-36', payout: '1:1', description: 'Bet on numbers 19-36' },
    dozen1: { name: '1st Dozen', payout: '2:1', description: 'Bet on numbers 1-12' },
    dozen2: { name: '2nd Dozen', payout: '2:1', description: 'Bet on numbers 13-24' },
    dozen3: { name: '3rd Dozen', payout: '2:1', description: 'Bet on numbers 25-36' }
  };

  const handleNumberClick = (number) => {
    if (betType === 'number') {
      setSelectedNumbers(prev => 
        prev.includes(number) 
          ? prev.filter(n => n !== number)
          : [...prev, number]
      );
    }
  };

  const handlePlaceBet = () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    if (parseFloat(betAmount) > parseFloat(nxlBalance)) {
      alert('Insufficient balance');
      return;
    }

    if (betType === 'number' && selectedNumbers.length === 0) {
      alert('Please select at least one number');
      return;
    }

    const numbers = betType === 'number' ? selectedNumbers : [];
    placeBet(betType, betAmount, numbers);
    
    // Reset selections for number bets
    if (betType === 'number') {
      setSelectedNumbers([]);
    }
  };

  const handleSpin = async () => {
    if (rouletteGame.bets.length === 0) {
      alert('Please place at least one bet');
      return;
    }

    await spinRoulette();
  };

  const getTotalBetAmount = () => {
    return rouletteGame.bets.reduce((total, bet) => total + bet.amount, 0);
  };

  const getNumberColor = (number) => {
    const numData = rouletteNumbers.find(n => n.number === number);
    return numData ? numData.color : 'black';
  };

  return (
    <div className="roulette-game">
      <div className="game-header">
        <h2>🎰 Roulette</h2>
        <p>Place your bets and spin the wheel of fortune!</p>
      </div>

      <div className="game-content">
        <div className="roulette-wheel-section">
          <div className="wheel-container">
            <div className={`roulette-wheel ${rouletteGame.isSpinning ? 'spinning' : ''}`}>
              <div className="wheel-center">
                {rouletteGame.winningNumber !== null && !rouletteGame.isSpinning && (
                  <div className={`winning-number ${getNumberColor(rouletteGame.winningNumber)}`}>
                    {rouletteGame.winningNumber}
                  </div>
                )}
                {rouletteGame.isSpinning && (
                  <div className="spinning-indicator">
                    🎯
                  </div>
                )}
              </div>
              
              {/* Wheel numbers */}
              {rouletteNumbers.map((num, index) => (
                <div
                  key={num.number}
                  className={`wheel-number ${num.color}`}
                  style={{
                    transform: `rotate(${(index * 360) / rouletteNumbers.length}deg) translateY(-120px)`,
                    transformOrigin: '50% 120px'
                  }}
                >
                  {num.number}
                </div>
              ))}
            </div>
          </div>

          <div className="spin-section">
            <button
              className="spin-button"
              onClick={handleSpin}
              disabled={loading || rouletteGame.isSpinning || rouletteGame.bets.length === 0}
            >
              {rouletteGame.isSpinning ? 'Spinning...' : 'Spin Wheel'}
            </button>
            
            {rouletteGame.result && (
              <div className="spin-result">
                <div className={`result-number ${getNumberColor(rouletteGame.winningNumber)}`}>
                  {rouletteGame.winningNumber}
                </div>
                <div className="result-info">
                  {rouletteGame.result.totalWin > 0 ? (
                    <span className="win">Won: {rouletteGame.result.totalWin.toFixed(2)} NXL</span>
                  ) : (
                    <span className="loss">Better luck next time!</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="betting-section">
          <div className="bet-controls">
            <div className="bet-type-selector">
              <label>Bet Type:</label>
              <select 
                value={betType} 
                onChange={(e) => {
                  setBetType(e.target.value);
                  setSelectedNumbers([]);
                }}
                disabled={rouletteGame.isSpinning}
              >
                {Object.entries(betTypes).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.name} ({type.payout})
                  </option>
                ))}
              </select>
            </div>

            <div className="bet-amount-input">
              <label>Bet Amount (NXL):</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="0.01"
                max={nxlBalance}
                step="0.01"
                disabled={rouletteGame.isSpinning}
              />
              <div className="balance-info">
                Balance: {nxlBalance} NXL
              </div>
            </div>

            <button
              className="place-bet-button"
              onClick={handlePlaceBet}
              disabled={rouletteGame.isSpinning || !betAmount}
            >
              Place Bet
            </button>
          </div>

          {betType === 'number' && (
            <div className="number-grid">
              <div className="grid-header">Select Numbers:</div>
              <div className="numbers-container">
                {rouletteNumbers.map((num) => (
                  <button
                    key={num.number}
                    className={`number-button ${num.color} ${
                      selectedNumbers.includes(num.number) ? 'selected' : ''
                    }`}
                    onClick={() => handleNumberClick(num.number)}
                    disabled={rouletteGame.isSpinning}
                  >
                    {num.number}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="current-bets">
            <h3>Current Bets</h3>
            {rouletteGame.bets.length > 0 ? (
              <div className="bets-list">
                {rouletteGame.bets.map((bet) => (
                  <div key={bet.id} className="bet-item">
                    <div className="bet-info">
                      <span className="bet-type">
                        {betTypes[bet.type]?.name || bet.type}
                        {bet.numbers.length > 0 && ` (${bet.numbers.join(', ')})`}
                      </span>
                      <span className="bet-amount">{bet.amount.toFixed(2)} NXL</span>
                    </div>
                    <button
                      className="remove-bet-button"
                      onClick={() => removeBet(bet.id)}
                      disabled={rouletteGame.isSpinning}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="total-bet">
                  Total: {getTotalBetAmount().toFixed(2)} NXL
                </div>
              </div>
            ) : (
              <div className="no-bets">No bets placed</div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="game-info">
        <div className="betting-guide">
          <h3>Betting Guide</h3>
          <div className="guide-grid">
            {Object.entries(betTypes).map(([key, type]) => (
              <div key={key} className="guide-item">
                <div className="guide-name">{type.name}</div>
                <div className="guide-payout">{type.payout}</div>
                <div className="guide-description">{type.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouletteGame;
