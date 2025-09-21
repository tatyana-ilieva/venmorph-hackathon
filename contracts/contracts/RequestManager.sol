// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// Interface for Flare's FTSO (Time Series Oracle)
interface IFtsoRegistry {
    function getCurrentPrice(string memory _symbol) external view returns (uint256 _price, uint256 _timestamp);
    function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals);
}

contract RequestManager is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // State variables
    Counters.Counter private _requestIds;
    IFtsoRegistry public ftsoRegistry;
    
    // Request status enum
    enum RequestStatus { PENDING, PAID, CANCELLED, EXPIRED }
    
    // Request struct
    struct Request {
        uint256 id;
        address creator;
        string recipientXRPL;
        string assetSymbol;
        uint256 assetAmount;
        uint256 expiry;
        uint16 slippageBp;
        RequestStatus status;
        bytes32 paidTxHash;
        uint256 paidAmount;
        uint256 paidTimestamp;
        string message;
    }
    
    // Mappings
    mapping(uint256 => Request) public requests;
    mapping(address => uint256[]) public userRequests;
    mapping(string => bool) public supportedAssets;
    mapping(address => bool) public authorizedAttestors;
    
    // Events
    event RequestCreated(
        uint256 indexed requestId,
        address indexed creator,
        string recipientXRPL,
        string assetSymbol,
        uint256 assetAmount,
        uint256 expiry,
        string message
    );
    
    event RequestPaid(
        uint256 indexed requestId,
        bytes32 indexed txHash,
        uint256 paidAmount,
        uint256 timestamp
    );
    
    event RequestCancelled(uint256 indexed requestId);
    event RequestExpired(uint256 indexed requestId);
    event AttestorAdded(address indexed attestor);
    event AttestorRemoved(address indexed attestor);
    
    // Modifiers
    modifier onlyAuthorizedAttestor() {
        require(authorizedAttestors[msg.sender], "Not authorized attestor");
        _;
    }
    
    modifier validRequest(uint256 _requestId) {
        require(_requestId <= _requestIds.current(), "Invalid request ID");
        require(requests[_requestId].creator != address(0), "Request does not exist");
        _;
    }
    
    constructor(address _ftsoRegistry) {
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        
        // Initialize supported assets
        supportedAssets["ETH"] = true;
        supportedAssets["XRP"] = true;
        supportedAssets["BTC"] = true;
        supportedAssets["USDT"] = true;
        supportedAssets["USDC"] = true;
    }
    
    /**
     * @dev Create a new payment request
     */
    function createRequest(
        string memory _recipientXRPL,
        string memory _assetSymbol,
        uint256 _assetAmount,
        uint256 _expiry,
        uint16 _slippageBp,
        string memory _message
    ) external returns (uint256) {
        require(bytes(_recipientXRPL).length > 0, "Invalid recipient XRPL address");
        require(supportedAssets[_assetSymbol], "Asset not supported");
        require(_assetAmount > 0, "Amount must be greater than 0");
        require(_expiry > block.timestamp, "Expiry must be in the future");
        require(_slippageBp <= 1000, "Slippage cannot exceed 10%"); // 1000 bp = 10%
        
        _requestIds.increment();
        uint256 newRequestId = _requestIds.current();
        
        Request storage newRequest = requests[newRequestId];
        newRequest.id = newRequestId;
        newRequest.creator = msg.sender;
        newRequest.recipientXRPL = _recipientXRPL;
        newRequest.assetSymbol = _assetSymbol;
        newRequest.assetAmount = _assetAmount;
        newRequest.expiry = _expiry;
        newRequest.slippageBp = _slippageBp;
        newRequest.status = RequestStatus.PENDING;
        newRequest.message = _message;
        
        userRequests[msg.sender].push(newRequestId);
        
        emit RequestCreated(
            newRequestId,
            msg.sender,
            _recipientXRPL,
            _assetSymbol,
            _assetAmount,
            _expiry,
            _message
        );
        
        return newRequestId;
    }
    
    /**
     * @dev Submit payment attestation from XRPL
     */
    function submitPaymentAttestation(
        uint256 _requestId,
        bytes32 _txHash,
        uint256 _paidAmountXRP,
        uint256 _timestamp
    ) external onlyAuthorizedAttestor validRequest(_requestId) nonReentrant {
        Request storage request = requests[_requestId];
        
        require(request.status == RequestStatus.PENDING, "Request not pending");
        require(block.timestamp <= request.expiry, "Request expired");
        require(_timestamp <= block.timestamp, "Future timestamp not allowed");
        
        // Calculate required XRP amount using FTSO
        uint256 requiredXRP = calculateXRPAmount(request.assetSymbol, request.assetAmount);
        
        // Apply slippage tolerance
        uint256 minAcceptableAmount = (requiredXRP * (10000 - request.slippageBp)) / 10000;
        
        require(_paidAmountXRP >= minAcceptableAmount, "Insufficient payment amount");
        
        // Mark as paid
        request.status = RequestStatus.PAID;
        request.paidTxHash = _txHash;
        request.paidAmount = _paidAmountXRP;
        request.paidTimestamp = _timestamp;
        
        emit RequestPaid(_requestId, _txHash, _paidAmountXRP, _timestamp);
    }
    
    /**
     * @dev Calculate XRP amount for given asset and amount
     */
    function calculateXRPAmount(string memory _assetSymbol, uint256 _assetAmount) 
        public view returns (uint256) {
        
        if (keccak256(bytes(_assetSymbol)) == keccak256(bytes("XRP"))) {
            return _assetAmount;
        }
        
        // Get asset price in USD
        (uint256 assetPrice, , uint256 assetDecimals) = ftsoRegistry.getCurrentPriceWithDecimals(_assetSymbol);
        (uint256 xrpPrice, , uint256 xrpDecimals) = ftsoRegistry.getCurrentPriceWithDecimals("XRP");
        
        require(assetPrice > 0 && xrpPrice > 0, "Invalid price data");
        
        // Convert to XRP: (assetAmount * assetPrice / xrpPrice) adjusted for decimals
        uint256 xrpAmount = (_assetAmount * assetPrice * (10**xrpDecimals)) / (xrpPrice * (10**assetDecimals));
        
        return xrpAmount;
    }
    
    /**
     * @dev Get current exchange rate for UI display
     */
    function getExchangeRate(string memory _assetSymbol) 
        external view returns (uint256 assetPrice, uint256 xrpPrice, uint256 timestamp) {
        
        (assetPrice, timestamp,) = ftsoRegistry.getCurrentPriceWithDecimals(_assetSymbol);
        (xrpPrice,,) = ftsoRegistry.getCurrentPriceWithDecimals("XRP");
        
        return (assetPrice, xrpPrice, timestamp);
    }
    
    /**
     * @dev Cancel a request (only creator)
     */
    function cancelRequest(uint256 _requestId) 
        external validRequest(_requestId) {
        
        Request storage request = requests[_requestId];
        require(request.creator == msg.sender, "Only creator can cancel");
        require(request.status == RequestStatus.PENDING, "Can only cancel pending requests");
        
        request.status = RequestStatus.CANCELLED;
        emit RequestCancelled(_requestId);
    }
    
    /**
     * @dev Mark expired requests (callable by anyone)
     */
    function markExpired(uint256 _requestId) 
        external validRequest(_requestId) {
        
        Request storage request = requests[_requestId];
        require(request.status == RequestStatus.PENDING, "Request not pending");
        require(block.timestamp > request.expiry, "Request not yet expired");
        
        request.status = RequestStatus.EXPIRED;
        emit RequestExpired(_requestId);
    }
    
    /**
     * @dev Get request details
     */
    function getRequest(uint256 _requestId) 
        external view validRequest(_requestId) returns (Request memory) {
        return requests[_requestId];
    }
    
    /**
     * @dev Get user's requests
     */
    function getUserRequests(address _user) 
        external view returns (uint256[] memory) {
        return userRequests[_user];
    }
    
    /**
     * @dev Get total number of requests
     */
    function getTotalRequests() external view returns (uint256) {
        return _requestIds.current();
    }
    
    // Admin functions
    function addAuthorizedAttestor(address _attestor) external onlyOwner {
        authorizedAttestors[_attestor] = true;
        emit AttestorAdded(_attestor);
    }
    
    function removeAuthorizedAttestor(address _attestor) external onlyOwner {
        authorizedAttestors[_attestor] = false;
        emit AttestorRemoved(_attestor);
    }
    
    function addSupportedAsset(string memory _symbol) external onlyOwner {
        supportedAssets[_symbol] = true;
    }
    
    function removeSupportedAsset(string memory _symbol) external onlyOwner {
        supportedAssets[_symbol] = false;
    }
    
    function updateFtsoRegistry(address _newRegistry) external onlyOwner {
        ftsoRegistry = IFtsoRegistry(_newRegistry);
    }
}