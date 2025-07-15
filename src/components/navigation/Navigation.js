import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { WalletContext } from '../../contexts/WalletContext';
import './Navigation.css';

const Navigation = ({ currentPage, onPageChange }) => {
  const { user, isAdmin, logout } = useContext(AuthContext);
  const { wallet, balance } = useContext(WalletContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', adminOnly: false },
    { id: 'games', label: 'Games', icon: '🎮', adminOnly: false },
    { id: 'wallet', label: 'Wallet', icon: '💰', adminOnly: false },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', adminOnly: false },
    { id: 'admin', label: 'Admin Panel', icon: '⚙️', adminOnly: true }
  ];

  const gameItems = [
    { id: 'card-game', label: 'Card Game', icon: '🃏' },
    { id: 'roulette', label: 'Roulette', icon: '🎰' },
    { id: 'crash-out', label: 'Crash Out', icon: '🚀' }
  ];

  const handleNavigation = (pageId) => {
    onPageChange(pageId);
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const formatBalance = (balance) => {
    if (!balance) return '0.0000';
    return parseFloat(balance).toFixed(4);
  };

  return (
    <nav className="nexalis-navigation">
      <div className="nav-container">
        {/* Logo and Brand */}
        <div className="nav-brand">
          <div className="brand-logo">
            <span className="logo-icon">⚡</span>
            <span className="brand-text">Nexalis</span>
          </div>
          <div className="brand-tagline">Gaming Hub</div>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-menu desktop-menu">
          {navigationItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            
            return (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Games Dropdown */}
          <div className="nav-dropdown">
            <button className={`nav-item dropdown-trigger ${currentPage?.startsWith('game-') ? 'active' : ''}`}>
              <span className="nav-icon">🎯</span>
              <span className="nav-label">Quick Play</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            <div className="dropdown-menu">
              {gameItems.map(game => (
                <button
                  key={game.id}
                  className="dropdown-item"
                  onClick={() => handleNavigation(game.id)}
                >
                  <span className="dropdown-icon">{game.icon}</span>
                  <span className="dropdown-label">{game.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="nav-user-section">
          {/* Wallet Balance */}
          <div className="nav-balance">
            <span className="balance-icon">💎</span>
            <span className="balance-amount">{formatBalance(balance)}</span>
            <span className="balance-currency">AVAX</span>
          </div>

          {/* User Menu */}
          <div className="nav-user-menu">
            <button className="user-menu-trigger" onClick={toggleUserMenu}>
              <div className="user-avatar">
                <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
              <div className="user-info">
                <span className="username">{user?.username || 'Player'}</span>
                {isAdmin && <span className="admin-badge">ADMIN</span>}
              </div>
              <span className="menu-arrow">▼</span>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="user-avatar-large">
                    <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                  </div>
                  <div className="user-details">
                    <h4>{user?.username || 'Player'}</h4>
                    <p>{user?.email || 'player@nexalis.com'}</p>
                    {wallet?.address && (
                      <p className="wallet-address">
                        {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="user-dropdown-menu">
                  <button 
                    className="dropdown-menu-item"
                    onClick={() => handleNavigation('profile')}
                  >
                    <span className="menu-item-icon">👤</span>
                    <span>Profile Settings</span>
                  </button>
                  <button 
                    className="dropdown-menu-item"
                    onClick={() => handleNavigation('wallet')}
                  >
                    <span className="menu-item-icon">💰</span>
                    <span>Wallet</span>
                  </button>
                  <button 
                    className="dropdown-menu-item"
                    onClick={() => handleNavigation('achievements')}
                  >
                    <span className="menu-item-icon">🏆</span>
                    <span>Achievements</span>
                  </button>
                  <button 
                    className="dropdown-menu-item"
                    onClick={() => handleNavigation('settings')}
                  >
                    <span className="menu-item-icon">⚙️</span>
                    <span>Settings</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-menu-item logout"
                    onClick={handleLogout}
                  >
                    <span className="menu-item-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
          >
            <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-nav-header">
          <div className="mobile-user-info">
            <div className="user-avatar">
              <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div className="user-details">
              <h4>{user?.username || 'Player'}</h4>
              <div className="mobile-balance">
                <span>{formatBalance(balance)} AVAX</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mobile-nav-menu">
          {navigationItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            
            return (
              <button
                key={item.id}
                className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}

          <div className="mobile-games-section">
            <h5>Quick Play</h5>
            {gameItems.map(game => (
              <button
                key={game.id}
                className="mobile-game-item"
                onClick={() => handleNavigation(game.id)}
              >
                <span className="game-icon">{game.icon}</span>
                <span className="game-label">{game.label}</span>
              </button>
            ))}
          </div>

          <div className="mobile-nav-footer">
            <button 
              className="mobile-nav-item"
              onClick={() => handleNavigation('settings')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </button>
            <button 
              className="mobile-nav-item logout"
              onClick={handleLogout}
            >
              <span className="nav-icon">🚪</span>
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-nav-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Overlay for user menu */}
      {showUserMenu && (
        <div 
          className="user-menu-overlay"
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </nav>
  );
};

export default Navigation;
