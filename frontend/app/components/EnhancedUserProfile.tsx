'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import { SystemProgram } from '@solana/web3.js';
import { uploadImageToIPFS, uploadMetadataToIPFS, fetchMetadataFromIPFS, createDefaultMetadata } from '../utils/ipfs';

export default function EnhancedUserProfile() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [user, setUser] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile picture
  const [profilePicPreview, setProfilePicPreview] = useState<string>('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    username: '',
    techStack: '',
    bio: '',
    githubUrl: '',
    twitterUrl: '',
  });

  // Validation errors
  const [errors, setErrors] = useState({
    username: '',
    techStack: '',
    githubUrl: '',
    twitterUrl: '',
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
      const userAccount = await (program as any).account.user.fetch(userPDA);
      setUser(userAccount);

      if (userAccount.ipfsMetadataHash) {
        const ipfsData = await fetchMetadataFromIPFS(userAccount.ipfsMetadataHash);
        setMetadata(ipfsData);
      }
    } catch (error) {
      console.log('User not found');
      setUser(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ Image must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('❌ Please upload an image file');
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
    const newErrors = {
      username: '',
      displayName: '',
      techStack: '',
      githubUrl: '',
      twitterUrl: '',
    };

    let isValid = true;

    // Username validation
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

    // Display name validation
    // if (!formData.displayName.trim()) {
    //   newErrors.displayName = 'Display name is required';
    //   isValid = false;
    // }

    // Tech stack validation
    if (!formData.techStack.trim()) {
      newErrors.techStack = 'Tech stack/role is required';
      isValid = false;
    }

    // GitHub URL validation
    if (!formData.githubUrl.trim()) {
      newErrors.githubUrl = 'GitHub profile URL is required';
      isValid = false;
    } else if (!formData.githubUrl.match(/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/)) {
      newErrors.githubUrl = 'Please enter a valid GitHub profile URL (e.g., https://github.com/username)';
      isValid = false;
    }

    // Twitter URL validation
    if (!formData.twitterUrl.trim()) {
      newErrors.twitterUrl = 'Twitter profile URL is required';
      isValid = false;
    } else if (!formData.twitterUrl.match(/^https?:\/\/(www\.)?x\.com\/[a-zA-Z0-9_]+\/?$/)) {
      newErrors.twitterUrl = 'Please enter a valid Twitter profile URL (e.g., https://x.com/username)';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('❌ Please fix the errors in the form');
      return;
    }

    if (!publicKey || !program) return;

    // Prevent double submission
    if (loading) return;

    setLoading(true);
    try {
      // Upload profile picture to IPFS
      let profilePicHash = '';
      if (profilePicFile) {
        console.log('Uploading profile picture to IPFS...');
        profilePicHash = await uploadImageToIPFS(profilePicFile);
      }

      // Create metadata object
      const metadataObj = {
        ...createDefaultMetadata(),
        profile_picture: profilePicHash,
        social_links: {
          github: formData.githubUrl,
          twitter: formData.twitterUrl,
        },
      };

      // Upload metadata to IPFS
      console.log('Uploading metadata to IPFS...');
      const metadataHash = await uploadMetadataToIPFS(metadataObj);

      const [userPDA] = getUserPDA(publicKey);

      if (isEditing) {
        // Update existing profile
        await (program as any).methods
          .updateUser(
            formData.username, // Use username as display name
            formData.techStack,
            '', // location (empty string since we removed it)
            formData.bio,
            formData.githubUrl,
            metadataHash,
            true,
            { public: {} }
          )
          .accounts({
            user: userPDA,
            signer: publicKey,
            wallet: publicKey,
          })
          .rpc();

        alert('✅ Profile updated successfully!');
      } else {
        // Create new profile
        await (program as any).methods
          .createUser(
            formData.username,
            formData.username, // Use username as display name
            formData.techStack,
            '', // location (empty string since we removed it)
            formData.bio,
            formData.githubUrl,
            metadataHash
          )
          .accounts({
            user: userPDA,
            signer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        alert('✅ Profile created successfully!');
      }

      await fetchUser();
      setShowCreateForm(false);
      setIsEditing(false);
    } catch (error: any) {
      console.error('Transaction Error Details:', error);
      console.error('Error Message:', error.message);
      console.error('Error Logs:', error.logs);

      // Handle specific Solana errors
      if (error.message?.includes('already in use')) {
        alert('❌ Profile already exists! Use Edit Profile instead.');
      } else if (error.message?.includes('already been processed') || error.message?.includes('This transaction has already been processed')) {
        alert('⚠️ Transaction already processed. Please wait a moment and try again.');
        console.warn('Duplicate transaction detected - this is normal if you clicked multiple times');
      } else if (error.message?.includes('User rejected')) {
        alert('❌ Transaction cancelled by user.');
      } else if (error.message?.includes('insufficient funds')) {
        alert('❌ Insufficient SOL balance for transaction.');
      } else if (error.message?.includes('Blockhash not found')) {
        alert('⚠️ Transaction expired. Please try again.');
      } else if (error.message?.includes('Simulation failed')) {
        alert('⚠️ Transaction simulation failed. Please try again in a few seconds.');
      } else {
        // Try to get more details from SendTransactionError if available
        try {
          if (error.getLogs) {
            const logs = error.getLogs();
            console.error('Transaction logs:', logs);
            alert('❌ Transaction failed. Check console for details.');
          } else {
            alert('❌ Error: ' + (error.message || 'Unknown error occurred'));
          }
        } catch (logError) {
          alert('❌ Error: ' + (error.message || 'Unknown error occurred'));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400">Connect your Phantom wallet to create your developer profile</p>
      </div>
    );
  }

  // Show existing profile
  if (user && !showCreateForm && !isEditing) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {/* Profile Header */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>

        <div className="relative px-6 pb-6">
          {/* Profile Picture */}
          <div className="absolute -top-16 left-6">
            <div className="w-32 h-32 rounded-full border-4 border-gray-800 bg-gray-700 flex items-center justify-center text-4xl overflow-hidden">
              {metadata?.profile_picture ? (
                <img src={metadata.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                '👤'
              )}
            </div>
          </div>

          <div className="pt-20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{user.username}</h2>
                <p className="text-blue-400">@{user.username}</p>
                <p className="text-gray-400">{user.role}</p>
                {user.location && <p className="text-gray-500 text-sm">📍 {user.location}</p>}
              </div>
              <button
                onClick={() => {
                  setFormData({
                    username: user.username,
                    techStack: user.role,
                    bio: user.bio,
                    githubUrl: user.githubLink,
                    twitterUrl: metadata?.social_links?.twitter || '',
                  });
                  setProfilePicPreview(metadata?.profile_picture || '');
                  setIsEditing(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                ✏️ Edit Profile
              </button>
            </div>

            <div className="space-y-4">
              {user.bio && (
                <div>
                  <h3 className="text-white font-semibold mb-2">📝 Bio</h3>
                  <p className="text-gray-300">{user.bio}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {user.githubLink && (
                  <a
                    href={user.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-blue-400"
                  >
                    <span>🔗</span>
                    <span>GitHub</span>
                  </a>
                )}
                {metadata?.social_links?.twitter && (
                  <a
                    href={metadata.social_links.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-blue-400"
                  >
                    <span>🐦</span>
                    <span>Twitter/X</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create/Edit Form
  if (showCreateForm || isEditing) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">
          {isEditing ? '✏️ Edit Your Profile' : '🚀 Create Your Developer Profile'}
        </h2>

        <div className="space-y-5">
          {/* Profile Picture */}
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Profile Picture</label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, GIF</p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              Username * <span className="text-xs text-gray-500">(max 32 chars)</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
              maxLength={32}
              disabled={isEditing}
              className="w-full bg-gray-700 text-white rounded px-4 py-3 disabled:opacity-50"
              placeholder="johndoe"
            />
            {errors.username && <p className="text-red-400 text-sm mt-1">⚠️ {errors.username}</p>}
            {isEditing && <p className="text-gray-500 text-xs mt-1">Username cannot be changed</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              Role * <span className="text-xs text-gray-500">(max 30 chars)</span>
            </label>
            <input
              type="text"
              value={formData.techStack}
              onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
              maxLength={30}
              className="w-full bg-gray-700 text-white rounded px-4 py-3"
              placeholder="Full Stack Developer"
            />
            {errors.techStack && <p className="text-red-400 text-sm mt-1">⚠️ {errors.techStack}</p>}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              Bio <span className="text-xs text-gray-500">(max 200 chars)</span>
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              maxLength={200}
              rows={4}
              className="w-full bg-gray-700 text-white rounded px-4 py-3"
              placeholder="Tell us about yourself, your experience, and what you're working on..."
            />
            <div className="text-xs text-gray-500 mt-1">{formData.bio.length}/200 characters</div>
          </div>

          {/* GitHub URL */}
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              GitHub Profile URL *
            </label>
            <input
              type="url"
              value={formData.githubUrl}
              onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
              className="w-full bg-gray-700 text-white rounded px-4 py-3"
              placeholder="https://github.com/johndoe"
            />
            {errors.githubUrl && <p className="text-red-400 text-sm mt-1">⚠️ {errors.githubUrl}</p>}
          </div>

          {/* Twitter URL */}
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              Twitter Profile URL *
            </label>
            <input
              type="url"
              value={formData.twitterUrl}
              onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
              className="w-full bg-gray-700 text-white rounded px-4 py-3"
              placeholder="https://x.com/devsh_"
            />
            {errors.twitterUrl && <p className="text-red-400 text-sm mt-1">⚠️ {errors.twitterUrl}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={() => {
              setShowCreateForm(false);
              setIsEditing(false);
              setErrors({
                username: '',
                techStack: '',
                githubUrl: '',
                twitterUrl: '',
              });
            }}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? '⏳ Processing...' : (isEditing ? '✅ Update Profile' : '🚀 Create Profile')}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          * Required fields • All data is stored on Solana blockchain
        </p>
      </div>
    );
  }

  // Initial state
  return (
    <div className="bg-gray-800 rounded-lg p-8 text-center">
      <div className="text-6xl mb-4">🚀</div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to DevCol!</h2>
      <p className="text-gray-400 mb-6">Create your professional developer profile on Solana</p>
      <button
        onClick={() => setShowCreateForm(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg text-lg font-semibold"
      >
        Create Your Profile
      </button>
    </div>
  );
}
