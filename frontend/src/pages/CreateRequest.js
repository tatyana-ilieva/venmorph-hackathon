import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { useRequests } from '../hooks/useRequests';
import { SUPPORTED_ASSETS } from '../config/contracts';

const CreateRequest = () => {
  const navigate = useNavigate();
  const { isConnected, account } = useWeb3();
  const { createRequest, calculateXRPAmount, exchangeRates, isLoading } = useRequests();

  const [formData, setFormData] = useState({
    recipientXRPL: '',
    assetSymbol: 'ETH',
    assetAmount: '',
    expiry: 24, // hours
    slippageBp: 2, // 2% slippage
    message: ''
  });

  const [xrpEquivalent, setXrpEquivalent] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Calculate XRP equivalent when amount or asset changes
  useEffect(() => {
    const calculateEquivalent = async () => {
      if (!formData.assetAmount || !formData.assetSymbol || !isConnected) {
        setXrpEquivalent(null);
        return;
      }

      try {
        setIsCalculating(true);
        const xrpAmount = await calculateXRPAmount(formData.assetSymbol, formData.assetAmount);
        setXrpEquivalent(xrpAmount);
      } catch (error) {
        console.error('Error calculating XRP equivalent:', error);
        setXrpEquivalent(null);
      } finally {
        setIsCalculating(false);
      }
    };

    const timeoutId = setTimeout(calculateEquivalent, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.assetAmount, formData.assetSymbol, calculateXRPAmount, isConnected]);

  const validateForm = () => {
    const errors = {};

    // Validate XRPL address (basic validation)
    if (!formData.recipientXRPL) {
      errors.recipientXRPL = 'XRPL address is required';
    } else if (!formData.recipientXRPL.match(/^r[A-HJ-NP-Z0-9]{25,34}$/)) {
      errors.recipientXRPL = 'Invalid XRPL address format';
    }

    // Validate amount
    if (!formData.assetAmount) {
      errors.assetAmount = 'Amount is required';
    } else if (isNaN(formData.assetAmount) || parseFloat(formData.assetAmount) <= 0) {
      errors.assetAmount = 'Amount must be a positive number';
    }

    // Validate expiry
    if (!formData.expiry || formData.expiry < 1 || formData.expiry > 168) {
      errors.expiry = 'Expiry must be between 1 and 168 hours';
    }

    // Validate slippage
    if (formData.slippageBp < 0.1 || formData.slippageBp > 10) {
      errors.slippageBp = 'Slippage must be between 0.1% and 10%';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      const result = await createRequest(formData);
      
      if (result.success) {
        toast.success('Request created successfully!');
        navigate(`/request/${result.requestId}`);
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Failed to create request');
    }
  };

  const suggestedMessages = [
    "Payment for lunch 🍕",
    "Split bill for dinner 🍽️",
    "Concert ticket payment 🎵",
    "Birthday gift contribution 🎁",
    "Project milestone payment 💼",
    "Freelance work payment 💻"
  ];

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-6">
            You need to connect your wallet to create payment requests
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
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Create Payment Request
        </h1>
        <p className="text-lg text-gray-600">
          Request payment in any asset, get paid in XRP
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Recipient XRPL Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient XRPL Address *
          </label>
          <input
            type="text"
            name="recipientXRPL"
            value={formData.recipientXRPL}
            onChange={handleInputChange}
            placeholder="rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH"
            className={`input-field ${validationErrors.recipientXRPL ? 'border-red-500' : ''}`}
          />
          {validationErrors.recipientXRPL && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.recipientXRPL}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            The XRPL address where you want to receive the payment
          </p>
        </div>

        {/* Asset and Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset *
            </label>
            <select
              name="assetSymbol"
              value={formData.assetSymbol}
              onChange={handleInputChange}
              className="input-field"
            >
              {SUPPORTED_ASSETS.map(asset => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.icon} {asset.name} ({asset.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <input
              type="number"
              name="assetAmount"
              value={formData.assetAmount}
              onChange={handleInputChange}
              placeholder="0.0"
              step="any"
              min="0"
              className={`input-field ${validationErrors.assetAmount ? 'border-red-500' : ''}`}
            />
            {validationErrors.assetAmount && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.assetAmount}</p>
            )}
          </div>
        </div>

        {/* XRP Equivalent Display */}
        {formData.assetAmount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                XRP Equivalent (via Flare FTSO):
              </span>
              <div className="text-right">
                {isCalculating ? (
                  <div className="flex items-center space-x-2">
                    <div className="loading-spinner"></div>
                    <span className="text-sm text-blue-600">Calculating...</span>
                  </div>
                ) : xrpEquivalent ? (
                  <div>
                    <span className="text-lg font-bold text-blue-900">
                      {xrpEquivalent.toLocaleString()} XRP
                    </span>
                    <div className="text-xs text-blue-600">
                      ~${(xrpEquivalent * (exchangeRates.XRP?.rate || 0.5)).toFixed(2)} USD
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-red-600">Unable to calculate</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expiry and Slippage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires In (hours) *
            </label>
            <select
              name="expiry"
              value={formData.expiry}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>1 week</option>
            </select>
            {validationErrors.expiry && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.expiry}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Slippage (%) *
            </label>
            <select
              name="slippageBp"
              value={formData.slippageBp}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value={0.5}>0.5%</option>
              <option value={1}>1.0%</option>
              <option value={2}>2.0%</option>
              <option value={5}>5.0%</option>
            </select>
            {validationErrors.slippageBp && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.slippageBp}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Acceptable price variation when payment is made
            </p>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional)
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="What is this payment for?"
            rows={3}
            className="input-field resize-none"
            maxLength={200}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex flex-wrap gap-2">
              {suggestedMessages.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, message: suggestion }))}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {formData.message.length}/200
            </span>
          </div>
        </div>

        {/* Summary Card */}
        {formData.assetAmount && xrpEquivalent && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Request Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Requesting:</span>
                <span className="font-medium">
                  {formData.assetAmount} {formData.assetSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payer will send:</span>
                <span className="font-medium">
                  ~{xrpEquivalent.toLocaleString()} XRP
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires:</span>
                <span className="font-medium">
                  {new Date(Date.now() + formData.expiry * 3600000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price tolerance:</span>
                <span className="font-medium">±{formData.slippageBp}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isCalculating}
            className="btn-primary flex-1"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>Creating...</span>
              </div>
            ) : (
              'Create Request'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How it works:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Your request is stored on Flare with a unique ID</li>
            <li>Share the request link with the person who should pay</li>
            <li>They see the current XRP equivalent via Flare oracles</li>
            <li>Payment is made on XRPL to your address with the request ID</li>
            <li>Attestors detect the payment and mark your request as paid</li>
          </ol>
        </div>
      </form>
    </div>
  );
};

export default CreateRequest;