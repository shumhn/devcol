'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePathname } from 'next/navigation';
import { useAnchorProgram } from '../hooks/useAnchorProgram';

export default function Navbar() {
  const { publicKey } = useWallet();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { program, provider } = useAnchorProgram();
  const [pendingCount, setPendingCount] = useState(0);

  const canQuery = useMemo(() => !!program && !!publicKey, [program, publicKey]);

  const refreshPending = async () => {
    try {
      if (!program || !publicKey) return;
      const all = await (program as any).account.collaborationRequest.all();
      const rec = all.filter((a: any) => a.account.to?.toString?.() === publicKey.toString());
      const pending = rec.filter((r: any) => Object.keys(r.account.status)[0] === 'pending').length;
      setPendingCount(pending);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to refresh pending requests count', e);
    }
  };

  useEffect(() => {
    if (!canQuery) {
      setPendingCount(0);
      return;
    }
    refreshPending();
    // Subscribe to program account changes and refresh
    const conn = provider?.connection;
    let subId: number | null = null;
    if (conn && program) {
      try {
        subId = conn.onProgramAccountChange((program as any).programId, () => {
          // Debounce slightly
          setTimeout(() => refreshPending(), 200);
        });
      } catch {}
    }
    const interval = setInterval(refreshPending, 15000);
    return () => {
      clearInterval(interval);
      if (conn && subId !== null) {
        try { conn.removeProgramAccountChangeListener(subId); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuery]);

  const navLinks = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/projects', label: 'Projects', icon: '📂' },
    { href: '/profile', label: 'My Profile', icon: '👤' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              ◎ DevCol
            </div>
            <span className="hidden sm:inline text-gray-400 text-sm">Web3 Developer Collaboration</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive(link.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}

            {publicKey && (
              <Link
                href="/requests"
                className={`relative px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive('/requests')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                title="Collaboration Inbox"
              >
                <span className="mr-2">✉️</span>
                Requests
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
            
            {publicKey && (
              <Link
                href="/projects/new"
                className="ml-2 px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all shadow-lg"
              >
                <span className="mr-2">🚀</span>
                Create Project
              </Link>
            )}
          </div>

          {/* Wallet Button */}
          <div className="flex items-center space-x-4">
            <div className="wallet-adapter-button-trigger">
              <WalletMultiButton />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-800"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-800">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive(link.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}

            {publicKey && (
              <Link
                href="/requests"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive('/requests')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-2">✉️</span>
                Requests
                {pendingCount > 0 && (
                  <span className="ml-2 inline-block bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
            
            {publicKey && (
              <Link
                href="/projects/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                <span className="mr-2">🚀</span>
                Create Project
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
