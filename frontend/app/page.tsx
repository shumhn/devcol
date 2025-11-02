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

interface ProjectItem {
  publicKey: PublicKey;
  account: any;
}

interface FounderItem {
  wallet: string;
  username: string;
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
      if (!program) return;
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
          let bio = '';
          try {
            if (infos && infos[i]) {
              const dec = (program as any).coder.accounts.decode('User', (infos[i] as any)!.data);
              username = dec.username || username;
              bio = dec.bio || '';
            }
          } catch {}
          const projectsCount = (all as any[]).filter((p: any) => p.account.creator.toString() === w).length;
          return { wallet: w, username, bio, projects: projectsCount };
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

  const featured = useMemo(() => projects.slice(0, 6), [projects]);

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Hero */}
        <section className="mb-20 pt-16">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-5">
              <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Solana Developer Collaboration Platform</span>
            </div>
            <h1 className={`${display.className} text-6xl md:text-7xl font-black mb-4 leading-[0.95] uppercase tracking-tight`} aria-label="Build the next killer project">
              <span className="text-gray-900 block animate-reveal-up" style={{ ['--delay' as any]: '0ms' }}>BUILD THE NEXT</span>
              <span className="block animate-reveal-up" style={{ ['--delay' as any]: '200ms' }}>
                <span className="headline-shimmer">KILLER PROJECT</span>
              </span>
            </h1>
            <p className={`${premium.className} text-xl md:text-2xl font-semibold text-gray-700 mb-10 animate-reveal-up`} style={{ ['--delay' as any]: '400ms' }}>
              Find your co‑builder. Ship on Solana.
            </p>
            <p className={`${premium.className} text-gray-600 text-lg mb-12 max-w-2xl mx-auto leading-relaxed`}>
              Connect with talented Web3 developers, form teams, and collaborate on projects built on Solana. DevCol helps you find the right people to bring your ideas to life.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/projects/new" className="px-8 py-4 bg-[#00D4AA] hover:bg-[#00B894] text-white font-bold rounded-lg transition-all">
                Start Building
              </Link>
              <Link href="/founders" className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-all">
                Find Teammates
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Projects */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-tight">Featured Projects</h2>
              <p className="text-gray-500 text-sm mt-1">Exceptional work from the community</p>
            </div>
            <Link href="/projects" className="text-sm text-gray-900 hover:text-[#00D4AA] font-semibold flex items-center gap-1 transition-colors uppercase tracking-wide">
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
          ) : featured.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-12 text-center shadow-sm">
              <div className="text-6xl mb-4 opacity-30">🚀</div>
              <p className="text-gray-600">No projects yet. Be the first to showcase your work.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((p: any) => {
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
              })}
            </div>
          )}
        </section>

        {/* Founders Spotlight */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-tight">Founders</h2>
              <p className="text-gray-500 text-sm mt-1">The builders behind the projects</p>
            </div>
            <Link href="/founders" className="text-sm text-gray-900 hover:text-[#00D4AA] font-semibold flex items-center gap-1 transition-colors uppercase tracking-wide">
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
          ) : founders.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-12 text-center shadow-sm">
              <div className="text-6xl mb-4 opacity-30">👤</div>
              <p className="text-gray-600">No founders yet. Create a profile and submit a project.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {founders.slice(0, 6).map((f) => (
                <Link
                  key={f.wallet}
                  href={`/profile?wallet=${f.wallet}`}
                  className="group rounded-xl bg-white border border-gray-200 hover:border-[#00D4AA] hover:shadow-md transition-all p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-gray-900 font-bold">{f.username}</div>
                    <span className="text-xs text-gray-500 font-medium">{f.projects} projects</span>
                  </div>
                  {f.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{f.bio}</p>
                  )}
                  {!f.bio && (
                    <p className="text-sm text-gray-500">{f.wallet.slice(0, 6)}…{f.wallet.slice(-4)}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
