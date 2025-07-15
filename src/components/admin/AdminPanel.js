import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { WalletContext } from '../../contexts/WalletContext';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const { wallet, deployToken, getTokenBalance } = useContext(WalletContext);
  
  const [tokenData, setTokenData] = useState({
    name: '',
    symbol: '',
    totalSupply: '',
    decimals: 18,
    description: ''
  });
  
  const [deploymentStatus, setDeploymentStatus] = useState('');
  const [deployedTokens, setDeployedTokens] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState('deploy');
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalGames: 0,
    totalVolume: 0,
    activeUsers: 0
  });

  useEffect(() => {
    if (isAdmin) {
      loadDeployedTokens();
      loadSystemStats();
    }
  }, [isAdmin]);

  const loadDeployedTokens = async () => {
    try {
      // Load deployed tokens from local storage or API
      const tokens = JSON.parse(localStorage.getItem('deployedTokens') || '[]');
      setDeployedTokens(tokens);
    } catch (error) {
      console.error('Error loading deployed tokens:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      // Mock system statistics - in real implementation, this would come from API
      setSystemStats({
        totalUsers: Math.floor(Math.random() * 1000) + 500,
        totalGames: 3,
        totalVolume: Math.floor(Math.random() * 100000) + 50000,
        activeUsers: Math.floor(Math.random() * 100) + 50
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTokenData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTokenDeploy = async (e) => {
    e.preventDefault();
    
    if (!tokenData.name || !tokenData.symbol || !tokenData.totalSupply) {
      setDeploymentStatus('Please fill in all required fields');
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus('Deploying token...');

    try {
      // Simulate token deployment
      const deploymentResult = await deployToken(tokenData);
      
      if (deploymentResult.success) {
        const newToken = {
          ...tokenData,
          address: deploymentResult.address,
          deployedAt: new Date().toISOString(),
          deployer: user.address,
          txHash: deploymentResult.txHash
        };

        // Save to deployed tokens
        const updatedTokens = [...deployedTokens, newToken];
        setDeployedTokens(updatedTokens);
        localStorage.setItem('deployedTokens', JSON.stringify(updatedTokens));

        setDeploymentStatus(`Token deployed successfully! Address: ${deploymentResult.address}`);
        
        // Reset form
        setTokenData({
          name: '',
          symbol: '',
          totalSupply: '',
          decimals: 18,
          description: ''
        });
      } else {
        setDeploymentStatus(`Deployment failed: ${deploymentResult.error}`);
      }
    } catch (error) {
      console.error('Token deployment error:', error);
      setDeploymentStatus(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleTokenAction = async (token, action) => {
    try {
      switch (action) {
        case 'pause':
          // Implement token pause functionality
          console.log('Pausing token:', token.address);
          break;
        case 'unpause':
          // Implement token unpause functionality
          console.log('Unpausing token:', token.address);
          break;
        case 'burn':
          // Implement token burn functionality
          console.log('Burning tokens:', token.address);
          break;
        default:
          console.log('Unknown action:', action);
      }
    } catch (error) {
      console.error('Token action error:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-panel-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have administrator privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-container">
      <div className="admin-header">
        <h1 className="admin-title">Nexalis Admin Panel</h1>
        <div className="admin-user-info">
          <span>Welcome, {user?.username || 'Admin'}</span>
          <div className="admin-badge">ADMIN</div>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'deploy' ? 'active' : ''}`}
          onClick={() => setActiveTab('deploy')}
        >
          Deploy Token
        </button>
        <button 
          className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Tokens
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          System Stats
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'deploy' && (
          <div className="deploy-section">
            <h2>Deploy New Token</h2>
            <form onSubmit={handleTokenDeploy} className="deploy-form">
              <div className="form-group">
                <label htmlFor="name">Token Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={tokenData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Nexalis Token"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="symbol">Token Symbol *</label>
                <input
                  type="text"
                  id="symbol"
                  name="symbol"
                  value={tokenData.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., NXL"
                  maxLength="10"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="totalSupply">Total Supply *</label>
                <input
                  type="number"
                  id="totalSupply"
                  name="totalSupply"
                  value={tokenData.totalSupply}
                  onChange={handleInputChange}
                  placeholder="e.g., 1000000"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="decimals">Decimals</label>
                <input
                  type="number"
                  id="decimals"
                  name="decimals"
                  value={tokenData.decimals}
                  onChange={handleInputChange}
                  min="0"
                  max="18"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={tokenData.description}
                  onChange={handleInputChange}
                  placeholder="Token description..."
                  rows="3"
                />
              </div>

              <button 
                type="submit" 
                className="deploy-button"
                disabled={isDeploying}
              >
                {isDeploying ? 'Deploying...' : 'Deploy Token'}
              </button>
            </form>

            {deploymentStatus && (
              <div className={`deployment-status ${deploymentStatus.includes('successfully') ? 'success' : 'error'}`}>
                {deploymentStatus}
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="manage-section">
            <h2>Manage Deployed Tokens</h2>
            {deployedTokens.length === 0 ? (
              <div className="no-tokens">
                <p>No tokens have been deployed yet.</p>
              </div>
            ) : (
              <div className="tokens-grid">
                {deployedTokens.map((token, index) => (
                  <div key={index} className="token-card">
                    <div className="token-header">
                      <h3>{token.name} ({token.symbol})</h3>
                      <div className="token-status active">Active</div>
                    </div>
                    <div className="token-details">
                      <p><strong>Address:</strong> {token.address}</p>
                      <p><strong>Total Supply:</strong> {token.totalSupply.toLocaleString()}</p>
                      <p><strong>Decimals:</strong> {token.decimals}</p>
                      <p><strong>Deployed:</strong> {new Date(token.deployedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="token-actions">
                      <button 
                        className="action-button pause"
                        onClick={() => handleTokenAction(token, 'pause')}
                      >
                        Pause
                      </button>
                      <button 
                        className="action-button burn"
                        onClick={() => handleTokenAction(token, 'burn')}
                      >
                        Burn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <h2>System Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>Total Users</h3>
                  <div className="stat-value">{systemStats.totalUsers.toLocaleString()}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎮</div>
                <div className="stat-content">
                  <h3>Total Games</h3>
                  <div className="stat-value">{systemStats.totalGames}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <h3>Total Volume</h3>
                  <div className="stat-value">${systemStats.totalVolume.toLocaleString()}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-content">
                  <h3>Active Users</h3>
                  <div className="stat-value">{systemStats.activeUsers}</div>
                </div>
              </div>
            </div>

            <div className="charts-section">
              <h3>Platform Analytics</h3>
              <div className="chart-placeholder">
                <p>📊 Analytics charts would be displayed here</p>
                <p>Integration with analytics service required</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
