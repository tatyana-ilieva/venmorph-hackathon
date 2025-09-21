import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { formatRequestStatus, getAssetBySymbol } from '../config/contracts';

export const useRequests = () => {
  const { 
    requestManagerContract, 
    ftsoRegistryContract, 
    account, 
    isConnected,
    chainId 
  } = useWeb3();
  
  const [requests, setRequests] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exchangeRates, setExchangeRates] = useState({});

  // Create a new payment request
  const createRequest = useCallback(async (requestData) => {
    if (!requestManagerContract || !account) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    try {
      setError(null);
      setIsLoading(true);

      const {
        recipientXRPL,
        assetSymbol,
        assetAmount,
        expiry,
        slippageBp,
        message
      } = requestData;

      // Convert amount to proper units
      const asset = getAssetBySymbol(assetSymbol);
      const amountWei = ethers.utils.parseUnits(assetAmount.toString(), asset.decimals);

      // Create expiry timestamp
      const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiry * 3600); // expiry in hours

      const tx = await requestManagerContract.createRequest(
        recipientXRPL,
        assetSymbol,
        amountWei,
        expiryTimestamp,
        slippageBp * 100, // Convert percentage to basis points
        message || ''
      );

      const receipt = await tx.wait();
      
      // Extract request ID from event
      const event = receipt.events?.find(e => e.event === 'RequestCreated');
      const requestId = event?.args?.requestId;

      if (requestId) {
        // Fetch the created request
        const newRequest = await getRequest(requestId.toString());
        
        // Update local state
        setRequests(prev => [newRequest, ...prev]);
        setUserRequests(prev => [newRequest, ...prev]);

        return {
          success: true,
          requestId: requestId.toString(),
          txHash: receipt.transactionHash,
          request: newRequest
        };
      }

      throw new Error('Request ID not found in transaction receipt');

    } catch (err) {
      console.error('Error creating request:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [requestManagerContract, account]);

  // Get a specific request by ID
  const getRequest = useCallback(async (requestId) => {
    if (!requestManagerContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const request = await requestManagerContract.getRequest(requestId);
      
      return {
        id: request.id.toString(),
        creator: request.creator,
        recipientXRPL: request.recipientXRPL,
        assetSymbol: request.assetSymbol,
        assetAmount: request.assetAmount.toString(),
        expiry: request.expiry.toNumber(),
        slippageBp: request.slippageBp,
        status: formatRequestStatus(request.status),
        statusCode: request.status,
        paidTxHash: request.paidTxHash,
        paidAmount: request.paidAmount.toString(),
        paidTimestamp: request.paidTimestamp.toNumber(),
        message: request.message,
        // Computed fields
        isExpired: request.expiry.toNumber() < Math.floor(Date.now() / 1000),
        asset: getAssetBySymbol(request.assetSymbol),
        formattedAmount: ethers.utils.formatUnits(
          request.assetAmount, 
          getAssetBySymbol(request.assetSymbol).decimals
        ),
        expiryDate: new Date(request.expiry.toNumber() * 1000),
        createdBy: request.creator.toLowerCase() === account?.toLowerCase()
      };
    } catch (err) {
      console.error('Error fetching request:', err);
      throw err;
    }
  }, [requestManagerContract, account]);

  // Get user's requests
  const getUserRequests = useCallback(async (userAddress = account) => {
    if (!requestManagerContract || !userAddress) {
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      const requestIds = await requestManagerContract.getUserRequests(userAddress);
      const requestPromises = requestIds.map(id => getRequest(id.toString()));
      const userRequestsData = await Promise.all(requestPromises);

      // Sort by creation time (most recent first)
      userRequestsData.sort((a, b) => b.expiry - a.expiry);

      setUserRequests(userRequestsData);
      return userRequestsData;

    } catch (err) {
      console.error('Error fetching user requests:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [requestManagerContract, account, getRequest]);

  // Get all recent requests (for public feed)
  const getRecentRequests = useCallback(async (limit = 20) => {
    if (!requestManagerContract) {
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      const totalRequests = await requestManagerContract.getTotalRequests();
      const startId = Math.max(1, totalRequests.toNumber() - limit + 1);
      
      const requestPromises = [];
      for (let i = totalRequests.toNumber(); i >= startId; i--) {
        requestPromises.push(getRequest(i.toString()));
      }

      const recentRequestsData = await Promise.all(requestPromises);
      
      // Filter out cancelled/expired for public feed
      const publicRequests = recentRequestsData.filter(
        req => req.status === 'PENDING' && !req.isExpired
      );

      setRequests(publicRequests);
      return publicRequests;

    } catch (err) {
      console.error('Error fetching recent requests:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [requestManagerContract, getRequest]);

  // Cancel a request
  const cancelRequest = useCallback(async (requestId) => {
    if (!requestManagerContract) {
      throw new Error('Contract not initialized');
    }

    try {
      setError(null);
      setIsLoading(true);

      const tx = await requestManagerContract.cancelRequest(requestId);
      await tx.wait();

      // Update local state
      const updateRequestStatus = (requests) => 
        requests.map(req => 
          req.id === requestId 
            ? { ...req, status: 'CANCELLED', statusCode: 2 }
            : req
        );

      setRequests(updateRequestStatus);
      setUserRequests(updateRequestStatus);

      return { success: true };

    } catch (err) {
      console.error('Error cancelling request:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [requestManagerContract]);

  // Calculate XRP amount for a given asset
  const calculateXRPAmount = useCallback(async (assetSymbol, assetAmount) => {
    if (!requestManagerContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const asset = getAssetBySymbol(assetSymbol);
      const amountWei = ethers.utils.parseUnits(assetAmount.toString(), asset.decimals);
      
      const xrpAmountWei = await requestManagerContract.calculateXRPAmount(
        assetSymbol, 
        amountWei
      );
      
      const xrpAmount = ethers.utils.formatUnits(xrpAmountWei, 6); // XRP has 6 decimals
      return parseFloat(xrpAmount);

    } catch (err) {
      console.error('Error calculating XRP amount:', err);
      throw err;
    }
  }, [requestManagerContract]);

  // Get current exchange rates
  const getExchangeRates = useCallback(async (assetSymbols = ['ETH', 'BTC', 'USDT', 'USDC']) => {
    if (!requestManagerContract) {
      return {};
    }

    try {
      const rates = {};
      
      for (const symbol of assetSymbols) {
        if (symbol === 'XRP') {
          rates[symbol] = { assetPrice: 1, xrpPrice: 1, timestamp: Date.now() };
          continue;
        }

        const { assetPrice, xrpPrice, timestamp } = await requestManagerContract.getExchangeRate(symbol);
        rates[symbol] = {
          assetPrice: assetPrice.toString(),
          xrpPrice: xrpPrice.toString(),
          timestamp: timestamp.toNumber(),
          rate: parseFloat(assetPrice.toString()) / parseFloat(xrpPrice.toString())
        };
      }

      setExchangeRates(rates);
      return rates;

    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      return {};
    }
  }, [requestManagerContract]);

  // Auto-refresh user requests when account changes
  useEffect(() => {
    if (isConnected && account) {
      getUserRequests();
    }
  }, [isConnected, account, getUserRequests]);

  // Auto-refresh exchange rates periodically
  useEffect(() => {
    if (requestManagerContract) {
      getExchangeRates();
      
      const interval = setInterval(() => {
        getExchangeRates();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [requestManagerContract, getExchangeRates]);

  return {
    // State
    requests,
    userRequests,
    isLoading,
    error,
    exchangeRates,
    
    // Actions
    createRequest,
    getRequest,
    getUserRequests,
    getRecentRequests,
    cancelRequest,
    calculateXRPAmount,
    getExchangeRates,
    
    // Utils
    clearError: () => setError(null),
    refreshUserRequests: getUserRequests,
    refreshRequests: getRecentRequests
  };
};