'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Space_Grotesk, Sora } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });
const premium = Sora({ subsets: ['latin'], weight: ['400','600'] });
import { useAnchorProgram, getUserPDA } from './hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';
import ShowcaseCard from './components/ShowcaseCard';
import { rpcWithRetry } from './utils/rpcRetry';
import { getCache, setCache } from './utils/cache';
import { mockProjects, mockFounders } from './utils/mockData';

interface ProjectItem {
  publicKey: PublicKey;
  account: any;
}

interface FounderItem {
  wallet: string;
  username: string;
  displayName?: string;
  bio?: string;
  projects: number;
}

export default function Home() {
  const { program } = useAnchorProgram();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [founders, setFounders] = useState<FounderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (!program) {
        // No wallet connected - show mock data immediately
        setLoading(false);
        return;
      }
      if (loadedRef.current) return; // prevent double-fetch in React strict/dev
      loadedRef.current = true;
      setLoading(true);
      try {
        // Try cache first for instant paint
        const cachedProjects = getCache<any[]>('showcase_projects');
        if (cachedProjects) {
          const restored: ProjectItem[] = cachedProjects.map((p: any) => ({ publicKey: new PublicKey(p.pubkey), account: p.account }));
          setProjects(restored);
        }

        // Fetch with retry
        const all = (await rpcWithRetry(() => (program as any).account.project.all())) as any[];
        setProjects(all as unknown as ProjectItem[]);
        try {
          const toCache = all.map((p: any) => ({ pubkey: p.publicKey.toString(), account: p.account }));
          setCache('showcase_projects', toCache, 60_000);
        } catch {}

        // Derive founders from projects
        const creatorSet: string[] = Array.from(new Set((all as any[]).map((p: any) => p.account.creator.toString()))) as string[];
        // Fetch user accounts in batch
        const pdas = creatorSet.map((w: string) => getUserPDA(new PublicKey(w))[0]);
        // Use cache if present
        const cachedFounders = getCache<FounderItem[]>('showcase_founders');
        if (cachedFounders) {
          setFounders(cachedFounders);
        }
        let infos: any[] = [];
        if (pdas.length > 0) {
          infos = (await rpcWithRetry(() => (program as any).provider.connection.getMultipleAccountsInfo(pdas, 'processed'))) as any[];
        }
        const list: FounderItem[] = creatorSet.map((w: string, i: number) => {
          let username = w.slice(0, 4) + '…' + w.slice(-4);
          let displayName = '';
          let bio = '';
          try {
            if (infos && infos[i]) {
              const dec = (program as any).coder.accounts.decode('User', (infos[i] as any)!.data);
              username = dec.username || username;
              displayName = dec.display_name || '';
              bio = dec.bio || '';
            }
          } catch {}
          const projectsCount = (all as any[]).filter((p: any) => p.account.creator.toString() === w).length;
          return { wallet: w, username, displayName, bio, projects: projectsCount };
        });
        // Sort founders by #projects desc
        list.sort((a, b) => b.projects - a.projects);
        setFounders(list);
        try {
          setCache('showcase_founders', list, 60_000);
        } catch {}
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Showcase load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [program]);

  const featured = useMemo(() => projects.length > 0 ? projects.slice(0, 6) : [], [projects]);
  const displayProjects = featured.length > 0 ? featured : mockProjects.slice(0, 3);
  const displayFounders = founders.length > 0 ? founders : mockFounders.slice(0, 3);

  return (
    <div className="min-h-screen bg-(--background)">
      <main className="max-w-7xl mx-auto px-4 py-10 bg-(--background)">
        {/* Hero */}
        <section className="mb-20 pt-16">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-5">
              <span className="text-(--text-secondary) text-sm font-medium uppercase tracking-wider">Solana Developer Collaboration Platform</span>
            </div>
            <h1 className={`${display.className} text-6xl md:text-7xl font-black mb-4 leading-[0.95] uppercase tracking-tight`} aria-label="Build the next killer project">
              <span className="text-(--text-primary) block animate-reveal-up" style={{ ['--delay' as any]: '0ms' }}>BUILD THE NEXT</span>
              <span className="block animate-reveal-up" style={{ ['--delay' as any]: '200ms' }}>
                <span className="headline-shimmer">KILLER PROJECT</span>
              </span>
            </h1>
            <p className={`${premium.className} text-xl md:text-2xl font-semibold text-(--text-secondary) mb-10 animate-reveal-up`} style={{ ['--delay' as any]: '400ms' }}>
              Find your co‑builder. Ship on Solana.
            </p>
            <p className={`${premium.className} text-(--text-secondary) text-lg font-medium mb-12 max-w-2xl mx-auto leading-relaxed`}>
              Connect with talented Web3 developers, form teams, and collaborate on projects built on Solana. c0Foundr helps you find the right people to bring your ideas to life.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/projects/new" className="px-8 py-4 bg-[#00D4AA] hover:bg-[#00B894] text-white font-black text-lg rounded-lg transition-all shadow-lg hover:shadow-xl">
                Start Building
              </Link>
              <Link href="/founders" className="px-8 py-4 bg-(--surface-hover) hover:bg-(--surface) text-(--text-primary) font-bold rounded-lg transition-all">
                Find Teammates
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Projects */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-(--text-primary) uppercase tracking-tight">Featured Projects</h2>
              <p className="text-(--text-muted) text-sm mt-1">Exceptional work from the community</p>
            </div>
            <Link href="/projects" className="text-sm text-(--text-primary) hover:text-[#00D4AA] font-semibold flex items-center gap-1 transition-colors uppercase tracking-wide">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl glass animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProjects.map((p: any) => {
                const isMock = !p.publicKey;
                if (isMock) {
                  // Mock project
                  return (
                    <ShowcaseCard
                      key={p.id}
                      href={p.projectUrl || '#'}
                      name={p.name}
                      tagline={p.tagline}
                      description={p.description}
                      logoUrl={p.logoUrl}
                      techStack={p.techStack}
                    />
                  );
                } else {
                  // Real project
                  const logoHash = p.account.logoHash || p.account.logo_hash || null;
                  const logoUrl = logoHash ? `https://ipfs.io/ipfs/${logoHash}` : null;
                  const rawTech = p.account.techStack || p.account.tech_stack || [];
                  const tech = (rawTech as any[]).map((t: any) => typeof t === 'string' ? t : (t?.value ?? '')).filter(Boolean);
                  const rawName = p.account.name;
                  const name = typeof rawName === 'string' ? rawName : (rawName?.value ?? '');
                  const rawDesc = p.account.description;
                  const description = typeof rawDesc === 'string' ? rawDesc : (rawDesc?.value ?? '');
                  const rawTag = p.account.collabIntent || p.account.collab_intent;
                  const tagline = typeof rawTag === 'string' ? rawTag : (rawTag?.value ?? '');
                  return (
                    <ShowcaseCard
                      key={p.publicKey.toString()}
                      href={`/projects/${p.publicKey.toString()}`}
                      name={name}
                      tagline={tagline}
                      description={description}
                      logoUrl={logoUrl}
                      techStack={tech}
                    />
                  );
                }
              })}
            </div>
          )}
        </section>

        {/* Founders Spotlight */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-(--text-primary) uppercase tracking-tight">Founders</h2>
              <p className="text-(--text-muted) text-sm mt-1">The builders behind the projects</p>
            </div>
            <Link href="/founders" className="text-sm text-(--text-primary) hover:text-[#00D4AA] font-semibold flex items-center gap-1 transition-colors uppercase tracking-wide">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl glass animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayFounders.slice(0, 6).map((f: any) => {
                const isMock = !f.wallet || f.wallet.match(/^[1-9]{32}$/);
                const href = isMock ? (f.socialLink || '#') : `/profile?wallet=${f.wallet}`;
                return (
                  <Link
                    key={f.wallet || f.username}
                    href={href}
                    target={isMock && f.socialLink ? '_blank' : undefined}
                    rel={isMock && f.socialLink ? 'noopener noreferrer' : undefined}
                    className="group block relative bg-(--surface) rounded-2xl border border-(--border) hover:border-[#00D4AA] shadow-sm hover:shadow-xl transition-all duration-300 p-6 overflow-hidden"
                  >
                    {/* Top gradient bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-[#00D4AA] to-[#00B894]" />
                    
                    <div className="flex items-start gap-4 mb-4">
                      <div className="shrink-0">
                        {f.profilePicture ? (
                          <img 
                            src={f.profilePicture} 
                            alt={f.name || f.username}
                            className="w-16 h-16 rounded-xl object-cover border-2 border-(--border) shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-(--surface-hover) border-2 border-(--border) flex items-center justify-center text-2xl">
                            👤
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-(--text-primary) truncate group-hover:text-[#00D4AA] transition-colors mb-1">
                          {f.name || f.displayName || f.username}
                        </h3>
                        <p className="text-sm text-(--text-secondary) font-medium">@{f.username}</p>
                      </div>
                    </div>
                    
                    {f.bio && (
                      <p className="text-sm text-(--text-secondary) line-clamp-2 leading-relaxed mb-4">
                        {f.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-(--surface-hover) text-(--text-primary) border border-(--border)">
                        {f.projects} {f.projects === 1 ? 'project' : 'projects'}
                      </span>
                    </div>

                    {/* Hover arrow */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-7 h-7 rounded-full bg-[#00D4AA] flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
