import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRequests } from '../hooks/useRequests';
import { useWeb3 } from '../contexts/Web3Context';

const PublicRequests = () => {
  const { isConnected } = useWeb3();
  const { getRecentRequests, exchangeRates, isLoading } = useRequests();
  
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filters, setFilters] = useState({
    asset: 'ALL',
    amountRange: 'ALL',
    sortBy: 'newest'
  });

  // Load public requests
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const publicRequests = await getRecentRequests(50);
        // Only show pending requests that aren't expired
        const activeRequests = publicRequests.filter(
          req => req.status === 'PENDING' && !req.isExpired
        );
        setRequests(activeRequests);
        setFilteredRequests(activeRequests);
      } catch (error) {
        console.error('Error loading public requests:', error);
      }
    };

    loadRequests();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [getRecentRequests]);

  // Apply filters when they change
  useEffect(() => {
    let filtered = [...requests];

    // Filter by asset
    if (filters.asset !== 'ALL') {
      filtered = filtered.filter(req => req.assetSymbol === filters.asset);
    }

    // Filter by amount range
    if (filters.amountRange !== 'ALL') {
      const amount = parseFloat(req.formattedAmount);
      switch (filters.amountRange) {
        case 'SMALL':
          filtered = filtered.filter(req => parseFloat(req.formattedAmount) <= 1);
          break;
        case 'MEDIUM':
          filtered = filtered.filter(req => {
            const amt = parseFloat(req.formattedAmount);
            return amt > 1 && amt <= 10;
          });
          break;
        case 'LARGE':
          filtered = filtered.filter(req => parseFloat(req.formattedAmount) > 10);
          break;
      }
    }

    // Sort requests
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.expiry - a.expiry);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.expiry - b.expiry);
        break;
      case 'amount_high':
        filtered.sort((a, b) => parseFloat(b.formattedAmount) - parseFloat(a.formattedAmount));
        break;
      case 'amount_low':
        filtered.sort((a, b) => parseFloat(a.formattedAmount) - parseFloat(b.formattedAmount));
        break;
      case 'expiring':
        filtered.sort((a, b) => a.expiry - b.expiry);
        break;
    }

    setFilteredRequests(filtered);
  }, [requests, filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const formatTimeRemaining = (expiry) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiry - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getAssetIcon = (symbol) => {
    const icons = {
      'ETH': '⚡',
      'XRP': '💎',
      'BTC': '₿',
      'USDT': '💵',
      'USDC': '💰'
    };
    return icons[symbol] || '💱';
  };

  const getUrgencyColor = (expiry) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiry - now;
    const hours = remaining / 3600;
    
    if (hours <= 1) return 'text-red-600 bg-red-50';
    if (hours <= 6) return 'text-orange-600 bg-orange-50';
    if (hours <= 24) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const uniqueAssets = [...new Set(requests.map(req => req.assetSymbol))];

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to view and interact with public payment requests
          </p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🌟 Public Payment Requests
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Discover and fulfill payment requests from the community
        </p>
        
        <div className="flex justify-center">
          <Link to="/create" className="btn-primary">
            ➕ Create Your Own Request
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Asset:</label>
            <select
              value={filters.asset}
              onChange={(e) => handleFilterChange('asset', e.target.value)}
              className="input-field py-2 text-sm w-auto"
            >
              <option value="ALL">All Assets</option>
              {uniqueAssets.map(asset => (
                <option key={asset} value={asset}>
                  {getAssetIcon(asset)} {asset}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Amount:</label>
            <select
              value={filters.amountRange}
              onChange={(e) => handleFilterChange('amountRange', e.target.value)}
              className="input-field py-2 text-sm w-auto"
            >
              <option value="ALL">All Amounts</option>
              <option value="SMALL">≤ 1</option>
              <option value="MEDIUM">1 - 10</option>
              <option value="LARGE">> 10</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="input-field py-2 text-sm w-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Highest Amount</option>
              <option value="amount_low">Lowest Amount</option>
              <option value="expiring">Expiring Soon</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-500">
            {filteredRequests.length} of {requests.length} requests
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading public requests...</p>
        </div>
      )}

      {/* No Requests */}
      {!isLoading && filteredRequests.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🌟</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Public Requests Found
          </h3>
          <p className="text-gray-600 mb-6">
            {requests.length === 0 
              ? "Be the first to create a public payment request!"
              : "Try adjusting your filters to see more requests."
            }
          </p>
          <Link to="/create" className="btn-primary">
            Create the First Request
          </Link>
        </div>
      )}

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.map((request) => (
          <div key={request.id} className="card hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            {/* Request Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getAssetIcon(request.assetSymbol)}</span>
                <div>
                  <div className="font-semibold text-lg">
                    {request.formattedAmount} {request.assetSymbol}
                  </div>
                  {exchangeRates[request.assetSymbol] && (
                    <div className="text-sm text-gray-500">
                      ≈ ${(parseFloat(request.formattedAmount) * exchangeRates[request.assetSymbol].rate * 0.5).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${getUrgencyColor(request.expiry)}`}>
                {formatTimeRemaining(request.expiry)}
              </div>
            </div>

            {/* Message */}
            {request.message && (
              <div className="mb-4">
                <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
                  "{request.message}"
                </p>
              </div>
            )}

            {/* Request Details */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Request ID:</span>
                <span className="font-mono">#{request.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">From:</span>
                <span className="font-mono">
                  {request.creator.slice(0, 6)}...{request.creator.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Slippage:</span>
                <span>±{request.slippageBp / 100}%</span>
              </div>
            </div>

            {/* Action Button */}
            <Link
              to={`/request/${request.id}`}
              className="btn-primary w-full text-center"
            >
              💰 View & Pay
            </Link>

            {/* Quick Pay Info */}
            <div className="mt-3 text-xs text-gray-500 text-center">
              Pay with XRP on XRPL • Instant settlement
            </div>
          </div>
        ))}
      </div>

      {/* Live Updates Indicator */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-700 font-medium">
            Live updates • Refreshing every 30 seconds
          </span>
        </div>
      </div>

      {/* Info Section */}
      <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">
            How Public Requests Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-purple-600 text-2xl mb-2">👀</div>
              <div className="font-medium text-purple-800">Discover</div>
              <div className="text-purple-600">Browse active payment requests</div>
            </div>
            <div className="text-center">
              <div className="text-purple-600 text-2xl mb-2">💸</div>
              <div className="font-medium text-purple-800">Pay</div>
              <div className="text-purple-600">Send XRP with the request ID</div>
            </div>
            <div className="text-center">
              <div className="text-purple-600 text-2xl mb-2">✅</div>
              <div className="font-medium text-purple-800">Verify</div>
              <div className="text-purple-600">Automatic on-chain confirmation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicRequests;