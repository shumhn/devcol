'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '@/app/hooks/useAnchorProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import Link from 'next/link';
import { Space_Grotesk, Sora } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });
const premium = Sora({ subsets: ['latin'], weight: ['400','600'] });

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  justStarted: { label: 'Just Started', color: 'bg-gray-100 text-gray-700 border border-gray-300' },
  inProgress: { label: 'In Progress', color: 'bg-[#00D4AA] text-white border border-[#00D4AA]' },
  nearlyComplete: { label: 'Nearly Complete', color: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border border-green-300' },
  activeDev: { label: 'Active Development', color: 'bg-blue-100 text-blue-800 border border-blue-300' },
  onHold: { label: 'On Hold', color: 'bg-gray-100 text-gray-600 border border-gray-300' },
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
  const [desiredRole, setDesiredRole] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editCollabIntent, setEditCollabIntent] = useState('');
  const [editTechStack, setEditTechStack] = useState(''); // comma-separated tags
  const [editNeeds, setEditNeeds] = useState(''); // comma-separated tags
  const [editLevel, setEditLevel] = useState<'beginner'|'intermediate'|'advanced'|'allLevels'>('intermediate');
  const [editStatus, setEditStatus] = useState<'justStarted'|'inProgress'|'nearlyComplete'|'completed'|'activeDev'|'onHold'>('inProgress');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params.id && program) {
      fetchProject();
    }
  }, [params.id, program]);

  useEffect(() => {
    const checkProfile = async () => {
      if (!program || !publicKey) {
        setHasProfile(false);
        setProfileChecked(true);
        return;
      }
      try {
        const [userPda] = await PublicKey.findProgramAddress(
          [Buffer.from('user'), publicKey.toBuffer()],
          (program as any).programId
        );
        const acct = await (program as any).account.user.fetchNullable(userPda);
        setHasProfile(!!acct);
      } catch {
        setHasProfile(false);
      } finally {
        setProfileChecked(true);
      }
    };
    checkProfile();
  }, [program, publicKey]);

  useEffect(() => {
    try { console.log('[DevCol] showEditModal', showEditModal); } catch {}
  }, [showEditModal]);

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
    if (!hasProfile) {
      alert('Please create your profile before sending collaboration requests.');
      router.push('/profile');
      return;
    }
    // Basic validation for proofs
    const ghOk = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?\/?$/.test(proofGithub.trim());
    // Accept either Twitter profile URL or handle
    const twOk = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]{1,15}\/?$/.test(proofTwitter.trim()) || /^(@)?[A-Za-z0-9_]{1,15}$/.test(proofTwitter.trim());
    if (!ghOk) {
      alert('Please provide a valid GitHub repo or profile URL');
      return;
    }
    if (!twOk) {
      alert('Please provide a valid Twitter/X profile URL or handle (e.g. https://twitter.com/yourhandle or @yourhandle)');
      return;
    }
    const body = collabMessage.trim();
    if (!body) {
      alert('Please add a short message');
      return;
    }

    // Validate desired role if roles are defined
    if (account.requiredRoles && account.requiredRoles.length > 0) {
      if (!desiredRole) {
        alert('Please select a desired role for this project.');
        return;
      }
      const roleReq = account.requiredRoles.find((r: any) => Object.keys(r.role || {})[0] === desiredRole);
      if (!roleReq || roleReq.accepted >= roleReq.needed) {
        alert('Selected role is no longer available. Please choose another.');
        return;
      }
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
        .sendCollabRequest(combined, desiredRole ? { [desiredRole]: {} } : null)
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
      setDesiredRole('');
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
    // Debug: confirm click handler fires
    try { console.log('[DevCol] Edit click'); } catch {}
    setEditName(account.name);
    setEditDescription(account.description);
    setEditGithub(account.githubLink);
    setEditCollabIntent(account.collabIntent || '');
    setEditTechStack((account.techStack || []).map((t:any)=>t.value).join(', '));
    setEditNeeds((account.contributionNeeds || []).map((t:any)=>t.value).join(', '));
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
      // Parse tags from comma-separated strings
      const parseTags = (s: string) => s.split(',').map(t=>t.trim()).filter(Boolean);
      const newStack = parseTags(editTechStack);
      const newNeeds = parseTags(editNeeds);
      // Compare with current
      const currStack = (account.techStack || []).map((t:any)=>t.value);
      const currNeeds = (account.contributionNeeds || []).map((t:any)=>t.value);
      // Validate limits when changed
      let techStackOpt: string[] | null = null;
      let needsOpt: string[] | null = null;
      const arraysEqual = (a:string[], b:string[]) => a.length===b.length && a.every((v,i)=>v===b[i]);
      if (!arraysEqual(newStack, currStack)) {
        if (newStack.length > 12) throw new Error('Too many tech stack tags (max 12)');
        if (newStack.some(t=>t.length>24)) throw new Error('Each tech stack tag must be ≤ 24 chars');
        techStackOpt = newStack;
      }
      if (!arraysEqual(newNeeds, currNeeds)) {
        if (newNeeds.length > 10) throw new Error('Too many contribution need tags (max 10)');
        if (newNeeds.some(t=>t.length>24)) throw new Error('Each contribution need tag must be ≤ 24 chars');
        needsOpt = newNeeds;
      }
      const levelOpt = editLevel !== collabLevel ? { [editLevel]: {} } as any : null;
      const statusOpt = editStatus !== status ? { [editStatus]: {} } as any : null;

      await (program as any).methods
        .updateProject(nameOpt, descOpt, githubOpt, techStackOpt, needsOpt, intentOpt, levelOpt, statusOpt, null)
        .accounts({ project: project.publicKey, creator: publicKey })
        .rpc();

      await fetchProject();
      setShowEditModal(false);
    } catch (e:any) {
      // Surface Anchor error details if present
      console.error('Update project error:', e);
      const code = e?.error?.errorCode?.code || e?.code || '';
      const logs = e?.logs ? '\nLogs:\n' + e.logs.join('\n') : '';
      alert(`❌ Failed to update project: ${e?.message || 'Unknown error'} ${code ? '\nCode: ' + code : ''}${logs}`);
    } finally {
      setUpdating(false);
    }
  };

  const deleteProject = async () => {
    if (!publicKey || !program || !project) return;
    if (!confirm('Delete this project permanently and reclaim the rent deposit? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await (program as any).methods
        .deleteProject()
        .accounts({ project: project.publicKey, creator: publicKey })
        .rpc();
      router.push('/projects');
    } catch (e:any) {
      console.error('Delete project error:', e);
      const code = e?.error?.errorCode?.code || e?.code || '';
      const logs = e?.logs ? '\nLogs:\n' + e.logs.join('\n') : '';
      alert(`❌ Failed to delete project: ${e?.message || 'Unknown error'} ${code ? '\nCode: ' + code : ''}${logs}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link href="/projects" className="text-blue-400 hover:underline mb-4 inline-block">
        ← Back to Projects
      </Link>

      {/* Hero Section */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-lg p-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-6">
            {/* Logo */}
            <div className="w-24 h-24 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden shrink-0">
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
  {showEditModal && typeof window !== 'undefined' && createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-start justify-center pt-20 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mb-10">
        <h2 className="text-2xl font-bold text-white mb-4">Edit Project</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Project Name</label>
            <input value={editName} onChange={(e)=>setEditName(e.target.value)} maxLength={50} className="w-full bg-gray-700 text-white rounded px-4 py-3 opacity-70 cursor-not-allowed" disabled />
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
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Tech Stack (comma-separated, max 12)</label>
            <input
              value={editTechStack}
              onChange={(e)=>setEditTechStack(e.target.value)}
              placeholder="Solana, Anchor, React, TypeScript"
              className="w-full bg-gray-700 text-white rounded px-4 py-3"
            />
            <p className="text-xs text-gray-500 mt-1">Each tag ≤ 24 chars.</p>
          </div>
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Contribution Needs (comma-separated, max 10)</label>
            <input
              value={editNeeds}
              onChange={(e)=>setEditNeeds(e.target.value)}
              placeholder="Frontend, Smart Contract, Docs"
              className="w-full bg-gray-700 text-white rounded px-4 py-3"
            />
            <p className="text-xs text-gray-500 mt-1">Each tag ≤ 24 chars.</p>
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
    </div>,
    document.body
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
                  💻 {tech.value}
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

          {/* Showcase mode: hide role requirements */}

          {/* About the Project */}
          {account.collabIntent && (
            <div className="bg-linear-to-r from-purple-900 to-blue-900 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">📄 About the Project</h2>
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
            <div className="space-y-3 pointer-events-auto relative z-10">
              <button
                onClick={openEdit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold relative z-10"
              >
                ✏️ Edit Project
              </button>
              <button
                onClick={deleteProject}
                disabled={deleting}
                className="w-full px-6 py-3 rounded-lg font-semibold text-white relative z-10 bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '⏳ Deleting...' : '🗑️ Delete Project'}
              </button>
            </div>
          ) : publicKey ? (
            (
              account.githubLink || account.github_link ? (
                <a
                  href={(account.githubLink || account.github_link) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-4 rounded-lg font-semibold text-lg text-center block border border-gray-700"
                >
                  🔗 View Repository
                </a>
              ) : (
                <div className="w-full bg-gray-800 text-gray-300 px-6 py-4 rounded-lg font-semibold text-lg border border-gray-700 text-center">
                  Showcase project
                </div>
              )
            )
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

            {/* Proof of work fields */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1 font-semibold">Proof of Work (GitHub)</label>
                <input
                  value={proofGithub}
                  onChange={(e) => setProofGithub(e.target.value)}
                  placeholder="https://github.com/yourusername/your-repo"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1 font-semibold">Contact (Twitter/X)</label>
                <input
                  value={proofTwitter}
                  onChange={(e) => setProofTwitter(e.target.value)}
                  placeholder="https://twitter.com/yourhandle or @yourhandle"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
                />
              </div>
              <p className="text-xs text-gray-500">GitHub shows your work; Twitter/X is for contact.</p>
            </div>

            {/* Role Selection */}
            {account.requiredRoles && account.requiredRoles.length > 0 && (
              <div className="mb-4">
                <label className="block text-gray-300 text-sm mb-2 font-semibold">Desired Role</label>
                <select
                  value={desiredRole}
                  onChange={(e) => setDesiredRole(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select a role...</option>
                  {account.requiredRoles
                    .filter((roleReq: any) => roleReq.accepted < roleReq.needed)
                    .map((roleReq: any, idx: number) => (
                      <option key={idx} value={Object.keys(roleReq.role || {})[0]}>
                        {(() => {
                          const key = (Object.keys(roleReq.role || {})[0] || '');
                          const label = roleReq.label as string | undefined;
                          const pretty = key.replace(/^[a-z]/, (c) => c.toUpperCase());
                          return key === 'others' && label ? `${pretty} — ${label}` : pretty;
                        })()} ({roleReq.accepted}/{roleReq.needed} slots filled)
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose the role you want to fill on this project.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCollabModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendCollabRequest}
                disabled={!collabMessage.trim() || !proofGithub.trim() || !proofTwitter.trim() || sending}
                className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
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
