import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { useRequests } from '../hooks/useRequests';

const MyRequests = () => {
  const { isConnected, account } = useWeb3();
  const { userRequests, getUserRequests, cancelRequest, isLoading } = useRequests();
  
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, PAID, CANCELLED, EXPIRED
  const [filteredRequests, setFilteredRequests] = useState([]);

  // Load user requests on mount and when account changes
  useEffect(() => {
    if (isConnected && account) {
      getUserRequests();
    }
  }, [isConnected, account, getUserRequests]);

  // Filter requests when filter changes
  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredRequests(userRequests);
    } else {
      setFilteredRequests(userRequests.filter(req => req.status === filter));
    }
  }, [userRequests, filter]);

  const handleCancelRequest = async (requestId) => {
    try {
      await cancelRequest(requestId);
      toast.success('Request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error(error.message || 'Failed to cancel request');
    }
  };

  const copyRequestLink = (requestId) => {
    const link = `${window.location.origin}/request/${requestId}`;
    navigator.clipboard.writeText(link);
    toast.success('Request link copied to clipboard!');
  };

  const shareRequest = (request) => {
    const shareUrl = `${window.location.origin}/request/${request.id}`;
    const text = `Payment request for ${request.formattedAmount} ${request.assetSymbol}${request.message ? ` - ${request.message}` : ''}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Payment Request',
        text: text,
        url: shareUrl,
      });
    } else {
      copyRequestLink(request.id);
    }
  };

  const formatTimeRemaining = (expiry) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiry - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'PAID': return 'status-paid';
      case 'CANCELLED': return 'status-cancelled';
      case 'EXPIRED': return 'status-expired';
      default: return 'status-pending';
    }
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

  const getRequestStats = () => {
    const stats = {
      total: userRequests.length,
      pending: userRequests.filter(r => r.status === 'PENDING' && !r.isExpired).length,
      paid: userRequests.filter(r => r.status === 'PAID').length,
      expired: userRequests.filter(r => r.isExpired || r.status === 'EXPIRED').length,
      cancelled: userRequests.filter(r => r.status === 'CANCELLED').length,
      totalValue: userRequests
        .filter(r => r.status === 'PAID')
        .reduce((sum, r) => sum + parseFloat(r.formattedAmount || 0), 0)
    };
    return stats;
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to view and manage your payment requests
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

  const stats = getRequestStats();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          📝 My Payment Requests
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Manage and track all your payment requests
        </p>
        
        <div className="flex justify-center">
          <Link to="/create" className="btn-primary">
            ➕ Create New Request
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          <div className="text-sm text-gray-600">Paid</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
          <div className="text-sm text-gray-600">Expired</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-600">{stats.totalValue.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Received</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status} {status !== 'ALL' && `(${userRequests.filter(r => r.status === status).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your requests...</p>
        </div>
      )}

      {/* No Requests */}
      {!isLoading && filteredRequests.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'ALL' ? 'No Requests Yet' : `No ${filter.toLowerCase()} requests`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'ALL' 
              ? "Create your first payment request to get started!"
              : `You don't have any ${filter.toLowerCase()} requests.`
            }
          </p>
          {filter === 'ALL' && (
            <Link to="/create" className="btn-primary">
              Create Your First Request
            </Link>
          )}
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <div key={request.id} className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              {/* Request Info */}
              <div className="flex-1">
                <div className="flex items-start space-x-4">
                  {/* Asset Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">{getAssetIcon(request.assetSymbol)}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.formattedAmount} {request.assetSymbol}
                      </h3>
                      <span className={`${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        #{request.id}
                      </span>
                    </div>

                    {request.message && (
                      <p className="text-gray-600 mb-2 truncate">
                        "{request.message}"
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        Expires: {request.isExpired ? 'Expired' : formatTimeRemaining(request.expiry)}
                      </span>
                      <span>Slippage: ±{request.slippageBp / 100}%</span>
                      {request.status === 'PAID' && request.paidTimestamp && (
                        <span>
                          Paid: {new Date(request.paidTimestamp * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 mt-4 md:mt-0">
                <Link
                  to={`/request/${request.id}`}
                  className="btn-secondary"
                >
                  View
                </Link>

                {request.status === 'PENDING' && !request.isExpired && (
                  <>
                    <button
                      onClick={() => shareRequest(request)}
                      className="btn-secondary"
                      title="Share request"
                    >
                      📤
                    </button>
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="btn-secondary text-red-600 hover:bg-red-50"
                      title="Cancel request"
                    >
                      ❌
                    </button>
                  </>
                )}

                {request.status === 'PAID' && request.paidTxHash && (
                  <a
                    href={`https://testnet.xrpl.org/transactions/${request.paidTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-blue-600"
                    title="View XRPL transaction"
                  >
                    🔗
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tips Section */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          💡 Tips for Better Results
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Add clear messages to your requests to increase payment likelihood</li>
          <li>• Set reasonable expiry times - too short may not give enough time to pay</li>
          <li>• Share request links directly with the intended payer</li>
          <li>• Monitor your requests and cancel if no longer needed</li>
          <li>• Keep slippage reasonable (1-2%) to account for price movements</li>
        </ul>
      </div>
    </div>
  );
};

export default MyRequests;