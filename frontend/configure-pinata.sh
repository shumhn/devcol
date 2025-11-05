#!/bin/bash

# Configure Pinata IPFS for c0Foundr
echo "🔧 Configuring Pinata IPFS..."

cat > .env.local << 'EOF'
# Pinata IPFS Configuration
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiYTIyZmFiYy0yMDdhLTQ0NGEtOWM4NC1mOTYzYjYzNDBkOGUiLCJlbWFpbCI6InRoZXNodW1hbmhlcmVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImYzZWU3MzI2ZmE2ZjgyYjQxMjEzIiwic2NvcGVkS2V5U2VjcmV0IjoiYzAwYjhkMzIwZTRhODkxYTc3NGY0MjVmZTM5N2QwZGFmOGM2YmU3NjFmNzliMmQ2YTIxYmIxZDE3ZDE1M2M5ZCIsImV4cCI6MTc5MzkxMTI4M30.Yd0shXVkGU6khiaxbqesDg3uDsfzdHPW2eug8iRAyac

# Solana RPC Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EOF

echo "✅ Created .env.local with Pinata credentials"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your dev server:"
echo "   npm run dev"
echo ""
echo "2. Test image upload:"
echo "   - Go to /profile and upload a profile picture"
echo "   - Or go to /projects/new and upload a project logo"
echo ""
echo "3. Images will be stored on IPFS via Pinata!"
echo "   View at: https://gateway.pinata.cloud/ipfs/YOUR_CID"
