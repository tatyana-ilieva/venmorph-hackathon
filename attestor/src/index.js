const { Client } = require('xrpl');
const { ethers } = require('ethers');
const cron = require('node-cron');
require('dotenv').config();

console.log('🚀 Starting Venmorph Attestor Service...');

// Configuration
const config = {
  xrpl: {
    network: process.env.XRPL_NETWORK || 'testnet',
    networks: {
      mainnet: 'wss://xrplcluster.com',
      testnet: 'wss://s.altnet.rippletest.net:51233',
      devnet: 'wss://s.devnet.rippletest.net:51233'
    }
  },
  flare: {
    chainId: parseInt(process.env.FLARE_CHAIN_ID) || 114, // Coston2 by default
    rpcUrl: process.env.FLARE_RPC_URL || 'https://coston2-api.flare.network/ext/bc/C/rpc',
    privateKey: process.env.ATTESTOR_PRIVATE_KEY,
    requestManagerAddress: process.env.REQUEST_MANAGER_ADDRESS
  },
  attestor: {
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 10000, // 10 seconds
    confirmations: parseInt(process.env.CONFIRMATIONS) || 1,
    batchSize: parseInt(process.env.BATCH_SIZE) || 10
  }
};

// Contract ABI
const REQUEST_MANAGER_ABI = [
  "function getRequest(uint256 _requestId) external view returns (tuple(uint256 id, address creator, string recipientXRPL, string assetSymbol, uint256 assetAmount, uint256 expiry, uint16 slippageBp, uint8 status, bytes32 paidTxHash, uint256 paidAmount, uint256 paidTimestamp, string message))",
  "function getTotalRequests() external view returns (uint256)",
  "function submitPaymentAttestation(uint256 _requestId, bytes32 _txHash, uint256 _paidAmountXRP, uint256 _timestamp) external",
  "event RequestCreated(uint256 indexed requestId, address indexed creator, string recipientXRPL, string assetSymbol, uint256 assetAmount, uint256 expiry, string message)",
  "event RequestPaid(uint256 indexed requestId, bytes32 indexed txHash, uint256 paidAmount, uint256 timestamp)"
];

class VenmorphAttestor {
  constructor() {
    this.xrplClient = null;
    this.flareProvider = null;
    this.requestManagerContract = null;
    this.wallet = null;
    this.isRunning = false;
    this.lastProcessedLedger = null;
    this.pendingRequests = new Map();
    this.processedTransactions = new Set();
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Attestor Service...');

      // Initialize XRPL client
      await this.initializeXRPL();

      // Initialize Flare connection
      await this.initializeFlare();

      // Load pending requests
      await this.loadPendingRequests();

      console.log('✅ Attestor Service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Attestor Service:', error);
      throw error;
    }
  }

  async initializeXRPL() {
    try {
      const networkUrl = config.xrpl.networks[config.xrpl.network];
      this.xrplClient = new Client(networkUrl);
      
      await this.xrplClient.connect();
      console.log(`🔗 Connected to XRPL ${config.xrpl.network}`);

      // Get latest ledger info
      const serverInfo = await this.xrplClient.request({
        command: 'server_info'
      });
      
      this.lastProcessedLedger = serverInfo.result.info.validated_ledger.seq;
      console.log(`📊 Starting from ledger: ${this.lastProcessedLedger}`);

    } catch (error) {
      console.error('❌ Failed to initialize XRPL:', error);
      throw error;
    }
  }

  async initializeFlare() {
    try {
      if (!config.flare.privateKey) {
        throw new Error('ATTESTOR_PRIVATE_KEY environment variable is required');
      }
      
      if (!config.flare.requestManagerAddress) {
        throw new Error('REQUEST_MANAGER_ADDRESS environment variable is required');
      }

      this.flareProvider = new ethers.JsonRpcProvider(config.flare.rpcUrl);
      this.wallet = new ethers.Wallet(config.flare.privateKey, this.flareProvider);
      
      this.requestManagerContract = new ethers.Contract(
        config.flare.requestManagerAddress,
        REQUEST_MANAGER_ABI,
        this.wallet
      );

      console.log(`🔗 Connected to Flare network (Chain ID: ${config.flare.chainId})`);
      console.log(`📋 Request Manager: ${config.flare.requestManagerAddress}`);
      console.log(`👤 Attestor Address: ${this.wallet.address}`);

    } catch (error) {
      console.error('❌ Failed to initialize Flare:', error);
      throw error;
    }
  }

  async loadPendingRequests() {
    try {
      const totalRequests = await this.requestManagerContract.getTotalRequests();
      console.log(`📊 Total requests in contract: ${totalRequests.toString()}`);

      // Load recent requests for monitoring
      const batchSize = Math.min(config.attestor.batchSize, totalRequests.toNumber());
      for (let i = Math.max(0, totalRequests.toNumber() - batchSize); i < totalRequests.toNumber(); i++) {
        try {
          const request = await this.requestManagerContract.getRequest(i);
          if (request.status === 1) { // Status 1 = Pending
            this.pendingRequests.set(i, request);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load request ${i}:`, error.message);
        }
      }

      console.log(`📋 Loaded ${this.pendingRequests.size} pending requests`);
    } catch (error) {
      console.error('❌ Failed to load pending requests:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.initialize();
      this.isRunning = true;
      
      console.log('🎯 Starting attestor monitoring...');
      
      // Start monitoring for new requests
      this.startRequestMonitoring();
      
      // Start XRPL transaction monitoring
      this.startXRPLMonitoring();

    } catch (error) {
      console.error('❌ Failed to start attestor:', error);
      process.exit(1);
    }
  }

  startRequestMonitoring() {
    // Monitor for new requests every 30 seconds
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const totalRequests = await this.requestManagerContract.getTotalRequests();
        const currentCount = totalRequests.toNumber();
        
        // Check for new requests
        for (let i = this.pendingRequests.size; i < currentCount; i++) {
          try {
            const request = await this.requestManagerContract.getRequest(i);
            if (request.status === 1) { // Status 1 = Pending
              this.pendingRequests.set(i, request);
              console.log(`🆕 New pending request detected: ${i}`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to load new request ${i}:`, error.message);
          }
        }
      } catch (error) {
        console.error('❌ Error monitoring requests:', error);
      }
    }, 30000);
  }

  startXRPLMonitoring() {
    // Monitor XRPL transactions every 10 seconds
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.checkXRPLTransactions();
      } catch (error) {
        console.error('❌ Error monitoring XRPL:', error);
      }
    }, config.attestor.pollInterval);
  }

  async checkXRPLTransactions() {
    try {
      const serverInfo = await this.xrplClient.request({
        command: 'server_info'
      });
      
      const currentLedger = serverInfo.result.info.validated_ledger.seq;
      
      if (this.lastProcessedLedger && currentLedger > this.lastProcessedLedger) {
        // Process transactions from new ledgers
        for (let ledger = this.lastProcessedLedger + 1; ledger <= currentLedger; ledger++) {
          await this.processLedger(ledger);
        }
      }
      
      this.lastProcessedLedger = currentLedger;
      
    } catch (error) {
      console.error('❌ Error checking XRPL transactions:', error);
    }
  }

  async processLedger(ledgerIndex) {
    try {
      const ledger = await this.xrplClient.request({
        command: 'ledger',
        ledger_index: ledgerIndex,
        transactions: true
      });

      if (ledger.result.ledger.transactions) {
        for (const tx of ledger.result.ledger.transactions) {
          await this.processTransaction(tx);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ledger ${ledgerIndex}:`, error);
    }
  }

  async processTransaction(tx) {
    try {
      // Skip if already processed
      if (this.processedTransactions.has(tx.hash)) {
        return;
      }

      // Check if this is a payment transaction
      if (tx.TransactionType === 'Payment') {
        await this.checkPaymentTransaction(tx);
      }

      this.processedTransactions.add(tx.hash);
    } catch (error) {
      console.error(`❌ Error processing transaction ${tx.hash}:`, error);
    }
  }

  async checkPaymentTransaction(tx) {
    try {
      // Check if this payment matches any pending request
      for (const [requestId, request] of this.pendingRequests) {
        if (this.matchesRequest(tx, request)) {
          console.log(`💰 Payment found for request ${requestId}: ${tx.hash}`);
          
          // Submit attestation
          await this.submitAttestation(requestId, tx.hash, tx.Amount, tx.date);
          
          // Remove from pending
          this.pendingRequests.delete(requestId);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking payment transaction:`, error);
    }
  }

  matchesRequest(tx, request) {
    // Check if transaction matches the request criteria
    // This is a simplified matching - you may need more sophisticated logic
    return tx.Destination === request.recipientXRPL && 
           tx.Amount === request.assetAmount;
  }

  async submitAttestation(requestId, txHash, amount, timestamp) {
    try {
      console.log(`📝 Submitting attestation for request ${requestId}...`);
      
      const tx = await this.requestManagerContract.submitPaymentAttestation(
        requestId,
        txHash,
        amount,
        timestamp
      );
      
      await tx.wait();
      console.log(`✅ Attestation submitted for request ${requestId}: ${tx.hash}`);
      
    } catch (error) {
      console.error(`❌ Failed to submit attestation for request ${requestId}:`, error);
    }
  }

  async stop() {
    console.log('🛑 Stopping attestor service...');
    this.isRunning = false;
    
    if (this.xrplClient) {
      await this.xrplClient.disconnect();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (attestor) {
    await attestor.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  if (attestor) {
    await attestor.stop();
  }
  process.exit(0);
});

// Start the attestor
const attestor = new VenmorphAttestor();
attestor.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});