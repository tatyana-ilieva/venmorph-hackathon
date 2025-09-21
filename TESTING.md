# 🧪 Venmorph Testing Guide

This guide covers how to test Venmorph thoroughly before the hackathon demo.

## 🎯 Testing Strategy

### 1. Unit Tests
Test individual components in isolation

### 2. Integration Tests  
Test component interactions

### 3. End-to-End Tests
Test complete user flows

### 4. Demo Rehearsal
Practice the actual demo flow

## 🔧 Running Tests

### All Tests
```bash
# Run all test suites
npm test
```

### Smart Contract Tests
```bash
cd contracts
npm test

# Run specific test file
npx hardhat test test/RequestManager.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Frontend Tests
```bash
cd frontend
npm test

# Run with coverage
npm test -- --coverage --watchAll=false
```

### Backend Tests
```bash
cd backend
npm test

# Run specific test suite
npm test -- --grep "XRPL"
```

## 🎬 End-to-End Testing

### Scenario 1: Basic Payment Request

#### Setup
1. Start all services: `npm run dev`
2. Connect MetaMask to Coston2
3. Ensure XRPL testnet wallet has funds

#### Test Steps
1. **Create Request**
   - Navigate to Create Request page
   - Enter XRPL address: `rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH`
   - Amount: `0.1 ETH`
   - Message: `Test payment`
   - Submit transaction

2. **Verify Request Creation**
   - Check transaction confirmed on Flare
   - Note request ID from event logs
   - Verify request appears in "My Requests"

3. **Share Request**
   - Copy request URL
   - Open in new browser tab
   - Verify all details display correctly

4. **Pay Request**
   - Send XRP to recipient address
   - Include destination tag = request ID
   - Amount should match displayed conversion

5. **Verify Payment**
   - Wait for attestor to detect payment
   - Check request status updates to PAID
   - Verify XRPL transaction hash is recorded

#### Expected Results
- ✅ Request created successfully
- ✅ Real-time price conversion displayed
- ✅ Payment detected automatically
- ✅ Status updated with proof links

### Scenario 2: Multiple Asset Types

Test with different assets:
- ETH request
- BTC request  
- USDT request
- USDC request

Verify FTSO prices load correctly for each.

### Scenario 3: Edge Cases

#### Expired Request
1. Create request with 1-hour expiry
2. Wait for expiry (or modify contract time)
3. Attempt payment
4. Verify payment rejected

#### Insufficient Payment
1. Create request for 1 ETH
2. Send less XRP than required
3. Verify payment rejected due to slippage

#### Wrong Destination Tag
1. Create request
2. Send payment without destination tag
3. Verify payment not detected

#### Cancelled Request
1. Create request
2. Cancel before payment
3. Attempt payment
4. Verify payment not processed

## 🤖 Automated Testing

### Contract Testing
```javascript
// Example test structure
describe("RequestManager", function () {
  it("Should create request successfully", async function () {
    // Test implementation
  });
  
  it("Should calculate XRP amount correctly", async function () {
    // Test implementation  
  });
  
  it("Should accept valid payment attestation", async function () {
    // Test implementation
  });
});
```

### API Testing
```bash
# Test backend health
curl http://localhost:3001/api/health

# Test request creation
curl -X POST http://localhost:3001/api/requests/114 \
  -H "Content-Type: application/json" \
  -d '{"requestIds": [1, 2, 3]}'

# Test XRPL integration
curl http://localhost:3001/api/xrpl/account/rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 10 --num 100 http://localhost:3001/api/health
```

## 📊 Test Data Management

### Test Wallets
Create dedicated test wallets:
```
Flare Wallet 1: 0x1234... (Requester)
Flare Wallet 2: 0x5678... (Attestor)
XRPL Wallet 1: rABC123... (Recipient)
XRPL Wallet 2: rDEF456... (Payer)
```

### Test Assets
Use small amounts for testing:
- 0.001 ETH (cheap to test)
- 0.0001 BTC  
- 1 USDT
- 1 USDC

### Test Scenarios Data
```json
{
  "testRequests": [
    {
      "asset": "ETH",
      "amount": "0.1",
      "recipient": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      "message": "Test payment 1"
    },
    {
      "asset": "BTC", 
      "amount": "0.001",
      "recipient": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      "message": "Bitcoin test"
    }
  ]
}
```

## 🎭 Demo Rehearsal

### Pre-Demo Checklist
- [ ] All services running
- [ ] Wallets funded with testnet tokens
- [ ] Browser tabs prepared
- [ ] Test requests created
- [ ] Backup plan ready

### Demo Script Practice

#### Timing Targets
- **Setup**: 30 seconds
- **Create Request**: 90 seconds  
- **Show Conversion**: 30 seconds
- **Make Payment**: 90 seconds
- **Show Verification**: 60 seconds
- **Wrap-up**: 30 seconds
- **Total**: 5 minutes

#### Practice Runs
1. **Full rehearsal** - Complete demo start to finish
2. **Segment practice** - Individual sections
3. **Backup scenarios** - What if X fails?
4. **Q&A prep** - Common questions

### Common Demo Issues

#### "Transaction Pending"
- Pre-approve transactions
- Use higher gas price
- Have backup transaction ready

#### "XRPL Payment Not Detected"  
- Verify destination tag
- Check attestor logs
- Have manual verification ready

#### "Price Feeds Not Loading"
- Check FTSO connection
- Have static examples ready
- Use mock data if needed

#### "Website Not Loading"
- Check all services running
- Have backup deployment
- Use mobile hotspot if needed

## 📈 Performance Testing

### Metrics to Monitor
- Request creation time
- Payment detection latency  
- UI responsiveness
- API response times

### Load Testing Scenarios
```bash
# Test concurrent request creation
# Test multiple payments simultaneously  
# Test API under load
# Test frontend with many requests
```

### Performance Targets
- Request creation: < 10 seconds
- Payment detection: < 30 seconds
- Page load time: < 3 seconds
- API response: < 1 second

## 🐛 Bug Tracking

### Known Issues Log
```markdown
## Known Issues

### High Priority
- [ ] Issue #1: Description and workaround

### Medium Priority  
- [ ] Issue #2: Description and timeline

### Low Priority
- [ ] Issue #3: Nice to have fix
```

### Bug Report Template
```markdown
**Bug Description:**
Brief description of the issue

**Steps to Reproduce:**
1. Step 1
2. Step 2  
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- Browser: Chrome 118
- Network: Coston2  
- Contract: 0x1234...

**Logs:**
Relevant error messages
```

## ✅ Test Checklist

### Pre-Deployment
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Contract deployment works
- [ ] Frontend builds successfully
- [ ] Backend starts without errors
- [ ] Attestor connects to networks

### Pre-Demo
- [ ] Full end-to-end test completed
- [ ] Demo script rehearsed 3+ times
- [ ] Backup plans tested
- [ ] All wallets funded
- [ ] Services optimized
- [ ] Monitoring enabled

### Post-Demo
- [ ] Collect feedback
- [ ] Document issues found
- [ ] Plan improvements
- [ ] Archive test results

## 🎯 Success Criteria

The testing is successful when:
- ✅ All automated tests pass
- ✅ Full user flow works reliably  
- ✅ Demo can be completed in 5 minutes
- ✅ Edge cases are handled gracefully
- ✅ Performance meets targets
- ✅ Team confident in live demo
