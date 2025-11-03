'use client';

import { useEffect, useMemo, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';
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

function RequestsPageContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get('highlight');
  const { program } = useAnchorProgram();
  const { publicKey } = useWallet();

  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'received' | 'sent'>('open');
  const [actingId, setActingId] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const requestRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const shorten = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

  const resolveUsername = async (pkStr: string) => {
    if (!program) return;
    if (usernames[pkStr]) return;
    try {
      const wallet = new PublicKey(pkStr);
      const [userPda] = await PublicKey.findProgramAddress(
        [Buffer.from('user'), wallet.toBuffer()],
        (program as any).programId
      );
      const acct = await (program as any).account.user.fetchNullable(userPda);
      const name = (acct?.display_name as string) || (acct?.username as string) || '';
      setUsernames((m: Record<string, string>) => ({ ...m, [pkStr]: name }));
    } catch {
      // ignore
    }
  };

  const updateMsg = async (req: any) => {
    if (!program || !publicKey) return;
    const curr = req.account.message || '';
    const next = typeof window !== 'undefined' ? window.prompt('Edit message (max 500 chars):', curr) : null;
    if (next == null) return;
    const trimmed = next.slice(0, 500);
    setActingId(req.publicKey.toString());
    try {
      await (program as any).methods
        .updateCollabRequest(trimmed)
        .accounts({ collabRequest: req.publicKey, sender: publicKey })
        .rpc();
      await fetchAll();
    } catch (e) {
      console.error('Update collab message error:', e);
      alert('❌ Failed to update: ' + (e as any)?.message || 'Unknown error');
    } finally {
      setActingId(null);
    }
  };

  const withdraw = async (req: any) => {
    if (!program || !publicKey) return;
    if (!confirm('Withdraw this pending request?')) return;
    setActingId(req.publicKey.toString());
    try {
      await (program as any).methods
        .withdrawCollabRequest()
        .accounts({ collabRequest: req.publicKey, sender: publicKey, project: req.account.project })
        .rpc();
      await fetchAll();
    } catch (e) {
      console.error('Withdraw collab error:', e);
      alert('❌ Failed to withdraw: ' + (e as any)?.message || 'Unknown error');
    } finally {
      setActingId(null);
    }
  };

  const delRequest = async (req: any) => {
    if (!program || !publicKey) return;
    if (!confirm('Delete this resolved request?')) return;
    setActingId(req.publicKey.toString());
    try {
      await (program as any).methods
        .deleteCollabRequest()
        .accounts({ collabRequest: req.publicKey, projectOwner: publicKey, to: req.account.to })
        .rpc();
      await fetchAll();
    } catch (e) {
      console.error('Delete collab error:', e);
      alert('❌ Failed to delete: ' + (e as any)?.message || 'Unknown error');
    } finally {
      setActingId(null);
    }
  };

  const Username = ({ pk }: { pk: string }) => {
    const name = usernames[pk];
    useEffect(() => {
      resolveUsername(pk);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pk, program]);
    if (!name) return <span>{shorten(pk)}</span>;
    return <span>{name}</span>;
  };

  const canUse = useMemo(() => !!program && !!publicKey, [program, publicKey]);

  const fetchAll = async () => {
    if (!program || !publicKey) return;
    setLoading(true);
    try {
      // Some legacy or corrupted accounts on devnet can break decode with RangeError.
      // Walk program accounts and decode each safely, skipping failures.
      const conn = (program as any).provider.connection;
      const programId = (program as any).programId;
      const accs = await conn.getProgramAccounts(programId, { commitment: 'processed' });
      const decoded: any[] = [];
      for (const a of accs) {
        try {
          const acct = await (program as any).account.collaborationRequest.fetchNullable(a.pubkey, 'processed');
          if (acct) {
            decoded.push({ publicKey: a.pubkey, account: acct });
          }
        } catch (e) {
          // Skip accounts that are not CollaborationRequest or fail to decode
          continue;
        }
      }
      // Sort newest first
      decoded.sort((x: any, y: any) => (y.account.timestamp || 0) - (x.account.timestamp || 0));
      const rec = decoded.filter((a: any) => a.account.to?.toString?.() === publicKey.toString());
      const snt = decoded.filter((a: any) => a.account.from?.toString?.() === publicKey.toString());
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

  // Handle highlight from URL query parameter
  useEffect(() => {
    if (highlightId && !loading) {
      // Find which tab the request is in
      const inReceived = received.find(r => r.publicKey.toString() === highlightId);
      const inSent = sent.find(r => r.publicKey.toString() === highlightId);
      
      if (inReceived) {
        setActiveTab('received');
      } else if (inSent) {
        setActiveTab('sent');
      }
      
      // Highlight the request
      setHighlightedId(highlightId);
      
      // Scroll to the request after a short delay to ensure rendering
      setTimeout(() => {
        const element = requestRefs.current[highlightId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightedId(null), 3000);
      }, 300);
    }
  }, [highlightId, loading, received, sent]);

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

  function parseProofs(message: string) {
    const lines = (message || '').split('\n');
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

  const Section = ({ items, type }: { items: any[]; type: 'open' | 'received' | 'sent' }) => (
    <div>
      {items.length === 0 ? (
        <div className="text-gray-600 bg-white border border-gray-200 rounded-lg p-6 text-center text-sm">
          No {type} collaboration requests.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((req) => {
            const status = Object.keys(req.account.status)[0];
            const isPending = status === 'pending';
            const { gh, tw, body } = parseProofs(req.account.message || '');
            const youAreSender = publicKey?.toString() === req.account.from.toString();
            const youAreRecipient = publicKey?.toString() === req.account.to.toString();
            const reqId = req.publicKey.toString();
            const isHighlighted = reqId === highlightedId;
            return (
              <div
                key={reqId}
                ref={el => { requestRefs.current[reqId] = el; }}
                className={`bg-white border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm transition-all duration-500 ${
                  isHighlighted ? 'border-[#00D4AA] border-2 bg-[#00D4AA]/5' : 'border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs text-gray-500">{new Date(req.account.timestamp * 1000).toLocaleString()}</span>
                  </div>
                  <div className="mt-1">
                    <Link
                      className="text-sm text-[#00D4AA] hover:underline font-medium"
                      href={`/requests/${req.publicKey.toString()}`}
                      title="Open request details"
                    >
                      View full request →
                    </Link>
                    <span className="mx-2 text-gray-400">•</span>
                    <Link
                      className="text-sm text-[#00D4AA] hover:underline font-medium"
                      href={`/projects/${req.account.project.toString()}`}
                      title="Open project"
                    >
                      Project
                    </Link>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{body || req.account.message}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {gh && (
                      <a href={gh} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">GitHub</a>
                    )}
                    {tw && (
                      <a href={`https://twitter.com/${tw.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">@{tw.replace(/^@/, '')}</a>
                    )}
                    {req.account.desiredRole && (
                      <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-xs font-medium">
                        {Object.keys(req.account.desiredRole)[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {type === 'received' ? (
                      <>From: <Username pk={req.account.from.toString()} /></>
                    ) : (
                      <>To: <Username pk={req.account.to.toString()} /></>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Recipient actions for pending */}
                  {youAreRecipient && isPending && (
                    <>
                      <button
                        disabled={actingId === req.publicKey.toString()}
                        onClick={() => accept(req)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {actingId === req.publicKey.toString() ? 'Processing…' : 'Accept'}
                      </button>
                      <button
                        disabled={actingId === req.publicKey.toString()}
                        onClick={() => reject(req)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {/* Sender actions for pending */}
                  {youAreSender && isPending && (
                    <>
                      <button
                        disabled={actingId === req.publicKey.toString()}
                        onClick={() => updateMsg(req)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        disabled={actingId === req.publicKey.toString()}
                        onClick={() => withdraw(req)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    </>
                  )}
                  {/* Recipient delete for resolved */}
                  {youAreRecipient && !isPending && (
                    <button
                      disabled={actingId === req.publicKey.toString()}
                      onClick={() => delRequest(req)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const open = useMemo(
    () => received.filter((r) => Object.keys(r.account.status)[0] === 'pending'),
    [received]
  );

  if (!publicKey) {
    return (
      <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-gray-600">Connect your wallet to view collaboration requests</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F8F9FA] ${premium.className}`}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Collaboration Inbox</h1>
            <p className="text-sm text-gray-600">All your collaboration requests and messages</p>
          </div>
          <button
            onClick={fetchAll}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              activeTab === 'open'
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Open ({open.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              activeTab === 'received'
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Received ({received.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              activeTab === 'sent'
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Sent ({sent.length})
          </button>
        </div>

        {loading ? (
          <div className="text-gray-600 text-sm">Loading…</div>
        ) : activeTab === 'open' ? (
          <Section items={open} type="open" />
        ) : activeTab === 'received' ? (
          <Section items={received} type="received" />
        ) : (
          <Section items={sent} type="sent" />
        )}
      </div>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <RequestsPageContent />
    </Suspense>
  );
}
