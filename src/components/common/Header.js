import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const { wallet, nxlBalance, avaxBalance } = useWallet();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="nexalis-header">
      <div className="header-container">
        <div className="header-left">
          <div className="logo">
            <h1>NEXALIS</h1>
            <span className="tagline">Decentralized Game Hub</span>
          </div>
        </div>

        <div className="header-center">
          <nav className="main-nav">
            <a href="#games" className="nav-link">Games</a>
            <a href="#leaderboard" className="nav-link">Leaderboard</a>
            <a href="#tournaments" className="nav-link">Tournaments</a>
            <a href="#rewards" className="nav-link">Rewards</a>
          </nav>
        </div>

        <div className="header-right">
          {user && wallet && (
            <div className="user-info">
              <div className="wallet-info">
                <div className="balance-item">
                  <span className="balance-label">NXL:</span>
                  <span className="balance-value">{nxlBalance}</span>
                </div>
                <div className="balance-item">
                  <span className="balance-label">AVAX:</span>
                  <span className="balance-value">{avaxBalance}</span>
                </div>
              </div>
              
              <div className="user-profile">
                <div className="user-avatar">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-details">
                  <span className="username">{user.username}</span>
                  <span className="wallet-address">
                    {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                  </span>
                </div>
              </div>

              <button 
                className="logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
