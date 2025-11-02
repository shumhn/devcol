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

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'pending'
      ? 'bg-yellow-500'
      : status === 'underReview'
      ? 'bg-blue-500'
      : status === 'accepted'
      ? 'bg-green-600'
      : 'bg-red-600';
  const label = status === 'underReview' ? 'Under Review' : status[0].toUpperCase() + status.slice(1);
  return <span className={`text-xs px-2 py-1 rounded ${color} text-white`}>{label}</span>;
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
          .acceptCollabRequest()
          .accounts({ collabRequest: req.publicKey, to: publicKey, project: req.account.project })
          .rpc()
      );
      // Confirmed: refetch to reconcile
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'confirmed');
      setReq({ publicKey: req.publicKey, account });
      showToast('success', '✅ Request accepted');
      // Store owner message
      if (ownerMessage.trim()) {
        try {
          localStorage.setItem(`request_message_${req.publicKey.toString()}`, JSON.stringify({
            type: 'accept',
            message: ownerMessage.trim(),
            timestamp: Date.now()
          }));
        } catch {}
      }
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
          .rejectCollabRequest()
          .accounts({ collabRequest: req.publicKey, to: publicKey, project: req.account.project })
          .rpc()
      );
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey, 'confirmed');
      setReq({ publicKey: req.publicKey, account });
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
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <div className="text-4xl mb-3">⏳</div>
        <div className="text-gray-400">Loading request…</div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <div className="text-4xl mb-3">❓</div>
        <div className="text-gray-400">Request not found.</div>
        <div className="mt-6">
          <Link href="/requests" className="text-blue-400 hover:underline">← Back to Inbox</Link>
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/requests" className="text-blue-400 hover:underline">← Back to Inbox</Link>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Collaboration Request</h1>
              <StatusBadge status={status} />
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {new Date(req.account.timestamp * 1000).toLocaleString()}
            </div>
          </div>
          <div>
            <Link
              href={`/projects/${req.account.project.toString()}`}
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
            >
              Open Project
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold text-white mb-2">From</h2>
            <div className="text-gray-300 break-all"><Username pk={req.account.from.toString()} /></div>
          </div>
          <div>
            <h2 className="font-semibold text-white mb-2">To</h2>
            <div className="text-gray-300 break-all"><Username pk={req.account.to.toString()} /></div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold text-white mb-2">Requested Role</h2>
          <div className="bg-purple-900 text-purple-200 px-3 py-2 rounded inline-block">
            🎭 {roleLabel}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold text-white mb-2">Proof of Work</h2>
            <div className="space-y-2">
              {gh && (
                <div className="flex items-center gap-2">
                  <span>🔗</span>
                  <a href={gh} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    GitHub
                  </a>
                </div>
              )}
              {tw && (
                <div className="flex items-center gap-2">
                  <span>🐦</span>
                  <a href={`https://twitter.com/${tw.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    @{tw.replace(/^@/, '')}
                  </a>
                </div>
              )}
              {!gh && !tw && <div className="text-gray-500">No proof provided</div>}
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-white mb-2">Message</h2>
            <div className="text-gray-300 whitespace-pre-wrap">{body || req.account.message}</div>
          </div>
        </div>

        {youAreSender && displayMessage && (status === 'accepted' || status === 'rejected') && (
          <div className={`mt-6 p-4 rounded-lg border ${
            displayMessage.type === 'accept' ? 'bg-green-900 border-green-600' : 'bg-red-900 border-red-600'
          }`}>
            <h3 className="font-semibold text-white mb-2">
              {displayMessage.type === 'accept' ? '✅ Message from project owner' : '❌ Rejection reason'}
            </h3>
            <p className="text-gray-200 whitespace-pre-wrap">{displayMessage.message}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {youAreRecipient && isPending && (
            <button
              onClick={markUnderReview}
              disabled={acting === 'review'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {acting === 'review' ? '⏳ Marking...' : '🔍 Mark Under Review'}
            </button>
          )}
          {youAreRecipient && (isPending || isUnderReview) && (
            <>
              <button
                disabled={acting === 'accept'}
                onClick={() => setShowMessageModal('accept')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {acting === 'accept' ? '⏳ Accepting...' : '✅ Accept'}
              </button>
              <button
                onClick={() => setShowMessageModal('reject')}
                disabled={acting === 'reject'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {acting === 'reject' ? '⏳ Rejecting...' : '❌ Reject'}
              </button>
            </>
          )}
          {youAreSender && (
            <div className="text-gray-400 text-center py-3">
              {isPending && 'Waiting for review...'}
              {isUnderReview && 'Under review by project owner'}
              {status === 'accepted' && '✅ Your request was accepted!'}
              {status === 'rejected' && '❌ Your request was rejected'}
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
  );
}
