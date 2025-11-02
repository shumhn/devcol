'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
const ToastContainer = dynamic(() => import('./Toast').then(m => m.ToastContainer), { ssr: false });
const NotificationProvider = dynamic(() => import('./NotificationProvider').then(m => m.NotificationProvider), { ssr: false });
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';

export default function Navbar() {
  const { publicKey } = useWallet();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { program, provider } = useAnchorProgram();
  const [pendingCount, setPendingCount] = useState(0);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  const canQuery = useMemo(() => !!program && !!publicKey, [program, publicKey]);

  const checkProfile = async () => {
    if (!program || !publicKey) {
      setHasProfile(false);
      setProfileChecked(true);
      return;
    }
    try {
      const [userPda] = getUserPDA(publicKey);
      const userAcct = await (program as any).account.user.fetchNullable(userPda);
      setHasProfile(!!userAcct);
    } catch {
      setHasProfile(false);
    } finally {
      setProfileChecked(true);
    }
  };

  // Throttle refresh to avoid RPC bursts
  const refreshInFlight = useRef(false);
  const refreshPending = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      if (!program || !publicKey) return;
      // Filter by recipient (to) using memcmp to reduce data size
      const filters = [
        { memcmp: { offset: 8 + 32, bytes: publicKey.toBase58() } }, // 8 disc + 32 from = start of `to`
      ];
      const rec = await (program as any).account.collaborationRequest.all(filters);
      const pending = rec.filter((r: any) => Object.keys(r.account.status)[0] === 'pending').length;
      setPendingCount(pending);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to refresh pending requests count', e);
    } finally {
      refreshInFlight.current = false;
    }
  };

  useEffect(() => {
    if (!canQuery) {
      setPendingCount(0);
      setHasProfile(false);
      setProfileChecked(false);
      return;
    }
    checkProfile();
    refreshPending();
    // Moderate polling (20s) + focus/visibility-triggered refresh
    const interval = setInterval(refreshPending, 60000);
    const onFocus = () => refreshPending();
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshPending(); };
    try { window.addEventListener('focus', onFocus); } catch {}
    try { document.addEventListener('visibilitychange', onVisibility); } catch {}
    return () => {
      clearInterval(interval);
      try { window.removeEventListener('focus', onFocus); } catch {}
      try { document.removeEventListener('visibilitychange', onVisibility); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuery]);

  const navLinks = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/projects', label: 'Projects', icon: '📂' },
    { href: '/profile', label: 'My Profile', icon: '👤' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <>
    <NotificationProvider />
    <ToastContainer />
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
            
            {publicKey && profileChecked && (
              hasProfile ? (
                <Link
                  href="/projects/new"
                  className="ml-2 px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all shadow-lg"
                >
                  <span className="mr-2">🚀</span>
                  Create Project
                </Link>
              ) : (
                <Link
                  href="/profile"
                  className="ml-2 px-4 py-2 rounded-lg font-medium bg-yellow-600 hover:bg-yellow-700 text-white transition-all"
                  title="Create your profile first"
                >
                  <span className="mr-2">👤</span>
                  Create Profile
                </Link>
              )
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
            
            {publicKey && profileChecked && (
              hasProfile ? (
                <Link
                  href="/projects/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                >
                  <span className="mr-2">🚀</span>
                  Create Project
                </Link>
              ) : (
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg font-medium bg-yellow-600 text-white"
                >
                  <span className="mr-2">👤</span>
                  Create Profile First
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
