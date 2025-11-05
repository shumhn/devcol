'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';

export default function CollabRequests() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (publicKey && program) {
      fetchRequests();
    }
  }, [publicKey, program]);

  const fetchRequests = async () => {
    if (!publicKey || !program) return;
    
    try {
      // Fetch all collaboration requests
      const allRequests = await (program.account as any).collaborationRequest.all();
      
      // Filter requests where the current user is the recipient (project owner)
      const myRequests = allRequests.filter(
        (req: any) => req.account.to.toString() === publicKey.toString()
      );
      
      setRequests(myRequests);
      
      // Fetch user profiles for all senders
      const uniqueSenders = [...new Set(myRequests.map((req: any) => req.account.from.toString()))];
      const profiles = new Map();
      
      for (const senderWallet of uniqueSenders) {
        try {
          const walletPubkey = new PublicKey(senderWallet as string);
          const [userPda] = await PublicKey.findProgramAddress(
            [Buffer.from('user'), walletPubkey.toBuffer()],
            (program as any).programId
          );
          const profile = await (program as any).account.user.fetchNullable(userPda);
          if (profile) {
            profiles.set(senderWallet, profile);
          }
        } catch (error) {
          // User doesn't have a profile, that's okay
          console.log(`No profile found for wallet ${senderWallet}`);
        }
      }
      
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!publicKey || !program) return;
    
    setLoading(true);
    try {
      await (program as any).methods
        .acceptCollabRequest()
        .accounts({
          collabRequest: request.publicKey,
          projectOwner: publicKey,
          to: publicKey,
        })
        .rpc();

      alert('✅ Collaboration request accepted!');
      await fetchRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (request: any) => {
    if (!publicKey || !program) return;
    
    setLoading(true);
    try {
      await (program as any).methods
        .rejectCollabRequest()
        .accounts({
          collabRequest: request.publicKey,
          projectOwner: publicKey,
          to: publicKey,
        })
        .rpc();

      alert('✅ Collaboration request rejected');
      await fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: any) => {
    const statusMap: any = {
      pending: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: '⏳ Pending' },
      accepted: { bg: 'bg-green-900/30', text: 'text-green-400', label: '✓ Accepted' },
      rejected: { bg: 'bg-red-900/30', text: 'text-red-400', label: '✗ Rejected' }
    };
    
    const statusKey = Object.keys(status)[0];
    const style = statusMap[statusKey] || statusMap.pending;
    
    return (
      <span className={`${style.bg} ${style.text} px-3 py-1 rounded-full text-sm font-semibold`}>
        {style.label}
      </span>
    );
  };

  if (!publicKey) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">Connect your wallet to view collaboration requests</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">📬 Collaboration Requests</h2>
      
      {requests.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No collaboration requests received yet</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request, idx) => {
            const senderWallet = request.account.from.toString();
            const senderProfile = userProfiles.get(senderWallet);
            
            return (
              <div key={idx} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    {senderProfile ? (
                      <div>
                        <p className="text-white font-semibold mb-1">
                          {senderProfile.display_name || senderProfile.username || 'Anonymous Collaborator'}
                        </p>
                        {senderProfile.role && (
                          <p className="text-gray-400 text-sm">{senderProfile.role}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-white font-semibold mb-1">Wallet-only Collaborator</p>
                        <p className="text-gray-400 text-sm break-all font-mono">
                          {senderWallet.slice(0, 20)}...
                        </p>
                      </div>
                    )}
                    <p className="text-gray-400 text-sm mt-1">
                      Project: {request.account.project.toString().slice(0, 16)}...
                    </p>
                  </div>
                  {getStatusBadge(request.account.status)}
                </div>
              
              <div className="bg-gray-800 rounded p-3 mb-3">
                <p className="text-gray-300 text-sm">{request.account.message}</p>
              </div>
              
              {Object.keys(request.account.status)[0] === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleAcceptRequest(request)}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request)}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
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
}
