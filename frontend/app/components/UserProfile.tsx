'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import { SystemProgram } from '@solana/web3.js';

export default function UserProfile() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    githubLink: '',
    bio: ''
  });

  useEffect(() => {
    if (publicKey && program) {
      fetchUser();
    }
  }, [publicKey, program]);

  const fetchUser = async () => {
    if (!publicKey || !program) return;
    
    try {
      const [userPDA] = getUserPDA(publicKey);
      const userAccount = await program.account.user.fetch(userPDA);
      setUser(userAccount);
    } catch (error) {
      console.log('User not found, needs to create profile');
      setUser(null);
    }
  };

  const handleCreateUser = async () => {
    if (!publicKey || !program) return;
    
    setLoading(true);
    try {
      const [userPDA] = getUserPDA(publicKey);
      
      await program.methods
        .createUser(formData.username, formData.githubLink, formData.bio)
        .accounts({
          user: userPDA,
          signer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert('✅ User profile created successfully!');
      await fetchUser();
      setShowForm(false);
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert('❌ Error creating user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">Connect your wallet to create a profile</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">👤 Your Profile</h2>
        <div className="space-y-2">
          <p className="text-gray-300"><span className="font-semibold">Username:</span> {user.username}</p>
          <p className="text-gray-300"><span className="font-semibold">GitHub:</span> 
            <a href={user.githubLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-2">
              {user.githubLink}
            </a>
          </p>
          <p className="text-gray-300"><span className="font-semibold">Bio:</span> {user.bio}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Create Your Profile</h2>
      
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Create Profile
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Username (max 32 chars)</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              maxLength={32}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
              placeholder="johndoe"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">GitHub Link (max 100 chars)</label>
            <input
              type="text"
              value={formData.githubLink}
              onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
              maxLength={100}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
              placeholder="https://github.com/johndoe"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Bio (max 200 chars)</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              maxLength={200}
              rows={3}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
              placeholder="Full-stack developer passionate about Web3..."
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCreateUser}
              disabled={loading || !formData.username}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
