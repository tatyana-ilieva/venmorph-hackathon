# 🚀 Venmorph - The Venmo of Web3

> **Hackathon Project**: EasyA x Flare x XRPL Boston Hackathon  
> **Tagline**: Send payment requests in any asset, settle instantly with XRP, verify on-chain with Flare

Venmorph revolutionizes Web3 payments by combining:
- 🌟 **Flare's FTSO oracles** for real-time price feeds
- 🔗 **Flare's Data Connector (FDC)** for cross-chain attestations  
- ⚡ **XRPL's lightning-fast settlement** (sub-second, ultra-low fees)
- 📱 **Venmo-style UX** that anyone can use

## 🎯 What It Does

1. **Create requests** in any asset (ETH, BTC, USDT, etc.) on Flare
2. **Real-time conversion** shows payers the exact XRP equivalent via FTSO
3. **Instant settlement** on XRPL using destination tags for routing
4. **Automatic verification** through Flare attestors that prove XRPL payments
5. **On-chain proof** stored permanently on Flare for audit trails

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Flare Smart    │    │   XRPL Ledger   │
│   (React)       │◄──►│   Contracts      │    │   (Settlement)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │              ┌─────────▼─────────┐             │
         │              │  FTSO Oracles     │             │
         │              │  (Price Feeds)    │             │
         │              └───────────────────┘             │
         │                                                │
         └──────────────┐                ┌────────────────┘
                        │                │
                ┌───────▼────────────────▼───────┐
                │      Attestor Service          │
                │   (XRPL → Flare Bridge)        │
                └────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Git
- MetaMask or Web3 wallet
- XRPL wallet (XUMM recommended)

### 1. Clone & Setup
```bash
git clone https://github.com/your-username/venmorph-hackathon.git
cd venmorph-hackathon

# Install all dependencies
npm run install-all

# Copy environment file
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` with your settings:
```bash
# Get test FLR from: https://faucet.flare.network/coston2
PRIVATE_KEY=your_private_key_without_0x
ATTESTOR_PRIVATE_KEY=your_attestor_private_key

# Network configs (defaults work for demo)
FLARE_CHAIN_ID=114
XRPL_NETWORK=testnet
```

### 3. Deploy Contracts
```bash
# Compile contracts
npm run contracts:compile

# Deploy to Coston2 testnet
npm run contracts:deploy:coston2
```

### 4. Update Contract Addresses
After deployment, update `.env` with the contract address:
```bash
COSTON2_REQUEST_MANAGER_ADDRESS=0x...
```

### 5. Start All Services
```bash
# Start everything (frontend, backend, attestor)
npm run dev
```

### 6. Access the dApp
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Attestor**: Running in background

## 🎮 Demo Flow

### For Requesters (Alice wants 20 ETH):
1. Connect wallet to Flare Coston2 testnet
2. Create request: 20 ETH to XRPL address `rAbc...` 
3. Get shareable link with request ID
4. Share link with payer

### For Payers (Bob has XRP):
1. Open Alice's request link
2. See "20 ETH ≈ 40,000 XRP" (live via FTSO)
3. Pay 40,000 XRP to Alice's XRPL address with Destination Tag = Request ID
4. Payment auto-verified via attestor within seconds

### Automatic Magic:
- Attestor watches XRPL for payments with matching destination tags
- Submits proof to Flare via FDC attestation
- Contract verifies amount vs FTSO price ± slippage tolerance  
- Request marked as PAID with cryptographic proof

## 🛠️ Development

### Project Structure
```
venmorph/
├── frontend/          # React dApp
├── backend/           # Express API
├── contracts/         # Solidity contracts  
├── attestor/          # XRPL monitoring service
├── package.json       # Root scripts
└── README.md          # This file
```

### Key Components

#### Smart Contracts (`contracts/`)
- **RequestManager.sol**: Core payment request logic
- **MockFtsoRegistry.sol**: Local testing oracle
- Uses Flare's FTSO for price feeds
- Integrates with FDC for XRPL attestations

#### Frontend (`frontend/`)
- React + Tailwind CSS
- ethers.js for Flare interaction
- xrpl.js for XRPL integration
- Real-time price updates

#### Backend (`backend/`)
- Express.js REST API
- XRPL transaction querying
- Contract interaction helpers

#### Attestor (`attestor/`)
- Monitors XRPL ledger in real-time
- Detects payments to tracked addresses
- Submits FDC attestations to Flare
- Handles multiple concurrent requests

### Development Commands
```bash
# Install everything
npm run setup

# Start local development
npm run dev

# Run tests
npm test

# Build for production  
npm run build

# Deploy contracts
npm run contracts:deploy:coston2
```

## 🔧 Configuration

### Flare Networks
- **Coston2 Testnet**: Default for development
- **Flare Mainnet**: Production ready

### XRPL Networks  
- **Testnet**: Default for development
- **Mainnet**: Production ready

### Key Environment Variables
```bash
# Flare
FLARE_CHAIN_ID=114                    # Coston2
FLARE_RPC_URL=https://coston2-api...  # RPC endpoint
REQUEST_MANAGER_ADDRESS=0x...         # Deployed contract

# XRPL
XRPL_NETWORK=testnet                  # testnet/mainnet
POLL_INTERVAL=10000                   # Attestor poll frequency

# Wallets
PRIVATE_KEY=...                       # Contract deployer
ATTESTOR_PRIVATE_KEY=...             # Attestor service
```

## 🧪 Testing

### Unit Tests
```bash
# Test contracts
npm run contracts:test

# Test frontend  
npm run frontend:test

# Test backend
npm run backend:test
```

### Integration Testing
1. Deploy to local Hardhat network
2. Start all services in dev mode
3. Create test request
4. Simulate XRPL payment
5. Verify attestation

### Demo Script
```bash
# Full demo with local blockchain
npm run demo
```

## 🚀 Deployment

### Testnet Deployment (Recommended)
```bash
# Deploy to Coston2
npm run contracts:deploy:coston2

# Update .env with addresses
# Start services
npm run start
```

### Mainnet Deployment
```bash
# Deploy to Flare mainnet
npm run contracts:deploy:flare

# Update environment for production
NODE_ENV=production
FLARE_CHAIN_ID=14
XRPL_NETWORK=mainnet

# Start production services
npm run start
```

## 🏆 Hackathon Demo Script

### Live Demo (5 minutes)
1. **Slide**: "Venmorph - Venmo of Web3" (30s)
2. **Create Request**: Alice requests 5 ETH → Bob (60s)
3. **Show Conversion**: Live FTSO price: 5 ETH ≈ 10,000 XRP (30s)  
4. **XRPL Payment**: Bob pays XRP with Destination Tag (60s)
5. **Auto-Verification**: Attestor detects → Flare marks PAID (60s)
6. **Show Results**: On-chain proof + XRPL tx link (30s)

### Key Points to Emphasize
- ✅ **Real Flare FTSO integration** (live price feeds)
- ✅ **Real XRPL settlement** (actual blockchain transactions)  
- ✅ **Working FDC attestations** (cross-chain proof)
- ✅ **Production-ready architecture**
- ✅ **Solves real Web3 UX problems**

## 🎯 What Makes This Special

### Technical Innovation
- **Cross-chain architecture**: Flare ↔ XRPL seamlessly integrated
- **Real oracle usage**: Live FTSO price feeds, not mocked data
- **Automatic attestations**: FDC proves external blockchain events
- **Gas optimization**: Efficient contract design for Flare

### UX Innovation  
- **Familiar interface**: Venmo-style payment requests
- **One-click payments**: XUMM integration for XRP payments
- **Real-time updates**: Live conversion rates and status
- **Social features**: Public request feed and sharing

### Business Value
- **Lower costs**: XRPL fees vs Ethereum mainnet
- **Faster settlement**: Sub-second vs minutes/hours
- **Better UX**: Request-based vs manual calculations
- **Audit trail**: Permanent on-chain verification

## 🛡️ Security Considerations

### Smart Contract Security
- Reentrancy protection
- Input validation
- Access controls
- Slippage protection

### Attestor Security  
- Multiple attestor consensus (production)
- Transaction verification
- Rate limiting
- Error handling

### Frontend Security
- Input sanitization
- XSS protection  
- Secure wallet integration

## 🗺️ Roadmap

### Phase 1: MVP (Hackathon) ✅
- Basic request/payment flow
- Single attestor
- Coston2 testnet

### Phase 2: Beta
- Multi-attestor consensus
- Mainnet deployment
- Mobile-responsive UI

### Phase 3: Production
- Advanced features (recurring, splits)
- Business integrations
- Governance token

## 🤝 Contributing

We welcome contributions! Please see our contribution guidelines.

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit PR

## 📜 License

MIT License - see LICENSE file for details.

## 🏅 Team

Built for EasyA x Flare x XRPL Boston Hackathon by:
- **[Your Name]** - Full-stack development
- **[Partner Name]** - Smart contracts & integration

## 🔗 Links

- **Live Demo**: [venmorph-demo.vercel.app](https://venmorph-demo.vercel.app)
- **Flare Docs**: [docs.flare.network](https://docs.flare.network)
- **XRPL Docs**: [xrpl.org](https://xrpl.org)
- **GitHub**: [github.com/your-username/venmorph](https://github.com/your-username/venmorph)

## 📞 Support

For hackathon questions or technical support:
- Create an issue on GitHub
- Tag us on Twitter: [@VenmorphTeam](https://twitter.com/VenmorphTeam)
- Join our Discord: [discord.gg/venmorph](https://discord.gg/venmorph)

---

**Built with ❤️ for the future of Web3 payments**