#!/bin/bash

# IPFS Setup Script for c0Foundr
# This script helps you configure Pinata IPFS storage

echo "🚀 c0Foundr IPFS Setup"
echo "====================="
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file found"
    
    # Check if PINATA_JWT is configured
    if grep -q "PINATA_JWT=" .env.local; then
        echo "✅ PINATA_JWT is already configured"
        echo ""
        echo "Current configuration:"
        grep "PINATA_JWT=" .env.local | sed 's/PINATA_JWT=.*/PINATA_JWT=***hidden***/'
    else
        echo "⚠️  PINATA_JWT not found in .env.local"
        echo ""
        echo "Please add your Pinata JWT to .env.local:"
        echo "PINATA_JWT=your_jwt_here"
    fi
else
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
# Pinata IPFS Configuration
# Get your JWT from: https://pinata.cloud
PINATA_JWT=your_pinata_jwt_here

# Solana RPC Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EOF
    echo "✅ Created .env.local file"
    echo ""
    echo "⚠️  Please edit .env.local and add your Pinata JWT"
fi

echo ""
echo "📚 Next Steps:"
echo "1. Get your Pinata JWT from: https://pinata.cloud"
echo "2. Edit .env.local and replace 'your_pinata_jwt_here' with your actual JWT"
echo "3. Restart your dev server: npm run dev"
echo ""
echo "📖 For detailed instructions, see: IPFS_SETUP.md"
