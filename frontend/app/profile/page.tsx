'use client';

import EnhancedUserProfile from '../components/EnhancedUserProfile';
import { EmptyState } from '../components/EmptyState';
import { useWallet } from '@solana/wallet-adapter-react';
import { Sora } from 'next/font/google';

const premium = Sora({ subsets: ['latin'], weight: ['400', '600'] });

export default function ProfilePage() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <div className={`min-h-screen bg-(--background) ${premium.className}`}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <EmptyState
            icon="🔌"
            title="Connect Your Wallet"
            description="Connect your Phantom wallet to create and manage your profile"
            actionLabel="Connect Wallet"
            onAction={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-(--background) ${premium.className}`}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <EnhancedUserProfile />
      </div>
    </div>
  );
}
