'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import { SystemProgram } from '@solana/web3.js';
import { uploadImageToIPFS, uploadMetadataToIPFS, fetchMetadataFromIPFS, createDefaultMetadata } from '../utils/ipfs';
import { Space_Grotesk, Sora } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });
const premium = Sora({ subsets: ['latin'], weight: ['400', '600'] });

const ROLES = ['Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'Smart Contract Developer', 'Designer', 'DevOps', 'Product Manager', 'Other'];
const TECH_STACKS = ['Solana', 'Anchor', 'React', 'Next.js', 'TypeScript', 'Rust', 'Node.js', 'Python', 'Go', 'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'MongoDB', 'PostgreSQL', 'Other'];
const TECH_EMOJI: Record<string, string> = {
  'React': '⚛️',
  'Next.js': '⚡',
  'TypeScript': '🔷',
  'Node.js': '🟢',
  'Solana': '◎',
  'Anchor': '⚓',
  'Rust': '🦀',
  'PostgreSQL': '🐘',
  'MongoDB': '🍃',
  'GraphQL': '🌐',
  'Docker': '🐳',
  'Kubernetes': '☸️',
  'AWS': '☁️',
  'Python': '🐍',
  'Go': '🐹',
};

export default function EnhancedUserProfile() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [user, setUser] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [accountAddress, setAccountAddress] = useState<any>(null); // Track actual account address (PDA or old)

  const [profilePicPreview, setProfilePicPreview] = useState<string>('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  type ProfileForm = { username: string; displayName: string; role: string; country: string; bio: string; githubUrl: string; twitterUrl: string; contactInfo: string };
  type ProfileErrors = { username: string; role: string; techStack: string; githubUrl: string; twitterUrl: string; contactInfo: string; displayName?: string };

  const [formData, setFormData] = useState<ProfileForm>({
    username: '',
    displayName: '',
    role: '',
    country: '',
    bio: '',
    githubUrl: '',
    twitterUrl: '',
    contactInfo: '',
  });
  // Multi-select tech stacks (saved to IPFS metadata)
  const [techStacks, setTechStacks] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState<string>('');

  const [errors, setErrors] = useState<ProfileErrors>({
    username: '',
    role: '',
    techStack: '',
    githubUrl: '',
    twitterUrl: '',
    contactInfo: '',
  });

  useEffect(() => {
    // When wallet changes, immediately clear all state
    setUser(null);
    setMetadata(null);
    setAccountAddress(null);
    setNeedsMigration(false);
    setShowCreateForm(false);
    setIsEditing(false);
    
    if (publicKey && program) {
      setLoading(true);
      fetchUser();
    } else {
      setLoading(false);
    }
    
    // Cleanup function: reset state when wallet disconnects or changes
    return () => {
      setUser(null);
      setMetadata(null);
      setAccountAddress(null);
      setNeedsMigration(false);
      setShowCreateForm(false);
      setIsEditing(false);
    };
  }, [publicKey?.toString(), program]); // Use publicKey.toString() to properly detect changes

  const fetchUser = async () => {
    if (!publicKey || !program) return;
    console.log('🔍 Fetching user for wallet:', publicKey.toString());
    
    try {
      // First try the calculated PDA
      const [userPDA] = getUserPDA(publicKey);
      console.log('📍 Calculated PDA:', userPDA.toString());
      
      let userAccount = null;
      let accountAddress = userPDA;
      
      try {
        console.log('🔎 Trying to fetch from calculated PDA...');
        userAccount = await (program as any).account.user.fetch(userPDA);
        console.log('✅ Found account at calculated PDA');
        accountAddress = userPDA; // Store PDA address
      } catch (e) {
        // If not found at calculated PDA, try the old hardcoded address
        console.log('❌ Not found at calculated PDA, checking old address...');
        const { PublicKey } = await import('@solana/web3.js');
        const oldAddress = new PublicKey('FWvQRwMZAWheL386Gcixjjr8YUjvx8BWTmaFCmWukxsP');
        console.log('📍 Old address:', oldAddress.toString());
        
        try {
          console.log('🔎 Trying to fetch from old address...');
          userAccount = await (program as any).account.user.fetch(oldAddress);
          accountAddress = oldAddress; // Store old address
          console.log('✅ Found account at old address!');
          console.log('📦 Account data:', userAccount);
        } catch (e2) {
          console.log('❌ User not found at either address');
          console.log('Error:', e2);
          setUser(null);
          setAccountAddress(null);
          setNeedsMigration(false);
          return;
        }
      }
      
      // Store the actual account address in state
      setAccountAddress(accountAddress);
      console.log('💾 Stored account address:', accountAddress.toString());
      
      // Load user profile - contact info is optional
      console.log('✅ User account loaded:', {
        username: userAccount.username,
        hasContactInfo: !!(userAccount.contactInfo && userAccount.contactInfo.trim())
      });
      
      setUser(userAccount);
      setNeedsMigration(false); // No forced migration
      
      if (userAccount.ipfsMetadataHash) {
        const ipfsData = await fetchMetadataFromIPFS(userAccount.ipfsMetadataHash);
        setMetadata(ipfsData);
      }
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      setUser(null);
      setNeedsMigration(false);
    } finally {
      // Ensure loading is reset after fetch completes so the form button
      // does not remain in a 'Saving...' state when entering edit mode.
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: ProfileErrors = {
      username: '',
      role: '',
      techStack: '',
      githubUrl: '',
      twitterUrl: '',
      contactInfo: '',
    };
    let isValid = true;

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
      isValid = false;
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
      isValid = false;
    }

    if (techStacks.length === 0) {
      newErrors.techStack = 'At least one tech stack is required';
      isValid = false;
    }

    // Contact info is optional - no validation needed

    if (!formData.githubUrl.trim()) {
      newErrors.githubUrl = 'GitHub profile URL is required';
      isValid = false;
    } else if (!formData.githubUrl.match(/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/)) {
      newErrors.githubUrl = 'Please enter a valid GitHub profile URL';
      isValid = false;
    }

    if (!formData.twitterUrl.trim()) {
      newErrors.twitterUrl = 'Twitter profile URL is required';
      isValid = false;
    } else if (!formData.twitterUrl.match(/^https?:\/\/(www\.)?(x|twitter)\.com\/[a-zA-Z0-9_]+\/?$/)) {
      newErrors.twitterUrl = 'Please enter a valid Twitter/X profile URL';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleMigration = async (contactInfo: string) => {
    if (!publicKey || !program) return;
    if (!contactInfo.trim()) {
      alert('Contact info is required for migration');
      return;
    }
    try {
      setLoading(true);
      const { PublicKey } = await import('@solana/web3.js');
      const oldAccountAddress = new PublicKey('FWvQRwMZAWheL386Gcixjjr8YUjvx8BWTmaFCmWukxsP');
      await (program as any).methods
        .migrateUserAccount(contactInfo)
        .accounts({
          user: oldAccountAddress,
          signer: publicKey,
          systemProgram: (await import('@solana/web3.js')).SystemProgram.programId,
        })
        .rpc();
      // brief wait then refetch
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const updated = await (program as any).account.user.fetch(oldAccountAddress, 'confirmed');
        setUser(updated);
        setAccountAddress(oldAccountAddress);
        setNeedsMigration(false);
        alert('✅ Account migrated successfully!');
      } catch {}
    } catch (error: any) {
      console.error('Migration error:', error);
      alert('Failed to migrate account: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('Please fix the errors in the form');
      return;
    }
    if (!publicKey || !program) {
      alert('⚠️ Please connect your wallet first');
      return;
    }
    setSaving(true);
    try {
      // profile picture upload (optional, 30s timeout)
      let profilePicHash = '';
      if (profilePicFile) {
        try {
          profilePicHash = await Promise.race([
            uploadImageToIPFS(profilePicFile),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Image upload timeout after 30s')), 30000)),
          ]);
        } catch {
          alert('⚠️ Profile picture upload failed. Continuing without image...');
        }
      }
      // metadata upload (optional, 30s timeout)
      const meta = {
        display_name: formData.displayName,
        tech_stack: techStacks,
        profile_picture: profilePicHash,
        social_links: { twitter: formData.twitterUrl },
        country: formData.country,
      };
      let metadataHash = '';
      try {
        metadataHash = await Promise.race([
          uploadMetadataToIPFS(meta),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Metadata upload timeout after 30s')), 30000)),
        ]);
      } catch {
        // proceed without metadata
      }
      const [userPDA] = getUserPDA(publicKey);
      // if editing, update existing account
      if (isEditing && user) {
        if (!accountAddress) {
          alert('Error: Account address not found. Please refresh the page.');
          return;
        }
        await Promise.race([
          (program as any).methods
            .updateUser(
              formData.displayName ? formData.displayName : null,
              formData.role ? formData.role : null,
              formData.country ? formData.country : null,
              formData.bio ? formData.bio : null,
              formData.githubUrl ? formData.githubUrl : null,
              metadataHash ? metadataHash : null,
              formData.contactInfo ? formData.contactInfo : null,
              null,
              null
            )
            .accounts({ user: accountAddress, signer: publicKey, wallet: publicKey })
            .rpc(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout after 60s')), 60000)),
        ]);
        alert('✅ Profile updated successfully!');
      } else {
        // optional: attempt delete existing PDA if present
        try {
          const existing = await (program as any).account.user.fetch(userPDA);
          if (existing) {
            await (program as any).methods.deleteUser().accounts({ user: userPDA, signer: publicKey, wallet: publicKey }).rpc();
            await new Promise((r) => setTimeout(r, 1200));
          }
        } catch {}
        await Promise.race([
          (program as any).methods
            .createUser(
              formData.username,
              formData.displayName || formData.username,
              formData.role,
              formData.country || '',
              formData.bio,
              formData.githubUrl,
              metadataHash,
              formData.contactInfo || ''
            )
            .accounts({ user: userPDA, signer: publicKey, systemProgram: SystemProgram.programId })
            .rpc(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout after 60s')), 60000)),
        ]);
        alert('✅ Profile created successfully!');
      }
      await fetchUser();
      setShowCreateForm(false);
      setIsEditing(false);
      setFormData({ username: '', displayName: '', role: '', country: '', bio: '', githubUrl: '', twitterUrl: '', contactInfo: '' });
      setTechStacks([]);
      setCustomTech('');
      setProfilePicFile(null);
      setProfilePicPreview('');
    } catch (error: any) {
      console.error('❌ Profile save error:', error);
      alert('❌ ' + (error?.message || 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center">
        <h2 className={`${display.className} text-2xl font-bold text-gray-900 mb-2`}>Connect Your Wallet</h2>
        <p className="text-gray-600">Connect your Phantom wallet to create your developer profile</p>
      </div>
    );
  }

  // Show existing profile
  if (user && !showCreateForm && !isEditing) {
    console.log('🔍 Profile View State:', {
      hasUser: !!user,
      needsMigration,
      hasAccountAddress: !!accountAddress,
      accountAddress: accountAddress?.toString(),
      contactInfo: user?.contactInfo
    });
    
    return (
      <>
        {/* Migration Banner */}
        {needsMigration && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-bold text-yellow-800 mb-2">Account Migration Required</h3>
                <p className="text-sm text-yellow-700 mb-4">
                  Your profile is missing the Contact Info field. Add it below to upgrade your account and keep all your data!
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-yellow-800 mb-2">
                      Contact Info (WhatsApp, Discord, etc.) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="migration-contact-info"
                      className="w-full bg-white border border-yellow-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="WhatsApp: +1234567890, Discord: username#1234"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById('migration-contact-info') as HTMLInputElement;
                      if (input) {
                        handleMigration(input.value);
                      }
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Migrating...' : 'Migrate Account'}
                  </button>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  ✅ All your data will be preserved • ✅ Account will be expanded • ✅ Takes 2 seconds
                </p>
              </div>
            </div>
          </div>
        )}
        
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="h-24 bg-gradient-to-r from-[#00D4AA] to-[#00B894]"></div>

        <div className="relative px-4 pb-2">
          {/* Profile Picture */}
          <div className="absolute -top-10 left-4">
            <div className="w-20 h-20 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
              {metadata?.profile_picture ? (
                <img 
                  src={typeof window !== 'undefined' ? localStorage.getItem(`ipfs_image_${metadata.profile_picture}`) || '' : ''} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-3xl text-gray-400">?</span>
              )}
            </div>
          </div>

          <div className="pt-12">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className={`${display.className} text-xl font-bold text-gray-900 mb-0.5`}>
                  {user.display_name || user.username}
                </h2>
                <p className="text-[#00D4AA] font-semibold text-sm">@{user.display_name || user.username}</p>
                <p className="text-gray-600 text-sm mb-0">{user.role}</p>
              </div>

              {/* Action Buttons - Top Right */}
              <div className="flex gap-2">
              <button
                onClick={() => {
                  setFormData({
                    username: user.username,
                    displayName: (metadata as any)?.display_name || '',
                    role: user.role,
                    country: (metadata as any)?.country || (user as any)?.location || '',
                    bio: user.bio,
                    githubUrl: user.githubLink,
                    twitterUrl: metadata?.social_links?.twitter || '',
                    contactInfo: user.contactInfo || '',
                  });
                  const existingTech = (metadata as any)?.tech_stack;
                  if (Array.isArray(existingTech)) {
                    setTechStacks(existingTech as string[]);
                  } else if (typeof existingTech === 'string' && existingTech) {
                    setTechStacks([existingTech]);
                  } else {
                    setTechStacks([]);
                  }
                  setProfilePicPreview(metadata?.profile_picture || '');
                  setIsEditing(true);
                }}
                className="px-4 py-2 bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 font-semibold rounded-lg transition-colors text-sm"
              >
                Edit Profile
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete your profile? This action cannot be undone.')) return;
                  try {
                    setLoading(true);
                    if (!accountAddress) {
                      alert('Error: Account address not found. Please refresh the page.');
                      setLoading(false);
                      return;
                    }
                    console.log('🗑️ Deleting account at:', accountAddress.toString());
                    await (program as any).methods
                      .deleteUser()
                      .accounts({
                        user: accountAddress,
                        signer: publicKey,
                        wallet: publicKey,
                      })
                      .rpc();
                    alert('Profile deleted successfully! You can now create a new one.');
                    setUser(null);
                    setMetadata(null);
                  } catch (error: any) {
                    console.error('Delete error:', error);
                    alert('Failed to delete profile: ' + (error.message || 'Unknown error'));
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Delete Profile
              </button>
              </div>
            </div>

            <div className="space-y-4 mt-3">
              {user.bio && (
                <div>
                  <h3 className="text-gray-900 font-bold mb-2">Bio</h3>
                  <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                </div>
              )}

              {(user.contactInfo || user.contact_info) && (
                <div>
                  <h3 className="text-gray-900 font-bold mb-2">Contact Info</h3>
                  <p className="text-gray-700 leading-relaxed">{user.contactInfo || user.contact_info}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {user.githubLink && (
                  <a
                    href={user.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg text-sm"
                    aria-label="GitHub"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M12 .5C5.73.5.98 5.24.98 11.5c0 4.85 3.14 8.96 7.49 10.41.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.03-3.05.66-3.69-1.3-3.69-1.3-.5-1.27-1.22-1.6-1.22-1.6-.99-.68.08-.66.08-.66 1.09.08 1.66 1.12 1.66 1.12.98 1.67 2.57 1.19 3.2.91.1-.71.38-1.19.69-1.46-2.44-.28-5-1.22-5-5.42 0-1.2.43-2.17 1.12-2.94-.11-.28-.49-1.41.11-2.94 0 0 .93-.3 3.04 1.12.88-.25 1.83-.37 2.78-.38.94.01 1.9.13 2.78.38 2.1-1.42 3.03-1.12 3.03-1.12.61 1.53.23 2.66.12 2.94.7.77 1.12 1.74 1.12 2.94 0 4.21-2.57 5.14-5.01 5.41.39.34.73 1.01.73 2.03 0 1.47-.01 2.66-.01 3.02 0 .29.2.64.76.53 4.35-1.45 7.48-5.56 7.48-10.41C23.02 5.24 18.27.5 12 .5z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">GitHub</span>
                  </a>
                )}
                {metadata?.social_links?.twitter && (
                  <a
                    href={metadata.social_links.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg text-sm"
                    aria-label="Twitter / X"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M18.244 2H21l-6.5 7.43L22 22h-6.158l-4.81-6.243L5.5 22H2l7.02-8.02L2 2h6.342l4.41 5.817L18.244 2zm-1.077 18h1.71L8.92 4H7.14l10.027 16z" />
                    </svg>
                    <span className="sr-only">Twitter / X</span>
                  </a>
                )}
              </div>

              {/* Tech Stack display */}
              {Array.isArray((metadata as any)?.tech_stack) && (metadata as any).tech_stack.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-gray-900 font-bold mb-2">Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {((metadata as any).tech_stack as string[]).map((t, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-800 text-sm rounded-full">
                        <span className="mr-1">{TECH_EMOJI[t] || '🔧'}</span>{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Create/Edit Form
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
      <h2 className={`${display.className} text-3xl font-bold text-gray-900 mb-6`}>
        {isEditing ? 'Edit Your Profile' : 'Create Your Developer Profile'}
      </h2>

      <div className="space-y-6">
        {/* Profile Picture */}
        <div>
          <label className="block text-gray-700 font-semibold mb-3">Profile Picture</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-gray-400">?</span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
              />
              <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, GIF</p>
            </div>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Username <span className="text-xs text-gray-500">(max 32 chars)</span>
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
            maxLength={32}
            disabled={isEditing}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA] disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="yourhandle"
          />
          {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username}</p>}
          {isEditing && <p className="text-xs text-gray-500 mt-1">Username cannot be changed after creation</p>}
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Display Name <span className="text-xs text-gray-500">(optional)</span></label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            maxLength={50}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            placeholder="Your public display name"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
          >
            <option value="">Select your role...</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role}</p>}
        </div>

        {/* Custom Role Input (if Other selected) */}
        {formData.role === 'Other' && (
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Specify Role <span className="text-xs text-gray-500">(max 30 chars)</span></label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              maxLength={30}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
              placeholder="Your role"
            />
          </div>
        )}

        {/* Tech Stacks (multi-select) */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Add your tech stack</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {TECH_STACKS.map((t) => {
              const selected = techStacks.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTechStacks((prev) => selected ? prev.filter(x => x !== t) : [...prev, t]);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm ${selected ? 'bg-[#00D4AA] border-[#00D4AA] text-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="mr-1">{TECH_EMOJI[t] || '🔧'}</span>{t}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTech}
              onChange={(e) => setCustomTech(e.target.value)}
              maxLength={24}
              placeholder="Add custom tech"
              className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            />
            <button
              type="button"
              onClick={() => {
                const v = customTech.trim();
                if (!v) return;
                if (v.length > 24) return;
                setTechStacks((prev) => (prev.includes(v) ? prev : [...prev, v]));
                setCustomTech('');
              }}
              className="px-4 py-2 rounded-lg bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 font-bold"
            >
              + Add
            </button>
          </div>
          {techStacks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {techStacks.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-300 text-sm text-gray-800">
                  {tag}
                  <button type="button" onClick={() => setTechStacks(techStacks.filter(t => t !== tag))} className="text-gray-500 hover:text-gray-800" aria-label={`Remove ${tag}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.techStack && <p className="text-red-600 text-sm mt-1">{errors.techStack}</p>}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Bio <span className="text-xs text-gray-500">(max 200 chars)</span></label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            maxLength={200}
            rows={4}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            placeholder="Tell us about yourself..."
          />
          <div className="text-xs text-gray-500 mt-1">{formData.bio.length}/200</div>
        </div>

        {/* GitHub URL */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">GitHub Profile URL</label>
          <input
            type="url"
            value={formData.githubUrl}
            onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            placeholder="https://github.com/yourhandle"
          />
          {errors.githubUrl && <p className="text-red-600 text-sm mt-1">{errors.githubUrl}</p>}
        </div>

        {/* Twitter URL */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Twitter/X Profile URL</label>
          <input
            type="url"
            value={formData.twitterUrl}
            onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            placeholder="https://x.com/yourhandle"
          />
          {errors.twitterUrl && <p className="text-red-600 text-sm mt-1">{errors.twitterUrl}</p>}
        </div>

        {/* Contact Info - Optional but Recommended */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Contact Info <span className="text-xs text-gray-500">(Optional but recommended)</span>
          </label>
          <input
            type="text"
            value={formData.contactInfo}
            onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            placeholder="WhatsApp: +1234567890, Discord: username#1234, or Meeting link"
          />
          <p className="text-xs text-gray-500 mt-1">
            How should people reach you? (WhatsApp, Discord, Telegram, meeting link, etc.)
          </p>
          {errors.contactInfo && <p className="text-red-600 text-sm mt-1">{errors.contactInfo}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {(showCreateForm || isEditing) && (
            <button
              onClick={() => {
                setShowCreateForm(false);
                setIsEditing(false);
                setFormData({ username: '', displayName: '', role: '', country: '', bio: '', githubUrl: '', twitterUrl: '', contactInfo: '' });
                setTechStacks([]);
                setCustomTech('');
                setProfilePicFile(null);
                setProfilePicPreview('');
              }}
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-[#00D4AA] hover:bg-[#00B894] text-gray-900 px-6 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isEditing ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
