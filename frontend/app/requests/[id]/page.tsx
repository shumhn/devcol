'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '@/app/hooks/useAnchorProgram';

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'pending'
      ? 'bg-yellow-500'
      : status === 'accepted'
      ? 'bg-green-600'
      : 'bg-red-600';
  const label = status[0].toUpperCase() + status.slice(1);
  return <span className={`text-xs px-2 py-1 rounded ${color} text-white`}>{label}</span>;
}

function parseProofs(message: string) {
  // Expect header lines:
  // [GH] <url>\n[TW] <handle>\n\n<body>
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
  const [acting, setActing] = useState<'accept' | 'reject' | null>(null);

  const canUse = useMemo(() => !!program && !!publicKey, [program, publicKey]);

  useEffect(() => {
    const run = async () => {
      if (!program || !params.id) return;
      setLoading(true);
      try {
        const k = new PublicKey(params.id as string);
        const account = await (program as any).account.collaborationRequest.fetch(k);
        setReq({ publicKey: k, account });
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
    setActing('accept');
    try {
      await (program as any).methods
        .acceptCollabRequest()
        .accounts({ collabRequest: req.publicKey, to: publicKey })
        .rpc();
      // Refresh
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey);
      setReq({ publicKey: req.publicKey, account });
    } catch (e) {
      console.error('Accept collab error:', e);
      alert('❌ Failed to accept: ' + (e as any)?.message || 'Unknown error');
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!canUse || !req) return;
    setActing('reject');
    try {
      await (program as any).methods
        .rejectCollabRequest()
        .accounts({ collabRequest: req.publicKey, to: publicKey })
        .rpc();
      const account = await (program as any).account.collaborationRequest.fetch(req.publicKey);
      setReq({ publicKey: req.publicKey, account });
    } catch (e) {
      console.error('Reject collab error:', e);
      alert('❌ Failed to reject: ' + (e as any)?.message || 'Unknown error');
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
  const youAreRecipient = publicKey?.toString() === req.account.to.toString();
  const youAreSender = publicKey?.toString() === req.account.from.toString();
  const { gh, tw, body } = parseProofs(req.account.message || '');

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
            <div className="text-gray-300 break-all">{req.account.from.toString()}</div>
          </div>
          <div>
            <h2 className="font-semibold text-white mb-2">To</h2>
            <div className="text-gray-300 break-all">{req.account.to.toString()}</div>
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

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {youAreRecipient && (
            <>
              <button
                disabled={!isPending || acting === 'accept'}
                onClick={accept}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg disabled:opacity-50"
              >
                {acting === 'accept' ? 'Processing…' : 'Accept'}
              </button>
              <button
                disabled={!isPending || acting === 'reject'}
                onClick={reject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {youAreSender && !youAreRecipient && (
            <div className="text-gray-400">You sent this request.</div>
          )}
        </div>
      </div>
    </div>
  );
}
