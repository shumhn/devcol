'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-blue-500">🔷 DevCol</div>
            <span className="text-gray-400 text-sm">Web3 Developer Collaboration</span>
          </div>
          <WalletMultiButton className="bg-blue-600! hover:bg-blue-700!" />
        </div>
      </div>
    </header>
  );
}
