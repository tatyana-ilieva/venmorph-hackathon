const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// Contract configuration
const CONTRACT_ADDRESSES = {
  114: { // Coston2
    requestManager: process.env.COSTON2_REQUEST_MANAGER_ADDRESS,
    ftsoRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019'
  },
  14: { // Flare mainnet
    requestManager: process.env.FLARE_REQUEST_MANAGER_ADDRESS,
    ftsoRegistry: '0x0262bcA0A4F5C1A8fC5d50cE2E79dfA87d55Ae8D'
  }
};

const REQUEST_MANAGER_ABI = [
  "function getRequest(uint256 _requestId) external view returns (tuple(uint256 id, address creator, string recipientXRPL, string assetSymbol, uint256 assetAmount, uint256 expiry, uint16 slippageBp, uint8 status, bytes32 paidTxHash, uint256 paidAmount, uint256 paidTimestamp, string message))",
  "function getTotalRequests() external view returns (uint256)",
  "function calculateXRPAmount(string memory _assetSymbol, uint256 _assetAmount) external view returns (uint256)",
  "function getExchangeRate(string memory _assetSymbol) external view returns (uint256 assetPrice, uint256 xrpPrice, uint256 timestamp)"
];

// Initialize providers
const providers = {
  114: new ethers.providers.JsonRpcProvider('https://coston2-api.flare.network/ext/bc/C/rpc'),
  14: new ethers.providers.JsonRpcProvider('https://flare-api.flare.network/ext/bc/C/rpc')
};

// Get contract instance
const getContract = (chainId) => {
  const contractAddress = CONTRACT_ADDRESSES[chainId]?.requestManager;
  if (!contractAddress) {
    throw new Error(`Contract not deployed on chain ${chainId}`);
  }
  
  const provider = providers[chainId];
  return new ethers.Contract(contractAddress, REQUEST_MANAGER_ABI, provider);
};

// Get request by ID
router.get('/:chainId/:requestId', async (req, res) => {
  try {
    const { chainId, requestId } = req.params;
    
    if (!CONTRACT_ADDRESSES[chainId]) {
      return res.status(400).json({
        error: {
          message: 'Unsupported chain ID',
          supportedChains: Object.keys(CONTRACT_ADDRESSES)
        }
      });
    }

    const contract = getContract(parseInt(chainId));
    const request = await contract.getRequest(requestId);

    // Format the response
    const formattedRequest = {
      id: request.id.toString(),
      creator: request.creator,
      recipientXRPL: request.recipientXRPL,
      assetSymbol: request.assetSymbol,
      assetAmount: request.assetAmount.toString(),
      expiry: request.expiry.toNumber(),
      slippageBp: request.slippageBp,
      status: request.status,
      statusText: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'][request.status] || 'UNKNOWN',
      paidTxHash: request.paidTxHash,
      paidAmount: request.paidAmount.toString(),
      paidTimestamp: request.paidTimestamp.toNumber(),
      message: request.message,
      // Computed fields
      isExpired: request.expiry.toNumber() < Math.floor(Date.now() / 1000),
      expiryDate: new Date(request.expiry.toNumber() * 1000).toISOString(),
      formattedAmount: ethers.utils.formatUnits(request.assetAmount, getAssetDecimals(request.assetSymbol)),
      chainId: parseInt(chainId)
    };

    res.json(formattedRequest);

  } catch (error) {
    console.error('Error fetching request:', error);
    
    if (error.message.includes('execution reverted')) {
      return res.status(404).json({
        error: {
          message: 'Request not found',
          details: 'The requested ID does not exist'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Failed to fetch request',
        details: error.message
      }
    });
  }
});

// Get multiple requests (batch)
router.post('/:chainId/batch', async (req, res) => {
  try {
    const { chainId } = req.params;
    const { requestIds } = req.body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({
        error: {
          message: 'requestIds must be a non-empty array'
        }
      });
    }

    if (requestIds.length > 50) {
      return res.status(400).json({
        error: {
          message: 'Cannot fetch more than 50 requests at once'
        }
      });
    }

    const contract = getContract(parseInt(chainId));
    
    // Fetch all requests in parallel
    const requestPromises = requestIds.map(async (id) => {
      try {
        const request = await contract.getRequest(id);
        return {
          id: request.id.toString(),
          creator: request.creator,
          recipientXRPL: request.recipientXRPL,
          assetSymbol: request.assetSymbol,
          assetAmount: request.assetAmount.toString(),
          expiry: request.expiry.toNumber(),
          slippageBp: request.slippageBp,
          status: request.status,
          statusText: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'][request.status] || 'UNKNOWN',
          paidTxHash: request.paidTxHash,
          paidAmount: request.paidAmount.toString(),
          paidTimestamp: request.paidTimestamp.toNumber(),
          message: request.message,
          isExpired: request.expiry.toNumber() < Math.floor(Date.now() / 1000),
          expiryDate: new Date(request.expiry.toNumber() * 1000).toISOString(),
          formattedAmount: ethers.utils.formatUnits(request.assetAmount, getAssetDecimals(request.assetSymbol)),
          chainId: parseInt(chainId)
        };
      } catch (error) {
        return {
          id: id.toString(),
          error: error.message
        };
      }
    });

    const requests = await Promise.all(requestPromises);

    res.json({
      requests: requests,
      total: requests.length,
      successful: requests.filter(r => !r.error).length,
      failed: requests.filter(r => r.error).length
    });

  } catch (error) {
    console.error('Error fetching batch requests:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch batch requests',
        details: error.message
      }
    });
  }
});

// Get recent requests
router.get('/:chainId/recent/:limit?', async (req, res) => {
  try {
    const { chainId, limit = 20 } = req.params;
    const requestLimit = Math.min(parseInt(limit), 100); // Cap at 100

    const contract = getContract(parseInt(chainId));
    const totalRequests = await contract.getTotalRequests();
    
    if (totalRequests.eq(0)) {
      return res.json({
        requests: [],
        total: 0,
        chainId: parseInt(chainId)
      });
    }

    const startId = Math.max(1, totalRequests.toNumber() - requestLimit + 1);
    const requestIds = [];
    
    for (let i = totalRequests.toNumber(); i >= startId; i--) {
      requestIds.push(i);
    }

    // Fetch requests in parallel
    const requestPromises = requestIds.map(async (id) => {
      try {
        const request = await contract.getRequest(id);
        return {
          id: request.id.toString(),
          creator: request.creator,
          recipientXRPL: request.recipientXRPL,
          assetSymbol: request.assetSymbol,
          assetAmount: request.assetAmount.toString(),
          expiry: request.expiry.toNumber(),
          slippageBp: request.slippageBp,
          status: request.status,
          statusText: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'][request.status] || 'UNKNOWN',
          paidTxHash: request.paidTxHash,
          paidAmount: request.paidAmount.toString(),
          paidTimestamp: request.paidTimestamp.toNumber(),
          message: request.message,
          isExpired: request.expiry.toNumber() < Math.floor(Date.now() / 1000),
          expiryDate: new Date(request.expiry.toNumber() * 1000).toISOString(),
          formattedAmount: ethers.utils.formatUnits(request.assetAmount, getAssetDecimals(request.assetSymbol)),
          chainId: parseInt(chainId)
        };
      } catch (error) {
        console.error(`Error fetching request ${id}:`, error);
        return null;
      }
    });

    const requests = (await Promise.all(requestPromises)).filter(r => r !== null);

    res.json({
      requests: requests,
      total: requests.length,
      totalRequests: totalRequests.toNumber(),
      chainId: parseInt(chainId)
    });

  } catch (error) {
    console.error('Error fetching recent requests:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch recent requests',
        details: error.message
      }
    });
  }
});

// Calculate XRP amount for asset
router.post('/:chainId/calculate-xrp', async (req, res) => {
  try {
    const { chainId } = req.params;
    const { assetSymbol, assetAmount } = req.body;

    if (!assetSymbol || !assetAmount) {
      return res.status(400).json({
        error: {
          message: 'assetSymbol and assetAmount are required'
        }
      });
    }

    const contract = getContract(parseInt(chainId));
    const decimals = getAssetDecimals(assetSymbol);
    const amountWei = ethers.utils.parseUnits(assetAmount.toString(), decimals);
    
    const xrpAmountWei = await contract.calculateXRPAmount(assetSymbol, amountWei);
    const xrpAmount = ethers.utils.formatUnits(xrpAmountWei, 6); // XRP has 6 decimals

    res.json({
      assetSymbol: assetSymbol,
      assetAmount: assetAmount.toString(),
      xrpAmount: parseFloat(xrpAmount),
      chainId: parseInt(chainId),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating XRP amount:', error);
    res.status(500).json({
      error: {
        message: 'Failed to calculate XRP amount',
        details: error.message
      }
    });
  }
});

// Get exchange rates
router.get('/:chainId/exchange-rates/:assets?', async (req, res) => {
  try {
    const { chainId, assets } = req.params;
    const assetList = assets ? assets.split(',') : ['ETH', 'BTC', 'USDT', 'USDC'];

    const contract = getContract(parseInt(chainId));
    const rates = {};

    for (const asset of assetList) {
      try {
        if (asset === 'XRP') {
          rates[asset] = {
            assetPrice: '1',
            xrpPrice: '1',
            timestamp: Math.floor(Date.now() / 1000),
            rate: 1
          };
        } else {
          const { assetPrice, xrpPrice, timestamp } = await contract.getExchangeRate(asset);
          rates[asset] = {
            assetPrice: assetPrice.toString(),
            xrpPrice: xrpPrice.toString(),
            timestamp: timestamp.toNumber(),
            rate: parseFloat(assetPrice.toString()) / parseFloat(xrpPrice.toString())
          };
        }
      } catch (error) {
        console.error(`Error getting rate for ${asset}:`, error);
        rates[asset] = {
          error: error.message
        };
      }
    }

    res.json({
      rates: rates,
      chainId: parseInt(chainId),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch exchange rates',
        details: error.message
      }
    });
  }
});

// Get contract statistics
router.get('/:chainId/stats', async (req, res) => {
  try {
    const { chainId } = req.params;
    const contract = getContract(parseInt(chainId));
    
    const totalRequests = await contract.getTotalRequests();
    
    // For demo purposes, we'll calculate basic stats
    // In production, you might want to cache these or use indexing
    const stats = {
      totalRequests: totalRequests.toNumber(),
      chainId: parseInt(chainId),
      contractAddress: CONTRACT_ADDRESSES[chainId]?.requestManager,
      timestamp: new Date().toISOString()
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching contract stats:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch contract stats',
        details: error.message
      }
    });
  }
});

// Helper function to get asset decimals
function getAssetDecimals(symbol) {
  const decimals = {
    'ETH': 18,
    'XRP': 6,
    'BTC': 8,
    'USDT': 6,
    'USDC': 6
  };
  return decimals[symbol] || 18;
}

module.exports = router;