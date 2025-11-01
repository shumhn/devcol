'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';

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

export default function RequestsPage() {
  const { program } = useAnchorProgram();
  const { publicKey } = useWallet();

  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [actingId, setActingId] = useState<string | null>(null);

  const canUse = useMemo(() => !!program && !!publicKey, [program, publicKey]);

  const fetchAll = async () => {
    if (!program || !publicKey) return;
    setLoading(true);
    try {
      const all = await (program as any).account.collaborationRequest.all();
      const rec = all.filter((a: any) => a.account.to?.toString?.() === publicKey.toString());
      const snt = all.filter((a: any) => a.account.from?.toString?.() === publicKey.toString());
      setReceived(rec);
      setSent(snt);
    } catch (e) {
      console.error('Fetch collaboration requests error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, publicKey]);

  const accept = async (req: any) => {
    if (!program || !publicKey) return;
    setActingId(req.publicKey.toString());
    try {
      await (program as any).methods
        .acceptCollabRequest()
        .accounts({ collabRequest: req.publicKey, to: publicKey })
        .rpc();
      await fetchAll();
    } catch (e) {
      console.error('Accept collab error:', e);
      alert('❌ Failed to accept: ' + (e as any)?.message || 'Unknown error');
    } finally {
      setActingId(null);
    }
  };

  const reject = async (req: any) => {
    if (!program || !publicKey) return;
    setActingId(req.publicKey.toString());
    try {
      await (program as any).methods
        .rejectCollabRequest()
        .accounts({ collabRequest: req.publicKey, to: publicKey })
        .rpc();
      await fetchAll();
    } catch (e) {
      console.error('Reject collab error:', e);
      alert('❌ Failed to reject: ' + (e as any)?.message || 'Unknown error');
    } finally {
      setActingId(null);
    }
  };

  const Section = ({ items, type }: { items: any[]; type: 'received' | 'sent' }) => (
    <div>
      {items.length === 0 ? (
        <div className="text-gray-400 bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          No {type} collaboration requests.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((req) => {
            const status = Object.keys(req.account.status)[0];
            const isPending = status === 'pending';
            return (
              <div
                key={req.publicKey.toString()}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-sm text-gray-400">{new Date(req.account.timestamp * 1000).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-white font-semibold">
                    <Link
                      className="text-blue-400 hover:text-blue-300"
                      href={`/requests/${req.publicKey.toString()}`}
                      title="Open request details"
                    >
                      View full request →
                    </Link>
                    <span className="mx-2 text-gray-600">•</span>
                    <Link
                      className="text-blue-400 hover:text-blue-300"
                      href={`/projects/${req.account.project.toString()}`}
                      title="Open project"
                    >
                      Project
                    </Link>
                  </div>
                  <div className="mt-2 text-gray-300 whitespace-pre-wrap">
                    {req.account.message}
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    {type === 'received' ? (
                      <>From: {req.account.from.toString()}</>
                    ) : (
                      <>To: {req.account.to.toString()}</>
                    )}
                  </div>
                </div>
                {type === 'received' && (
                  <div className="flex gap-2">
                    <button
                      disabled={!isPending || actingId === req.publicKey.toString()}
                      onClick={() => accept(req)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      {actingId === req.publicKey.toString() ? 'Processing…' : 'Accept'}
                    </button>
                    <button
                      disabled={!isPending || actingId === req.publicKey.toString()}
                      onClick={() => reject(req)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!publicKey) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your Phantom wallet to view collaboration requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Collaboration Inbox</h1>
          <p className="text-gray-400">All your collaboration requests and messages</p>
        </div>
        <button
          onClick={fetchAll}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          ⟳ Refresh
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 rounded-lg border ${
            activeTab === 'received'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-200'
          }`}
        >
          Received ({received.filter((r) => Object.keys(r.account.status)[0] === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 rounded-lg border ${
            activeTab === 'sent'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-200'
          }`}
        >
          Sent ({sent.filter((r) => Object.keys(r.account.status)[0] === 'pending').length})
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : activeTab === 'received' ? (
        <Section items={received} type="received" />
      ) : (
        <Section items={sent} type="sent" />
      )}
    </div>
  );
}
