#!/bin/bash

# Configure Pinata IPFS for c0Foundr (no secrets stored in repo)
echo "🔧 Configuring Pinata IPFS..."

cat > .env.local << 'EOF'
# Pinata IPFS Configuration
# Get your JWT from https://pinata.cloud and paste it below
PINATA_JWT=YOUR_PINATA_JWT_HERE

# Solana RPC Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EOF

echo "✅ Created .env.local (remember: do NOT commit this file)"
echo ""
echo "🚀 Next steps:"
echo "1. Edit .env.local and replace YOUR_PINATA_JWT_HERE with your actual JWT"
echo "2. Restart your dev server: npm run dev"
echo "3. Test uploads from /profile or /projects/new"
echo "   Files are accessible at: https://gateway.pinata.cloud/ipfs/<CID>"
