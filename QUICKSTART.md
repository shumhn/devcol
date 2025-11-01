# 🚀 Quick Start Guide - DevCol

Get up and running in 5 minutes!

## Step 1: Start the Frontend (Already Running!)

The development server is already running at **http://localhost:3000** 🎉

If you need to restart it:
```bash
cd frontend
npm run dev
```

## Step 2: Install Phantom Wallet

1. Visit https://phantom.app/
2. Install the browser extension
3. Create a new wallet or import existing
4. **Switch to Devnet** (Settings → Change Network → Devnet)

## Step 3: Get Test SOL

In Phantom wallet:
- Click the settings icon
- Click "Airdrop" button
- Get free devnet SOL for testing

Or use command line:
```bash
solana airdrop 2
```

## Step 4: Deploy Smart Contract to Devnet

```bash
# In the root directory (/Users/sumangiri/Desktop/devcol/devcol-solana)
anchor build
anchor deploy
```

**IMPORTANT**: After deploying, copy the Program ID from the output and update it in:
- `frontend/app/hooks/useAnchorProgram.ts` (line 10)

## Step 5: Use the App!

1. Open http://localhost:3000
2. Click "Select Wallet" and connect Phantom
3. Create your profile
4. Create a project
5. Test collaboration requests

## 🎯 MVP Features Checklist

- ✅ Memory-optimized smart contracts (<4KB)
- ✅ Wallet authentication (Phantom)
- ✅ User profile creation
- ✅ Project creation and listing
- ✅ Collaboration request system (send/accept/reject)
- ✅ Beautiful, responsive UI with Tailwind CSS

## 📦 What's Included

**Smart Contract** (`/programs/devcol-solana/src/lib.rs`)
- User accounts (~377 bytes)
- Project accounts (~537 bytes)  
- CollaborationRequest accounts (~610 bytes)
- All with proper PDA derivation and security checks

**Frontend** (`/frontend`)
- Next.js 16 with React 19
- Solana Wallet Adapter integration
- TypeScript for type safety
- Tailwind CSS for styling
- All CRUD operations for users, projects, and requests

## 🔧 Common Commands

```bash
# Build smart contract
anchor build

# Deploy to devnet
anchor deploy

# Run tests
anchor test

# Start frontend
cd frontend && npm run dev

# Check Solana config
solana config get

# Get test SOL
solana airdrop 2
```

## 💡 Tips

1. **Always test on devnet first** - Never use real SOL until you're ready
2. **Save your Program ID** - You'll need it after each deployment
3. **Check wallet network** - Make sure Phantom is on Devnet for testing
4. **Transaction failures?** - Check you have enough SOL for gas fees

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Wallet won't connect | Refresh page, unlock Phantom |
| Transaction fails | Check you're on Devnet and have SOL |
| "User not found" | Create profile first |
| Smart contract error | Redeploy and update Program ID |

## 📚 Next Steps

1. Test all features on devnet
2. When ready, deploy to mainnet-beta
3. Consider adding the future features from README
4. Share with the community!

## 🎓 Learning Resources

- Solana Docs: https://docs.solana.com/
- Anchor Framework: https://www.anchor-lang.com/
- Phantom Wallet: https://phantom.app/learn

---

**Need help?** Check the full README.md for detailed documentation!
