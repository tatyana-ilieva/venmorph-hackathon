import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useRequests } from '../hooks/useRequests';

const Home = () => {
  const { isConnected, account } = useWeb3();
  const { getRecentRequests, exchangeRates } = useRequests();
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalValue: 0,
    activeRequests: 0
  });

  useEffect(() => {
    // Load recent requests for stats
    const loadStats = async () => {
      try {
        const requests = await getRecentRequests(50);
        const activeRequests = requests.filter(r => r.status === 'PENDING');
        
        setStats({
          totalRequests: requests.length,
          activeRequests: activeRequests.length,
          totalValue: requests.reduce((sum, req) => sum + parseFloat(req.formattedAmount || 0), 0)
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
  }, [getRecentRequests]);

  const features = [
    {
      icon: '💸',
      title: 'Easy Requests',
      description: 'Create payment requests in any supported asset with just a few clicks'
    },
    {
      icon: '⚡',
      title: 'Real-time Conversion',
      description: 'Live price feeds from Flare oracles show exact XRP equivalent'
    },
    {
      icon: '🔗',
      title: 'XRPL Settlement',
      description: 'Fast, cheap settlement on XRPL with sub-second confirmation'
    },
    {
      icon: '🛡️',
      title: 'On-chain Proof',
      description: 'Cryptographic attestation of payments via Flare Data Connector'
    }
  ];

  const quickActions = [
    {
      title: 'Create Request',
      description: 'Ask someone to pay you in any asset',
      href: '/create',
      icon: '➕',
      color: 'primary'
    },
    {
      title: 'Browse Public',
      description: 'See requests from the community',
      href: '/public',
      icon: '🌟',
      color: 'flare'
    },
    {
      title: 'My Requests',
      description: 'View and manage your requests',
      href: '/my-requests',
      icon: '📝',
      color: 'xrp'
    }
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Venmorph</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-4">
            The Venmo of Web3
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Send payment requests in any asset, let payers settle with XRP, 
            and get cryptographic proof on Flare
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isConnected ? (
              <>
                <Link to="/create" className="btn-primary">
                  Create Your First Request
                </Link>
                <Link to="/public" className="btn-secondary">
                  Explore Public Requests
                </Link>
              </>
            ) : (
              <div className="glass card p-6">
                <p className="text-gray-600 mb-4">Connect your wallet to get started</p>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="btn-primary"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {isConnected && (
        <section className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {stats.totalRequests}
              </div>
              <div className="text-gray-600">Total Requests</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-flare-600 mb-2">
                {stats.activeRequests}
              </div>
              <div className="text-gray-600">Active Requests</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-xrp-600 mb-2">
                {stats.totalValue.toFixed(2)}
              </div>
              <div className="text-gray-600">Total Value (ETH)</div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to get started with Venmorph
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className={`card hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                isConnected ? '' : 'opacity-50 pointer-events-none'
              }`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 bg-${action.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-2xl">{action.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {action.title}
                </h3>
                <p className="text-gray-600">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {!isConnected && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Connect your wallet to access these features
            </p>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white/50 rounded-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Venmorph combines the best of Flare's oracle infrastructure 
            with XRPL's lightning-fast settlement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-flare-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">{feature.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Built on Best-in-Class Infrastructure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-flare-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">F</span>
              </div>
              <h3 className="text-xl font-semibold">Flare Network</h3>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li>• FTSO oracles for real-time price feeds</li>
              <li>• FDC attestations for cross-chain verification</li>
              <li>• EVM-compatible smart contracts</li>
            </ul>
          </div>

          <div className="card">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-xrp-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">X</span>
              </div>
              <h3 className="text-xl font-semibold">XRP Ledger</h3>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li>• Sub-second settlement times</li>
              <li>• Ultra-low transaction fees</li>
              <li>• Built-in destination tags for routing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Exchange Rates Preview */}
      {Object.keys(exchangeRates).length > 0 && (
        <section className="py-12">
          <div className="card max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-center mb-6">
              Current Exchange Rates (via Flare FTSO)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(exchangeRates).map(([symbol, data]) => (
                <div key={symbol} className="text-center">
                  <div className="text-sm text-gray-500">{symbol}/XRP</div>
                  <div className="font-semibold">
                    {data.rate ? data.rate.toFixed(4) : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <span className="text-xs text-gray-400">
                Updates every 30 seconds
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;