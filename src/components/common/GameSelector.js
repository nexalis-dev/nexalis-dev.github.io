import React from 'react';
import { useGame } from '../../contexts/GameContext';
import './GameSelector.css';

const GameSelector = () => {
  const { currentGame, setCurrentGame } = useGame();

  const games = [
    {
      id: 'crash',
      name: 'Crash Out',
      description: 'Watch the multiplier rise and cash out before it crashes!',
      icon: '🚀',
      color: '#ff6b6b',
      minBet: '0.01',
      maxBet: '100',
      features: ['Real-time multiplier', 'Auto cash-out', 'Live statistics']
    },
    {
      id: 'roulette',
      name: 'Roulette',
      description: 'Classic casino roulette with multiple betting options',
      icon: '🎰',
      color: '#4ecdc4',
      minBet: '0.01',
      maxBet: '50',
      features: ['Multiple bet types', 'Live wheel', 'Betting history']
    },
    {
      id: 'cards',
      name: 'Card Game',
      description: 'Strategic card battles with skill-based gameplay',
      icon: '🃏',
      color: '#45b7d1',
      minBet: '0.05',
      maxBet: '25',
      features: ['Strategy-based', 'Card collection', 'Tournament mode']
    }
  ];

  const handleGameSelect = (gameId) => {
    setCurrentGame(gameId);
  };

  return (
    <div className="game-selector">
      <div className="selector-header">
        <h2>Choose Your Game</h2>
        <p>Select from our collection of decentralized games</p>
      </div>

      <div className="games-grid">
        {games.map((game) => (
          <div
            key={game.id}
            className={`game-card ${currentGame === game.id ? 'active' : ''}`}
            onClick={() => handleGameSelect(game.id)}
            style={{ '--game-color': game.color }}
          >
            <div className="game-card-header">
              <div className="game-icon">{game.icon}</div>
              <div className="game-status">
                {currentGame === game.id && (
                  <span className="status-badge">Playing</span>
                )}
              </div>
            </div>

            <div className="game-info">
              <h3 className="game-name">{game.name}</h3>
              <p className="game-description">{game.description}</p>
            </div>

            <div className="game-stats">
              <div className="stat-item">
                <span className="stat-label">Min Bet</span>
                <span className="stat-value">{game.minBet} NXL</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Max Bet</span>
                <span className="stat-value">{game.maxBet} NXL</span>
              </div>
            </div>

            <div className="game-features">
              <h4>Features:</h4>
              <ul>
                {game.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="game-card-footer">
              <button 
                className="play-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGameSelect(game.id);
                }}
              >
                {currentGame === game.id ? 'Continue Playing' : 'Play Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="selector-footer">
        <div className="info-cards">
          <div className="info-card">
            <div className="info-icon">🔒</div>
            <h4>Provably Fair</h4>
            <p>All games use cryptographic proof for fairness</p>
          </div>
          <div className="info-card">
            <div className="info-icon">⚡</div>
            <h4>Instant Payouts</h4>
            <p>Winnings are paid out immediately to your wallet</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🌐</div>
            <h4>Decentralized</h4>
            <p>No central authority, powered by blockchain</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSelector;
