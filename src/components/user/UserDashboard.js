import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { WalletContext } from '../../contexts/WalletContext';
import { GameContext } from '../../contexts/GameContext';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { wallet, balance, getTokenBalance, transactions } = useContext(WalletContext);
  const { gameStats, recentGames, achievements } = useContext(GameContext);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [userStats, setUserStats] = useState({
    totalGamesPlayed: 0,
    totalWinnings: 0,
    winRate: 0,
    favoriteGame: 'None',
    level: 1,
    experience: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadUserStats();
    loadRecentActivity();
    loadNotifications();
  }, [user]);

  const loadUserStats = async () => {
    try {
      // Calculate user statistics from game data
      const totalGames = recentGames?.length || 0;
      const wins = recentGames?.filter(game => game.result === 'win').length || 0;
      const totalWinnings = recentGames?.reduce((sum, game) => sum + (game.winnings || 0), 0) || 0;
      
      setUserStats({
        totalGamesPlayed: totalGames,
        totalWinnings: totalWinnings,
        winRate: totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0,
        favoriteGame: getMostPlayedGame(),
        level: calculateUserLevel(totalGames),
        experience: calculateExperience(totalGames, wins)
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Combine game results and transactions for activity feed
      const gameActivity = recentGames?.slice(0, 5).map(game => ({
        type: 'game',
        title: `Played ${game.gameType}`,
        description: `${game.result === 'win' ? 'Won' : 'Lost'} ${game.amount} tokens`,
        timestamp: game.timestamp,
        icon: getGameIcon(game.gameType),
        status: game.result
      })) || [];

      const transactionActivity = transactions?.slice(0, 3).map(tx => ({
        type: 'transaction',
        title: tx.type === 'deposit' ? 'Deposit' : 'Withdrawal',
        description: `${tx.amount} ${tx.token}`,
        timestamp: tx.timestamp,
        icon: tx.type === 'deposit' ? '💰' : '📤',
        status: tx.status
      })) || [];

      const combined = [...gameActivity, ...transactionActivity]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 8);

      setRecentActivity(combined);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      // Mock notifications - in real implementation, these would come from API
      const mockNotifications = [
        {
          id: 1,
          type: 'achievement',
          title: 'New Achievement Unlocked!',
          message: 'You\'ve played 10 games. Keep it up!',
          timestamp: new Date().toISOString(),
          read: false
        },
        {
          id: 2,
          type: 'bonus',
          title: 'Daily Bonus Available',
          message: 'Claim your daily bonus of 100 tokens',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false
        },
        {
          id: 3,
          type: 'update',
          title: 'New Game Added',
          message: 'Check out the new Crash Out game!',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          read: true
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const getMostPlayedGame = () => {
    if (!recentGames || recentGames.length === 0) return 'None';
    
    const gameCount = recentGames.reduce((acc, game) => {
      acc[game.gameType] = (acc[game.gameType] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(gameCount).reduce((a, b) => gameCount[a] > gameCount[b] ? a : b);
  };

  const calculateUserLevel = (totalGames) => {
    return Math.floor(totalGames / 10) + 1;
  };

  const calculateExperience = (totalGames, wins) => {
    return (totalGames * 10) + (wins * 25);
  };

  const getGameIcon = (gameType) => {
    const icons = {
      'Card Game': '🃏',
      'Roulette': '🎰',
      'Crash Out': '🚀'
    };
    return icons[gameType] || '🎮';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleClaimBonus = async () => {
    try {
      // Implement daily bonus claim logic
      console.log('Claiming daily bonus...');
      // Update notifications to mark bonus as claimed
      setNotifications(prev => 
        prev.map(notif => 
          notif.type === 'bonus' ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error claiming bonus:', error);
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  return (
    <div className="user-dashboard-container">
      <div className="dashboard-header">
        <div className="user-welcome">
          <div className="user-avatar">
            <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div className="user-info">
            <h1>Welcome back, {user?.username || 'Player'}!</h1>
            <div className="user-level">
              <span className="level-badge">Level {userStats.level}</span>
              <div className="xp-bar">
                <div 
                  className="xp-fill" 
                  style={{ width: `${(userStats.experience % 100)}%` }}
                ></div>
              </div>
              <span className="xp-text">{userStats.experience} XP</span>
            </div>
          </div>
        </div>
        
        <div className="quick-stats">
          <div className="stat-item">
            <div className="stat-icon">🎮</div>
            <div className="stat-content">
              <span className="stat-value">{userStats.totalGamesPlayed}</span>
              <span className="stat-label">Games Played</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <span className="stat-value">{userStats.totalWinnings.toFixed(2)}</span>
              <span className="stat-label">Total Winnings</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <span className="stat-value">{userStats.winRate}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
        >
          Wallet
        </button>
        <button 
          className={`tab-button ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </button>
        <button 
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="overview-grid">
              <div className="balance-card">
                <h3>Wallet Balance</h3>
                <div className="balance-amount">
                  <span className="amount">{balance?.toFixed(4) || '0.0000'}</span>
                  <span className="currency">AVAX</span>
                </div>
                <div className="wallet-address">
                  <span>Address: {wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Not connected'}</span>
                </div>
              </div>

              <div className="favorite-game-card">
                <h3>Favorite Game</h3>
                <div className="game-info">
                  <div className="game-icon">{getGameIcon(userStats.favoriteGame)}</div>
                  <div className="game-name">{userStats.favoriteGame}</div>
                </div>
                <button className="play-button">Play Now</button>
              </div>

              <div className="notifications-card">
                <h3>Notifications</h3>
                <div className="notifications-list">
                  {notifications.slice(0, 3).map(notification => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="notification-content">
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      {notification.type === 'bonus' && !notification.read && (
                        <button 
                          className="claim-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaimBonus();
                          }}
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="recent-activity-overview">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">{activity.icon}</div>
                    <div className="activity-content">
                      <h4>{activity.title}</h4>
                      <p>{activity.description}</p>
                      <span className="activity-time">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <div className={`activity-status ${activity.status}`}>
                      {activity.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="wallet-section">
            <div className="wallet-overview">
              <div className="wallet-balance">
                <h3>Current Balance</h3>
                <div className="balance-display">
                  <span className="balance-amount">{balance?.toFixed(6) || '0.000000'}</span>
                  <span className="balance-currency">AVAX</span>
                </div>
              </div>
              
              <div className="wallet-actions">
                <button className="wallet-action-btn deposit">
                  <span className="btn-icon">💰</span>
                  Deposit
                </button>
                <button className="wallet-action-btn withdraw">
                  <span className="btn-icon">📤</span>
                  Withdraw
                </button>
                <button className="wallet-action-btn swap">
                  <span className="btn-icon">🔄</span>
                  Swap
                </button>
              </div>
            </div>

            <div className="transaction-history">
              <h3>Transaction History</h3>
              <div className="transactions-list">
                {transactions?.length > 0 ? (
                  transactions.map((tx, index) => (
                    <div key={index} className="transaction-item">
                      <div className="tx-icon">
                        {tx.type === 'deposit' ? '💰' : tx.type === 'withdrawal' ? '📤' : '🔄'}
                      </div>
                      <div className="tx-content">
                        <h4>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</h4>
                        <p>{tx.amount} {tx.token}</p>
                        <span className="tx-time">
                          {formatTimestamp(tx.timestamp)}
                        </span>
                      </div>
                      <div className={`tx-status ${tx.status}`}>
                        {tx.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-transactions">
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-section">
            <h3>Your Achievements</h3>
            <div className="achievements-grid">
              {achievements?.length > 0 ? (
                achievements.map((achievement, index) => (
                  <div key={index} className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
                    <div className="achievement-icon">{achievement.icon}</div>
                    <div className="achievement-content">
                      <h4>{achievement.title}</h4>
                      <p>{achievement.description}</p>
                      {achievement.unlocked && (
                        <span className="unlock-date">
                          Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-achievements">
                  <p>Start playing games to unlock achievements!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-section">
            <h3>Activity History</h3>
            <div className="activity-history">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="activity-history-item">
                    <div className="activity-icon">{activity.icon}</div>
                    <div className="activity-content">
                      <h4>{activity.title}</h4>
                      <p>{activity.description}</p>
                      <span className="activity-time">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <div className={`activity-status ${activity.status}`}>
                      {activity.status}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-activity">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
