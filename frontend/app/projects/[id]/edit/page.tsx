'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '@/app/hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import ProjectCreate from '@/app/components/ProjectCreate';

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    if (params.id && program) {
      fetchProject();
    }
  }, [params.id, program]);

  const fetchProject = async () => {
    if (!params.id || !program) return;
    setLoading(true);
    try {
      const projectPubkey = new PublicKey(params.id as string);
      const projectAccount = await (program as any).account.project.fetch(projectPubkey);
      
      // Check ownership
      if (!publicKey || !projectAccount.creator.equals(publicKey)) {
        alert('You do not own this project');
        router.push(`/projects/${params.id}`);
        return;
      }

      setProject({ publicKey: projectPubkey, account: projectAccount });
    } catch (error) {
      console.error('Error fetching project:', error);
      alert('Failed to load project');
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-gray-600">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <Link href="/projects" className="text-[#00D4AA] hover:underline">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href={`/projects/${project.publicKey.toBase58()}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
          ← Back to Project
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Project</h1>

        {/* Render the full ProjectCreate component in edit mode */}
        <ProjectCreate 
          editMode={true}
          existingProject={project}
        />
      </div>
    </div>
  );
}
