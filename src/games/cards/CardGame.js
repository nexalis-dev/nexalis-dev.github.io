import React, { useState, useEffect, useCallback } from 'react';
import './CardGame.css';

const CardGame = () => {
  // Game state
  const [gameState, setGameState] = useState('betting'); // betting, playing, finished
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(1000);
  const [message, setMessage] = useState('Place your bet to start!');
  const [messageType, setMessageType] = useState('info');
  const [gameHistory, setGameHistory] = useState([]);
  const [isDealing, setIsDealing] = useState(false);
  const [canDouble, setCanDouble] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    totalWinnings: 0
  });

  // Create a standard deck of cards
  const createDeck = useCallback(() => {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck = [];

    suits.forEach(suit => {
      values.forEach(value => {
        newDeck.push({
          suit,
          value,
          color: suit === '♥' || suit === '♦' ? 'red' : 'black',
          numericValue: getCardValue(value)
        });
      });
    });

    // Shuffle the deck
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    return newDeck;
  }, []);

  // Get numeric value of a card
  const getCardValue = (value) => {
    if (value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(value)) return 10;
    return parseInt(value);
  };

  // Calculate hand score with Ace handling
  const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;

    hand.forEach(card => {
      if (card.value === 'A') {
        aces++;
        score += 11;
      } else {
        score += card.numericValue;
      }
    });

    // Adjust for Aces
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    return score;
  };

  // Initialize game
  useEffect(() => {
    setDeck(createDeck());
  }, [createDeck]);

  // Update scores when hands change
  useEffect(() => {
    setPlayerScore(calculateScore(playerHand));
    setDealerScore(calculateScore(dealerHand));
  }, [playerHand, dealerHand]);

  // Deal initial cards
  const dealInitialCards = () => {
    if (bet > balance) {
      setMessage('Insufficient balance!');
      setMessageType('lose');
      return;
    }

    setIsDealing(true);
    const newDeck = createDeck();
    const newPlayerHand = [newDeck.pop(), newDeck.pop()];
    const newDealerHand = [newDeck.pop(), newDeck.pop()];

    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setGameState('playing');
    setMessage('Make your move!');
    setMessageType('info');
    setCanDouble(true);

    // Check for blackjack
    setTimeout(() => {
      const playerBJ = calculateScore(newPlayerHand) === 21;
      const dealerBJ = calculateScore(newDealerHand) === 21;

      if (playerBJ && dealerBJ) {
        endGame('push', 'Both have Blackjack! Push!');
      } else if (playerBJ) {
        endGame('blackjack', 'Blackjack! You win!');
      } else if (dealerBJ) {
        endGame('lose', 'Dealer has Blackjack!');
      }
      setIsDealing(false);
    }, 1000);
  };

  // Hit - take another card
  const hit = () => {
    if (deck.length === 0) return;

    const newCard = deck.pop();
    const newPlayerHand = [...playerHand, newCard];
    const newScore = calculateScore(newPlayerHand);

    setPlayerHand(newPlayerHand);
    setDeck([...deck]);
    setCanDouble(false);

    if (newScore > 21) {
      endGame('lose', 'Bust! You lose!');
    } else if (newScore === 21) {
      stand();
    }
  };

  // Stand - end player turn
  const stand = () => {
    setCanDouble(false);
    dealerPlay();
  };

  // Double down
  const doubleDown = () => {
    if (bet * 2 > balance) {
      setMessage('Insufficient balance to double!');
      setMessageType('lose');
      return;
    }

    setBet(bet * 2);
    hit();
    if (calculateScore([...playerHand, deck[deck.length - 1]]) <= 21) {
      setTimeout(() => stand(), 500);
    }
  };

  // Dealer plays automatically
  const dealerPlay = () => {
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];
    let dealerCurrentScore = calculateScore(currentDealerHand);

    const dealerHitInterval = setInterval(() => {
      if (dealerCurrentScore < 17) {
        const newCard = currentDeck.pop();
        currentDealerHand.push(newCard);
        dealerCurrentScore = calculateScore(currentDealerHand);
        
        setDealerHand([...currentDealerHand]);
        setDeck([...currentDeck]);
      } else {
        clearInterval(dealerHitInterval);
        
        // Determine winner
        const playerFinalScore = calculateScore(playerHand);
        
        if (dealerCurrentScore > 21) {
          endGame('win', 'Dealer busts! You win!');
        } else if (dealerCurrentScore > playerFinalScore) {
          endGame('lose', 'Dealer wins!');
        } else if (playerFinalScore > dealerCurrentScore) {
          endGame('win', 'You win!');
        } else {
          endGame('push', 'Push! It\'s a tie!');
        }
      }
    }, 1000);
  };

  // End game and update stats
  const endGame = (result, msg) => {
    setGameState('finished');
    setMessage(msg);
    setMessageType(result === 'win' || result === 'blackjack' ? 'win' : result === 'lose' ? 'lose' : 'push');

    let winnings = 0;
    if (result === 'win') {
      winnings = bet;
      setBalance(balance + bet);
    } else if (result === 'blackjack') {
      winnings = Math.floor(bet * 1.5);
      setBalance(balance + winnings);
    } else if (result === 'lose') {
      winnings = -bet;
      setBalance(balance - bet);
    }

    // Update stats
    setStats(prev => ({
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + (result === 'win' || result === 'blackjack' ? 1 : 0),
      totalWinnings: prev.totalWinnings + winnings
    }));

    // Add to history
    setGameHistory(prev => [{
      id: Date.now(),
      result,
      bet,
      winnings,
      playerScore: calculateScore(playerHand),
      dealerScore: calculateScore(dealerHand),
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 9)]);
  };

  // Start new game
  const newGame = () => {
    setGameState('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setMessage('Place your bet to start!');
    setMessageType('info');
    setCanDouble(false);
    setIsDealing(false);
  };

  // Betting functions
  const placeBet = (amount) => {
    setBet(Math.min(amount, balance));
  };

  const adjustBet = (amount) => {
    setBet(Math.max(1, Math.min(bet + amount, balance)));
  };

  return (
    <div className="card-game">
      <div className="card-game-header">
        <h1 className="card-game-title">Blackjack</h1>
        
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
            <div className="stat-label">Total Winnings</div>
            <div className="stat-value">${stats.totalWinnings}</div>
          </div>
        </div>
      </div>

      {gameState === 'betting' && (
        <div className="betting-area">
          <div className="betting-label">Place Your Bet</div>
          <div className="bet-controls">
            <button className="game-button" onClick={() => adjustBet(-10)}>-$10</button>
            <input
              type="number"
              className="bet-input"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Math.min(parseInt(e.target.value) || 1, balance)))}
              min="1"
              max={balance}
            />
            <button className="game-button" onClick={() => adjustBet(10)}>+$10</button>
          </div>
          <div className="bet-chips">
            <div className="chip chip-1" onClick={() => placeBet(1)}>$1</div>
            <div className="chip chip-5" onClick={() => placeBet(5)}>$5</div>
            <div className="chip chip-10" onClick={() => placeBet(10)}>$10</div>
            <div className="chip chip-25" onClick={() => placeBet(25)}>$25</div>
            <div className="chip chip-100" onClick={() => placeBet(100)}>$100</div>
          </div>
          <button className="game-button new-game-button" onClick={dealInitialCards}>
            Deal Cards
          </button>
        </div>
      )}

      <div className="game-area">
        {(gameState === 'playing' || gameState === 'finished') && (
          <>
            <div className="dealer-area">
              <div className="dealer-label">Dealer</div>
              <div className="card-hand">
                {dealerHand.map((card, index) => (
                  <div
                    key={index}
                    className={`playing-card card-animation ${
                      gameState === 'playing' && index === 1 ? 'hidden' : ''
                    }`}
                  >
                    {gameState === 'finished' || index === 0 ? (
                      <>
                        <div className={`card-value ${card.color}`}>{card.value}</div>
                        <div className={`card-suit ${card.color}`}>{card.suit}</div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              {gameState === 'finished' && (
                <div className="hand-value">Score: {dealerScore}</div>
              )}
            </div>

            <div className="player-area">
              <div className="player-label">Your Hand</div>
              <div className="card-hand">
                {playerHand.map((card, index) => (
                  <div key={index} className="playing-card card-animation">
                    <div className={`card-value ${card.color}`}>{card.value}</div>
                    <div className={`card-suit ${card.color}`}>{card.suit}</div>
                  </div>
                ))}
              </div>
              <div className="hand-value">Score: {playerScore}</div>
            </div>
          </>
        )}

        <div className={`game-message message-${messageType}`}>
          {isDealing ? <div className="loading-spinner"></div> : message}
        </div>

        {gameState === 'playing' && (
          <div className="game-controls">
            <button className="game-button hit-button" onClick={hit}>
              Hit
            </button>
            <button className="game-button stand-button" onClick={stand}>
              Stand
            </button>
            {canDouble && (
              <button
                className="game-button double-button"
                onClick={doubleDown}
                disabled={bet * 2 > balance}
              >
                Double
              </button>
            )}
          </div>
        )}

        {gameState === 'finished' && (
          <div className="game-controls">
            <button className="game-button new-game-button" onClick={newGame}>
              New Game
            </button>
          </div>
        )}
      </div>

      {gameHistory.length > 0 && (
        <div className="game-history">
          <div className="history-title">Recent Games</div>
          <div className="history-list">
            {gameHistory.map((game) => (
              <div key={game.id} className="history-item">
                <span>{game.timestamp}</span>
                <span>Bet: ${game.bet}</span>
                <span className={`history-result ${game.result === 'blackjack' ? 'win' : game.result}`}>
                  {game.result === 'win' || game.result === 'blackjack' ? `+$${game.winnings}` :
                   game.result === 'lose' ? `-$${Math.abs(game.winnings)}` : 'Push'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardGame;
