'use client';

import { useEffect, useMemo, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';
import { EmptyState } from '../components/EmptyState';
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

  // Mark all current requests as read (clears the notification badge)
  const markAllAsRead = () => {
    if (typeof window === 'undefined' || !publicKey) return;
    try {
      // Mark incoming requests as read
      const incomingKey = `notifiedIncoming_${publicKey.toBase58()}`;
      const storedIncoming = localStorage.getItem(incomingKey);
      const notifiedIncoming = storedIncoming ? new Set(JSON.parse(storedIncoming)) : new Set();
      
      // Add all current received request IDs to notified set
      received.forEach(req => {
        notifiedIncoming.add(req.publicKey.toString());
      });
      localStorage.setItem(incomingKey, JSON.stringify(Array.from(notifiedIncoming)));
      
      // Mark outgoing request responses as read
      const outgoingKey = `notifiedRequests_${publicKey.toBase58()}`;
      const storedOutgoing = localStorage.getItem(outgoingKey);
      const notifiedOutgoing = storedOutgoing ? new Set(JSON.parse(storedOutgoing)) : new Set();
      
      // Add all current sent request IDs to notified set
      sent.forEach(req => {
        notifiedOutgoing.add(req.publicKey.toString());
      });
      localStorage.setItem(outgoingKey, JSON.stringify(Array.from(notifiedOutgoing)));
      
      console.log('✅ Marked all requests as read');
    } catch (e) {
      console.error('Failed to mark requests as read:', e);
    }
  };

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
      
      // Received: requests TO you (as project owner)
      const rec = decoded.filter((a: any) => a.account.to?.toString?.() === publicKey.toString());
      
      // Sent: requests FROM you (as applicant)
      const snt = decoded.filter((a: any) => a.account.from?.toString?.() === publicKey.toString());
      
      // Special case: If you're the applicant and the request is accepted with an owner reply,
      // also show it in Received (because you're receiving a response)
      const sentWithReplies = decoded.filter((a: any) => {
        const isSender = a.account.from?.toString?.() === publicKey.toString();
        const status = Object.keys(a.account.status || {})[0];
        const isAccepted = status === 'accepted';
        const ownerMsg = a.account.owner_message || a.account.ownerMessage || '';
        const hasOwnerReply = ownerMsg.trim().length > 0;
        
        // Debug logging
        if (isSender && isAccepted) {
          console.log('🔍 Checking sent request for owner reply:');
          console.log('  - Request ID:', a.publicKey.toString().slice(0, 8));
          console.log('  - Status:', status);
          console.log('  - Owner message:', ownerMsg);
          console.log('  - Has owner reply:', hasOwnerReply);
          console.log('  - Will show in Received:', isSender && isAccepted && hasOwnerReply);
        }
        
        return isSender && isAccepted && hasOwnerReply;
      });
      
      // Combine received requests with sent requests that have owner replies
      const allReceived = [...rec, ...sentWithReplies];
      
      // Remove duplicates by public key
      const uniqueReceived = allReceived.filter((item, index, self) =>
        index === self.findIndex((t) => t.publicKey.toString() === item.publicKey.toString())
      );
      
      setReceived(uniqueReceived);
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

  // Mark all requests as read when they're loaded (clears the badge)
  useEffect(() => {
    if (!loading && (received.length > 0 || sent.length > 0)) {
      // Small delay to ensure requests are displayed first
      setTimeout(() => {
        markAllAsRead();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, received.length, sent.length]);

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
        <div className="text-(--text-secondary) bg-(--surface) border border-(--border) rounded-lg p-6 text-center text-sm">
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
                className={`bg-(--surface) border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm transition-all duration-500 ${
                  isHighlighted ? 'border-[#00D4AA] border-2 bg-[#00D4AA]/5' : 'border-(--border)'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs text-(--text-secondary)">{new Date(req.account.timestamp * 1000).toLocaleString()}</span>
                  </div>
                  <div className="mt-1">
                    <Link
                      className="text-sm text-[#00D4AA] hover:underline font-medium"
                      href={`/requests/${req.publicKey.toString()}`}
                      title="Open request details"
                    >
                      View full request →
                    </Link>
                    <span className="mx-2 text-(--text-secondary)">•</span>
                    <Link
                      className="text-sm text-[#00D4AA] hover:underline font-medium"
                      href={`/projects/${req.account.project.toString()}`}
                      title="Open project"
                    >
                      Project
                    </Link>
                  </div>
                  <div className="mt-2 text-sm text-(--text-secondary) whitespace-pre-wrap">{body || req.account.message}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {gh && (
                      <a href={gh} target="_blank" rel="noopener noreferrer" className="text-(--text-secondary) hover:text-(--text-primary) underline">GitHub</a>
                    )}
                    {tw && (
                      <a href={`https://twitter.com/${tw.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="text-(--text-secondary) hover:text-(--text-primary) underline">@{tw.replace(/^@/, '')}</a>
                    )}
                    {req.account.desiredRole && (
                      <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-xs font-medium">
                        {Object.keys(req.account.desiredRole)[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-(--text-secondary)">
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
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        disabled={actingId === req.publicKey.toString()}
                        onClick={() => reject(req)}
                        className="border border-(--border) hover:border-[#ff6b6b] text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {/* Sender actions */}
                  {youAreSender && isPending && (
                    <button
                      disabled={actingId === req.publicKey.toString()}
                      onClick={() => withdraw(req)}
                      className="border border-(--border) hover:border-[#ff6b6b] text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Withdraw
                    </button>
                  )}
                  {/* Sender can update message */}
                  {youAreSender && (
                    <button
                      disabled={actingId === req.publicKey.toString()}
                      onClick={() => updateMsg(req)}
                      className="bg-(--surface-hover) hover:bg-(--surface) text-(--text-primary) text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors border border-(--border)"
                    >
                      Update
                    </button>
                  )}
                  {/* Recipient delete for resolved */}
                  {youAreRecipient && !isPending && (
                    <button
                      onClick={() => delRequest(req)}
                      className="border border-(--border) hover:border-[#ff6b6b] text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Remove
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
      <div className={`min-h-screen bg-(--background) ${premium.className}`}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <EmptyState
            icon="🔌"
            title="Connect Your Wallet"
            description="Connect your Phantom wallet to view collaboration requests"
            actionLabel="Connect Wallet"
            onAction={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-(--background) ${premium.className}`}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-(--text-primary)">Collaboration Inbox</h1>
            <p className="text-sm text-(--text-secondary)">All your collaboration requests and messages</p>
          </div>
          <button
            onClick={fetchAll}
            className="bg-[#00D4AA] hover:bg-[#00B894] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeTab === 'open'
                ? 'bg-[#00D4AA] border-[#00D4AA] text-white shadow-sm'
                : 'bg-(--surface) border-(--border) text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            Open ({open.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-[#00D4AA] border-[#00D4AA] text-white shadow-sm'
                : 'bg-(--surface) border-(--border) text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            Received ({received.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-[#00D4AA] border-[#00D4AA] text-white shadow-sm'
                : 'bg-(--surface) border-(--border) text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            Sent ({sent.length})
          </button>
        </div>

        {loading ? (
          <div className="text-(--text-secondary) text-sm">Loading…</div>
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
