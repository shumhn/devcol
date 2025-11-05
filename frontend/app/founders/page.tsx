'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import { rpcWithRetry } from '../utils/rpcRetry';
import { getCache, setCache } from '../utils/cache';
import { Sora } from 'next/font/google';

const premium = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

interface FounderItem {
  wallet: string;
  username: string;
  bio?: string;
  github?: string;
  role?: string;
  projects: number;
  displayName?: string;
  techStack?: string[];
  twitter?: string;
  country?: string;
  contactInfo?: string;
  profilePicture?: string;
}

export default function FoundersPage() {
  const { program } = useAnchorProgram();
  const [founders, setFounders] = useState<FounderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (!program) return;
      if (loadedRef.current) return;
      loadedRef.current = true;
      setLoading(true);
      try {
        const cached = getCache<FounderItem[]>('founders_dir');
        if (cached) setFounders(cached);

        const all = (await rpcWithRetry(() => (program as any).account.project.all())) as any[];
        const creatorSet: string[] = Array.from(new Set(all.map((p: any) => p.account.creator.toString())));
        const pdas = creatorSet.map((w: string) => getUserPDA(new PublicKey(w))[0]);
        let infos: any[] = [];
        if (pdas.length > 0) {
          infos = (await rpcWithRetry(() => (program as any).provider.connection.getMultipleAccountsInfo(pdas, 'processed'))) as any[];
        }
        const list: FounderItem[] = await Promise.all(creatorSet.map(async (w: string, i: number) => {
          let username = w.slice(0, 4) + '…' + w.slice(-4);
          let bio = '';
          let github = '';
          let role = '';
          let displayName = '';
          let techStack: string[] = [];
          let twitter = '';
          let country = '';
          let contactInfo = '';
          let profilePicture = '';
          
          try {
            if (infos && infos[i]) {
              const dec = (program as any).coder.accounts.decode('User', (infos[i] as any)!.data);
              username = dec.username || username;
              bio = dec.bio || '';
              github = dec.githubLink || dec.github_link || '';
              role = dec.role || '';
              displayName = dec.display_name || dec.displayName || '';
              contactInfo = dec.contactInfo || dec.contact_info || '';
              
              // Fetch IPFS metadata if available
              const ipfsHash = dec.ipfsMetadataHash || dec.ipfs_metadata_hash;
              if (ipfsHash && typeof window !== 'undefined') {
                try {
                  const cached = localStorage.getItem(`ipfs_metadata_${ipfsHash}`);
                  if (cached) {
                    const metadata = JSON.parse(cached);
                    techStack = Array.isArray(metadata.tech_stack) ? metadata.tech_stack : [];
                    twitter = metadata.social_links?.twitter || '';
                    country = metadata.country || '';
                    profilePicture = metadata.profile_picture || '';
                  }
                } catch {}
              }
            }
          } catch {}
          const projectsCount = all.filter((p: any) => p.account.creator.toString() === w).length;
          return { wallet: w, username, bio, github, role, displayName, techStack, twitter, country, contactInfo, profilePicture, projects: projectsCount };
        }));
        list.sort((a, b) => b.projects - a.projects);
        setFounders(list);
        try { setCache('founders_dir', list, 60_000); } catch {}
      } catch (e) {
        console.error('Founders load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [program]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return founders;
    return founders.filter(f =>
      f.username.toLowerCase().includes(q) ||
      (f.bio || '').toLowerCase().includes(q) ||
      f.wallet.toLowerCase().includes(q)
    );
  }, [founders, query]);

  return (
    <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
      <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Founders</h1>
          <p className="text-gray-600 text-lg mt-1">Discover teams building in Web3</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search founders by name, bio, or wallet"
            className="bg-gray-50 border border-gray-200 rounded-lg text-gray-900 px-4 py-3 w-80 focus:border-gray-900 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-12 text-center">
          <p className="text-gray-600 font-medium">No founders found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <Link
              key={f.wallet}
              href={`/founders/${f.wallet}`}
              className="group rounded-2xl border border-gray-200 bg-white hover:shadow-lg hover:border-gray-900 transition-all p-6"
            >
              <div className="flex items-start gap-3 mb-3">
                {/* Profile Picture */}
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {f.profilePicture && typeof window !== 'undefined' && localStorage.getItem(`ipfs_image_${f.profilePicture}`) ? (
                    <img 
                      src={localStorage.getItem(`ipfs_image_${f.profilePicture}`) || ''} 
                      alt={f.displayName || f.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl text-gray-400">?</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-bold text-lg group-hover:text-gray-700 transition-colors truncate">
                    {f.displayName || f.username}
                  </div>
                  <div className="text-[#00D4AA] text-sm font-semibold">@{f.displayName || f.username}</div>
                  {f.role && (
                    <div className="text-xs text-gray-600 mt-0.5">{f.role}</div>
                  )}
                  {f.country && (
                    <div className="text-xs text-gray-500 mt-0.5">📍 {f.country}</div>
                  )}
                </div>
                
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500 text-white font-semibold shrink-0 h-fit">
                  {f.projects}
                </span>
              </div>
              
              {f.bio && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">{f.bio}</p>
              )}
              
              {/* Tech Stack */}
              {f.techStack && f.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {f.techStack.slice(0, 3).map((tech, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                      {tech}
                    </span>
                  ))}
                  {f.techStack.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      +{f.techStack.length - 3}
                    </span>
                  )}
                </div>
              )}
              
              {/* Social Links */}
              {(f.github || f.twitter) && (
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  {f.github && (
                    <a
                      href={f.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-900 hover:underline inline-flex items-center gap-1 font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 .5C5.73.5.98 5.24.98 11.5c0 4.85 3.14 8.96 7.49 10.41.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.03-3.05.66-3.69-1.3-3.69-1.3-.5-1.27-1.22-1.6-1.22-1.6-.99-.68.08-.66.08-.66 1.09.08 1.66 1.12 1.66 1.12.98 1.67 2.57 1.19 3.2.91.1-.71.38-1.19.69-1.46-2.44-.28-5-1.22-5-5.42 0-1.2.43-2.17 1.12-2.94-.11-.28-.49-1.41.11-2.94 0 0 .93-.3 3.04 1.12.88-.25 1.83-.37 2.78-.38.94.01 1.9.13 2.78.38 2.1-1.42 3.03-1.12 3.03-1.12.61 1.53.23 2.66.12 2.94.7.77 1.12 1.74 1.12 2.94 0 4.21-2.57 5.14-5.01 5.41.39.34.73 1.01.73 2.03 0 1.47-.01 2.66-.01 3.02 0 .29.2.64.76.53 4.35-1.45 7.48-5.56 7.48-10.41C23.02 5.24 18.27.5 12 .5z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </a>
                  )}
                  {f.twitter && (
                    <a
                      href={f.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-900 hover:underline inline-flex items-center gap-1 font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2H21l-6.5 7.43L22 22h-6.158l-4.81-6.243L5.5 22H2l7.02-8.02L2 2h6.342l4.41 5.817L18.244 2zm-1.077 18h1.71L8.92 4H7.14l10.027 16z" />
                      </svg>
                      Twitter
                    </a>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
