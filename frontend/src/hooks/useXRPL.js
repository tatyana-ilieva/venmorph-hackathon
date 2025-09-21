import { useState, useCallback } from 'react';
import { Client, Wallet, convertStringToHex } from 'xrpl';

// XRPL network configurations
const XRPL_NETWORKS = {
  mainnet: 'wss://xrplcluster.com',
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet: 'wss://s.devnet.rippletest.net:51233'
};

export const useXRPL = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);

  // Initialize XRPL client
  const initializeClient = useCallback(async (network = 'testnet') => {
    try {
      setIsConnecting(true);
      setError(null);

      const xrplClient = new Client(XRPL_NETWORKS[network]);
      await xrplClient.connect();
      
      setClient(xrplClient);
      return xrplClient;
    } catch (err) {
      console.error('Error connecting to XRPL:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Send XRP payment with destination tag
  const sendPayment = useCallback(async (params) => {
    const {
      fromWallet,
      toAddress,
      amountXRP,
      destinationTag,
      memo,
      network = 'testnet'
    } = params;

    try {
      setError(null);
      
      // Initialize client if not already connected
      let xrplClient = client;
      if (!xrplClient || !xrplClient.isConnected()) {
        xrplClient = await initializeClient(network);
      }

      // Prepare payment transaction
      const payment = {
        TransactionType: 'Payment',
        Account: fromWallet.address,
        Destination: toAddress,
        Amount: (parseFloat(amountXRP) * 1000000).toString(), // Convert XRP to drops
      };

      // Add destination tag if provided
      if (destinationTag) {
        payment.DestinationTag = parseInt(destinationTag);
      }

      // Add memo if provided
      if (memo) {
        payment.Memos = [{
          Memo: {
            MemoData: convertStringToHex(memo)
          }
        }];
      }

      // Submit transaction
      const prepared = await xrplClient.autofill(payment);
      const signed = fromWallet.sign(prepared);
      const result = await xrplClient.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        return {
          success: true,
          hash: result.result.hash,
          ledgerIndex: result.result.ledger_index,
          fee: result.result.Fee,
          sequence: result.result.Sequence
        };
      } else {
        throw new Error(`Transaction failed: ${result.result.meta.TransactionResult}`);
      }

    } catch (err) {
      console.error('Error sending payment:', err);
      setError(err.message);
      throw err;
    }
  }, [client, initializeClient]);

  // Get account info
  const getAccountInfo = useCallback(async (address, network = 'testnet') => {
    try {
      setError(null);
      
      let xrplClient = client;
      if (!xrplClient || !xrplClient.isConnected()) {
        xrplClient = await initializeClient(network);
      }

      const accountInfo = await xrplClient.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });

      return {
        balance: parseFloat(accountInfo.result.account_data.Balance) / 1000000, // Convert drops to XRP
        sequence: accountInfo.result.account_data.Sequence,
        ownerCount: accountInfo.result.account_data.OwnerCount,
        previousTxnId: accountInfo.result.account_data.PreviousTxnID
      };
    } catch (err) {
      console.error('Error getting account info:', err);
      setError(err.message);
      throw err;
    }
  }, [client, initializeClient]);

  // Get transaction details
  const getTransaction = useCallback(async (txHash, network = 'testnet') => {
    try {
      setError(null);
      
      let xrplClient = client;
      if (!xrplClient || !xrplClient.isConnected()) {
        xrplClient = await initializeClient(network);
      }

      const response = await xrplClient.request({
        command: 'tx',
        transaction: txHash
      });

      const tx = response.result;
      return {
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
        validated: tx.validated
      };
    } catch (err) {
      console.error('Error getting transaction:', err);
      setError(err.message);
      throw err;
    }
  }, [client, initializeClient]);

  // Monitor payments to a specific address
  const subscribeToPayments = useCallback(async (address, onPayment, network = 'testnet') => {
    try {
      setError(null);
      
      let xrplClient = client;
      if (!xrplClient || !xrplClient.isConnected()) {
        xrplClient = await initializeClient(network);
      }

      // Subscribe to account transactions
      await xrplClient.request({
        command: 'subscribe',
        accounts: [address]
      });

      // Listen for transaction events
      xrplClient.on('transaction', (tx) => {
        if (tx.transaction.TransactionType === 'Payment' && 
            tx.transaction.Destination === address &&
            tx.meta.TransactionResult === 'tesSUCCESS') {
          
          const paymentData = {
            hash: tx.transaction.hash,
            from: tx.transaction.Account,
            to: tx.transaction.Destination,
            amount: tx.transaction.Amount,
            destinationTag: tx.transaction.DestinationTag,
            memos: tx.transaction.Memos,
            ledgerIndex: tx.ledger_index,
            timestamp: new Date()
          };

          onPayment(paymentData);
        }
      });

      return () => {
        xrplClient.request({
          command: 'unsubscribe',
          accounts: [address]
        });
      };

    } catch (err) {
      console.error('Error subscribing to payments:', err);
      setError(err.message);
      throw err;
    }
  }, [client, initializeClient]);

  // Generate XRPL wallet (for testing)
  const generateWallet = useCallback((network = 'testnet') => {
    try {
      const wallet = Wallet.generate();
      return {
        address: wallet.address,
        seed: wallet.seed,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey
      };
    } catch (err) {
      console.error('Error generating wallet:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Fund wallet (testnet only)
  const fundWallet = useCallback(async (address, network = 'testnet') => {
    if (network === 'mainnet') {
      throw new Error('Cannot fund wallets on mainnet');
    }

    try {
      setError(null);
      
      let xrplClient = client;
      if (!xrplClient || !xrplClient.isConnected()) {
        xrplClient = await initializeClient(network);
      }

      const response = await xrplClient.fundWallet();
      return response;
    } catch (err) {
      console.error('Error funding wallet:', err);
      setError(err.message);
      throw err;
    }
  }, [client, initializeClient]);

  // Disconnect client
  const disconnect = useCallback(async () => {
    try {
      if (client && client.isConnected()) {
        await client.disconnect();
      }
      setClient(null);
    } catch (err) {
      console.error('Error disconnecting XRPL client:', err);
    }
  }, [client]);

  // Create payment URL for XUMM or other wallets
  const createPaymentURL = useCallback((params) => {
    const {
      toAddress,
      amountXRP,
      destinationTag,
      memo
    } = params;

    const baseUrl = 'https://xumm.app/detect/payment';
    const searchParams = new URLSearchParams({
      to: toAddress,
      amount: amountXRP.toString()
    });

    if (destinationTag) {
      searchParams.append('dt', destinationTag.toString());
    }

    if (memo) {
      searchParams.append('memo', memo);
    }

    return `${baseUrl}?${searchParams.toString()}`;
  }, []);

  return {
    // State
    isConnecting,
    error,
    isConnected: client?.isConnected() || false,
    
    // Actions
    initializeClient,
    sendPayment,
    getAccountInfo,
    getTransaction,
    subscribeToPayments,
    generateWallet,
    fundWallet,
    disconnect,
    createPaymentURL,
    
    // Utils
    client,
    networks: XRPL_NETWORKS
  };
};