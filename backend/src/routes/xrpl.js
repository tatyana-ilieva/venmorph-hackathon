const express = require('express');
const { Client } = require('xrpl');
const router = express.Router();

// XRPL client setup
const XRPL_NETWORKS = {
  mainnet: 'wss://xrplcluster.com',
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet: 'wss://s.devnet.rippletest.net:51233'
};

const network = process.env.XRPL_NETWORK || 'testnet';
const client = new Client(XRPL_NETWORKS[network]);

// Initialize XRPL client
let isClientConnected = false;

const initializeClient = async () => {
  if (!isClientConnected) {
    try {
      await client.connect();
      isClientConnected = true;
      console.log(`🔗 Connected to XRPL ${network}`);
    } catch (error) {
      console.error('Failed to connect to XRPL:', error);
      throw error;
    }
  }
};

// Middleware to ensure client is connected
const ensureConnection = async (req, res, next) => {
  try {
    await initializeClient();
    next();
  } catch (error) {
    res.status(503).json({
      error: {
        message: 'XRPL connection failed',
        details: error.message
      }
    });
  }
};

// Get account info
router.get('/account/:address', ensureConnection, async (req, res) => {
  try {
    const { address } = req.params;

    // Validate XRPL address format
    if (!address.match(/^r[A-HJ-NP-Z0-9]{25,34}$/)) {
      return res.status(400).json({
        error: {
          message: 'Invalid XRPL address format'
        }
      });
    }

    const accountInfo = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });

    res.json({
      address: address,
      balance: parseFloat(accountInfo.result.account_data.Balance) / 1000000, // Convert drops to XRP
      sequence: accountInfo.result.account_data.Sequence,
      ownerCount: accountInfo.result.account_data.OwnerCount,
      previousTxnId: accountInfo.result.account_data.PreviousTxnID,
      ledgerIndex: accountInfo.result.ledger_index
    });

  } catch (error) {
    console.error('Error getting account info:', error);
    
    if (error.data?.error === 'actNotFound') {
      return res.status(404).json({
        error: {
          message: 'Account not found',
          details: 'This XRPL address has not been activated'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Failed to get account info',
        details: error.message
      }
    });
  }
});

// Get transaction details
router.get('/transaction/:hash', ensureConnection, async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate transaction hash format
    if (!hash.match(/^[A-F0-9]{64}$/i)) {
      return res.status(400).json({
        error: {
          message: 'Invalid transaction hash format'
        }
      });
    }

    const transaction = await client.request({
      command: 'tx',
      transaction: hash
    });

    const tx = transaction.result;
    
    res.json({
      hash: tx.hash,
      ledgerIndex: tx.ledger_index,
      account: tx.Account,
      destination: tx.Destination,
      amount: tx.Amount,
      destinationTag: tx.DestinationTag,
      fee: tx.Fee,
      sequence: tx.Sequence,
      memos: tx.Memos,
      result: tx.meta?.TransactionResult,
      validated: tx.validated,
      date: tx.date,
      timestamp: tx.date ? new Date((tx.date + 946684800) * 1000).toISOString() : null
    });

  } catch (error) {
    console.error('Error getting transaction:', error);
    
    if (error.data?.error === 'txnNotFound') {
      return res.status(404).json({
        error: {
          message: 'Transaction not found',
          details: 'The specified transaction hash was not found'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Failed to get transaction',
        details: error.message
      }
    });
  }
});

// Get account transactions with filters
router.get('/account/:address/transactions', ensureConnection, async (req, res) => {
  try {
    const { address } = req.params;
    const { 
      limit = 20, 
      marker, 
      destinationTag,
      minAmount,
      maxAmount,
      startDate,
      endDate
    } = req.query;

    // Validate XRPL address format
    if (!address.match(/^r[A-HJ-NP-Z0-9]{25,34}$/)) {
      return res.status(400).json({
        error: {
          message: 'Invalid XRPL address format'
        }
      });
    }

    const requestParams = {
      command: 'account_tx',
      account: address,
      limit: Math.min(parseInt(limit), 100), // Cap at 100
      ledger_index_min: -1,
      ledger_index_max: -1
    };

    if (marker) {
      requestParams.marker = JSON.parse(marker);
    }

    const response = await client.request(requestParams);
    
    let transactions = response.result.transactions || [];

    // Filter transactions
    transactions = transactions.filter(tx => {
      const transaction = tx.tx;
      
      // Only include Payment transactions
      if (transaction.TransactionType !== 'Payment') return false;
      
      // Only include successful transactions
      if (tx.meta?.TransactionResult !== 'tesSUCCESS') return false;
      
      // Filter by destination tag if specified
      if (destinationTag && transaction.DestinationTag !== parseInt(destinationTag)) {
        return false;
      }
      
      // Filter by amount range if specified
      if (minAmount || maxAmount) {
        const amount = parseFloat(transaction.Amount) / 1000000; // Convert to XRP
        if (minAmount && amount < parseFloat(minAmount)) return false;
        if (maxAmount && amount > parseFloat(maxAmount)) return false;
      }
      
      // Filter by date range if specified
      if (startDate || endDate) {
        const txDate = new Date((transaction.date + 946684800) * 1000);
        if (startDate && txDate < new Date(startDate)) return false;
        if (endDate && txDate > new Date(endDate)) return false;
      }
      
      return true;
    });

    // Format transactions
    const formattedTransactions = transactions.map(tx => ({
      hash: tx.tx.hash,
      ledgerIndex: tx.tx.ledger_index,
      account: tx.tx.Account,
      destination: tx.tx.Destination,
      amount: parseFloat(tx.tx.Amount) / 1000000, // Convert to XRP
      destinationTag: tx.tx.DestinationTag,
      fee: parseFloat(tx.tx.Fee) / 1000000, // Convert to XRP
      sequence: tx.tx.Sequence,
      memos: tx.tx.Memos,
      result: tx.meta?.TransactionResult,
      validated: tx.validated,
      date: tx.tx.date,
      timestamp: tx.tx.date ? new Date((tx.tx.date + 946684800) * 1000).toISOString() : null,
      isIncoming: tx.tx.Destination === address
    }));

    res.json({
      account: address,
      transactions: formattedTransactions,
      marker: response.result.marker ? JSON.stringify(response.result.marker) : null,
      hasMore: !!response.result.marker
    });

  } catch (error) {
    console.error('Error getting account transactions:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get account transactions',
        details: error.message
      }
    });
  }
});

// Validate XRPL address
router.post('/validate-address', (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        error: {
          message: 'Address is required'
        }
      });
    }

    const isValid = address.match(/^r[A-HJ-NP-Z0-9]{25,34}$/);
    
    res.json({
      address: address,
      isValid: !!isValid,
      format: isValid ? 'valid' : 'invalid'
    });

  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Failed to validate address',
        details: error.message
      }
    });
  }
});

// Get network info
router.get('/network/info', ensureConnection, async (req, res) => {
  try {
    const serverInfo = await client.request({
      command: 'server_info'
    });

    const ledger = await client.request({
      command: 'ledger',
      ledger_index: 'validated',
      transactions: false,
      expand: false
    });

    res.json({
      network: network,
      serverInfo: {
        buildVersion: serverInfo.result.info.build_version,
        completeLedgers: serverInfo.result.info.complete_ledgers,
        hostId: serverInfo.result.info.hostid,
        ioLatency: serverInfo.result.info.io_latency_ms,
        peers: serverInfo.result.info.peers,
        pubkeyNode: serverInfo.result.info.pubkey_node,
        serverState: serverInfo.result.info.server_state,
        validatedLedger: serverInfo.result.info.validated_ledger
      },
      ledger: {
        ledgerIndex: ledger.result.ledger_index,
        ledgerHash: ledger.result.ledger_hash,
        closeTime: ledger.result.close_time,
        closeTimeResolution: ledger.result.close_time_resolution,
        totalCoins: ledger.result.total_coins
      }
    });

  } catch (error) {
    console.error('Error getting network info:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get network info',
        details: error.message
      }
    });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down XRPL client...');
  if (isClientConnected) {
    await client.disconnect();
  }
  process.exit(0);
});

module.exports = router;