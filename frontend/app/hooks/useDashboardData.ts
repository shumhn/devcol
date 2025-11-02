'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram, getUserPDA } from './useAnchorProgram';
import { PublicKey } from '@solana/web3.js';

export interface DashboardData {
  profile: any | null;
  ownedProjects: any[];
  applications: any[];
  receivedRequests: any[];
  activeCollaborations: any[];
  stats: {
    projectsCreated: number;
    pendingReviews: number;
    activeCollabs: number;
    totalApplications: number;
  };
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [data, setData] = useState<DashboardData>({
    profile: null,
    ownedProjects: [],
    applications: [],
    receivedRequests: [],
    activeCollaborations: [],
    stats: {
      projectsCreated: 0,
      pendingReviews: 0,
      activeCollabs: 0,
      totalApplications: 0,
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!program || !publicKey) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchDashboardData = async () => {
      setData(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Fetch user profile
        const [userPda] = getUserPDA(publicKey);
        const profile = await (program as any).account.user.fetchNullable(userPda);

        // Parallel fetch: projects, sent requests, received requests
        const [allProjects, sentRequests, receivedRequests] = await Promise.all([
          (program as any).account.project.all(),
          (program as any).account.collaborationRequest.all([
            { memcmp: { offset: 8, bytes: publicKey.toBase58() } }, // from = publicKey
          ]),
          (program as any).account.collaborationRequest.all([
            { memcmp: { offset: 8 + 32, bytes: publicKey.toBase58() } }, // to = publicKey
          ]),
        ]);

        // Filter owned projects
        const ownedProjects = allProjects.filter(
          (p: any) => p.account.creator.toString() === publicKey.toString()
        );

        // Find active collaborations (projects where user is accepted)
        const acceptedRequests = sentRequests.filter(
          (r: any) => Object.keys(r.account.status)[0] === 'accepted'
        );
        const activeCollabProjectKeys = new Set(
          acceptedRequests.map((r: any) => r.account.project.toString())
        );
        const activeCollaborations = allProjects.filter((p: any) =>
          activeCollabProjectKeys.has(p.publicKey.toString())
        );

        // Count pending reviews (requests to your projects that are pending)
        const pendingReviews = receivedRequests.filter(
          (r: any) => Object.keys(r.account.status)[0] === 'pending'
        ).length;

        setData({
          profile,
          ownedProjects,
          applications: sentRequests,
          receivedRequests,
          activeCollaborations,
          stats: {
            projectsCreated: ownedProjects.length,
            pendingReviews,
            activeCollabs: activeCollaborations.length,
            totalApplications: sentRequests.length,
          },
          loading: false,
          error: null,
        });
      } catch (e) {
        console.error('Dashboard data fetch error:', e);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load dashboard data',
        }));
      }
    };

    fetchDashboardData();

    // Refresh every 45s
    const interval = setInterval(fetchDashboardData, 45000);
    return () => clearInterval(interval);
  }, [program, publicKey]);

  return data;
}
