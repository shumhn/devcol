# DevCol - Web3 Developer Collaboration Platform

A decentralized platform for developers to collaborate on projects using Solana blockchain. Built with memory-optimized smart contracts to work within Solana's 4KB account size constraint.

## 🎯 Features

### Phase 1 MVP (Completed ✅)
- **Wallet Authentication**: Connect with Phantom wallet - no passwords needed
- **User Profiles**: Create on-chain developer profiles with username, GitHub, and bio
- **Project Creation**: Create projects with metadata stored on Solana blockchain
- **Collaboration Requests**: Send, accept, or reject collaboration requests
- **Memory Optimized**: All account structures optimized to stay well under 4KB:
  - User: ~377 bytes
  - Project: ~537 bytes
  - CollaborationRequest: ~610 bytes

## 🏗️ Architecture

### Smart Contract (Solana + Anchor)
Located in `/programs/devcol-solana/src/lib.rs`

**Account Structures:**
- **User**: `wallet`, `username` (32), `github_link` (100), `bio` (200), `bump`
- **Project**: `creator`, `name` (50), `description` (300), `github_link` (100), `collab_level` (30), `timestamp`, `bump`
- **CollaborationRequest**: `from`, `to`, `project`, `message` (500), `status`, `timestamp`, `bump`

**Instructions:**
- `create_user`, `update_user`
- `create_project`, `update_project`
- `send_collab_request`, `accept_collab_request`, `reject_collab_request`

### Frontend (Next.js + TypeScript)
Located in `/frontend`

**Tech Stack:**
- Next.js 16 (React 19)
- TypeScript
- Tailwind CSS
- Solana Wallet Adapter
- Anchor TypeScript Client

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Rust and Solana CLI
- Anchor Framework
- Phantom Wallet browser extension

### Installation

1. **Clone the repository**
```bash
cd /Users/sumangiri/Desktop/devcol/devcol-solana
```

2. **Install Anchor dependencies**
```bash
yarn install
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
```

### Development

#### 1. Build the Smart Contract
```bash
# In the root directory
anchor build
```

#### 2. Deploy to Devnet (for testing)
```bash
# Configure Solana to devnet
solana config set --url devnet

# Get some SOL for testing
solana airdrop 2

# Deploy the program
anchor deploy
```

**Important**: After deploying, update the Program ID in:
- `frontend/app/hooks/useAnchorProgram.ts` (line 10)
- `programs/devcol-solana/src/lib.rs` (line 3, in `declare_id!()`)

#### 3. Start the Frontend
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage Guide

### 1. Connect Wallet
- Click "Select Wallet" button in the header
- Choose Phantom and approve the connection
- Your wallet address will appear in the header

### 2. Create Your Profile
- After connecting, you'll see a "Create Profile" button
- Enter your username (max 32 chars)
- Add your GitHub link (max 100 chars)
- Write a bio (max 200 chars)
- Approve the transaction in your wallet

### 3. Create a Project
- Click "+ Create Project" in the Projects section
- Fill in project details:
  - Name (max 50 chars)
  - Description (max 300 chars)
  - GitHub repository link (max 100 chars)
  - Collaboration level (max 30 chars, e.g., "Beginner", "Intermediate")
- Approve the transaction

### 4. Send Collaboration Request
- Browse available projects
- Click "Request Collaboration" on a project you're interested in
- Write a message to the project owner (max 500 chars)
- Approve the transaction

### 5. Manage Collaboration Requests
- View incoming requests in the "Collaboration Requests" section
- Accept or reject requests
- Status updates are stored on-chain

## 💾 Memory Optimization

All data structures are carefully designed to stay under Solana's 4KB constraint:

| Account Type | Size | Limit |
|--------------|------|-------|
| User | ~377 bytes | 4KB |
| Project | ~537 bytes | 4KB |
| CollaborationRequest | ~610 bytes | 4KB |

**Optimization Techniques:**
1. Fixed-size string fields with `#[max_len()]` attribute
2. Efficient enum types (u8) for status
3. Minimal account structure with only essential fields
4. PDA-based account derivation (no extra storage needed)

## 🔐 Security Features

- **Wallet-based Authentication**: No passwords, just cryptographic signatures
- **On-chain Verification**: All actions verified by Solana validators
- **PDA Constraints**: Accounts use Program Derived Addresses for security
- **Owner Checks**: Only creators can update their projects
- **Status Validation**: Requests can only be accepted/rejected if pending

## 📁 Project Structure

```
devcol-solana/
├── programs/
│   └── devcol-solana/
│       └── src/
│           └── lib.rs          # Smart contract
├── frontend/
│   ├── app/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── idl/                # Generated IDL
│   │   ├── providers/          # Wallet provider
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Helper functions
│   ├── next.config.ts          # Next.js config
│   └── package.json
├── target/
│   └── idl/                    # Generated IDL
├── Anchor.toml                 # Anchor config
└── README.md
```

## 🧪 Testing

### Smart Contract Tests
```bash
anchor test
```

### Frontend Testing
The frontend is connected to Solana devnet for testing. Make sure you:
1. Have Phantom wallet installed
2. Switch to Devnet in Phantom settings
3. Get test SOL from a faucet

## 🚢 Deployment

### Smart Contract (Mainnet)
```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Build and deploy
anchor build
anchor deploy
```

### Frontend (Vercel/Netlify)
```bash
cd frontend

# Build for production
npm run build

# Deploy to Vercel
vercel deploy

# Or deploy to Netlify
netlify deploy --prod
```

**Environment Variables:**
Update the Program ID in `useAnchorProgram.ts` after mainnet deployment.

## 🐛 Troubleshooting

### Common Issues

1. **"User not found" error**
   - Create your user profile first before creating projects

2. **Transaction fails with "Account already exists"**
   - You may already have a profile/project with that name
   - Use different names or update existing ones

3. **Wallet connection issues**
   - Make sure Phantom is installed and unlocked
   - Check you're on the correct network (devnet/mainnet)

4. **TypeScript errors in IDE**
   - These are related to Anchor IDL type compatibility
   - The app will still run correctly

## 🔮 Future Enhancements

- [ ] Friend/follow system
- [ ] Project snapshots (IPFS/Arweave)
- [ ] Ephemeral stories
- [ ] Like/comment system
- [ ] Advanced search and filtering
- [ ] Notification system
- [ ] Multi-sig collaboration approvals

## 📝 License

MIT License - feel free to use this project as a learning resource!

## 🤝 Contributing

This is an MVP project. Contributions are welcome! Please feel free to submit issues and pull requests.

## 📧 Contact

Built with ❤️ on Solana blockchain
