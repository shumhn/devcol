'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
const InlineWalletSelector = dynamic(() => import('./SelectWalletButton'), { ssr: false });
import { Sora } from 'next/font/google';
import Logo from './Logo';
const ToastContainer = dynamic(() => import('./Toast').then(m => m.ToastContainer), { ssr: false });
const NotificationProvider = dynamic(() => import('./NotificationProvider').then(m => m.NotificationProvider), { ssr: false });
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import ThemeToggle from './ThemeToggle';

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
  
  // Load notified requests from localStorage (requests we've already shown notifications for)
  const getNotifiedRequests = (): Set<string> => {
    if (typeof window === 'undefined' || !publicKey) return new Set();
    try {
      const key = `notifiedRequests_${publicKey.toBase58()}`;
      const stored = localStorage.getItem(key);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  const saveNotifiedRequests = (notified: Set<string>) => {
    if (typeof window === 'undefined' || !publicKey) return;
    try {
      const key = `notifiedRequests_${publicKey.toBase58()}`;
      localStorage.setItem(key, JSON.stringify(Array.from(notified)));
    } catch {}
  };
  
  const refreshPending = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      if (!program || !publicKey) return;
      
      // Fetch all program accounts for collaboration requests
      const conn = (program as any).provider.connection;
      const programId = (program as any).programId;
      const accs = await conn.getProgramAccounts(programId, { commitment: 'processed' });
      
      const received: any[] = [];
      const sent: any[] = [];
      
      for (const a of accs) {
        try {
          const acct = await (program as any).account.collaborationRequest.fetchNullable(a.pubkey, 'processed');
          if (!acct) continue;
          
          if (acct.to?.toString?.() === publicKey.toString()) {
            received.push({ publicKey: a.pubkey, account: acct });
          }
          if (acct.from?.toString?.() === publicKey.toString()) {
            sent.push({ publicKey: a.pubkey, account: acct });
          }
        } catch {
          continue;
        }
      }
      
      // Count pending received requests
      const pendingReceived = received.filter((r: any) => Object.keys(r.account.status)[0] === 'pending').length;
      
      // Count sent requests with responses we haven't notified about yet
      const notifiedRequests = getNotifiedRequests();
      let unreadResponses = 0;
      
      for (const req of sent) {
        const reqId = req.publicKey.toString();
        const currentStatus = Object.keys(req.account.status || {})[0] || 'pending';
        
        // If status is not pending AND we haven't notified yet, count as unread
        if (currentStatus !== 'pending' && !notifiedRequests.has(reqId)) {
          unreadResponses++;
        }
      }
      
      setPendingCount(pendingReceived + unreadResponses);
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
    // Poll every 60 seconds to avoid rate limiting
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
    { href: '/requests', label: 'Requests', showBadge: true as const },
    { href: '/profile', label: 'My Profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <>
    <NotificationProvider />
    <ToastContainer />
    <nav className="sticky top-0 z-50 bg-(--surface) border-b border-(--border)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pr-6">
        <div className="relative flex items-center h-16 gap-4">
          {/* Left Logo */}
          <div className="hidden md:flex items-center">
            <Logo withWordmark href="/" />
          </div>

          {/* Center Tagline (absolute centered) */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <div className={`select-none ${premium.className}`}>
              <div className="px-8 md:px-10 py-2.5 rounded-full border border-(--border) bg-(--surface)/80 backdrop-blur text-lg md:text-xl font-semibold tracking-tight text-(--text-primary)">
                <span>Co‑build, catch bugs, crush launches.</span>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4 ml-auto relative" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Wallet */}
            <div style={{ zIndex: 10000, position: 'relative', pointerEvents: 'auto' }}>
              <InlineWalletSelector />
            </div>

            {/* Requests (LinkedIn-style badge) */}
            {publicKey && (
              <Link href="/requests" className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-(--border) bg-(--surface) hover:bg-(--surface-hover)">
                {/* Message icon */}
                <svg className="w-5 h-5 text-(--text-secondary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-9 8l3.6-3.6A2 2 0 0 1 9.6 16H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14z" />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#00D4AA] text-white text-[11px] font-semibold border border-(--surface)">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-(--text-secondary) hover:text-(--text-primary)"
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

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer panel */}
            <div className="fixed top-16 inset-x-0 z-50 md:hidden bg-(--surface) border-b border-(--border) shadow-lg">
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive(l.href)
                        ? 'bg-(--surface-hover) text-(--text-primary)'
                        : 'text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)'
                    }`}
                  >
                    <span>{l.label}</span>
                    {l.showBadge && publicKey && pendingCount > 0 && (
                      <span className="h-5 px-1.5 flex items-center justify-center rounded-full bg-[#00D4AA] text-white text-[11px] font-semibold">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
    </>
  );
}
