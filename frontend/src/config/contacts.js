// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Flare Mainnet
  14: {
    requestManager: '0x...', // Will be filled after deployment
    ftsoRegistry: '0x0262bcA0A4F5C1A8fC5d50cE2E79dfA87d55Ae8D'
  },
  // Coston2 Testnet
  114: {
    requestManager: '0x...', // Will be filled after deployment
    ftsoRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019'
  },
  // Local development
  31337: {
    requestManager: '0x...', // Will be filled after local deployment
    ftsoRegistry: '0x...' // Mock registry address
  }
};

// Network configurations
export const NETWORKS = {
  14: {
    name: 'Flare Mainnet',
    rpcUrl: 'https://flare-api.flare.network/ext/bc/C/rpc',
    blockExplorer: 'https://flare-explorer.flare.network',
    nativeCurrency: {
      name: 'Flare',
      symbol: 'FLR',
      decimals: 18
    }
  },
  114: {
    name: 'Coston2 Testnet',
    rpcUrl: 'https://coston2-api.flare.network/ext/bc/C/rpc',
    blockExplorer: 'https://coston2-explorer.flare.network',
    nativeCurrency: {
      name: 'Coston2 Flare',
      symbol: 'C2FLR',
      decimals: 18
    }
  },
  31337: {
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

// Supported assets
export const SUPPORTED_ASSETS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    icon: '⚡'
  },
  {
    symbol: 'XRP',
    name: 'XRP',
    decimals: 6,
    icon: '💎'
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    icon: '₿'
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    icon: '💵'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '💰'
  }
];

// Request status mapping
export const REQUEST_STATUS = {
  0: 'PENDING',
  1: 'PAID',
  2: 'CANCELLED',
  3: 'EXPIRED'
};

// Contract ABIs (simplified for key functions)
export const REQUEST_MANAGER_ABI = [
  "function createRequest(string memory _recipientXRPL, string memory _assetSymbol, uint256 _assetAmount, uint256 _expiry, uint16 _slippageBp, string memory _message) external returns (uint256)",
  "function getRequest(uint256 _requestId) external view returns (tuple(uint256 id, address creator, string recipientXRPL, string assetSymbol, uint256 assetAmount, uint256 expiry, uint16 slippageBp, uint8 status, bytes32 paidTxHash, uint256 paidAmount, uint256 paidTimestamp, string message))",
  "function getUserRequests(address _user) external view returns (uint256[])",
  "function getTotalRequests() external view returns (uint256)",
  "function calculateXRPAmount(string memory _assetSymbol, uint256 _assetAmount) external view returns (uint256)",
  "function getExchangeRate(string memory _assetSymbol) external view returns (uint256 assetPrice, uint256 xrpPrice, uint256 timestamp)",
  "function cancelRequest(uint256 _requestId) external",
  "function submitPaymentAttestation(uint256 _requestId, bytes32 _txHash, uint256 _paidAmountXRP, uint256 _timestamp) external",
  "event RequestCreated(uint256 indexed requestId, address indexed creator, string recipientXRPL, string assetSymbol, uint256 assetAmount, uint256 expiry, string message)",
  "event RequestPaid(uint256 indexed requestId, bytes32 indexed txHash, uint256 paidAmount, uint256 timestamp)",
  "event RequestCancelled(uint256 indexed requestId)",
  "event RequestExpired(uint256 indexed requestId)"
];

export const FTSO_REGISTRY_ABI = [
  "function getCurrentPrice(string memory _symbol) external view returns (uint256 _price, uint256 _timestamp)",
  "function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals)"
];

// Helper functions
export function getContractAddress(chainId, contractName) {
  return CONTRACT_ADDRESSES[chainId]?.[contractName];
}

export function getNetworkConfig(chainId) {
  return NETWORKS[chainId];
}

export function getAssetBySymbol(symbol) {
  return SUPPORTED_ASSETS.find(asset => asset.symbol === symbol);
}

export function formatRequestStatus(status) {
  return REQUEST_STATUS[status] || 'UNKNOWN';
}