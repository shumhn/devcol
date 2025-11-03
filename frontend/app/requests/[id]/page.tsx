'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '@/app/hooks/useAnchorProgram';
import { rpcWithRetry } from '@/app/utils/rpcRetry';
import { showToast } from '@/app/components/Toast';
import { MessageModal } from '@/app/components/MessageModal';
import { Sora } from 'next/font/google';

const premium = Sora({ subsets: ['latin'], weight: ['400', '500', '600'] });

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'pending'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
      : status === 'underReview'
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : status === 'accepted'
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-red-100 text-red-800 border-red-300';
  const label = status === 'underReview' ? 'Under Review' : status[0].toUpperCase() + status.slice(1);
  return <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${styles}`}>{label}</span>;
}

function parseProofs(message: string) {
  const lines = message.split('\n');
  let gh = '';
  let tw = '';
  let start = 0;
  if (lines[0]?.startsWith('[GH]')) {
    gh = lines[0].replace('[GH]', '').trim();
    start = 1;
  }
  if (lines[1]?.startsWith('[TW]')) {
    tw = lines[1].replace('[TW]', '').trim();
    start = 2;
  }
  const body = lines.slice(start).join('\n').trim();
  return { gh, tw, body };
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<any | null>(null);
  const [isLegacy, setIsLegacy] = useState(false);
  const [acting, setActing] = useState<'accept' | 'reject' | 'review' | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [showMessageModal, setShowMessageModal] = useState<'accept' | 'reject' | null>(null);
  const [ownerMessage, setOwnerMessage] = useState('');
  const [displayMessage, setDisplayMessage] = useState<{type: string, message: string} | null>(null);

  const shorten = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
  
  // Batch resolve usernames to reduce RTTs
  const resolveUsernames = async (pks: string[]) => {
    if (!program || pks.length === 0) return;
    const unique = [...new Set(pks)].filter(pk => !usernames[pk]);
    if (unique.length === 0) return;
    try {
      const pdas = await Promise.all(
        unique.map(pk => PublicKey.findProgramAddress([Buffer.from('user'), new PublicKey(pk).toBuffer()], (program as any).programId))
      );
      const accounts = await (program as any).provider.connection.getMultipleAccountsInfo(pdas.map(([pda]: any) => pda), 'processed');
      const names: Record<string, string> = {};
      accounts.forEach((info: any, i: number) => {
        if (info) {
          try {
            const decoded = (program as any).coder.accounts.decode('User', info.data);
            names[unique[i]] = (decoded.displayName as string) || (decoded.username as string) || '';
          } catch {}
        }
      });
      setUsernames(prev => ({ ...prev, ...names }));
    } catch {}
  };
  
  const Username = ({ pk }: { pk: string }) => <span>{usernames[pk] || shorten(pk)}</span>;

  const canUse = useMemo(() => !!program && !!publicKey, [program, publicKey]);

  useEffect(() => {
    const run = async () => {
      if (!program || !params.id) return;
      setLoading(true);
      try {
        const k = new PublicKey(params.id as string);
        const [account, info] = await Promise.all([
          (program as any).account.collaborationRequest.fetch(k, 'processed'),
          (program as any).provider.connection.getAccountInfo(k, 'processed')
        ]);
        setReq({ publicKey: k, account });
        const owner = info?.owner?.toBase58?.();
        const current = (program as any).programId?.toBase58?.();
        setIsLegacy(!!owner && !!current && owner !== current);
        // Batch resolve usernames
        await resolveUsernames([account.from.toString(), account.to.toString()]);
        // Load owner message if exists
        try {
          const stored = localStorage.getItem(`request_message_${k.toString()}`);
          if (stored) {
            setDisplayMessage(JSON.parse(stored));
          }
        } catch {}
      } catch (e) {
        console.error('Fetch request error:', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [program, params.id]);

  const accept = async () => {
    if (!canUse || !req) return;
    // Hard preflight: block legacy requests owned by old program
    try {
      const info = await (program as any).provider.connection.getAccountInfo(req.publicKey, 'processed');
      const owner = info?.owner?.toBase58?.();
      const current = (program as any).programId?.toBase58?.();
      if (owner && current && owner !== current) {
        setIsLegacy(true);
        alert('This request belongs to an earlier program version and cannot be updated. Please create a new request.');
        return;
      }
    } catch {}
    setActing('accept');
    // Optimistic UI
    setReq((prev: any) => prev ? { ...prev, account: { ...prev.account, status: { accepted: {} } } } : prev);
    try {
      await rpcWithRetry(() =>
        (program as any).methods
          .acceptCollabRequest(ownerMessage.trim() || 'Request accepted')
          .accounts({ collabRequest: req.publicKey, to: publicKey, project: req.account.project })
          .rpc()
      );
      // Confirmed: refetch to reconcile
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'confirmed');
      setReq({ publicKey: req.publicKey, account });
      showToast('success', '✅ Request accepted');
      setOwnerMessage('');
    } catch (e) {
      console.error('Accept collab error:', e);
      alert('❌ Failed to accept: ' + (e as any)?.message || 'Unknown error');
      // Rollback optimistic
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'processed');
      setReq({ publicKey: req.publicKey, account });
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!canUse || !req) return;
    // Hard preflight: block legacy requests owned by old program
    try {
      const info = await (program as any).provider.connection.getAccountInfo(req.publicKey, 'processed');
      const owner = info?.owner?.toBase58?.();
      const current = (program as any).programId?.toBase58?.();
      if (owner && current && owner !== current) {
        setIsLegacy(true);
        alert('This request belongs to an earlier program version and cannot be updated. Please create a new request.');
        return;
      }
    } catch {}
    setActing('reject');
    // Optimistic UI
    setReq((prev: any) => prev ? { ...prev, account: { ...prev.account, status: { rejected: {} } } } : prev);
    try {
      await rpcWithRetry(() =>
        (program as any).methods
          .rejectCollabRequest(ownerMessage.trim() || 'Request rejected')
          .accounts({ collabRequest: req.publicKey, to: publicKey, project: req.account.project })
          .rpc()
      );
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'confirmed');
      setReq({ publicKey: req.publicKey, account });
      setOwnerMessage('');
    } catch (e) {
      console.error('Reject collab error:', e);
      alert('❌ Failed to reject: ' + (e as any)?.message || 'Unknown error');
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'processed');
      setReq({ publicKey: req.publicKey, account });
    } finally {
      setActing(null);
    }
  };

  const markUnderReview = async () => {
    if (!canUse || !req) return;
    // Hard preflight: block legacy requests owned by old program
    try {
      const info = await (program as any).provider.connection.getAccountInfo(req.publicKey, 'processed');
      const owner = info?.owner?.toBase58?.();
      const current = (program as any).programId?.toBase58?.();
      if (owner && current && owner !== current) {
        setIsLegacy(true);
        alert('This request belongs to an earlier program version and cannot be updated. Please create a new request.');
        return;
      }
    } catch {}
    setActing('review');
    // Optimistic UI
    setReq((prev: any) => prev ? { ...prev, account: { ...prev.account, status: { underReview: {} } } } : prev);
    try {
      await rpcWithRetry(() =>
        (program as any).methods
          .markUnderReview()
          .accounts({ collabRequest: req.publicKey, to: publicKey, project: req.account.project })
          .rpc()
      );
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'confirmed');
      setReq({ publicKey: req.publicKey, account });
    } catch (e) {
      console.error('Mark under review error:', e);
      alert('❌ Failed to mark under review: ' + (e as any)?.message || 'Unknown error');
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'processed');
      setReq({ publicKey: req.publicKey, account });
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
        <div className="max-w-4xl mx-auto px-6 py-10 text-center">
          <div className="text-sm text-gray-600">Loading request…</div>
        </div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
        <div className="max-w-4xl mx-auto px-6 py-10 text-center">
          <div className="text-sm text-gray-600">Request not found.</div>
          <div className="mt-6">
            <Link href="/requests" className="text-[#00D4AA] hover:underline text-sm font-medium">← Back to Inbox</Link>
          </div>
        </div>
      </div>
    );
  }

  const status = Object.keys(req.account.status)[0];
  const isPending = status === 'pending';
  const isUnderReview = status === 'underReview';
  const youAreRecipient = publicKey?.toString() === req.account.to.toString();
  const youAreSender = publicKey?.toString() === req.account.from.toString();
  const { gh, tw, body } = parseProofs(req.account.message || '');
  const desiredRole = req.account.desiredRole ? Object.keys(req.account.desiredRole)[0] : null;
  const roleLabel = desiredRole ? desiredRole.replace(/^[a-z]/, (c: string) => c.toUpperCase()) : 'Not specified';

  return (
    <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link href="/requests" className="text-[#00D4AA] hover:underline text-sm font-medium">← Back to Inbox</Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">Collaboration Request</h1>
                <StatusBadge status={status} />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(req.account.timestamp * 1000).toLocaleString()}
              </div>
            </div>
            <div>
              <Link
                href={`/projects/${req.account.project.toString()}`}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Open Project
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">From</h2>
              <div className="text-sm text-gray-900 break-all"><Username pk={req.account.from.toString()} /></div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">To</h2>
              <div className="text-sm text-gray-900 break-all"><Username pk={req.account.to.toString()} /></div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Requested Role</h2>
            <div className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full inline-block text-sm font-medium">
              {roleLabel}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Proof of Work</h2>
              <div className="space-y-2 text-sm">
                {gh && (
                  <div>
                    <a href={gh} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">
                      GitHub
                    </a>
                  </div>
                )}
                {tw && (
                  <div>
                    <a href={`https://twitter.com/${tw.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">
                      @{tw.replace(/^@/, '')}
                    </a>
                  </div>
                )}
                {!gh && !tw && <div className="text-gray-500 text-sm">No proof provided</div>}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Message</h2>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{body || req.account.message}</div>
            </div>
          </div>

          {youAreSender && isUnderReview && (
            <div className="mt-6 p-4 rounded-lg border bg-blue-50 border-blue-200">
              <h3 className="text-sm font-medium mb-2 text-blue-900">
                Your request is being reviewed
              </h3>
              <p className="text-sm text-blue-800">
                The project owner has marked your collaboration request as under review. They will get back to you soon with their decision.
              </p>
            </div>
          )}

          {/* Owner's reply message */}
          {req.account.ownerMessage && req.account.ownerMessage.trim() && (
            <div className={`mt-6 p-4 rounded-lg border ${
              status === 'accepted' ? 'bg-green-50 border-green-200' : 
              status === 'rejected' ? 'bg-red-50 border-red-200' : 
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium ${
                  status === 'accepted' ? 'text-green-900' : 
                  status === 'rejected' ? 'text-red-900' : 
                  'text-gray-900'
                }`}>
                  {status === 'accepted' ? 'Accepted! Message from project owner:' : 
                   status === 'rejected' ? 'Rejected. Reason from project owner:' : 
                   'Message from project owner:'}
                </h3>
                {req.account.replyTimestamp && req.account.replyTimestamp > 0 && (
                  <span className="text-xs text-gray-500">
                    {new Date(req.account.replyTimestamp * 1000).toLocaleString()}
                  </span>
                )}
              </div>
              <p className={`text-sm whitespace-pre-wrap ${
                status === 'accepted' ? 'text-green-800' : 
                status === 'rejected' ? 'text-red-800' : 
                'text-gray-700'
              }`}>{req.account.ownerMessage}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {youAreRecipient && isPending && (
              <button
                onClick={markUnderReview}
                disabled={acting === 'review'}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {acting === 'review' ? 'Marking...' : 'Mark Under Review'}
              </button>
            )}
            {youAreRecipient && (isPending || isUnderReview) && (
              <>
                <button
                  disabled={acting === 'accept'}
                  onClick={() => setShowMessageModal('accept')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {acting === 'accept' ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  onClick={() => setShowMessageModal('reject')}
                  disabled={acting === 'reject'}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {acting === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
              </>
            )}
            {youAreSender && (
              <div className="text-gray-600 text-center py-3 text-sm">
                {isPending && 'Waiting for review...'}
                {isUnderReview && 'Under review by project owner'}
                {status === 'accepted' && 'Your request was accepted!'}
                {status === 'rejected' && 'Your request was rejected'}
              </div>
            )}
          </div>
        </div>

        <MessageModal
          isOpen={!!showMessageModal}
          type={showMessageModal || 'accept'}
          onClose={() => setShowMessageModal(null)}
          onSubmit={(msg) => {
            setOwnerMessage(msg);
            if (showMessageModal === 'accept') accept();
            else if (showMessageModal === 'reject') reject();
          }}
        />
      </div>
    </div>
  );
}
