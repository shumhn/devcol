'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';

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
  justStarted: { label: '🌱 Just Started', color: 'bg-green-600' },
  inProgress: { label: '🚧 In Progress', color: 'bg-blue-600' },
  nearlyComplete: { label: '🎯 Nearly Complete', color: 'bg-yellow-600' },
  completed: { label: '✅ Completed', color: 'bg-purple-600' },
  activeDev: { label: '🔥 Active Dev', color: 'bg-red-600' },
  onHold: { label: '⏸️ On Hold', color: 'bg-gray-600' },
};

const COLLAB_LEVEL_BADGES: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-green-700' },
  intermediate: { label: 'Intermediate', color: 'bg-blue-700' },
  advanced: { label: 'Advanced', color: 'bg-purple-700' },
  allLevels: { label: 'All Levels', color: 'bg-gray-700' },
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
    }
  }, [program]);

  const seedSample = async () => {
    if (!program || !publicKey) return;
    setSeeding(true);
    try {
      const name = 'DevCol Sample Project';
      const description = 'A sample Web3 collaboration project on Solana. This project demonstrates the full project flow: tech stack, contribution needs, collaboration level, status, and collaboration intent.';
      const github = 'https://github.com/example/sample-repo';
      const logoHash = '';
      const techStack = ['Solana', 'Anchor', 'React', 'TypeScript'];
      const needs = ['Frontend', 'Smart Contract'];
      const intent = 'Looking for collaborators to build modules and improve the UI/UX. Open to mentorship and long-term contributors.';
      const level = { intermediate: {} };
      const status = { inProgress: {} };

      // Derive PDA
      const { getProjectPDA } = await import('../utils/programHelpers');
      const { SystemProgram } = await import('@solana/web3.js');
      const [projectPDA] = await getProjectPDA(publicKey as any, name);

      await (program as any).methods
        .createProject(name, description, github, logoHash, techStack, needs, intent, level, status)
        .accounts({ project: projectPDA, creator: publicKey, systemProgram: SystemProgram.programId })
        .rpc();

      await fetchProjects();
      alert('✅ Seed project created');
    } catch (e:any) {
      console.error('Seed error:', e);
      alert('❌ Failed to seed project: ' + (e.message || 'Unknown error'));
    } finally {
      setSeeding(false);
    }
  };

  const fetchProjects = async () => {
    if (!program) return;
    setLoading(true);
    try {
      const projectAccounts = await (program as any).account.project.all();
      setProjects(projectAccounts);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Discover Projects</h1>
          <p className="text-gray-400">
            Browse Web3 projects and find collaboration opportunities on Solana
          </p>
        </div>
        {publicKey && (
          <button
            onClick={seedSample}
            disabled={seeding}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700"
            title="Create a sample project on-chain for testing"
          >
            {seeding ? 'Seeding...' : '🌱 Seed Sample Project'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search projects by name or description..."
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-300 text-sm mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
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
            <label className="block text-gray-300 text-sm mb-2">Filter by Tech</label>
            <select
              value={filterTech}
              onChange={(e) => setFilterTech(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
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
      <div className="mb-4 text-gray-400">
        Showing {filteredProjects.length} of {projects.length} projects
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-white mb-2">No projects found</h3>
          <p className="text-gray-400 mb-6">
            {projects.length === 0
              ? 'Be the first to create a project!'
              : 'Try adjusting your filters or search query'}
          </p>
          {publicKey && projects.length === 0 && (
            <Link href="/projects/new">
              <button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold">
                🚀 Create First Project
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
                className="block"
              >
                <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-all cursor-pointer border border-gray-700 hover:border-blue-600 h-full flex flex-col">
                  {/* Logo */}
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {project.account.logoIpfsHash ? (
                        <img
                          src={`https://gateway.pinata.cloud/ipfs/${project.account.logoIpfsHash}`}
                          alt={project.account.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">📁</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">
                        {project.account.name}
                      </h3>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${statusBadge.color} text-white`}>
                        {statusBadge.label}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${collabBadge.color} text-white`}>
                        {collabBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3 flex-grow">
                    {project.account.description}
                  </p>

                  {/* Tech Stack */}
                  {project.account.techStack.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {project.account.techStack.slice(0, 4).map((tech: any, idx: number) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded bg-blue-900 text-blue-200"
                          >
                            {TECH_ICONS[tech.value] || '💻'} {tech.value}
                          </span>
                        ))}
                        {project.account.techStack.length > 4 && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                            +{project.account.techStack.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-gray-700">
                    <span>👥 {project.account.contributorsCount} contributors</span>
                    <span className="text-blue-400 hover:underline">View Details →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
