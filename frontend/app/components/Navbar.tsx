'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
// Use client-only WalletMultiButton to avoid hydration mismatches
const WalletMultiButtonDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sora } from 'next/font/google';
import Logo from './Logo';
const ToastContainer = dynamic(() => import('./Toast').then(m => m.ToastContainer), { ssr: false });
const NotificationProvider = dynamic(() => import('./NotificationProvider').then(m => m.NotificationProvider), { ssr: false });
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';

const premium = Sora({ subsets: ['latin'], weight: ['500','600'] });

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
    { href: '/', label: 'Home' },
    { href: '/projects', label: 'Projects' },
    { href: '/founders', label: 'Founders' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <>
    <NotificationProvider />
    <ToastContainer />
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">
          {/* Left Logo */}
          <div className="hidden md:flex items-center">
            <Logo withWordmark href="/" />
          </div>

          {/* Center Tagline (absolute centered) */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            <div className={`select-none ${premium.className}`}>
              <div className="px-8 md:px-10 py-2.5 rounded-full border border-gray-300 bg-white/80 backdrop-blur text-lg md:text-xl font-semibold tracking-tight">
                <span>Co‑build, catch bugs, crush launches.</span>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4 ml-auto">
            {/* Wallet */}
            <div className="wallet-adapter-button-trigger">
              <WalletMultiButtonDynamic />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
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
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="px-4">
                <div className={`px-5 py-2 rounded-full border border-gray-300 bg-white/80 backdrop-blur text-sm font-semibold tracking-tight text-center ${premium.className}`}>
                  <span>Co‑build, catch bugs, crush launches.</span>
                </div>
              </div>
            </div>
          )}
      </div>
    </nav>
    </>
  );
}
