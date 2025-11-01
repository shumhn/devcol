'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '@/app/hooks/useAnchorProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import Link from 'next/link';

const TECH_ICONS: Record<string, string> = {
  React: '⚛️', 'Next.js': '⚡', TypeScript: '🔷', 'Node.js': '🟢',
  Solana: '◎', Anchor: '⚓', Rust: '🦀', PostgreSQL: '🐘',
  MongoDB: '🍃', GraphQL: '🌐',
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  justStarted: { label: '🌱 Just Started', color: 'bg-green-600' },
  inProgress: { label: '🚧 In Progress', color: 'bg-blue-600' },
  nearlyComplete: { label: '🎯 Nearly Complete', color: 'bg-yellow-600' },
  completed: { label: '✅ Completed', color: 'bg-purple-600' },
  activeDev: { label: '🔥 Active Dev', color: 'bg-red-600' },
  onHold: { label: '⏸️ On Hold', color: 'bg-gray-600' },
};

const COLLAB_LEVEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate',
  advanced: 'Advanced', allLevels: 'All Levels',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabMessage, setCollabMessage] = useState('');
  const [proofGithub, setProofGithub] = useState('');
  const [proofTwitter, setProofTwitter] = useState('');
  const [sending, setSending] = useState(false);
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editCollabIntent, setEditCollabIntent] = useState('');
  const [editLevel, setEditLevel] = useState<'beginner'|'intermediate'|'advanced'|'allLevels'>('intermediate');
  const [editStatus, setEditStatus] = useState<'justStarted'|'inProgress'|'nearlyComplete'|'completed'|'activeDev'|'onHold'>('inProgress');
  const [updating, setUpdating] = useState(false);

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

  const sendCollabRequest = async () => {
    if (!publicKey || !program || !project) return;
    // Basic validation for proofs
    const ghOk = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?\/?$/.test(proofGithub.trim());
    const twOk = /^(@)?[A-Za-z0-9_]{1,15}$/.test(proofTwitter.trim());
    if (!ghOk) {
      alert('Please provide a valid GitHub repo or profile URL');
      return;
    }
    if (!twOk) {
      alert('Please provide a valid Twitter/X handle (e.g. @yourhandle)');
      return;
    }
    const body = collabMessage.trim();
    if (!body) {
      alert('Please add a short message');
      return;
    }
    setSending(true);
    try {
      // Combine proofs + message within 500 chars budget
      const header = `[GH] ${proofGithub.trim()}\n[TW] ${proofTwitter.replace(/^@/, '').trim()}\n`;
      let combined = `${header}\n${body}`;
      if (combined.length > 500) {
        combined = combined.slice(0, 500);
      }
      // Derive PDA for collab request
      const [collabRequestPDA] = await PublicKey.findProgramAddress(
        [
          Buffer.from('collab_request'),
          publicKey.toBuffer(),
          project.publicKey.toBuffer(),
        ],
        (program as any).programId
      );

      await (program as any).methods
        .sendCollabRequest(combined)
        .accounts({
          collabRequest: collabRequestPDA,
          sender: publicKey,
          project: project.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setShowCollabModal(false);
      setCollabMessage('');
      setProofGithub('');
      setProofTwitter('');
      // Redirect to Collaboration Inbox
      router.push('/requests');
    } catch (error: any) {
      console.error('Send collab request error:', error);
      if (error.message?.includes('already in use')) {
        alert('❌ You already sent a request for this project.');
      } else {
        alert('❌ Error: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-400">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-4">📂</div>
        <h2 className="text-2xl font-bold text-white mb-2">Project Not Found</h2>
        <p className="text-gray-400 mb-6">This project doesn't exist or has been removed.</p>
        <Link href="/projects">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
            ← Back to Projects
          </button>
        </Link>
      </div>
    );
  }

  const { account } = project;
  const status = Object.keys(account.projectStatus)[0];
  const collabLevel = Object.keys(account.collaborationLevel)[0];
  const statusBadge = STATUS_BADGES[status];
  const isCreator = publicKey?.toString() === account.creator.toString();

  const openEdit = () => {
    setEditName(account.name);
    setEditDescription(account.description);
    setEditGithub(account.githubLink);
    setEditCollabIntent(account.collabIntent || '');
    setEditLevel(collabLevel as any);
    setEditStatus(status as any);
    setShowEditModal(true);
  };

  const saveEdits = async () => {
    if (!publicKey || !program) return;
    setUpdating(true);
    try {
      // Build optional fields: use null for unchanged fields to keep IDL Option None
      const nameOpt = editName !== account.name ? editName : null;
      const descOpt = editDescription !== account.description ? editDescription : null;
      const githubOpt = editGithub !== account.githubLink ? editGithub : null;
      const intentOpt = editCollabIntent !== (account.collabIntent || '') ? editCollabIntent : null;
      const levelOpt = editLevel !== collabLevel ? { [editLevel]: {} } as any : null;
      const statusOpt = editStatus !== status ? { [editStatus]: {} } as any : null;

      await (program as any).methods
        .updateProject(nameOpt, descOpt, githubOpt, null, null, intentOpt, levelOpt, statusOpt, null)
        .accounts({ project: project.publicKey, creator: publicKey })
        .rpc();

      await fetchProject();
      setShowEditModal(false);
    } catch (e:any) {
      console.error('Update project error:', e);
      alert('❌ Failed to update project: ' + (e.message || 'Unknown error'));
    } finally {
      setUpdating(false);
    }
  };

  const toggleArchive = async () => {
    if (!publicKey || !program) return;
    setUpdating(true);
    try {
      const newActive = !account.isActive;
      await (program as any).methods
        .updateProject(null, null, null, null, null, null, null, null, newActive)
        .accounts({ project: project.publicKey, creator: publicKey })
        .rpc();
      await fetchProject();
    } catch (e:any) {
      console.error('Archive project error:', e);
      alert('❌ Failed to update status: ' + (e.message || 'Unknown error'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link href="/projects" className="text-blue-400 hover:underline mb-4 inline-block">
        ← Back to Projects
      </Link>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-6">
            {/* Logo */}
            <div className="w-24 h-24 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden flex-shrink-0">
              {account.logoIpfsHash ? (
                <img
                  src={`https://gateway.pinata.cloud/ipfs/${account.logoIpfsHash}`}
                  alt={account.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">📁</span>
              )}

  {/* Edit Project Modal */}
  {showEditModal && (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Edit Project</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Project Name</label>
            <input value={editName} onChange={(e)=>setEditName(e.target.value)} maxLength={50} className="w-full bg-gray-700 text-white rounded px-4 py-3" />
          </div>
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Description</label>
            <textarea value={editDescription} onChange={(e)=>setEditDescription(e.target.value)} maxLength={1000} rows={6} className="w-full bg-gray-700 text-white rounded px-4 py-3" />
          </div>
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">GitHub URL</label>
            <input value={editGithub} onChange={(e)=>setEditGithub(e.target.value)} className="w-full bg-gray-700 text-white rounded px-4 py-3" />
          </div>
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Collaboration Intent</label>
            <textarea value={editCollabIntent} onChange={(e)=>setEditCollabIntent(e.target.value)} maxLength={300} rows={4} className="w-full bg-gray-700 text-white rounded px-4 py-3" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Collaboration Level</label>
              <select value={editLevel} onChange={(e)=>setEditLevel(e.target.value as any)} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="allLevels">All Levels</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-2">Status</label>
              <select value={editStatus} onChange={(e)=>setEditStatus(e.target.value as any)} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                <option value="justStarted">Just Started</option>
                <option value="inProgress">In Progress</option>
                <option value="nearlyComplete">Nearly Complete</option>
                <option value="completed">Completed</option>
                <option value="activeDev">Active Dev</option>
                <option value="onHold">On Hold</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={()=>setShowEditModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg">Cancel</button>
          <button onClick={saveEdits} disabled={updating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50">{updating? '⏳ Saving...' : '💾 Save Changes'}</button>
        </div>
      </div>
    </div>
  )}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-3">{account.name}</h1>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded ${statusBadge.color} text-white text-sm`}>
                  {statusBadge.label}
                </span>
                <span className="px-3 py-1 rounded bg-white text-gray-900 text-sm font-semibold">
                  {COLLAB_LEVEL[collabLevel]}
                </span>
              </div>
            </div>
          </div>
          {account.githubLink && (
            <a
              href={account.githubLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <span>🔗</span>
              <span>GitHub</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">📝 About This Project</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{account.description}</p>
          </div>

          {/* Tech Stack */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">💻 Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {account.techStack.map((tech: any, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-2 rounded bg-blue-900 text-blue-200 font-medium"
                >
                  {TECH_ICONS[tech.value] || '💻'} {tech.value}
                </span>
              ))}
            </div>
          </div>

          {/* Contribution Needs */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">🎯 Looking For</h2>
            <div className="flex flex-wrap gap-2">
              {account.contributionNeeds.map((need: any, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-2 rounded bg-purple-900 text-purple-200 font-medium"
                >
                  {need.value}
                </span>
              ))}
            </div>
          </div>

          {/* Collaboration Intent */}
          {account.collabIntent && (
            <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">💬 What They're Looking For</h2>
              <p className="text-white">{account.collabIntent}</p>
            </div>
          )}
        </div>

        {/* Right Column - Actions & Info */}
        <div className="space-y-6">
          {/* Creator Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">👤 Creator</h3>
            <p className="text-gray-400 text-sm break-all">{account.creator.toString()}</p>
            {isCreator && (
              <div className="mt-3 px-3 py-2 rounded bg-blue-900 text-blue-200 text-sm text-center">
                ✨ You own this project
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">📊 Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Contributors:</span>
                <span className="text-white font-semibold">{account.contributorsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-white font-semibold">{account.isActive ? '✅ Active' : '⏸️ Inactive'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isCreator ? (
            <div className="space-y-3">
              <button
                onClick={openEdit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                ✏️ Edit Project
              </button>
              <button
                onClick={toggleArchive}
                disabled={updating}
                className={`w-full px-6 py-3 rounded-lg font-semibold text-white ${account.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {updating ? '⏳ Updating...' : account.isActive ? '🗑️ Archive Project' : '✅ Unarchive Project'}
              </button>
            </div>
          ) : publicKey ? (
            <button
              onClick={() => setShowCollabModal(true)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-lg font-semibold text-lg"
            >
              🤝 Send Collaboration Request
            </button>
          ) : null}
        </div>
      </div>

      {/* Collaboration Request Modal */}
      {showCollabModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Send Collaboration Request</h2>
            <p className="text-gray-400 mb-4">
              Introduce yourself and explain why you'd like to collaborate on <strong>{account.name}</strong>
            </p>
            <textarea
              value={collabMessage}
              onChange={(e) => setCollabMessage(e.target.value)}
              maxLength={500}
              rows={6}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 mb-2"
              placeholder="Hi! I'd love to collaborate on this project because..."
            />
            <div className="text-xs text-gray-500 mb-4">{collabMessage.length}/500 characters</div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCollabModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendCollabRequest}
                disabled={!collabMessage.trim() || sending}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {sending ? '⏳ Sending...' : '✉️ Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
