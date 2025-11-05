'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { getProjectPDA } from '../utils/programHelpers';
import { SystemProgram } from '@solana/web3.js';
import { Sora } from 'next/font/google';

const premium = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

// Tech stack with icons for display
const TECH_ICONS: Record<string, string> = {
  React: '⚛️',
  'Next.js': '⚡',
  TypeScript: '🔷',
  'Node.js': '🟢',
  Solana: '◎',
  Anchor: '⚓',
  Rust: '🦀',
  PostgreSQL: '🐘',
  MongoDB: '🍃',
  GraphQL: '🌐',
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  justStarted: { label: 'Just Started', color: 'bg-emerald-500 text-white border-emerald-500' },
  inProgress: { label: 'In Progress', color: 'bg-blue-500 text-white border-blue-500' },
  nearlyComplete: { label: 'Nearly Complete', color: 'bg-amber-500 text-white border-amber-500' },
  completed: { label: 'Completed', color: 'bg-purple-500 text-white border-purple-500' },
  activeDev: { label: 'Active Dev', color: 'bg-rose-500 text-white border-rose-500' },
  onHold: { label: 'On Hold', color: 'bg-slate-500 text-white border-slate-500' },
};

const COLLAB_LEVEL_BADGES: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-cyan-500 text-white border-cyan-500' },
  intermediate: { label: 'Intermediate', color: 'bg-indigo-500 text-white border-indigo-500' },
  advanced: { label: 'Advanced', color: 'bg-fuchsia-500 text-white border-fuchsia-500' },
  allLevels: { label: 'All Levels', color: 'bg-violet-500 text-white border-violet-500' },
};

export default function ProjectsPage() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const { connection } = useConnection();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTech, setFilterTech] = useState<string>('all');

  useEffect(() => {
    if (program) {
      fetchProjects();
    } else {
      // No wallet connected
      setLoading(false);
    }
  }, [program]);

  const seedSample = async () => {
    if (!program || !publicKey) return;
    setSeeding(true);
    try {
      // Require user profile
      const [userPda] = getUserPDA(publicKey);
      const userAcct = await (program as any).account.user.fetchNullable(userPda);
      if (!userAcct) {
        alert('❌ Create your profile first. Redirecting...');
        window.location.href = '/profile';
        return;
      }
      // Use timestamp to ensure unique project name each time
      const timestamp = Date.now();
      const name = `Sample Project ${timestamp}`;
      const description = 'A sample Web3 collaboration project on Solana. This project demonstrates the full project flow: tech stack, contribution needs, collaboration level, status, and collaboration intent.';
      const github = 'https://github.com/example/sample-repo';
      const logoHash = '';
      const techStack = ['Solana', 'Anchor', 'React', 'TypeScript'];
      const needs = ['Frontend', 'Smart Contract'];
      const intent = 'Looking for collaborators to build modules and improve the UI/UX. Open to mentorship and long-term contributors.';
      const level = { intermediate: {} };
      const status = { inProgress: {} };
      const roleRequirements = [
        { role: { frontend: {} }, needed: 2, accepted: 0, label: null },
        { role: { backend: {} }, needed: 1, accepted: 0, label: null },
        { role: { fullstack: {} }, needed: 1, accepted: 0, label: null },
      ];

      // Derive PDA
      const { getProjectPDA } = await import('../utils/programHelpers');
      const { SystemProgram } = await import('@solana/web3.js');
      const [projectPDA] = await getProjectPDA(publicKey as any, name);

      const { rpcWithRetry } = await import('../utils/rpcRetry');

      // Preflight: if PDA already exists, bail early to prevent collisions
      try {
        const info = await (program as any).provider.connection.getAccountInfo(projectPDA, 'processed');
        if (info) {
          alert('A sample project with this derived address already exists. Please try again in a few seconds.');
          setSeeding(false);
          return;
        }
      } catch {}

      await rpcWithRetry(() =>
        (program as any).methods
          .createProject(name, description, github, logoHash, techStack, needs, intent, level, status, roleRequirements)
          .accounts({ project: projectPDA, user: userPda, creator: publicKey, systemProgram: SystemProgram.programId })
          .rpc()
      );

      console.log('✅ Sample project created successfully!');
      
      // Manually fetch and add the new project to avoid losing wallet connection
      try {
        // Wait a bit for blockchain to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch the newly created project
        const newProjectAccount = await (program as any).account.project.fetch(projectPDA);
        
        // Add it to the projects list
        setProjects(prev => [...prev, { publicKey: projectPDA, account: newProjectAccount }]);
        
        alert('✅ Seed project created successfully!');
      } catch (fetchError) {
        console.error('Could not fetch new project, but it was created:', fetchError);
        alert('✅ Seed project created! Refresh manually to see it (to avoid disconnecting wallet).');
      }
    } catch (e:any) {
      console.error('Seed error:', e);
      alert('❌ Failed to seed project: ' + (e.message || 'Unknown error'));
    } finally {
      setSeeding(false);
    }
  };

  const fetchProjects = async (retryCount = 0) => {
    if (!program) {
      console.log('Program not initialized yet, skipping fetch');
      // If called from seedSample, retry after a short delay
      if (retryCount < 3) {
        console.log(`Retrying fetchProjects (attempt ${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchProjects(retryCount + 1);
      }
      return;
    }
    setLoading(true);
    try {
      // Double-check program is still valid
      if (!program || !(program as any).account?.project) {
        console.error('Program or project account not available');
        if (retryCount < 3) {
          setLoading(false);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProjects(retryCount + 1);
        }
        return;
      }
      
      // Fetch all project accounts - manually decode to skip old/incompatible ones
      let projectAccounts = [];
      try {
        const conn = (program as any).provider.connection;
        const programId = (program as any).programId;
        const accounts = await conn.getProgramAccounts(programId, { commitment: 'processed' });
        
        // Safely decode each account, skipping failures
        for (const acc of accounts) {
          try {
            const decoded = await (program as any).account.project.fetchNullable(acc.pubkey, 'processed');
            if (decoded) {
              projectAccounts.push({ publicKey: acc.pubkey, account: decoded });
            }
          } catch (e) {
            // Skip accounts that fail to decode (old schema, corrupted, or not a project)
            console.log('Skipping account that failed to decode:', acc.pubkey.toString().slice(0, 8));
            continue;
          }
        }
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        setProjects([]);
        return;
      }
      
      // Filter to only show OPEN projects (hide closed projects from public view)
      const openProjects = projectAccounts.filter((project: any) => {
        try {
          const collabStatus = project.account.acceptingCollaborations;
          
          // If missing the field entirely, it's an old project - hide it
          if (!collabStatus || (collabStatus !== undefined && collabStatus === null)) {
            console.log(`Hiding old project without acceptingCollaborations:`, project.publicKey.toString().slice(0, 8));
            return false;
          }
          
          // Check if project is Open (has {open: {}} enum)
          const isOpen = collabStatus.open !== undefined;
          
          if (!isOpen) {
            console.log(`Hiding closed project:`, project.publicKey.toString().slice(0, 8));
            return false;
          }
          
          return true; // Show open projects
        } catch (e) {
          console.log('Error checking project status, hiding it:', e);
          return false;
        }
      });
      
      console.log(`Fetched ${projectAccounts.length} projects, showing ${openProjects.length} open projects`);
      setProjects(openProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Don't show error to user if it's just rate limiting or connection issues
      if (error instanceof Error && !error.message.includes('429')) {
        // Only log non-rate-limit errors
        console.error('Non-rate-limit error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.account.name.toLowerCase().includes(query) ||
          p.account.description.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((p) => {
        const status = Object.keys(p.account.projectStatus)[0];
        return status === filterStatus;
      });
    }

    // Tech filter
    if (filterTech !== 'all') {
      filtered = filtered.filter((p) =>
        p.account.techStack.some((t: any) => t.value === filterTech)
      );
    }

    return filtered;
  }, [projects, searchQuery, filterStatus, filterTech]);

  const allTechs = useMemo(() => {
    const techs = new Set<string>();
    projects.forEach((p) => {
      p.account.techStack.forEach((t: any) => techs.add(t.value));
    });
    return Array.from(techs).sort();
  }, [projects]);

  return (
    <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Discover Projects</h1>
          <p className="text-gray-600 text-lg">
            Browse Web3 projects and find collaboration opportunities on Solana
          </p>
        </div>
        {publicKey && (
          <button
            onClick={seedSample}
            disabled={seeding}
            className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            title="Create a sample project on-chain for testing"
          >
            {seeding ? 'Seeding...' : 'Seed Sample'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or description..."
            className="w-full bg-gray-50 text-gray-900 rounded-lg px-4 py-3 border border-gray-200 focus:border-gray-900 focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-700 text-sm font-medium mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 rounded-lg px-4 py-2 border border-gray-200 focus:border-gray-900 focus:outline-none transition-colors"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_BADGES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tech Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-700 text-sm font-medium mb-2">Filter by Tech</label>
            <select
              value={filterTech}
              onChange={(e) => setFilterTech(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 rounded-lg px-4 py-2 border border-gray-200 focus:border-gray-900 focus:outline-none transition-colors"
            >
              <option value="all">All Technologies</option>
              {allTechs.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 text-gray-600 text-sm font-medium">
        Showing {filteredProjects.length} of {projects.length} projects
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-900 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading projects...</p>
        </div>
      ) : !publicKey ? (
        <div className="text-center py-16 bg-(--surface) border border-(--border) rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-bold text-(--text-primary) mb-2">Connect Your Wallet</h3>
          <p className="text-(--text-secondary) mb-6">
            Connect your Phantom wallet to view and create projects
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-6">
            {projects.length === 0
              ? 'Be the first to create a project!'
              : 'Try adjusting your filters or search query'}
          </p>
          {publicKey && projects.length === 0 && (
            <Link href="/projects/new">
              <button className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                Create First Project
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const status = Object.keys(project.account.projectStatus)[0];
            const collabLevel = Object.keys(project.account.collaborationLevel)[0];
            const statusBadge = STATUS_BADGES[status] || STATUS_BADGES.inProgress;
            const collabBadge = COLLAB_LEVEL_BADGES[collabLevel] || COLLAB_LEVEL_BADGES.intermediate;

            return (
              <Link
                key={project.publicKey.toString()}
                href={`/projects/${project.publicKey.toString()}`}
                className="block group"
              >
                <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-gray-900 h-full flex flex-col">
                  {/* Logo & Title */}
                  <div className="mb-4 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                      {project.account.logoIpfsHash ? (
                        <img
                          src={`https://gateway.pinata.cloud/ipfs/${project.account.logoIpfsHash}`}
                          alt={project.account.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">📁</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-gray-700 transition-colors">
                        {project.account.name}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                          {collabBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 grow leading-relaxed">
                    {project.account.description}
                  </p>

                  {/* Tech Stack */}
                  {project.account.techStack.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {project.account.techStack.slice(0, 3).map((tech: any, idx: number) => {
                          // Bright premium colors for tech tags
                          const colors = [
                            'bg-purple-500 text-white',
                            'bg-pink-500 text-white', 
                            'bg-orange-500 text-white',
                            'bg-blue-500 text-white',
                            'bg-red-500 text-white',
                            'bg-yellow-500 text-gray-900',
                          ];
                          return (
                            <span
                              key={idx}
                              className={`text-[10px] px-2 py-1 rounded-lg ${colors[idx % colors.length]} font-semibold`}
                            >
                              {tech.value}
                            </span>
                          );
                        })}
                        {project.account.techStack.length > 3 && (
                          <span className="text-[10px] px-2 py-1 rounded-lg bg-gray-900 text-white font-semibold">
                            +{project.account.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs pt-4 border-t border-gray-200">
                    <span className="text-gray-500 font-medium">👥 {project.account.contributorsCount || 1} contributors</span>
                    <span className="text-gray-900 font-semibold group-hover:underline">View →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
