import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { useRequests } from '../hooks/useRequests';
import { useXRPL } from '../hooks/useXRPL';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, isConnected } = useWeb3();
  const { getRequest, cancelRequest, calculateXRPAmount } = useRequests();
  const { createPaymentURL, getTransaction } = useXRPL();

  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [xrpAmount, setXrpAmount] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Load request details
  useEffect(() => {
    const loadRequest = async () => {
      if (!id) {
        setError('Invalid request ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const requestData = await getRequest(id);
        setRequest(requestData);

        // Calculate current XRP amount
        if (requestData.assetSymbol && requestData.formattedAmount) {
          const xrpEquivalent = await calculateXRPAmount(
            requestData.assetSymbol, 
            requestData.formattedAmount
          );
          setXrpAmount(xrpEquivalent);

          // Generate payment URL
          const url = createPaymentURL({
            toAddress: requestData.recipientXRPL,
            amountXRP: xrpEquivalent,
            destinationTag: parseInt(id),
            memo: `Venmorph Request #${id}`
          });
          setPaymentUrl(url);
        }

      } catch (err) {
        console.error('Error loading request:', err);
        setError(err.message || 'Failed to load request');
      } finally {
        setIsLoading(false);
      }
    };

    loadRequest();
  }, [id, getRequest, calculateXRPAmount, createPaymentURL]);

  const handleCancelRequest = async () => {
    if (!request || !account) return;

    try {
      setIsCancelling(true);
      await cancelRequest(id);
      toast.success('Request cancelled successfully');
      
      // Refresh request data
      const updatedRequest = await getRequest(id);
      setRequest(updatedRequest);
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error(error.message || 'Failed to cancel request');
    } finally {
      setIsCancelling(false);
    }
  };

  const copyToClipboard = (text, message = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const shareRequest = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Payment Request - ${request.formattedAmount} ${request.assetSymbol}`,
        text: request.message || `Payment request for ${request.formattedAmount} ${request.assetSymbol}`,
        url: shareUrl,
      });
    } else {
      copyToClipboard(shareUrl, 'Share link copied!');
    }
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

  const formatTimeRemaining = (expiry) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiry - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Loading request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Request Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'The requested payment request could not be found.'}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isCreator = account?.toLowerCase() === request.creator?.toLowerCase();
  const canCancel = isCreator && request.status === 'PENDING' && !request.isExpired;
  const canPay = request.status === 'PENDING' && !request.isExpired && !isCreator;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Request #{id}
        </h1>
        <div className={`inline-block ${getStatusColor(request.status)}`}>
          {request.status}
        </div>
      </div>

      {/* Main Request Card */}
      <div className="card">
        {/* Amount Display */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {request.formattedAmount} {request.assetSymbol}
          </div>
          {xrpAmount && (
            <div className="text-xl text-gray-600">
              ≈ {xrpAmount.toLocaleString()} XRP
            </div>
          )}
          {request.message && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{request.message}</p>
            </div>
          )}
        </div>

        {/* Request Details */}
        <div className="border-t border-gray-200 pt-6">
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Recipient Address</dt>
              <dd className="text-sm text-gray-900 font-mono">
                <button
                  onClick={() => copyToClipboard(request.recipientXRPL)}
                  className="hover:bg-gray-100 p-1 rounded transition-colors"
                  title="Click to copy"
                >
                  {request.recipientXRPL}
                </button>
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Destination Tag</dt>
              <dd className="text-sm text-gray-900 font-mono">{id}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="text-sm text-gray-900 font-mono">
                {isCreator ? 'You' : `${request.creator.slice(0, 6)}...${request.creator.slice(-4)}`}
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Expires</dt>
              <dd className="text-sm text-gray-900">
                {request.isExpired ? (
                  <span className="text-red-600">Expired</span>
                ) : (
                  <span>{formatTimeRemaining(request.expiry)}</span>
                )}
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Price Slippage</dt>
              <dd className="text-sm text-gray-900">±{request.slippageBp / 100}%</dd>
            </div>

            {request.status === 'PAID' && request.paidTxHash && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">XRPL Transaction</dt>
                <dd className="text-sm text-blue-600">
                  <a
                    href={`https://testnet.xrpl.org/transactions/${request.paidTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    View on XRPL Explorer
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Payment Instructions */}
      {canPay && (
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            💰 How to Pay
          </h3>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Option 1: Use XUMM Wallet</h4>
              <p className="text-sm text-gray-600 mb-3">
                Click the button below to open payment in XUMM wallet
              </p>
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-xrp w-full text-center"
              >
                Pay with XUMM
              </a>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Option 2: Manual Payment</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Send to:</span>
                  <button
                    onClick={() => copyToClipboard(request.recipientXRPL)}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {request.recipientXRPL}
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <button
                    onClick={() => copyToClipboard(xrpAmount?.toString() || '')}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {xrpAmount?.toLocaleString()} XRP
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Destination Tag:</span>
                  <button
                    onClick={() => copyToClipboard(id)}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {id}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Important:</strong> You must include the Destination Tag ({id}) 
                for the payment to be automatically verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Creator Actions */}
      {isCreator && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Request Management
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={shareRequest}
              className="btn-secondary w-full"
            >
              📤 Share Request
            </button>

            {canCancel && (
              <button
                onClick={handleCancelRequest}
                disabled={isCancelling}
                className="btn-secondary w-full text-red-600 hover:bg-red-50"
              >
                {isCancelling ? 'Cancelling...' : '❌ Cancel Request'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Updates */}
      {request.status === 'PAID' && (
        <div className="card bg-green-50 border-green-200">
          <div className="text-center">
            <div className="text-green-600 text-4xl mb-2">✅</div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Payment Received!
            </h3>
            <p className="text-green-700">
              {request.paidAmount && (
                <>Payment of {(parseInt(request.paidAmount) / 1000000).toLocaleString()} XRP confirmed on XRPL</>
              )}
            </p>
            {request.paidTimestamp && (
              <p className="text-sm text-green-600 mt-2">
                Paid on {new Date(request.paidTimestamp * 1000).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {request.status === 'EXPIRED' && (
        <div className="card bg-gray-50 border-gray-200">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">⏰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Request Expired
            </h3>
            <p className="text-gray-600">
              This payment request has expired and can no longer be paid.
            </p>
          </div>
        </div>
      )}

      {request.status === 'CANCELLED' && (
        <div className="card bg-red-50 border-red-200">
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-2">❌</div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Request Cancelled
            </h3>
            <p className="text-red-700">
              This payment request has been cancelled by the creator.
            </p>
          </div>
        </div>
      )}

      {/* Back Navigation */}
      <div className="text-center">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
};

export default RequestDetail;