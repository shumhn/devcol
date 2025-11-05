// IPFS utility for uploading profile pictures and metadata
// Uses Next.js API routes to proxy to Pinata (production-ready), with local fallback for dev

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

// Gateway used to render images/JSON by CID
export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export const cidToUrl = (cid?: string) => (cid ? `${IPFS_GATEWAY}${cid}` : '');

/**
 * Upload image to IPFS (simulated for MVP)
 * In production, integrate with Pinata, Web3.Storage, or NFT.Storage
 */
export async function uploadImageToIPFS(file: File): Promise<string> {
  // Try production route first (Pinata via serverless), fallback to local mock
  console.log('🚀 Uploading image to Pinata IPFS...', { name: file.name, size: file.size });
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/ipfs/upload', { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      const cid: string = data.cid;
      console.log('✅ Successfully uploaded to Pinata IPFS!', { 
        cid, 
        url: `https://gateway.pinata.cloud/ipfs/${cid}` 
      });
      // Optional: cache a local preview for instant loads
      try {
        const reader = new FileReader();
        const asBase64: string = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        localStorage.setItem(`ipfs_image_${cid}`, asBase64);
      } catch {}
      return cid;
    } else {
      const error = await res.json();
      console.error('❌ Pinata upload failed:', error);
    }
  } catch (err) {
    console.error('❌ IPFS upload error:', err);
  }

  // Fallback: local mock (only used if Pinata fails)
  console.warn('⚠️ Falling back to local mock storage (Pinata unavailable)');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const encoder = new TextEncoder();
      const data = encoder.encode(base64String.slice(0, 100) + file.name + Date.now());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 44);
      const mockCID = `Qm${hashHex}`;
      localStorage.setItem(`ipfs_image_${mockCID}`, base64String);
      resolve(mockCID);
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
  // Try production route first
  try {
    const res = await fetch('/api/ipfs/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
    if (res.ok) {
      const data = await res.json();
      const cid: string = data.cid;
      try { localStorage.setItem(`ipfs_metadata_${cid}`, JSON.stringify(metadata)); } catch {}
      return cid;
    }
  } catch {}

  // Fallback to local hash storage
  const jsonString = JSON.stringify(metadata);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem(`ipfs_metadata_${hashHex}`, jsonString); } catch {}
  return hashHex;
}

/**
 * Fetch metadata from IPFS
 */
export async function fetchMetadataFromIPFS(cidOrHash: string): Promise<IPFSMetadata | null> {
  // Try local cache first
  try {
    const cached = localStorage.getItem(`ipfs_metadata_${cidOrHash}`);
    if (cached) return JSON.parse(cached);
  } catch {}
  // Try gateway
  try {
    const res = await fetch(`${IPFS_GATEWAY}${cidOrHash}`, { cache: 'force-cache' });
    if (res.ok) {
      const json = await res.json();
      try { localStorage.setItem(`ipfs_metadata_${cidOrHash}`, JSON.stringify(json)); } catch {}
      return json;
    }
  } catch {}
  return null;
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
export async function uploadToProductionIPFS(file: File, _apiKey: string): Promise<string> {
  return uploadImageToIPFS(file);
}
