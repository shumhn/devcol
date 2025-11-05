'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Sora } from 'next/font/google';
import { uploadImageToIPFS } from '../utils/ipfs';
import { getProjectPDA } from '../utils/programHelpers';

const premium = Sora({ subsets: ['latin'], weight: ['600', '700'] });

// Enums as Anchor expects in TS
const CollaborationLevel = {
  Beginner: { beginner: {} },
  Intermediate: { intermediate: {} },
  Advanced: { advanced: {} },
  AllLevels: { allLevels: {} },
} as const;

const ProjectStatus = {
  Planning: { planning: {} },
  Development: { development: {} },
  Testing: { testing: {} },
  Launched: { launched: {} },
  ActiveDev: { activeDev: {} },
  Paused: { paused: {} },
} as const;

const Role = {
  Frontend: { Frontend: {} },
  Backend: { Backend: {} },
  Fullstack: { Fullstack: {} },
  DevOps: { DevOps: {} },
  QA: { QA: {} },
  Designer: { Designer: {} },
  Others: { Others: {} },
} as const;

type Tag = {
  key: string;
  label: string;
  icon?: string;
};

const TECH_PRESETS: Tag[] = [
  { key: 'React', label: 'React', icon: '⚛️' },
  { key: 'Next.js', label: 'Next.js', icon: '⚡' },
  { key: 'TypeScript', label: 'TypeScript', icon: '🔷' },
  { key: 'Node.js', label: 'Node.js', icon: '🟢' },
  { key: 'Solana', label: 'Solana', icon: '◎' },
  { key: 'Anchor', label: 'Anchor', icon: '⚓' },
  { key: 'Rust', label: 'Rust', icon: '🦀' },
  { key: 'PostgreSQL', label: 'PostgreSQL', icon: '🐘' },
  { key: 'MongoDB', label: 'MongoDB', icon: '🍃' },
  { key: 'GraphQL', label: 'GraphQL', icon: '🌐' },
];

const NEED_PRESETS: Tag[] = [
  { key: 'Frontend', label: 'Frontend', icon: '🎨' },
  { key: 'Backend', label: 'Backend', icon: '🧠' },
  { key: 'Smart Contract', label: 'Smart Contract', icon: '🔗' },
  { key: 'UI/UX', label: 'UI/UX', icon: '✨' },
  { key: 'DevOps', label: 'DevOps', icon: '🐳' },
  { key: 'QA', label: 'Testing/QA', icon: '🧪' },
  { key: 'Community', label: 'Community', icon: '👥' },
  { key: 'Content', label: 'Content', icon: '✍️' },
];

interface ProjectCreateProps {
  editMode?: boolean;
  existingProject?: any;
}

export default function ProjectCreate({ editMode = false, existingProject }: ProjectCreateProps = {}) {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();

  const [loading, setLoading] = useState(false);

  // Roles: simple static list
  const [roleRequirements, setRoleRequirements] = useState<Array<{role: string; needed: number; label?: string}>>([]);

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [collabIntent, setCollabIntent] = useState('');

  const [collabLevel, setCollabLevel] = useState<keyof typeof CollaborationLevel>('Intermediate');
  const [status, setStatus] = useState<keyof typeof ProjectStatus>('Development');

  const [techStack, setTechStack] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState('');
  const [customNeed, setCustomNeed] = useState('');
  const [othersLabel, setOthersLabel] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (editMode && existingProject) {
      const acc = existingProject.account;
      setName(acc.name || '');
      setDescription(acc.description || '');
      setGithubUrl(acc.githubLink || acc.github || '');
      setCollabIntent(acc.collaborationIntent || acc.collabIntent || '');
      
      // Tech stack
      const tech = acc.techStack || acc.tech_stack || [];
      setTechStack(Array.isArray(tech) ? tech.map((t: any) => typeof t === 'string' ? t : t.value || '') : []);
      
      // Needs
      const needsArr = acc.contributionNeeds || acc.needs || [];
      setNeeds(Array.isArray(needsArr) ? needsArr.map((n: any) => typeof n === 'string' ? n : n.value || '') : []);
      
      // Collab level
      const levelKey = Object.keys(acc.collaborationLevel || acc.collabLevel || {})[0];
      if (levelKey) {
        const mapped = levelKey === 'beginner' ? 'Beginner' :
                      levelKey === 'intermediate' ? 'Intermediate' :
                      levelKey === 'advanced' ? 'Advanced' :
                      levelKey === 'allLevels' ? 'AllLevels' : 'Intermediate';
        setCollabLevel(mapped as keyof typeof CollaborationLevel);
      }
      
      // Status
      const statusKey = Object.keys(acc.status || acc.projectStatus || {})[0];
      if (statusKey) {
        const mapped = statusKey === 'planning' ? 'Planning' :
                      statusKey === 'development' ? 'Development' :
                      statusKey === 'testing' ? 'Testing' :
                      statusKey === 'launched' ? 'Launched' :
                      statusKey === 'activeDev' ? 'ActiveDev' :
                      statusKey === 'paused' ? 'Paused' : 'Development';
        setStatus(mapped as keyof typeof ProjectStatus);
      }
      
      // Role requirements
      const rawRoles: any[] = (acc.requiredRoles || acc.roleRequirements || acc.roles || []) as any[];
      if (Array.isArray(rawRoles) && rawRoles.length > 0) {
        const roles = rawRoles.map((r: any) => {
          const roleKey = Object.keys(r.role || {})[0] || 'others';
          return {
            role: roleKey,
            needed: Number(r.needed ?? r.slots ?? 0),
            label: r.label ?? undefined,
          };
        });
        setRoleRequirements(roles);
        const othersRole = roles.find((r: any) => r.role === 'others');
        if (othersRole?.label) setOthersLabel(othersRole.label);
      }
      
      // Logo preview
      const logoHash = acc.logoIpfsHash || acc.logoHash || acc.logo;
      if (logoHash && typeof window !== 'undefined') {
        const stored = localStorage.getItem(`ipfs_image_${logoHash}`);
        if (stored) setLogoPreview(stored);
      }
    }
  }, [editMode, existingProject]);

  // Estimate serialized size for on-chain Project account (approximate)
  const estimateSize = useMemo(() => {
    // helper sizes: Anchor borsh strings = 4 bytes length + utf8 bytes
    const s = (str: string) => 4 + new TextEncoder().encode(str).length;
    // vec<string>: 4 bytes length + sum of string sizes
    const vs = (arr: string[]) => 4 + arr.reduce((acc, t) => acc + s(t), 0);
    // Option<String>: 1 byte tag + (if some) string size
    const optS = (maybe?: string) => 1 + (maybe ? s(maybe) : 0);
    // RoleRequirement: role enum (u8), needed (u8), accepted (u8), label Option<String>
    const roleReq = (label?: string) => 1 + 1 + 1 + optS(label);
    // Vec<RoleRequirement>
    const vRoles = (roles: Array<{roleKey: string; label?: string; needed: number; accepted: number}>) => 4 + roles.reduce((acc, r) => acc + roleReq(r.label), 0);
    // Fixed fields: 8 discriminator + 32 creator pubkey + 8 timestamp + struct padding
    let base = 8 + 32 + 8 + 64; // add padding for alignment and hidden fields
    // dynamic fields
    base += s(name);
    base += s(description);
    base += s(githubUrl);
    // Logo: only IPFS CID hash is stored on-chain (~46 chars), not the preview data
    base += logoPreview ? s('QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') : 4; // typical CID or empty string
    base += vs(techStack);
    base += vs(needs);
    base += s(collabIntent);
    // enums for collab level and status (u8 each)
    base += 1 + 1;
    base += vRoles(roleRequirements.map((r) => ({ roleKey: r.role, needed: r.needed, accepted: 0, label: r.label })));
    // Add 50% safety margin due to serialization overhead/padding
    return Math.round(base * 1.5);
  }, [name, description, githubUrl, logoPreview, techStack, needs, collabIntent, roleRequirements]);

  const MAX_ACCOUNT_BYTES = 4096;
  const RECOMMENDED_MAX = 2800; // much more conservative

  const autoCompact = () => {
    const trimStr = (s: string) => s.trim();
    const capLen = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
    const dedupe = (arr: string[]) => Array.from(new Set(arr));

    // More aggressive, but safe, limits for one-click compaction
    setDescription((d) => capLen(trimStr(d), 700));
    setCollabIntent((v) => capLen(trimStr(v), 300));
    setTechStack((ts) => dedupe(ts.map(t => capLen(trimStr(t), 24))).slice(0, 12));
    setNeeds((ns) => dedupe(ns.map(t => capLen(trimStr(t), 24))).slice(0, 10));
    setRoleRequirements((rs) => rs.slice(0, 8).map(r => ({
      ...r,
      needed: Math.max(0, Math.min(10, r.needed || 0)),
      ...(r.role === 'others' ? { label: r.label ? capLen(trimStr(r.label), 24) : undefined } : {})
    })));
    alert('Content compacted. Review the fields and try submitting again.');
  };

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 3 &&
      description.trim().length >= 10 &&
      githubUrl.trim().length > 0 &&
      /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(githubUrl) &&
      techStack.length > 0 &&
      needs.length > 0
    );
  }, [name, description, githubUrl, techStack, needs]);

  useEffect(() => {
    const e: Record<string, string> = {};
    if (name.length > 50) e.name = 'Max 50 characters';
    if (description.length > 1000) e.description = 'Max 1000 characters';
    if (collabIntent.length > 300) e.collabIntent = 'Max 300 characters';
    if (techStack.length > 12) e.techStack = 'Max 12 tech tags';
    if (needs.length > 10) e.needs = 'Max 10 contribution tags';
    setErrors(e);
  }, [name, description, collabIntent, techStack, needs]);

  const toggleTag = (list: string[], value: string, setter: (v: string[]) => void, max: number) => {
    if (list.includes(value)) {
      setter(list.filter((t) => t !== value));
    } else {
      if (list.length >= max) return;
      setter([...list, value]);
    }
  };

  const addCustom = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    max: number
  ) => {
    const v = value.trim();
    if (!v) return;
    if (v.length > 24) {
      alert('Tag must be 24 characters or less');
      return;
    }
    setter((prev) => (prev.includes(v) ? prev : prev.length < max ? [...prev, v] : prev));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Logo must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!publicKey || !program) return;
    if (!canSubmit || loading) return;

    // Sanitize and enforce strict limits to avoid on-chain size overruns
    const trimStr = (s: string) => s.trim();
    const capLen = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
    const dedupe = (arr: string[]) => Array.from(new Set(arr));

    const safeName = capLen(trimStr(name), 50);
    const safeDesc = capLen(trimStr(description), 1000);
    const safeGithub = capLen(trimStr(githubUrl), 100);
    const safeIntent = capLen(trimStr(collabIntent), 300);
    const safeTech = dedupe(techStack.map(t => capLen(trimStr(t), 24))).slice(0, 12);
    const safeNeeds = dedupe(needs.map(t => capLen(trimStr(t), 24))).slice(0, 10);
    const safeRoles = roleRequirements.slice(0, 8).map((r) => ({
      role: r.role,
      needed: Math.max(0, Math.min(10, r.needed || 0)),
      label: r.role === 'others' && r.label ? capLen(trimStr(r.label), 24) : undefined,
    }));

    // Validate at least one role
    if (safeRoles.filter(r => r.needed > 0).length === 0) {
      alert('Select at least one contributor role.');
      return;
    }

    if (safeGithub.length === 0 || safeGithub.length > 100) {
      alert('GitHub URL must be 1–100 characters.');
      return;
    }
    if (safeTech.length === 0) {
      alert('Select at least one tech.');
      return;
    }
    if (safeNeeds.length === 0) {
      alert('Select at least one contribution need.');
      return;
    }

    // warn early if estimated size is too big
    if (estimateSize > RECOMMENDED_MAX) {
      alert(
        'Your project data is currently too large (' +
          estimateSize +
          ' bytes, max ~' + RECOMMENDED_MAX +
          '). Shorten description and reduce tags (tech/contribution), or decrease role labels.'
      );
      return;
    }
    setLoading(true);
    try {
      // Ensure profile exists
      const [userPda] = getUserPDA(publicKey);
      const userAcct = await (program as any).account.user.fetchNullable(userPda);
      if (!userAcct) {
        alert('You must create your profile before creating a project.');
        router.push('/profile');
        return;
      }
      // Upload logo to IPFS if provided
      let logoHash = '';
      if (logoFile) {
        console.log('Uploading logo to IPFS...');
        logoHash = await uploadImageToIPFS(logoFile);
      }

      let projectPDA: PublicKey;
      
      if (editMode && existingProject) {
        // Edit mode: use existing project PDA
        projectPDA = existingProject.publicKey;
        
        // Call update_project instruction
        // Note: update_project doesn't support logo or role updates, only basic fields
        await (program as any).methods
          .updateProject(
            safeName,                           // name: Option<String>
            safeDesc,                           // description: Option<String>
            safeGithub,                         // github_link: Option<String>
            safeTech,                           // tech_stack: Option<Vec<String>>
            safeNeeds,                          // contribution_needs: Option<Vec<String>>
            safeIntent,                         // collab_intent: Option<String>
            CollaborationLevel[collabLevel],    // collaboration_level: Option<CollaborationLevel>
            ProjectStatus[status],              // project_status: Option<ProjectStatus>
            true                                // is_active: Option<bool>
          )
          .accounts({
            project: projectPDA,
            creator: publicKey,
          })
          .rpc();
        // Update roles if changed
        if (roleRequirements.length > 0) {
          try {
            const roleReqs = roleRequirements.filter(r => r.needed > 0).map(r => {
              // Map lowercase role to camelCase enum variant
              const roleVariant = r.role === 'frontend' ? 'frontend' :
                                  r.role === 'backend' ? 'backend' :
                                  r.role === 'fullstack' ? 'fullstack' :
                                  r.role === 'devops' ? 'devOps' :
                                  r.role === 'qa' ? 'qa' :
                                  r.role === 'designer' ? 'designer' :
                                  'others';
              return {
                role: { [roleVariant]: {} },
                needed: r.needed,
                accepted: 0,
                label: r.role === 'others' ? (r.label ?? null) : null,
              };
            });
            await (program as any).methods.updateProjectRoles(roleReqs).accounts({ project: projectPDA, creator: publicKey }).rpc();
          } catch (err) {
            console.error('Update roles error:', err);
          }
        }
        alert('✅ Project updated successfully!');
        router.push(`/projects/${projectPDA.toBase58()}`);
      } else {
        // Create mode: derive new PDA
        const [newProjectPDA] = await getProjectPDA(publicKey, name);
        projectPDA = newProjectPDA;

        // Preflight: prevent duplicate name PDA collisions (legacy or existing projects)
        try {
          const info = await (program as any).provider.connection.getAccountInfo(projectPDA, 'processed');
          if (info) {
            alert('A project with this name already exists for your wallet. Please choose a different name or edit the existing project.');
            setLoading(false);
            return;
          }
        } catch (e) {
          // Ignore RPC hiccups; continue to attempt creation
        }

        await (program as any).methods
          .createProject(
            safeName,
            safeDesc,
            safeGithub,
            logoHash,
            safeTech,
            safeNeeds,
            safeIntent,
            CollaborationLevel[collabLevel],
            ProjectStatus[status],
            safeRoles.filter(r => r.needed > 0).map(r => ({ role: { [r.role]: {} }, needed: r.needed, accepted: 0, label: r.role === 'others' && r.label ? r.label : null }))
          )
          .accounts({
            project: projectPDA,
            user: userPda,
            creator: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        // Navigate to the newly created project detail page
        try {
          // Small delay to allow RPC indexing
          setTimeout(() => {
            router.replace(`/projects/${projectPDA.toBase58()}`);
          }, 300);
        } catch {
          // Fallback: go to projects list
          router.push('/projects');
        }
      }
    } catch (error: any) {
      console.error('Create project error:', error);
      const msg = String(error?.message || '');
      if (msg.includes('encoding overruns Buffer')) {
        alert('Your project data is too large for a single Solana account. Please shorten the description or reduce the number/length of tags and try again.');
        return;
      }
      if (error.message?.includes('already in use')) {
        alert('A project with this name already exists for your wallet. Try a different name.');
      } else if (error.message?.includes('too many')) {
        alert('Too many tags selected.');
      } else {
        try {
          if (error.getLogs) console.error('Logs:', await error.getLogs());
        } catch {}
        alert('Error: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Connect your Phantom wallet to create a project</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 max-w-3xl mx-auto shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create a New Project</h2>

      {/* Project Name */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">Project Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
          placeholder="c0Foundr - Web3 Collaboration Platform"
        />
        <div className="text-xs text-gray-500 mt-1">{name.length}/50</div>
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Project Logo */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">Project Logo (optional)</label>
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm text-gray-500">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            />
            <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, GIF</p>
          </div>
        </div>
      </div>

      {/* Role Requirements */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2 font-semibold">Contributor Roles Needed *</label>
        <div className="space-y-2">
          {['Frontend', 'Backend', 'Fullstack', 'DevOps', 'QA', 'Designer', 'Others'].map((roleKey) => {
            const existing = roleRequirements.find(r => r.role === roleKey.toLowerCase());
            return (
              <div key={roleKey} className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={existing?.needed || 0}
                  onChange={(e) => {
                    const needed = parseInt(e.target.value) || 0;
                    setRoleRequirements(prev => {
                      const filtered = prev.filter(r => r.role !== roleKey.toLowerCase());
                      if (needed > 0) {
                        const base: any = { role: roleKey.toLowerCase(), needed };
                        if (roleKey === 'Others') base.label = othersLabel.trim() || undefined;
                        return [...filtered, base];
                      }
                      return filtered;
                    });
                  }}
                  className="w-16 bg-white border border-gray-300 text-gray-900 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
                  placeholder="0"
                />
                <span className="text-gray-700 text-sm">{roleKey}</span>
                {roleKey === 'Others' && (
                  <input
                    type="text"
                    maxLength={24}
                    value={othersLabel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOthersLabel(v);
                      setRoleRequirements(prev => prev.map(r => r.role === 'others' ? { ...r, label: v.trim() || undefined } : r));
                    }}
                    placeholder="Label (e.g., Solidity, DevRel)"
                    className="flex-1 bg-white border border-gray-300 text-gray-900 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">Specify how many contributors you need for each role (max 10 per role). At least one role is required.</p>
      </div>

      {/* Project Description */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">Description * (max 500 chars)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={500}
          className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
          placeholder="Describe what your project does, tech, goals, roadmap, and why collaborators would love it..."
        />
        <div className="text-xs text-gray-500 mt-1">{description.length}/500</div>
        {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* GitHub URL */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">GitHub Repository URL *</label>
        <input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
          placeholder="https://github.com/username/repo-name"
        />
      </div>

      {/* Collaboration Level */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">Collaboration Level *</label>
        <div className="flex flex-wrap gap-2">
          {(['Beginner','Intermediate','Advanced','AllLevels'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setCollabLevel(lvl)}
              className={`px-3 py-2 rounded-lg border text-sm ${collabLevel===lvl? `bg-[#00D4AA] border-[#00D4AA] text-black font-black ${premium.className}`:'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Project Status */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">Project Status *</label>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'Planning', label: 'Planning' },
            { key: 'Development', label: 'Development' },
            { key: 'Testing', label: 'Testing' },
            { key: 'Launched', label: 'Launched' },
            { key: 'ActiveDev', label: 'Active Development' },
            { key: 'Paused', label: 'Paused' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatus(opt.key)}
              className={`px-3 py-2 rounded-lg border text-sm ${status===opt.key? `bg-[#00D4AA] border-[#00D4AA] text-black font-black ${premium.className}`:'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contribution Needs */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">What help do you need? *</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {NEED_PRESETS.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => toggleTag(needs, t.key, setNeeds, 10)}
              className={`px-3 py-2 rounded-lg border text-sm ${needs.includes(t.key)? 'bg-teal-500 border-teal-500 text-white':'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              title={t.label}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customNeed}
            onChange={(e) => setCustomNeed(e.target.value)}
            className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
            placeholder="Add custom need (max 24 chars)"
            maxLength={24}
          />
          <button
            type="button"
            onClick={() => { addCustom(customNeed, setNeeds, 10); setCustomNeed(''); }}
            className={`px-4 py-2 rounded-lg bg-[#00D4AA] hover:bg-[#00B894] text-black font-black ${premium.className}`}
          >
            + Add
          </button>
        </div>
        {needs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {needs.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-300 text-sm text-gray-800">
                {tag}
                <button
                  type="button"
                  onClick={() => setNeeds(needs.filter((t) => t !== tag))}
                  className="text-gray-500 hover:text-gray-800"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.needs && <p className="text-red-600 text-sm mt-1">{errors.needs}</p>}
      </div>

      {/* Tech Stack */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">Tech Stack *</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {TECH_PRESETS.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => toggleTag(techStack, t.key, setTechStack, 12)}
              className={`px-3 py-2 rounded-lg border text-sm ${techStack.includes(t.key)? 'bg-teal-500 border-teal-500 text-white':'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              title={t.label}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTech}
            onChange={(e) => setCustomTech(e.target.value)}
            className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Add custom tech (max 24 chars)"
            maxLength={24}
          />
          <button
            type="button"
            onClick={() => { addCustom(customTech, setTechStack, 12); setCustomTech(''); }}
            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white"
          >
            + Add
          </button>
        </div>
        {techStack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {techStack.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-300 text-sm text-gray-800">
                {tag}
                <button
                  type="button"
                  onClick={() => setTechStack(techStack.filter((t) => t !== tag))}
                  className="text-gray-500 hover:text-gray-800"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.techStack && <p className="text-red-600 text-sm mt-1">{errors.techStack}</p>}
      </div>

      {/* Collaboration Intent */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2 font-semibold">What do you want from collaboration? * (max 300 chars)</label>
        <textarea
          value={collabIntent}
          onChange={(e) => setCollabIntent(e.target.value)}
          rows={4}
          maxLength={300}
          className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]"
          placeholder="E.g., Long-term co-founders for smart contract work"
        />
        <div className="text-xs text-gray-500 mt-1">{collabIntent.length}/300</div>
        {errors.collabIntent && <p className="text-red-600 text-sm mt-1">{errors.collabIntent}</p>}
      </div>

      {/* Project Status (light theme) */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2 font-semibold">Project Status *</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'Planning', label: 'Planning' },
            { key: 'Development', label: 'Development' },
            { key: 'Testing', label: 'Testing' },
            { key: 'Launched', label: 'Launched' },
            { key: 'ActiveDev', label: 'Active Development' },
            { key: 'Paused', label: 'Paused' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatus(opt.key)}
              className={`px-3 py-2 rounded-lg border text-left text-sm ${status===opt.key? 'bg-[#00D4AA] border-[#00D4AA] text-white':'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setName('');
            setDescription('');
            setGithubUrl('');
            setTechStack([]);
            setNeeds([]);
            setCollabIntent('');
            setCollabLevel('Intermediate');
            setStatus('Development');
          }}
          className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold"
        >
          Reset
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className={`flex-1 bg-[#00D4AA] hover:bg-[#00B894] text-black px-6 py-3 rounded-lg font-black disabled:opacity-50 disabled:cursor-not-allowed ${premium.className}`}
        >
          {loading ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}
