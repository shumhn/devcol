'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram } from '@solana/web3.js';
import { useAnchorProgram, getUserPDA } from '../hooks/useAnchorProgram';
import { getProjectPDA } from '../utils/programHelpers';
import { uploadImageToIPFS } from '../utils/ipfs';

// Enums as Anchor expects in TS
const CollaborationLevel = {
  Beginner: { beginner: {} },
  Intermediate: { intermediate: {} },
  Advanced: { advanced: {} },
  AllLevels: { allLevels: {} },
} as const;

const ProjectStatus = {
  JustStarted: { justStarted: {} },
  InProgress: { inProgress: {} },
  NearlyComplete: { nearlyComplete: {} },
  Completed: { completed: {} },
  ActiveDev: { activeDev: {} },
  OnHold: { onHold: {} },
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

export default function ProjectCreate() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();

  const [loading, setLoading] = useState(false);

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [collabIntent, setCollabIntent] = useState('');

  const [collabLevel, setCollabLevel] = useState<keyof typeof CollaborationLevel>('Intermediate');
  const [status, setStatus] = useState<keyof typeof ProjectStatus>('InProgress');

  const [techStack, setTechStack] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState('');
  const [customNeed, setCustomNeed] = useState('');
  const [roleRequirements, setRoleRequirements] = useState<Array<{role: keyof typeof Role, needed: number}>>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        alert('❌ Logo must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('❌ Please upload an image file');
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

    setLoading(true);
    try {
      // Ensure profile exists
      const [userPda] = getUserPDA(publicKey);
      const userAcct = await (program as any).account.user.fetchNullable(userPda);
      if (!userAcct) {
        alert('❌ You must create your profile before creating a project.');
        // Redirect to profile page
        window.location.href = '/profile';
        return;
      }
      // Upload logo to IPFS if provided
      let logoHash = '';
      if (logoFile) {
        console.log('Uploading logo to IPFS...');
        logoHash = await uploadImageToIPFS(logoFile);
      }

      // Derive PDA (depends on CreateProject context using name)
      const [projectPDA] = await getProjectPDA(publicKey, name);

      await (program as any).methods
        .createProject(
          name,
          description,
          githubUrl,
          logoHash,
          techStack,
          needs,
          collabIntent,
          CollaborationLevel[collabLevel],
          ProjectStatus[status],
          roleRequirements.map(r => ({ role: Role[r.role], needed: r.needed, accepted: 0 }))
        )
        .accounts({
          project: projectPDA,
          user: userPda,
          creator: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert('✅ Project created successfully!');
      // Reset form
      setName('');
      setDescription('');
      setGithubUrl('');
      setCollabIntent('');
      setTechStack([]);
      setNeeds([]);
      setCollabLevel('Intermediate');
      setStatus('InProgress');
    } catch (error: any) {
      console.error('Create project error:', error);
      if (error.message?.includes('already in use')) {
        alert('❌ A project with this name already exists for your wallet. Try a different name.');
      } else if (error.message?.includes('too many')) {
        alert('❌ Too many tags selected.');
      } else {
        try {
          if (error.getLogs) console.error('Logs:', await error.getLogs());
        } catch {}
        alert('❌ Error: ' + (error.message || 'Unknown error'));
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
        <p className="text-gray-400">Connect your Phantom wallet to create a project</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">🚀 Create a New Project</h2>

      {/* Project Name */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">Project Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="w-full bg-gray-700 text-white rounded px-4 py-3"
          placeholder="DevCol - Web3 Collaboration Platform"
        />
        <div className="text-xs text-gray-500 mt-1">{name.length}/50</div>
        {errors.name && <p className="text-red-400 text-sm mt-1">⚠️ {errors.name}</p>}
      </div>

      {/* Project Logo */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">Project Logo (optional)</label>
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">🖼️</span>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, GIF</p>
          </div>
        </div>
      </div>

      {/* Role Requirements */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">Contributor Roles Needed (optional)</label>
        <div className="space-y-2">
          {Object.keys(Role).map((roleKey) => {
            const existing = roleRequirements.find(r => r.role === roleKey);
            return (
              <div key={roleKey} className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={existing?.needed || 0}
                  onChange={(e) => {
                    const needed = parseInt(e.target.value) || 0;
                    setRoleRequirements(prev => {
                      const filtered = prev.filter(r => r.role !== roleKey);
                      if (needed > 0) {
                        return [...filtered, { role: roleKey as keyof typeof Role, needed }];
                      }
                      return filtered;
                    });
                  }}
                  className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  placeholder="0"
                />
                <span className="text-gray-300 text-sm">{roleKey}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-1">Specify how many contributors you need for each role (max 5 per role, total roles will be limited)</p>
      </div>

      {/* Project Description */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={1000}
          className="w-full bg-gray-700 text-white rounded px-4 py-3"
          placeholder="Describe what your project does, tech, goals, roadmap, and why collaborators would love it..."
        />
        <div className="text-xs text-gray-500 mt-1">{description.length}/1000</div>
        {errors.description && <p className="text-red-400 text-sm mt-1">⚠️ {errors.description}</p>}
      </div>

      {/* GitHub URL */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">GitHub Repository URL *</label>
        <input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          className="w-full bg-gray-700 text-white rounded px-4 py-3"
          placeholder="https://github.com/username/repo-name"
        />
      </div>

      {/* Collaboration Level */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">Collaboration Level *</label>
        <div className="flex flex-wrap gap-2">
          {(['Beginner','Intermediate','Advanced','AllLevels'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setCollabLevel(lvl)}
              className={`px-3 py-2 rounded border ${collabLevel===lvl? 'bg-blue-600 border-blue-500 text-white':'bg-gray-700 border-gray-600 text-gray-200'}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Contribution Needs */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">What help do you need? *</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {NEED_PRESETS.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => toggleTag(needs, t.key, setNeeds, 10)}
              className={`px-3 py-2 rounded border ${needs.includes(t.key)? 'bg-purple-600 border-purple-500 text-white':'bg-gray-700 border-gray-600 text-gray-200'}`}
              title={t.label}
            >
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customNeed}
            onChange={(e) => setCustomNeed(e.target.value)}
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2"
            placeholder="Add custom need (max 24 chars)"
            maxLength={24}
          />
          <button
            type="button"
            onClick={() => { addCustom(customNeed, setNeeds, 10); setCustomNeed(''); }}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
          >
            + Add
          </button>
        </div>
        {errors.needs && <p className="text-red-400 text-sm mt-1">⚠️ {errors.needs}</p>}
      </div>

      {/* Tech Stack */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2 font-semibold">Tech Stack *</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {TECH_PRESETS.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => toggleTag(techStack, t.key, setTechStack, 12)}
              className={`px-3 py-2 rounded border ${techStack.includes(t.key)? 'bg-blue-600 border-blue-500 text-white':'bg-gray-700 border-gray-600 text-gray-200'}`}
              title={t.label}
            >
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTech}
            onChange={(e) => setCustomTech(e.target.value)}
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2"
            placeholder="Add custom tech (max 24 chars)"
            maxLength={24}
          />
          <button
            type="button"
            onClick={() => { addCustom(customTech, setTechStack, 12); setCustomTech(''); }}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
          >
            + Add
          </button>
        </div>
        {errors.techStack && <p className="text-red-400 text-sm mt-1">⚠️ {errors.techStack}</p>}
      </div>

      {/* Collaboration Intent */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2 font-semibold">What do you want from collaboration? *</label>
        <textarea
          value={collabIntent}
          onChange={(e) => setCollabIntent(e.target.value)}
          rows={4}
          maxLength={300}
          className="w-full bg-gray-700 text-white rounded px-4 py-3"
          placeholder="Be clear: mentorship, long-term teammates, contributors for specific module, bug bounties, etc."
        />
        <div className="text-xs text-gray-500 mt-1">{collabIntent.length}/300</div>
        {errors.collabIntent && <p className="text-red-400 text-sm mt-1">⚠️ {errors.collabIntent}</p>}
      </div>

      {/* Status */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2 font-semibold">Project Status *</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'JustStarted', label: '🌱 Just Started' },
            { key: 'InProgress', label: '🚧 In Progress' },
            { key: 'NearlyComplete', label: '🎯 Nearly Complete' },
            { key: 'Completed', label: '✅ Completed' },
            { key: 'ActiveDev', label: '🔥 Active Development' },
            { key: 'OnHold', label: '⏸️ On Hold' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatus(opt.key)}
              className={`px-3 py-2 rounded border text-left ${status===opt.key? 'bg-green-600 border-green-500 text-white':'bg-gray-700 border-gray-600 text-gray-200'}`}
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
            setStatus('InProgress');
          }}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Reset
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? '⏳ Creating...' : '🚀 Create Project'}
        </button>
      </div>
    </div>
  );
}
