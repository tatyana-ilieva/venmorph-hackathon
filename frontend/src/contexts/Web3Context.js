import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  CONTRACT_ADDRESSES, 
  REQUEST_MANAGER_ABI, 
  FTSO_REGISTRY_ABI,
  getContractAddress,
  getNetworkConfig 
} from '../config/contracts';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [requestManagerContract, setRequestManagerContract] = useState(null);
  const [ftsoRegistryContract, setFtsoRegistryContract] = useState(null);

  // Initialize provider
  useEffect(() => {
    if (window.ethereum) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Check if already connected
      checkConnection();
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Initialize contracts when signer and chainId are available
  useEffect(() => {
    if (signer && chainId) {
      initializeContracts();
    }
  }, [signer, chainId]);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await web3Provider.listAccounts();
        
        if (accounts.length > 0) {
          const network = await web3Provider.getNetwork();
          const signerInstance = web3Provider.getSigner();
          
          setAccount(accounts[0]);
          setChainId(network.chainId);
          setSigner(signerInstance);
          setProvider(web3Provider);
        }
      }
    } catch (err) {
      console.error('Error checking connection:', err);
      setError(err.message);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await web3Provider.getNetwork();
      const signerInstance = web3Provider.getSigner();
      const address = await signerInstance.getAddress();

      setProvider(web3Provider);
      setSigner(signerInstance);
      setAccount(address);
      setChainId(network.chainId);

    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setRequestManagerContract(null);
    setFtsoRegistryContract(null);
    setError(null);
  };

  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          const networkConfig = getNetworkConfig(targetChainId);
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChainId.toString(16)}`,
              chainName: networkConfig.name,
              rpcUrls: [networkConfig.rpcUrl],
              nativeCurrency: networkConfig.nativeCurrency,
              blockExplorerUrls: networkConfig.blockExplorer ? [networkConfig.blockExplorer] : null,
            }],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          setError('Failed to add network to wallet');
        }
      } else {
        console.error('Error switching network:', switchError);
        setError('Failed to switch network');
      }
    }
  };

  const initializeContracts = () => {
    try {
      const requestManagerAddress = getContractAddress(chainId, 'requestManager');
      const ftsoRegistryAddress = getContractAddress(chainId, 'ftsoRegistry');

      if (requestManagerAddress && signer) {
        const requestManager = new ethers.Contract(
          requestManagerAddress,
          REQUEST_MANAGER_ABI,
          signer
        );
        setRequestManagerContract(requestManager);
      }

      if (ftsoRegistryAddress && provider) {
        const ftsoRegistry = new ethers.Contract(
          ftsoRegistryAddress,
          FTSO_REGISTRY_ABI,
          provider
        );
        setFtsoRegistryContract(ftsoRegistry);
      }
    } catch (err) {
      console.error('Error initializing contracts:', err);
      setError('Failed to initialize contracts');
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = (chainId) => {
    // Convert hex to decimal
    const newChainId = parseInt(chainId, 16);
    setChainId(newChainId);
    
    // Reload the page to reset the dapp state
    window.location.reload();
  };

  const value = {
    // State
    provider,
    signer,
    account,
    chainId,
    isConnecting,
    error,
    requestManagerContract,
    ftsoRegistryContract,
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    
    // Helper functions
    isConnected: !!account && !!signer,
    isCorrectNetwork: chainId && (chainId === 14 || chainId === 114 || chainId === 31337),
    networkName: chainId ? getNetworkConfig(chainId)?.name || 'Unknown Network' : null,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};