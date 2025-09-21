// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Mock FTSO Registry for local testing
 * Provides fake price data for development
 */
contract MockFtsoRegistry {
    
    struct PriceData {
        uint256 price;
        uint256 decimals;
        uint256 timestamp;
    }
    
    mapping(string => PriceData) private prices;
    
    constructor() {
        // Initialize with mock prices (in USD with 5 decimals)
        prices["ETH"] = PriceData(200000000, 5, block.timestamp); // $2000.00
        prices["XRP"] = PriceData(50000, 5, block.timestamp);      // $0.50
        prices["BTC"] = PriceData(4500000000, 5, block.timestamp); // $45000.00
        prices["USDT"] = PriceData(100000, 5, block.timestamp);    // $1.00
        prices["USDC"] = PriceData(100000, 5, block.timestamp);    // $1.00
    }
    
    function getCurrentPrice(string memory _symbol) 
        external view returns (uint256 _price, uint256 _timestamp) {
        PriceData memory data = prices[_symbol];
        require(data.price > 0, "Price not available");
        return (data.price, data.timestamp);
    }
    
    function getCurrentPriceWithDecimals(string memory _symbol) 
        external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals) {
        PriceData memory data = prices[_symbol];
        require(data.price > 0, "Price not available");
        return (data.price, data.timestamp, data.decimals);
    }
    
    // Admin function to update prices for testing
    function updatePrice(string memory _symbol, uint256 _price, uint256 _decimals) 
        external {
        prices[_symbol] = PriceData(_price, _decimals, block.timestamp);
    }
}