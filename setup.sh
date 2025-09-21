#!/bin/bash

# 🚀 Venmorph Setup Script
# This script sets up the entire Venmorph project for development

set -e  # Exit on any error

echo "🚀 Setting up Venmorph - The Venmo of Web3"
echo "=========================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 16+ and try again."
    exit 1
fi

echo "✅ Node.js $NODE_VERSION detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ git is not installed. Please install git and try again."
    exit 1
fi

echo "✅ git $(git --version | cut -d' ' -f3) detected"

echo ""
echo "📦 Installing dependencies..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies  
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install contracts dependencies
echo "Installing contracts dependencies..."
cd contracts
npm install
cd ..

# Install attestor dependencies
echo "Installing attestor dependencies..."
cd attestor
npm install
cd ..

echo "✅ All dependencies installed successfully"

echo ""
echo "📄 Setting up configuration..."

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env with your wallet private keys and settings"
else
    echo "⚠️  .env file already exists, skipping template copy"
fi

echo ""
echo "🔨 Compiling smart contracts..."

cd contracts
npx hardhat compile
echo "✅ Smart contracts compiled successfully"
cd ..

echo ""
echo "🧪 Running tests..."

# Test contracts
echo "Testing smart contracts..."
cd contracts
npm test
cd ..

echo "✅ All tests passed"

echo ""
echo "📋 Setup Summary"
echo "================"
echo ""
echo "✅ Dependencies installed"
echo "✅ Smart contracts compiled" 
echo "✅ Tests passed"
echo "✅ Configuration template created"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Edit .env file with your configuration:"
echo "   - Add your Flare wallet private key (get C2FLR from faucet)"
echo "   - Add your attestor wallet private key"
echo "   - Configure XRPL settings"
echo ""
echo "2. Deploy contracts to Coston2 testnet:"
echo "   npm run contracts:deploy:coston2"
echo ""
echo "3. Update .env with deployed contract address"
echo ""
echo "4. Start development environment:"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:3000 to use Venmorph"
echo ""
echo "📖 For detailed deployment instructions, see DEPLOYMENT.md"
echo ""
echo "🎉 Setup completed successfully!"
echo "Ready to build the future of Web3 payments! 🚀"