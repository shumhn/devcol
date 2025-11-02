'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram, getProjectPDA, getCollabRequestPDA } from '../hooks/useAnchorProgram';
import { SystemProgram, PublicKey } from '@solana/web3.js';
import Link from 'next/link';

export default function ProjectList() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    githubLink: '',
    collabLevel: ''
  });

  useEffect(() => {
    if (program) {
      fetchProjects();
    }
  }, [program]);

  const fetchProjects = async () => {
    if (!program) return;
    
    try {
      const allProjects = await (program.account as any).project.all();
      setProjects(allProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!publicKey || !program) return;
    
    setLoading(true);
    try {
      const [projectPDA] = getProjectPDA(publicKey, formData.name);
      
      const tx = (program as any).methods
        .createProject(
          formData.name,
          formData.description,
          formData.githubLink,
          formData.collabLevel
        )
        .accounts({
          project: projectPDA,
          creator: publicKey,
          systemProgram: SystemProgram.programId,
        });
      
      await tx.rpc();

      alert('✅ Project created successfully!');
      await fetchProjects();
      setShowCreateForm(false);
      setFormData({ name: '', description: '', githubLink: '', collabLevel: '' });
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert('❌ Error creating project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCollabRequest = async (project: any) => {
    if (!publicKey || !program) return;
    
    setLoading(true);
    try {
      const [collabRequestPDA] = getCollabRequestPDA(publicKey, project.publicKey);
      
      const tx = (program as any).methods
        .sendCollabRequest(requestMessage)
        .accounts({
          collabRequest: collabRequestPDA,
          sender: publicKey,
          project: project.publicKey,
          systemProgram: SystemProgram.programId,
        });
      
      await tx.rpc();

      alert('✅ Collaboration request sent!');
      setSelectedProject(null);
      setRequestMessage('');
    } catch (error: any) {
      console.error('Error sending request:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Project Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">📂 Projects</h2>
          {publicKey && (
            <Link href="/projects/new">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                🚀 Create Project
              </button>
            </Link>
          )}
        </div>

        {showCreateForm && (
          <div className="bg-gray-700 rounded-lg p-4 mb-4 space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Project Name (max 50 chars)</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={50}
                className="w-full bg-gray-600 text-white rounded px-3 py-2"
                placeholder="My Awesome Project"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Description (max 300 chars)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={300}
                rows={3}
                className="w-full bg-gray-600 text-white rounded px-3 py-2"
                placeholder="Describe your project..."
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">GitHub Link (max 100 chars)</label>
              <input
                type="text"
                value={formData.githubLink}
                onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
                maxLength={100}
                className="w-full bg-gray-600 text-white rounded px-3 py-2"
                placeholder="https://github.com/username/repo"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Collaboration Level (max 30 chars)</label>
              <input
                type="text"
                value={formData.collabLevel}
                onChange={(e) => setFormData({ ...formData, collabLevel: e.target.value })}
                maxLength={30}
                className="w-full bg-gray-600 text-white rounded px-3 py-2"
                placeholder="e.g., Beginner, Intermediate, Expert"
              />
            </div>
            
            <button
              onClick={handleCreateProject}
              disabled={loading || !formData.name}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        )}
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.length === 0 ? (
          <div className="col-span-2 bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">No projects yet. Create the first one!</p>
          </div>
        ) : (
          projects.map((project, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition">
              <h3 className="text-lg font-bold text-white mb-2">{project.account.name}</h3>
              <p className="text-gray-400 text-sm mb-3">{project.account.description}</p>
              
              <div className="space-y-1 text-sm mb-4">
                <p className="text-gray-500">
                  <span className="font-semibold">Creator:</span> {project.account.creator.toString().slice(0, 8)}...
                </p>
                <p className="text-gray-500">
                  <span className="font-semibold">Level:</span> {project.account.collabLevel}
                </p>
                {project.account.githubLink && (
                  <a
                    href={project.account.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View on GitHub →
                  </a>
                )}
              </div>

              {publicKey && project.account.creator.toString() !== publicKey.toString() && (
                <button
                  onClick={() => setSelectedProject(project)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
                >
                  Request Collaboration
                </button>
              )}
              
              {publicKey && project.account.creator.toString() === publicKey.toString() && (
                <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded text-sm text-center">
                  ✓ Your Project
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Collaboration Request Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Send Collaboration Request
            </h3>
            <p className="text-gray-400 mb-4">
              Project: <span className="text-white font-semibold">{selectedProject.account.name}</span>
            </p>
            
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
              placeholder="Tell the project owner why you'd like to collaborate... (max 500 chars)"
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleSendCollabRequest(selectedProject)}
                disabled={loading || !requestMessage}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Request'}
              </button>
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setRequestMessage('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
