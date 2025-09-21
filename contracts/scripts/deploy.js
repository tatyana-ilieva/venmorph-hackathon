const { ethers } = require("hardhat");

// Flare network FTSO Registry addresses
const FTSO_REGISTRY_ADDRESSES = {
  coston2: "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019", // Coston2 testnet
  flare: "0x0262bcA0A4F5C1A8fC5d50cE2E79dfA87d55Ae8D"    // Flare mainnet
};

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // Get FTSO Registry address for the network
  let ftsoRegistryAddress;
  if (network.chainId === 114) { // Coston2
    ftsoRegistryAddress = FTSO_REGISTRY_ADDRESSES.coston2;
  } else if (network.chainId === 14) { // Flare mainnet
    ftsoRegistryAddress = FTSO_REGISTRY_ADDRESSES.flare;
  } else {
    // For local testing, we'll need to deploy a mock
    console.log("Deploying mock FTSO Registry for local testing...");
    const MockFtsoRegistry = await ethers.getContractFactory("MockFtsoRegistry");
    const mockFtsoRegistry = await MockFtsoRegistry.deploy();
    await mockFtsoRegistry.deployed();
    ftsoRegistryAddress = mockFtsoRegistry.address;
    console.log("Mock FTSO Registry deployed to:", ftsoRegistryAddress);
  }
  
  console.log("Using FTSO Registry at:", ftsoRegistryAddress);
  
  // Deploy RequestManager
  console.log("Deploying RequestManager...");
  const RequestManager = await ethers.getContractFactory("RequestManager");
  const requestManager = await RequestManager.deploy(ftsoRegistryAddress);
  
  await requestManager.deployed();
  
  console.log("RequestManager deployed to:", requestManager.address);
  
  // Setup initial configuration
  console.log("Setting up initial configuration...");
  
  // Add deployer as initial attestor for testing
  const tx1 = await requestManager.addAuthorizedAttestor(deployer.address);
  await tx1.wait();
  console.log("Added deployer as authorized attestor");
  
  // Output deployment info
  console.log("\n=== Deployment Complete ===");
  console.log("Network:", network.name);
  console.log("RequestManager:", requestManager.address);
  console.log("FTSO Registry:", ftsoRegistryAddress);
  console.log("Deployer:", deployer.address);
  
  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    requestManager: requestManager.address,
    ftsoRegistry: ftsoRegistryAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `deployments-${network.name}.json`, 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`Deployment info saved to deployments-${network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });