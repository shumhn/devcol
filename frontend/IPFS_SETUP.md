# IPFS Storage Setup Guide

## Setup Real IPFS Storage with Pinata

Your app is already configured to use Pinata! You just need to add your API key.

### Step 1: Get Your Pinata API Key

1. Go to https://pinata.cloud and create a free account
2. Navigate to **API Keys** in the dashboard
3. Click **New Key** and select these permissions:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
4. Give it a name like "c0Foundr Dev"
5. Copy the **JWT** (it looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 2: Add API Key to Your Project

Create a file named `.env.local` in the `frontend` folder with:

```bash
# Pinata IPFS Configuration
PINATA_JWT=your_pinata_jwt_here

# Solana RPC (if you want to customize)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

Replace `your_pinata_jwt_here` with your actual JWT from Pinata.

### Step 3: Restart Your Dev Server

```bash
# Stop current server (Ctrl+C)
cd /Users/sumangiri/Desktop/devcol/devcol-solana/frontend
rm -rf .next
npm run dev
```

### Step 4: Test Image Upload

1. Go to your profile page
2. Upload a profile picture
3. Check the console - you should see "Uploading to Pinata..."
4. The image will be stored on IPFS and accessible via: `https://gateway.pinata.cloud/ipfs/YOUR_CID`

## How It Works

### Upload Flow:
```
User uploads image → Frontend sends to /api/ipfs/upload
                  ↓
              Next.js API route uploads to Pinata
                  ↓
              Returns IPFS CID (Content ID)
                  ↓
              CID stored in Solana account
                  ↓
              Image displayed via: gateway.pinata.cloud/ipfs/CID
```

### Files Already Configured:
- ✅ `/app/api/ipfs/upload/route.ts` - API endpoint for uploads
- ✅ `/app/utils/ipfs.ts` - Upload functions
- ✅ `/app/components/EnhancedUserProfile.tsx` - Profile picture upload
- ✅ `/app/components/ProjectCreate.tsx` - Project logo upload

## Free Tier Limits

Pinata Free Tier includes:
- ✅ 1 GB storage
- ✅ Unlimited bandwidth
- ✅ 100 pins per month
- ✅ Perfect for development and small apps!

## Troubleshooting

### "PINATA_JWT not configured" error
- Make sure `.env.local` file exists in the `frontend` folder
- Restart your dev server after adding the env variable

### Upload fails with 401 error
- Your JWT might be invalid or expired
- Generate a new API key from Pinata dashboard

### Images not loading
- Check the CID in browser: `https://gateway.pinata.cloud/ipfs/YOUR_CID`
- IPFS can take 10-30 seconds for first-time propagation

## Production Deployment

For production (Vercel/Netlify):
1. Add `PINATA_JWT` to your environment variables in the hosting dashboard
2. Never commit `.env.local` to git (it's already in .gitignore)
3. Consider upgrading to Pinata's paid plan for higher limits

## Alternative: Web3.Storage

If you prefer Web3.Storage instead:
1. Get API token from https://web3.storage
2. Update `/app/api/ipfs/upload/route.ts` to use Web3.Storage SDK
3. Add `WEB3_STORAGE_TOKEN` to `.env.local`
