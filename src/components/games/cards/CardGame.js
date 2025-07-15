import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useWallet } from '../../../contexts/WalletContext';
import './CardGame.css';

const CardGame = () => {
  const { 
    cardGame, 
    startCardGame, 
    playCard, 
    drawCard,
    endCardGame,
    loading,
    error 
  } = useGame();
  
  const { nxlBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('1.0');
  const [selectedCard, setSelectedCard] = useState(null);
  const [gameMode, setGameMode] = useState('blackjack');

  // Card suits and values
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const getCardValue = (card, currentTotal = 0) => {
    if (!card) return 0;
    
    if (card.value === 'A') {
      // Ace can be 1 or 11
      return (currentTotal + 11 <= 21) ? 11 : 1;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      return 10;
    } else {
      return parseInt(card.value);
    }
  };

  const getHandValue = (hand) => {
    let total = 0;
    let aces = 0;
    
    hand.forEach(card => {
      if (card.value === 'A') {
        aces++;
        total += 11;
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        total += 10;
      } else {
        total += parseInt(card.value);
      }
    });
    
    // Adjust for aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    
    return total;
  };

  const handleStartGame = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    if (parseFloat(betAmount) > parseFloat(nxlBalance)) {
      alert('Insufficient balance');
      return;
    }

    await startCardGame(gameMode, parseFloat(betAmount));
  };

  const handleHit = async () => {
    await drawCard('player');
  };

  const handleStand = async () => {
    // Dealer plays
    await playCard('stand');
  };

  const handleDoubleDown = async () => {
    if (cardGame.playerHand.length === 2) {
      await playCard('double');
    }
  };

  const canDoubleDown = () => {
    return cardGame.playerHand.length === 2 && 
           parseFloat(betAmount) * 2 <= parseFloat(nxlBalance) &&
           cardGame.gameState === 'playing';
  };

  const getCardColor = (suit) => {
    return ['♥', '♦'].includes(suit) ? 'red' : 'black';
  };

  const renderCard = (card, hidden = false) => {
    if (hidden) {
      return (
        <div className="card card-back">
          <div className="card-pattern">🂠</div>
        </div>
      );
    }

    return (
      <div className={`card ${getCardColor(card.suit)}`}>
        <div className="card-corner top-left">
          <div className="card-value">{card.value}</div>
          <div className="card-suit">{card.suit}</div>
        </div>
        <div className="card-center">
          <div className="card-suit-large">{card.suit}</div>
        </div>
        <div className="card-corner bottom-right">
          <div className="card-value">{card.value}</div>
          <div className="card-suit">{card.suit}</div>
        </div>
      </div>
    );
  };

  const getGameStatus = () => {
    if (cardGame.gameState === 'finished') {
      if (cardGame.result === 'win') {
        return { message: 'You Win!', class: 'win' };
      } else if (cardGame.result === 'lose') {
        return { message: 'You Lose!', class: 'lose' };
      } else {
        return { message: 'Push!', class: 'push' };
      }
    }
    return null;
  };

  const playerTotal = getHandValue(cardGame.playerHand || []);
  const dealerTotal = getHandValue(cardGame.dealerHand || []);
  const gameStatus = getGameStatus();

  return (
    <div className="card-game">
      <div className="game-header">
        <h2>🃏 Card Game</h2>
        <p>Test your luck and skill in classic card games!</p>
      </div>

      <div className="game-content">
        <div className="game-table">
          {/* Dealer Section */}
          <div className="dealer-section">
            <div className="section-header">
              <h3>Dealer</h3>
              <div className="hand-value">
                {cardGame.gameState === 'finished' || cardGame.gameState === 'dealer-turn' 
                  ? dealerTotal 
                  : cardGame.dealerHand?.length > 0 ? getCardValue(cardGame.dealerHand[0]) : 0
                }
              </div>
            </div>
            <div className="card-hand">
              {cardGame.dealerHand?.map((card, index) => (
                <div key={index} className="card-container">
                  {renderCard(
                    card, 
                    index === 1 && cardGame.gameState === 'playing'
                  )}
                </div>
              ))}
              {cardGame.dealerHand?.length === 0 && (
                <div className="empty-hand">No cards</div>
              )}
            </div>
          </div>

          {/* Game Status */}
          {gameStatus && (
            <div className={`game-status ${gameStatus.class}`}>
              <div className="status-message">{gameStatus.message}</div>
              {cardGame.winAmount && (
                <div className="win-amount">
                  {cardGame.winAmount > 0 ? '+' : ''}{cardGame.winAmount.toFixed(2)} NXL
                </div>
              )}
            </div>
          )}

          {/* Player Section */}
          <div className="player-section">
            <div className="section-header">
              <h3>Player</h3>
              <div className="hand-value">{playerTotal}</div>
            </div>
            <div className="card-hand">
              {cardGame.playerHand?.map((card, index) => (
                <div key={index} className="card-container">
                  {renderCard(card)}
                </div>
              ))}
              {cardGame.playerHand?.length === 0 && (
                <div className="empty-hand">No cards</div>
              )}
            </div>
          </div>
        </div>

        <div className="game-controls">
          <div className="betting-section">
            <div className="game-mode-selector">
              <label>Game Mode:</label>
              <select 
                value={gameMode} 
                onChange={(e) => setGameMode(e.target.value)}
                disabled={cardGame.gameState !== 'waiting'}
              >
                <option value="blackjack">Blackjack</option>
                <option value="poker">5-Card Draw</option>
                <option value="war">War</option>
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
                disabled={cardGame.gameState !== 'waiting'}
              />
              <div className="balance-info">
                Balance: {nxlBalance} NXL
              </div>
            </div>

            <div className="quick-bet-buttons">
              <button onClick={() => setBetAmount('1.0')}>1.0</button>
              <button onClick={() => setBetAmount('5.0')}>5.0</button>
              <button onClick={() => setBetAmount('10.0')}>10.0</button>
              <button onClick={() => setBetAmount('25.0')}>25.0</button>
            </div>
          </div>

          <div className="action-buttons">
            {cardGame.gameState === 'waiting' ? (
              <button
                className="start-game-btn"
                onClick={handleStartGame}
                disabled={loading || !betAmount}
              >
                {loading ? 'Starting...' : 'Deal Cards'}
              </button>
            ) : cardGame.gameState === 'playing' ? (
              <div className="playing-buttons">
                <button
                  className="action-btn hit-btn"
                  onClick={handleHit}
                  disabled={loading}
                >
                  Hit
                </button>
                <button
                  className="action-btn stand-btn"
                  onClick={handleStand}
                  disabled={loading}
                >
                  Stand
                </button>
                {canDoubleDown() && (
                  <button
                    className="action-btn double-btn"
                    onClick={handleDoubleDown}
                    disabled={loading}
                  >
                    Double Down
                  </button>
                )}
              </div>
            ) : (
              <button
                className="new-game-btn"
                onClick={() => {
                  endCardGame();
                  setSelectedCard(null);
                }}
                disabled={loading}
              >
                New Game
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
        <div className="game-rules">
          <h3>Game Rules - {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}</h3>
          <div className="rules-content">
            {gameMode === 'blackjack' && (
              <div className="rules-list">
                <p>• Get as close to 21 as possible without going over</p>
                <p>• Aces count as 1 or 11, face cards count as 10</p>
                <p>• Dealer must hit on 16 and stand on 17</p>
                <p>• Blackjack (21 with 2 cards) pays 3:2</p>
                <p>• Double down doubles your bet for one more card</p>
              </div>
            )}
            {gameMode === 'poker' && (
              <div className="rules-list">
                <p>• Draw 5 cards and make the best poker hand</p>
                <p>• You can discard and redraw up to 3 cards</p>
                <p>• Hand rankings from high to low:</p>
                <p>• Royal Flush, Straight Flush, Four of a Kind, Full House</p>
                <p>• Flush, Straight, Three of a Kind, Two Pair, Pair, High Card</p>
              </div>
            )}
            {gameMode === 'war' && (
              <div className="rules-list">
                <p>• Simple card comparison game</p>
                <p>• Higher card wins the round</p>
                <p>• Aces are high (worth 14)</p>
                <p>• In case of tie, war is declared</p>
                <p>• Winner takes all cards in war</p>
              </div>
            )}
          </div>
        </div>

        <div className="game-stats">
          <h3>Game Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Current Bet</span>
              <span className="stat-value">{betAmount} NXL</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Game Mode</span>
              <span className="stat-value">{gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Player Total</span>
              <span className="stat-value">{playerTotal}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Game State</span>
              <span className="stat-value">{cardGame.gameState || 'waiting'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardGame;
