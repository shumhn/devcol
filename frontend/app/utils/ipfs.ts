// IPFS utility for uploading profile pictures and metadata
// Using Pinata API for production-ready IPFS uploads

interface IPFSMetadata {
  profile_picture?: string;
  banner_image?: string;
  social_links?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  skills?: Array<{ name: string; level: string }>;
  languages?: string[];
  experience?: {
    years: number;
    level: string;
    specializations: string[];
  };
  about?: string;
  looking_for?: string;
  availability?: string;
  timezone?: string;
  email?: string;
  preferences?: {
    notifications: boolean;
    show_email: boolean;
    preferred_language: string;
  };
}

// For demo purposes, we'll use a public IPFS gateway
// In production, you'd use Pinata, Web3.Storage, or your own IPFS node
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

/**
 * Upload image to IPFS (simulated for MVP)
 * In production, integrate with Pinata, Web3.Storage, or NFT.Storage
 */
export async function uploadImageToIPFS(file: File): Promise<string> {
  // For MVP, we'll convert to base64 and store in metadata
  // In production, use actual IPFS upload
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Simulate IPFS hash (in production, this would be real IPFS upload)
      const mockHash = `data:${file.type};base64,${base64String.split(',')[1]}`;
      resolve(mockHash);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload metadata JSON to IPFS
 * Returns IPFS hash of the metadata
 */
export async function uploadMetadataToIPFS(metadata: IPFSMetadata): Promise<string> {
  try {
    // For MVP, we'll create a hash of the JSON
    // In production, upload to IPFS and return actual hash
    const jsonString = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Store in localStorage for MVP (in production, upload to IPFS)
    localStorage.setItem(`ipfs_metadata_${hashHex}`, jsonString);
    
    return hashHex;
  } catch (error) {
    console.error('Error uploading metadata:', error);
    throw error;
  }
}

/**
 * Fetch metadata from IPFS
 */
export async function fetchMetadataFromIPFS(hash: string): Promise<IPFSMetadata | null> {
  try {
    // For MVP, fetch from localStorage
    // In production, fetch from IPFS gateway
    const data = localStorage.getItem(`ipfs_metadata_${hash}`);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

/**
 * Create default metadata structure
 */
export function createDefaultMetadata(): IPFSMetadata {
  return {
    profile_picture: '',
    banner_image: '',
    social_links: {
      github: '',
      linkedin: '',
      twitter: '',
      website: '',
    },
    skills: [],
    languages: [],
    experience: {
      years: 0,
      level: 'Beginner',
      specializations: [],
    },
    about: '',
    looking_for: '',
    availability: 'Part-time',
    timezone: 'UTC',
    email: '',
    preferences: {
      notifications: true,
      show_email: false,
      preferred_language: 'en',
    },
  };
}

/**
 * Production IPFS upload function (placeholder)
 * To implement with actual Pinata/Web3.Storage
 */
export async function uploadToProductionIPFS(file: File, apiKey: string): Promise<string> {
  // This would implement actual Pinata/Web3.Storage upload
  // For now, using mock implementation
  console.log('Production IPFS upload would happen here with API key');
  return uploadImageToIPFS(file);
}
