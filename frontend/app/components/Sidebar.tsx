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

  const renderIcon = (href: string) => {
    const iconClass = "w-5 h-5";
    
    switch(href) {
      case '/':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case '/dashboard':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
          </svg>
        );
      case '/projects':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case '/founders':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case '/requests':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case '/profile':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <aside className={`hidden lg:block fixed left-0 top-0 h-screen w-64 bg-(--surface) border-r border-(--border) overflow-y-auto ${premium.className}`}>
      <div className="p-6">
        {/* Logo */}
        <Link href="/" className="block mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">c0Foundr</h1>
          <p className="text-xs mt-1 tracking-wide uppercase text-(--text-secondary)">Developer Collaboration</p>
        </Link>

        {/* Navigation Sections */}
        <div className="space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx}>
              {section.collapsible ? (
                <button
                  onClick={section.toggle}
                  className="flex items-center justify-between w-full text-xs font-semibold text-(--text-secondary) mb-3 tracking-widest uppercase"
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
                <h3 className="text-xs font-semibold text-(--text-secondary) mb-3 tracking-widest uppercase">{section.title}</h3>
              )}

              {(!section.collapsible || section.isOpen) && (
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-(--surface-hover) text-(--text-primary) before:content-[""] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r-full before:bg-[#00D4AA]'
                          : 'text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)'
                      }`}
                    >
                      {renderIcon(item.href)}
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/requests' && pendingCount > 0 && (
                        <span className="h-5 px-1.5 flex items-center justify-center rounded-full bg-[#00D4AA] text-(--background) text-[11px] font-semibold">
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
