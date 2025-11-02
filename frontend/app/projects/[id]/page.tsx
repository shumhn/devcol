'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '@/app/hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { Space_Grotesk, Sora } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });
const premium = Sora({ subsets: ['latin'], weight: ['400', '600'] });

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  justStarted: { label: 'Just Started', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  inProgress: { label: 'In Progress', color: 'bg-[#00D4AA] text-gray-900 border-[#00D4AA]' },
  nearlyComplete: { label: 'Nearly Complete', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-300' },
  activeDev: { label: 'Active Development', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  onHold: { label: 'On Hold', color: 'bg-gray-100 text-gray-600 border-gray-300' },
};

const COLLAB_LEVEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  allLevels: 'All Levels',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id && program) {
      fetchProject();
    }
  }, [params.id, program]);

  const fetchProject = async () => {
    if (!params.id || !program) return;
    setLoading(true);
    try {
      const projectPubkey = new PublicKey(params.id as string);
      const projectAccount = await (program as any).account.project.fetch(projectPubkey);
      setProject({ publicKey: projectPubkey, account: projectAccount });
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="text-center text-gray-600">Loading project...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
            <Link href="/projects" className="text-[#00D4AA] hover:underline">
              ← Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { account } = project;
  // Helpers to normalize possible object-wrapped values
  const asString = (v: any): string => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') {
      if ('value' in v) return asString((v as any).value);
      if ('some' in v) return asString((v as any).some);
      if ('toString' in v && typeof (v as any).toString === 'function') return (v as any).toString();
    }
    try { return JSON.stringify(v); } catch { return ''; }
  };
  const asStringArray = (arr: any): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(asString).filter(Boolean);
  };

  const isOwner = publicKey && account.creator?.equals?.(publicKey);
  const statusKey = Object.keys(account.status || account.projectStatus || {})[0] || 'inProgress';
  const levelKey = Object.keys(account.collaborationLevel || account.collabLevel || {})[0] || 'intermediate';
  const statusBadge = STATUS_BADGES[statusKey] || STATUS_BADGES.inProgress;

  const name = asString(account.name);
  const description = asString(account.description);
  const githubLink = asString(account.githubLink || account.github || account.github_url);
  const logoHash = asString(account.logoIpfsHash || account.logoHash || account.logo);
  const techStack = asStringArray(account.techStack || account.tech_stack || []);
  const needs = asStringArray(account.contributionNeeds || account.needs || []);
  const collabIntent = asString(account.collaborationIntent || account.collabIntent || '');

  return (
    <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Back Button */}
        <Link href="/projects" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
          ← Back to Projects
        </Link>

        {/* Hero Header */}
        <header className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {logoHash ? (
                <img
                  src={typeof window !== 'undefined' ? (localStorage.getItem(`ipfs_image_${logoHash}`) || '') : ''}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-sm text-gray-400">No logo</span>
              )}
            </div>

            {/* Title and Meta */}
            <div className="flex-1">
              <h1 className={`${display.className} text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight`}>
                {name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                  {COLLAB_LEVEL[levelKey]}
                </span>
              </div>
            </div>

            {/* GitHub Link */}
            {githubLink && (
              <a
                href={githubLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white text-base font-bold rounded-lg"
              >
                GitHub
              </a>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About This Project</h2>
              <p className="text-gray-700 leading-relaxed">{description}</p>
            </section>

            {/* Tech Stack */}
            {techStack.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Tech Stack</h2>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-[#00D4AA] text-gray-900 text-sm rounded-lg font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Looking For */}
            {needs.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Looking For</h2>
                <div className="flex flex-wrap gap-2">
                  {needs.map((need: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg font-medium"
                    >
                      {need}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Collaboration Intent */}
            {collabIntent && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">About the Project</h2>
                <p className="text-gray-700 leading-relaxed">{collabIntent}</p>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Creator</h2>
              <p className="text-xs text-gray-600 break-all font-mono">{account.creator.toBase58()}</p>
              {isOwner && (
                <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  You own this project
                </div>
              )}
            </section>

            {/* Stats */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Stats</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contributors:</span>
                  <span className="font-semibold text-gray-900">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600">Active</span>
                </div>
              </div>
            </section>

            {/* Actions */}
            {isOwner ? (
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/projects/${project.publicKey.toBase58()}/edit`)}
                  className="w-full px-4 py-3 bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 font-bold rounded-lg"
                >
                  Edit Project
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this project?')) {
                      // deleteProject logic here
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg"
                >
                  Delete Project
                </button>
              </div>
            ) : (
              <button
                onClick={() => alert('Collaboration request feature coming soon!')}
                className="w-full px-4 py-3 bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 font-bold rounded-lg"
              >
                Request to Collaborate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
