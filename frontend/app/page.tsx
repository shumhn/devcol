'use client';

import EnhancedUserProfile from './components/EnhancedUserProfile';
import ProjectList from './components/ProjectList';
import CollabRequests from './components/CollabRequests';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Web3 Developer Collaboration Platform
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Connect your Solana wallet to create projects, find collaborators, and build amazing things together.
            All secured on-chain with transparent, tamper-proof collaboration.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🔐</div>
            <h3 className="text-white font-semibold mb-2">Wallet Authentication</h3>
            <p className="text-gray-400 text-sm">Connect with Phantom wallet - no passwords needed</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">📂</div>
            <h3 className="text-white font-semibold mb-2">On-Chain Projects</h3>
            <p className="text-gray-400 text-sm">All project data stored securely on Solana blockchain</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🤝</div>
            <h3 className="text-white font-semibold mb-2">Transparent Collaboration</h3>
            <p className="text-gray-400 text-sm">Send and manage collaboration requests trustlessly</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Profile */}
          <div className="lg:col-span-1">
            <EnhancedUserProfile />
            
            <div className="mt-6">
              <CollabRequests />
            </div>
          </div>

          {/* Right Column - Projects */}
          <div className="lg:col-span-2">
            <ProjectList />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-2">🚀 MVP Phase 1 Features</h3>
            <div className="text-gray-300 text-sm space-y-1">
              <p>✓ Wallet-based user authentication (Solana)</p>
              <p>✓ Create and view projects on-chain</p>
              <p>✓ Send collaboration requests to project owners</p>
              <p>✓ Accept/reject collaboration requests</p>
              <p>✓ Memory-optimized smart contracts (&lt;4KB)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
