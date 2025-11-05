'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';
import { Sora } from 'next/font/google';

const premium = Sora({ subsets: ['latin'], weight: ['400','600'] });

export default function Sidebar() {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [exploreOpen, setExploreOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const refreshInFlight = useRef(false);

  const canQuery = useMemo(() => !!program && !!publicKey, [program, publicKey]);

  const isActive = (path: string) => pathname === path;

  // Load notified requests from localStorage
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

  const refreshPending = async () => {
    if (refreshInFlight.current || !program || !publicKey) return;
    refreshInFlight.current = true;
    try {
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
      
      const pendingReceived = received.filter((r: any) => Object.keys(r.account.status)[0] === 'pending').length;
      
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
      console.warn('Sidebar: Failed to refresh pending count', e);
    } finally {
      refreshInFlight.current = false;
    }
  };

  useEffect(() => {
    if (!canQuery) {
      setPendingCount(0);
      return;
    }
    refreshPending();
    const interval = setInterval(refreshPending, 60000);
    const onFocus = () => refreshPending();
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshPending(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuery]);

  const navSections = [
    {
      title: 'Main',
      items: [
        { href: '/', label: 'Home' },
        { href: '/dashboard', label: 'Dashboard' },
      ],
    },
    {
      title: 'Explore',
      collapsible: true,
      isOpen: exploreOpen,
      toggle: () => setExploreOpen(!exploreOpen),
      items: [
        { href: '/projects', label: 'Projects' },
        { href: '/founders', label: 'Founders' },
        { href: '/requests', label: 'Requests' },
      ],
    },
    {
      title: 'Account',
      items: [
        { href: '/profile', label: 'My Profile' },
      ],
    },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-(--background) border-r border-(--border) overflow-y-auto ${premium.className}`}>
      <div className="p-6">
        {/* Logo */}
        <Link href="/" className="block mb-8">
          <h1 className="text-2xl font-semibold text-(--text-primary) tracking-tight">Cofounder</h1>
          <p className="text-xs text-(--text-secondary) mt-1 tracking-wide uppercase">Developer Collaboration</p>
        </Link>

        {/* Navigation Sections */}
        <div className="space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx}>
              {section.collapsible ? (
                <button
                  onClick={section.toggle}
                  className="flex items-center justify-between w-full text-sm font-semibold text-(--text-primary) mb-3 tracking-wide"
                >
                  <span>{section.title}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${section.isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <h3 className="text-sm font-semibold text-(--text-primary) mb-3 tracking-wide uppercase">{section.title}</h3>
              )}

              {(!section.collapsible || section.isOpen) && (
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors tracking-tight ${
                        isActive(item.href)
                          ? 'bg-(--surface-hover) text-(--text-primary)'
                          : 'text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.href === '/requests' && pendingCount > 0 && (
                        <span className="
                         h-5 px-1.5 flex items-center justify-center rounded-full bg-[#00D4AA] text-white text-[11px] font-semibold">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
