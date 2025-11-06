'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '@/app/hooks/useAnchorProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import Link from 'next/link';
import { Space_Grotesk, Sora } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });
const premium = Sora({ subsets: ['latin'], weight: ['400', '600'] });

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  development: { label: 'Development', color: 'bg-[#00D4AA] text-gray-900 border-[#00D4AA]' },
  testing: { label: 'Testing', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  launched: { label: 'Launched', color: 'bg-green-100 text-green-800 border-green-300' },
  activeDev: { label: 'Active Development', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  paused: { label: 'Paused', color: 'bg-gray-100 text-gray-600 border-gray-300' },
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
  const [isLegacy, setIsLegacy] = useState(false);
  
  // Collaboration request modal state
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabMessage, setCollabMessage] = useState('');
  const [proofGithub, setProofGithub] = useState('');
  const [proofTwitter, setProofTwitter] = useState('');
  const [desiredRole, setDesiredRole] = useState('');
  const [sending, setSending] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [checkingRequest, setCheckingRequest] = useState(false);

  useEffect(() => {
    if (params.id && program) {
      fetchProject();
    }
  }, [params.id, program]);

  // Refetch when window regains focus to avoid stale project data after updates
  useEffect(() => {
    const onFocus = () => {
      if (program && params.id) fetchProject();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [program, params.id]);

  // Check if user has profile
  useEffect(() => {
    const checkProfile = async () => {
      if (!program || !publicKey) {
        setHasProfile(false);
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
      }
    };
    checkProfile();
  }, [program, publicKey]);

  // Check if user already sent a request for this project (ignore old schema accounts)
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!program || !publicKey || !project) return;
      setCheckingRequest(true);
      try {
        const [collabRequestPDA] = await PublicKey.findProgramAddress(
          [
            Buffer.from('collab_request'),
            publicKey.toBuffer(),
            project.publicKey.toBuffer(),
          ],
          (program as any).programId
        );
        const info = await (program as any).provider.connection.getAccountInfo(collabRequestPDA, 'processed');
        if (!info || !info.data) {
          setExistingRequest(null);
        } else if (info.owner?.toBase58?.() !== (program as any).programId.toBase58?.()) {
          setExistingRequest(null);
        } else if (info.data.length < 1000) {
          // Old schema without owner_message field - ignore
          setExistingRequest(null);
        } else {
          try {
            const existingReq = await (program as any).account.collaborationRequest.fetch(collabRequestPDA, 'processed');
            setExistingRequest(existingReq);
          } catch {
            setExistingRequest(null);
          }
        }
      } catch (e) {
        setExistingRequest(null);
      } finally {
        setCheckingRequest(false);
      }
    };
    checkExistingRequest();
  }, [program, publicKey, project]);

  const fetchProject = async () => {
    if (!params.id || !program) return;
    setLoading(true);
    try {
      const projectPubkey = new PublicKey(params.id as string);
      // Owner check: ensure this account belongs to current program
      const info = await (program as any).provider.connection.getAccountInfo(projectPubkey, 'processed');
      const owner = info?.owner?.toBase58?.();
      const current = (program as any).programId?.toBase58?.();
      if (owner && current && owner !== current) {
        // Legacy project from old program: hide from UI
        setIsLegacy(true);
        setProject(null);
        return;
      }
      // Use confirmed commitment to reduce stale reads after updates
      const projectAccount = await (program as any).account.project.fetch(projectPubkey, 'confirmed');
      setProject({ publicKey: projectPubkey, account: projectAccount });
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async () => {
    if (!publicKey || !program || !project) return;
    
    const confirmed = confirm('Are you sure you want to delete this project? This will refund your SOL but cannot be undone.');
    if (!confirmed) return;

    try {
      await (program as any).methods
        .deleteProject()
        .accounts({
          project: project.publicKey,
          creator: publicKey,
        })
        .rpc();

      alert('✅ Project deleted successfully! Your SOL has been refunded.');
      router.push('/projects');
    } catch (error: any) {
      console.error('Delete project error:', error);
      alert('❌ Failed to delete project: ' + (error.message || 'Unknown error'));
    }
  };

  const closeProject = async () => {
    if (!publicKey || !program || !project) return;
    
    const confirmed = confirm('Close this project? You will stop receiving collaboration requests.');
    if (!confirmed) return;

    try {
      await (program as any).methods
        .closeProject()
        .accounts({
          project: project.publicKey,
          creator: publicKey,
        })
        .rpc();

      alert('✅ Project closed! You are no longer accepting collaboration requests.');
      await fetchProject(); // Refresh to show updated status
    } catch (error: any) {
      console.error('Close project error:', error);
      alert('❌ Failed to close project: ' + (error.message || 'Unknown error'));
    }
  };

  const reopenProject = async () => {
    if (!publicKey || !program || !project) return;
    
    const confirmed = confirm('Reopen this project for collaboration?');
    if (!confirmed) return;

    try {
      await (program as any).methods
        .reopenProject()
        .accounts({
          project: project.publicKey,
          creator: publicKey,
        })
        .rpc();

      alert('✅ Project reopened! You are now accepting collaboration requests.');
      await fetchProject(); // Refresh to show updated status
    } catch (error: any) {
      console.error('Reopen project error:', error);
      alert('❌ Failed to reopen project: ' + (error.message || 'Unknown error'));
    }
  };

  const sendCollabRequest = async () => {
    if (!publicKey || !program || !project) return;

    // Preflight: Block if an existing non-rejected request already exists
    // If rejected, delete it first to free the PDA for a new request
    try {
      const [prePda] = await PublicKey.findProgramAddress(
        [Buffer.from('collab_request'), publicKey.toBuffer(), project.publicKey.toBuffer()],
        (program as any).programId
      );
      const info = await (program as any).provider.connection.getAccountInfo(prePda, 'processed');
      if (info && info.data && info.data.length >= 1000 && info.owner?.toBase58?.() === (program as any).programId.toBase58?.()) {
        const existing = await (program as any).account.collaborationRequest.fetch(prePda, 'processed');
        const st = Object.keys(existing.status || {})[0];
        
        // Block if pending/underReview/accepted
        if (st === 'pending') {
          alert('⏳ You already have a pending request for this project. Check your Requests page.');
          return;
        }
        if (st === 'underReview') {
          alert('👀 Your request is under review. Check your Requests page for updates.');
          return;
        }
        if (st === 'accepted') {
          alert('✅ You are already collaborating on this project!');
          return;
        }
        
        // If rejected, close the old request account first to free the PDA
        if (st === 'rejected') {
          try {
            console.log('Deleting rejected request...');
            console.log('PDA:', prePda.toBase58());
            console.log('Sender:', publicKey.toBase58());
            console.log('Project:', project.publicKey.toBase58());
            
            const tx = await (program as any).methods
              .deleteSenderRejectedRequest()
              .accounts({
                collabRequest: prePda,
                sender: publicKey,
                project: project.publicKey,
              })
              .rpc();
            console.log('Delete tx signature:', tx);
            // Wait for confirmation
            await (program as any).provider.connection.confirmTransaction(tx, 'confirmed');
            // Wait a moment for the account to close
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('Rejected request deleted successfully');
          } catch (deleteErr: any) {
            console.error('Failed to delete rejected request:', deleteErr);
            console.error('Error name:', deleteErr.name);
            console.error('Error message:', deleteErr.message);
            // Log detailed error
            if (deleteErr.logs) {
              console.error('Transaction logs:', deleteErr.logs);
            }
            // Check if user rejected
            if (deleteErr.message?.includes('User rejected') || deleteErr.name === 'WalletSignTransactionError') {
              alert('❌ Transaction canceled. Please approve the transaction to delete your previous rejected request.');
              return;
            }
            alert('❌ Failed to clear previous rejected request: ' + (deleteErr.message || 'Unknown error'));
            return;
          }
        }
      }
    } catch {}

    // Validate GitHub URL (allow profile or repo)
    const ghOk = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?\/?$/.test(proofGithub.trim());
    if (!ghOk) {
      alert('Please provide a valid GitHub repo or profile URL');
      return;
    }

    // Validate Twitter/X
    const twOk = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]{1,15}\/?$/.test(proofTwitter.trim()) || /^(@)?[A-Za-z0-9_]{1,15}$/.test(proofTwitter.trim());
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
    const account = project.account;
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

      // Import showToast at the top of file if not already imported
      const { showToast } = await import('../../components/Toast');
      
      // Show success notification
      showToast('success', '✅ Request sent! The project owner will be notified.', 6000);
      
      // Close modal and reset form
      setShowCollabModal(false);
      setCollabMessage('');
      setProofGithub('');
      setProofTwitter('');
      setDesiredRole('');
      
      // Navigate to requests page after a brief delay
      setTimeout(() => {
        router.push('/requests');
      }, 1000);
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
      <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="text-center text-gray-600">Loading project...</div>
        </div>
      </div>
    );
  }

  if (isLegacy) {
    // Legacy projects are hidden from UI
    if (typeof window !== 'undefined') {
      // Soft redirect back to projects
      setTimeout(() => {
        try { router.push('/projects'); } catch {}
      }, 0);
    }
    return (
      <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Legacy Project</h2>
            <p className="text-sm text-gray-600">This project belongs to an older program version and is hidden from the UI.</p>
            <Link href="/projects" className="inline-block mt-4 text-[#00D4AA] hover:underline text-sm font-medium">← Back to Projects</Link>
          </div>
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
  const statusKey = Object.keys(account.status || account.projectStatus || {})[0] || 'development';
  const levelKey = Object.keys(account.collaborationLevel || account.collabLevel || {})[0] || 'intermediate';
  const statusBadge = STATUS_BADGES[statusKey] || STATUS_BADGES.development;

  const name = asString(account.name);
  const description = asString(account.description);
  const githubLink = asString(account.githubLink || account.github || account.github_url);
  const logoHash = asString(account.logoIpfsHash || account.logoHash || account.logo);
  const techStack = asStringArray(account.techStack || account.tech_stack || []);
  const needs = asStringArray(account.contributionNeeds || account.needs || []);
  const collabIntent = asString(account.collaborationIntent || account.collabIntent || '');
  // Normalize roles array across schema versions
  const roles = (account.requiredRoles || account.roleRequirements || account.roles || []) as any[];

  return (
    <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Back Button */}
        <Link href="/projects" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
          ← Back to Projects
        </Link>

        {/* Hero Header */}
        <header className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-5">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {(() => {
                if (!logoHash) {
                  return <span className="text-sm text-gray-400">No logo</span>;
                }
                const imgSrc = typeof window !== 'undefined' 
                  ? localStorage.getItem(`ipfs_image_${logoHash}`) 
                  : null;
                return imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-sm text-gray-400">No logo</span>
                );
              })()}
            </div>

            {/* Title and Meta */}
            <div className="flex-1">
              <h1 className={`${display.className} text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight`}>
                {name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
                {/* Collaboration Status Badge */}
                {project.account.acceptingCollaborations?.open ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                    🟢 Open
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                    🔴 Closed
                  </span>
                )}
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
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

        {/* Closed Project Gate for Non-Owners */}
        {!isOwner && project.account.acceptingCollaborations?.closed && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className={`${premium.className} text-2xl font-bold text-gray-900 mb-3`}>
                This Project is Closed
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                The project owner is not currently accepting new collaboration requests. Check back later or explore other open projects.
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
              >
                ← Browse Open Projects
              </Link>
            </div>
          </div>
        )}

        {/* Main Content - Only show if owner OR project is open */}
        {(isOwner || project.account.acceptingCollaborations?.open) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-2">About This Project</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
            </section>

            {/* Tech Stack */}
            {techStack.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-2">Tech Stack</h2>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-[#00D4AA] text-gray-900 text-xs rounded-lg font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Looking For */}
            {needs.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-2">Contribution Needs</h2>
                <div className="flex flex-wrap gap-2">
                  {needs.map((need: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg font-medium"
                    >
                      {need}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Open Roles */}
            {roles.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-2">Open Roles</h2>
                <div className="space-y-2.5">
                  {roles.map((roleReq: any, idx: number) => {
                    const roleKey = Object.keys(roleReq.role || {})[0] || '';
                    const label = roleReq.label as string | undefined;
                    const pretty = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
                    const displayLabel = roleKey === 'others' && label ? `${pretty} — ${label}` : pretty;
                    // Map counts across possible schema versions/keys
                    const needed = Number(
                      roleReq.needed ?? roleReq.slots ?? roleReq.total ?? roleReq.capacity ?? 0
                    );
                    const accepted = Number(
                      roleReq.accepted ?? roleReq.filled ?? roleReq.current ?? 0
                    );
                    const isFull = accepted >= needed;
                    const fillPercentage = needed > 0 ? (accepted / needed) * 100 : 0;
                    const getColorClass = () => {
                      if (isFull) return 'bg-red-100 text-red-700 border-red-300';
                      if (fillPercentage >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
                      return 'bg-green-100 text-green-700 border-green-300';
                    };
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">{displayLabel}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${getColorClass()}`}>
                          {accepted}/{needed} filled
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Collaboration Intent */}
            {collabIntent && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">What We're Looking For</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{collabIntent}</p>
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
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/projects/${project.publicKey.toBase58()}/edit`)}
                  className="w-full px-4 py-2.5 bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 font-medium rounded-lg text-sm"
                >
                  Edit Project
                </button>
                {project.account.acceptingCollaborations?.open ? (
                  <button
                    onClick={closeProject}
                    className="w-full px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg text-sm"
                  >
                    Close Project
                  </button>
                ) : (
                  <button
                    onClick={reopenProject}
                    className="w-full px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg text-sm"
                  >
                    Reopen Project
                  </button>
                )}
                <button
                  onClick={deleteProject}
                  className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg text-sm"
                >
                  Delete Project
                </button>
              </div>
            ) : publicKey ? (
              (() => {
                // Check if project is closed for collaboration
                const isClosed = project.account.acceptingCollaborations?.closed;
                
                if (isClosed) {
                  return (
                    <div className="w-full px-4 py-3 bg-red-50 border border-red-200 text-red-700 font-medium rounded-lg text-center text-sm">
                      🔒 This project is closed
                      <p className="text-xs text-red-600 mt-1">No longer accepting collaboration requests</p>
                    </div>
                  );
                }
                
                const status = existingRequest ? Object.keys(existingRequest.status || {})[0] : null;
                
                // Show status message if pending, under review, or accepted
                if (status && status !== 'rejected') {
                  return (
                    <div className="w-full px-4 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-lg text-center text-sm">
                      {status === 'pending' && '⏳ Request pending'}
                      {status === 'underReview' && '👀 Request under review'}
                      {status === 'accepted' && '✅ Collaboration in progress'}
                      <a href="/requests" className="block mt-2 text-xs text-[#00D4AA] hover:underline">View request</a>
                    </div>
                  );
                }
                
                // Show button if no request exists or if rejected (allow re-send)
                return (
                  <button
                    onClick={() => setShowCollabModal(true)}
                    className="w-full px-4 py-2.5 bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 font-medium rounded-lg text-sm"
                    disabled={checkingRequest}
                  >
                    {checkingRequest ? 'Loading...' : status === 'rejected' ? 'Send New Request' : 'Request to Collaborate'}
                  </button>
                );
              })()
            ) : (
              <button
                disabled
                className="w-full px-4 py-2.5 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed text-sm"
              >
                Connect Wallet to Collaborate
              </button>
            )}
          </div>
        </div>
        )}

      {/* Collaboration Request Modal */}
      {showCollabModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto ${premium.className}`}>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Send Collaboration Request</h2>
            <p className="text-sm text-gray-600 mb-4">
              Introduce yourself and explain why you'd like to collaborate on <span className="font-medium">{account.name}</span>
            </p>
            
            <div className="space-y-4">
              {/* Message */}
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1.5">Message *</label>
                <textarea
                  value={collabMessage}
                  onChange={(e) => setCollabMessage(e.target.value)}
                  maxLength={500}
                  rows={6}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
                  placeholder="Hi! I'd love to collaborate on this project because..."
                />
                <div className="text-xs text-gray-500 mt-1">{collabMessage.length}/500 characters</div>
              </div>

              {/* GitHub Proof */}
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1.5">Proof of Work (GitHub) *</label>
                <input
                  type="url"
                  value={proofGithub}
                  onChange={(e) => setProofGithub(e.target.value)}
                  placeholder="https://github.com/yourusername/your-repo"
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
                />
              </div>

              {/* Twitter Contact */}
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1.5">Contact (Twitter/X) *</label>
                <input
                  type="text"
                  value={proofTwitter}
                  onChange={(e) => setProofTwitter(e.target.value)}
                  placeholder="https://x.com/devsh_"
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
                />
                <p className="text-xs text-gray-500 mt-1">GitHub shows your work; Twitter/X is for contact.</p>
              </div>

              {/* Role Selection */}
              {roles && roles.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1.5">Desired Role *</label>
                  <select
                    value={desiredRole}
                    onChange={(e) => setDesiredRole(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
                    required
                  >
                    <option value="">Select a role...</option>
                    {roles
                      .filter((roleReq: any) => (roleReq.accepted ?? 0) < (roleReq.needed ?? 0))
                      .map((roleReq: any, idx: number) => {
                        const roleKey = Object.keys(roleReq.role || {})[0] || '';
                        const label = roleReq.label as string | undefined;
                        const pretty = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
                        const displayLabel = roleKey === 'others' && label ? `${pretty} — ${label}` : pretty;
                        const needed = roleReq.needed ?? 0;
                        const accepted = roleReq.accepted ?? 0;
                        return (
                          <option key={idx} value={roleKey}>
                            {displayLabel} ({accepted}/{needed} slots filled)
                          </option>
                        );
                      })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose the role you want to fill on this project.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCollabModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={sendCollabRequest}
                disabled={!collabMessage.trim() || !proofGithub.trim() || !proofTwitter.trim() || sending}
                className="flex-1 bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
