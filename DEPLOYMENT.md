# 🚀 Venmorph Deployment Guide

This guide will walk you through deploying Venmorph from scratch for the hackathon demo.

## 📋 Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] Git installed  
- [ ] MetaMask wallet with Coston2 FLR tokens
- [ ] XRPL testnet wallet (XUMM recommended)
- [ ] Code editor (VS Code recommended)

## 🔧 Step-by-Step Deployment

### 1. Get Testnet Tokens

#### Flare Coston2 Testnet Tokens
1. Go to [Flare Faucet](https://faucet.flare.network/coston2)
2. Connect your MetaMask
3. Request C2FLR tokens
4. Wait for confirmation

#### XRPL Testnet Tokens  
1. Open XUMM wallet or [XRPL Testnet Faucet](https://xrpl.org/xrp-testnet-faucet.html)
2. Generate testnet wallet
3. Fund with test XRP
4. Save the address for testing

### 2. Project Setup

```bash
# Clone the repository
git clone https://github.com/your-username/venmorph-hackathon.git
cd venmorph-hackathon

# Install all dependencies
npm run install-all

# Copy environment file
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` with your wallet details:

```bash
# === WALLET CONFIGURATION ===
# Your MetaMask private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Separate key for attestor service (create a new wallet)
ATTESTOR_PRIVATE_KEY=your_attestor_private_key_here

# === NETWORK CONFIGURATION ===
FLARE_CHAIN_ID=114
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
XRPL_NETWORK=testnet

# === SERVICE CONFIGURATION ===
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

⚠️ **Security Note**: Never commit your `.env` file or share private keys!

### 4. Deploy Smart Contracts

```bash
# Compile contracts
npm run contracts:compile

# Deploy to Coston2 testnet
npm run contracts:deploy:coston2
```

You should see output like:
```
Deploying contracts with the account: 0x1234...
RequestManager deployed to: 0x5678...
FTSO Registry: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
```

### 5. Update Contract Addresses

Copy the deployed contract address and update `.env`:

```bash
# Add the deployed contract address
COSTON2_REQUEST_MANAGER_ADDRESS=0x5678... # Use your actual address
REQUEST_MANAGER_ADDRESS=0x5678...         # Same address for attestor
```

### 6. Start All Services

```bash
# Start frontend, backend, and attestor
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001  
- Attestor: Running in background

### 7. Test the Deployment

#### Create Your First Request
1. Open http://localhost:3000
2. Connect MetaMask (switch to Coston2 if needed)
3. Click "Create Request"
4. Fill in:
   - XRPL Address: Your XRPL testnet address
   - Asset: ETH
   - Amount: 0.1 (small test amount)
   - Message: "Test payment"
5. Submit the transaction

#### Test Payment Flow
1. Copy the request link from the created request
2. Open in new tab (simulate sharing)
3. See the XRP conversion amount
4. Use XUMM or manual payment to send XRP with the destination tag
5. Watch for automatic verification

## 🔍 Verification Checklist

### Frontend Working
- [ ] Page loads at localhost:3000
- [ ] Wallet connects to Coston2
- [ ] Can create requests
- [ ] Shows live price conversions
- [ ] Request links work

### Smart Contracts Working  
- [ ] Contracts deployed successfully
- [ ] Can read from contracts (exchange rates)
- [ ] Can write to contracts (create requests)
- [ ] Events are emitted properly

### Attestor Working
- [ ] Connects to XRPL testnet
- [ ] Monitors for payments
- [ ] Submits attestations to Flare
- [ ] Updates request status

### Backend Working
- [ ] API responds at localhost:3001/api/health
- [ ] Can fetch request data
- [ ] XRPL integration works

## 🎯 Demo Preparation

### Pre-Demo Setup (5 minutes before)
1. Have wallets ready with tokens
2. Start all services: `npm run dev`
3. Create a test request
4. Have XRPL payment ready to send
5. Open browser tabs for demo

### Demo Flow (5 minutes)
1. **Show home page** (30s)
   - Explain the problem Venmorph solves
   
2. **Create request** (90s)
   - "Alice wants 1 ETH from Bob"
   - Show real-time FTSO conversion
   - Generate shareable link

3. **Pay with XRPL** (90s)
   - Open request as "Bob"
   - Show XRP equivalent amount
   - Send XRP with destination tag

4. **Automatic verification** (60s)
   - Attestor detects payment
   - Submits proof to Flare
   - Request marked as PAID

5. **Show results** (60s)
   - On-chain proof on Flare
   - XRPL transaction link
   - Complete audit trail

### Backup Plans
- Have a pre-created request ready
- Use manual attestation if needed
- Show testnet transactions if live demo fails

## 🐛 Troubleshooting

### Common Issues

#### "Contract not deployed" Error
```bash
# Re-deploy contracts
npm run contracts:deploy:coston2

# Update .env with new address
```

#### "Insufficient funds" Error
- Get more C2FLR from faucet
- Check gas price settings

#### Attestor Not Working
```bash
# Check attestor logs
cd attestor
npm run dev

# Verify XRPL connection
# Check private key configuration
```

#### Frontend Build Errors
```bash
# Clear and reinstall
cd frontend
rm -rf node_modules
npm install
npm start
```

#### XRPL Payments Not Detected
- Verify destination tag is correct
- Check XRPL network (testnet vs mainnet)
- Ensure attestor is monitoring correct address

### Debug Commands

```bash
# Check contract deployment
cd contracts
npx hardhat run scripts/verify-deployment.js --network coston2

# Test backend API
curl http://localhost:3001/api/health

# Check attestor status
curl http://localhost:3001/api/attestor/status
```

## 📊 Performance Optimization

### For Demo Day
```bash
# Build optimized frontend
cd frontend
npm run build
npx serve -s build -l 3000

# Use production mode
NODE_ENV=production npm run start
```

### Monitoring
- Watch attestor logs for payment detection
- Monitor gas usage on Flare
- Check XRPL transaction confirmations

## 🚀 Production Deployment

### Frontend (Vercel)
```bash
# Build and deploy
cd frontend
npm run build

# Deploy to Vercel
npx vercel --prod
```

### Backend (Railway/Heroku)
```bash
# Set environment variables
# Deploy backend service
# Update CORS settings
```

### Attestor (VPS/Cloud)
```bash
# Deploy as daemon service
# Set up monitoring
# Configure restart policies
```

## 📈 Scaling Considerations

### Multiple Attestors
- Deploy multiple attestor instances
- Implement consensus mechanism
- Use different XRPL servers

### Database Integration
- Add PostgreSQL for request indexing
- Cache exchange rates
- Store attestation history

### Load Balancing
- Multiple backend instances
- CDN for frontend assets
- Rate limiting for APIs

## 🔒 Security Hardening

### Production Checklist
- [ ] Rotate all private keys
- [ ] Enable HTTPS everywhere
- [ ] Set up monitoring/alerts
- [ ] Audit smart contracts
- [ ] Test disaster recovery

### Wallet Security
- Use hardware wallets for mainnet
- Implement multi-sig for critical functions
- Regular key rotation

## 📞 Support During Deployment

If you encounter issues during deployment:

1. **Check the logs** - Each service logs to console
2. **Verify environment** - Ensure all `.env` variables are set
3. **Test networks** - Confirm testnet connectivity
4. **Ask for help** - Use hackathon Discord/Slack

## 🎉 Success Metrics

Your deployment is successful when:
- ✅ All services start without errors
- ✅ Can create and view requests
- ✅ FTSO prices update in real-time
- ✅ XRPL payments are detected and attested
- ✅ Full flow works end-to-end

**Ready for the demo!** 🚀