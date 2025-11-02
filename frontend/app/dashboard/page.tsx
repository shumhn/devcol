'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { profile, ownedProjects, applications, receivedRequests, activeCollaborations, stats, loading, error } = useDashboardData();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'underReview' | 'accepted' | 'rejected'>('all');

  // No wallet connected
  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <EmptyState
          icon="🔌"
          title="Connect Your Wallet"
          description="Connect your Phantom wallet to view your personalized dashboard"
          actionLabel="Connect Wallet"
          onAction={() => {}}
        />
      </div>
    );
  }

  // No profile yet
  if (!loading && !profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <EmptyState
          icon="👤"
          title="Create Your Profile"
          description="Get started by creating your developer profile to join projects and collaborate"
          actionLabel="Create Profile"
          actionHref="/profile"
        />
      </div>
    );
  }

  // Filter applications by status
  const filteredApplications = activeTab === 'all' 
    ? applications 
    : applications.filter((app: any) => {
        const status = Object.keys(app.account.status)[0];
        return status === activeTab;
      });

  const applicationCounts = {
    all: applications.length,
    pending: applications.filter((a: any) => Object.keys(a.account.status)[0] === 'pending').length,
    underReview: applications.filter((a: any) => Object.keys(a.account.status)[0] === 'underReview').length,
    accepted: applications.filter((a: any) => Object.keys(a.account.status)[0] === 'accepted').length,
    rejected: applications.filter((a: any) => Object.keys(a.account.status)[0] === 'rejected').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back, {profile?.username || 'Developer'}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Projects Created"
          value={loading ? '...' : stats.projectsCreated}
          icon="📂"
          color="blue"
          href={stats.projectsCreated > 0 ? '#my-projects' : undefined}
          loading={loading}
        />
        <StatCard
          title="Pending Reviews"
          value={loading ? '...' : stats.pendingReviews}
          icon="⏳"
          color="yellow"
          subtitle={stats.pendingReviews > 0 ? 'Requires attention' : 'All caught up'}
          href={stats.pendingReviews > 0 ? '#pending-requests' : undefined}
          loading={loading}
        />
        <StatCard
          title="Active Collaborations"
          value={loading ? '...' : stats.activeCollabs}
          icon="🤝"
          color="green"
          href={stats.activeCollabs > 0 ? '#active-collabs' : undefined}
          loading={loading}
        />
        <StatCard
          title="Total Applications"
          value={loading ? '...' : stats.totalApplications}
          icon="📤"
          color="purple"
          href={stats.totalApplications > 0 ? '#my-applications' : undefined}
          loading={loading}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-8">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Action Items - Urgent */}
      {!loading && stats.pendingReviews > 0 && (
        <div id="pending-requests" className="bg-red-900 border border-red-600 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🔴 Urgent: {stats.pendingReviews} Request{stats.pendingReviews !== 1 ? 's' : ''} Awaiting Review
              </h2>
              <p className="text-red-200 text-sm">Review and respond to collaboration requests</p>
            </div>
            <Link
              href="/requests"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}

      {/* My Projects Section */}
      {!loading && ownedProjects.length > 0 && (
        <section id="my-projects" className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">My Projects</h2>
            <Link href="/projects/new" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              + Create New
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedProjects.slice(0, 6).map((project: any) => {
              const pendingForProject = receivedRequests.filter(
                (r: any) => r.account.project.toString() === project.publicKey.toString() && 
                Object.keys(r.account.status)[0] === 'pending'
              ).length;

              return (
                <Link
                  key={project.publicKey.toString()}
                  href={`/projects/${project.publicKey.toString()}`}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {project.account.name}
                    </h3>
                    {pendingForProject > 0 && (
                      <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                        {pendingForProject}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {project.account.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{project.account.requiredRoles?.length || 0} roles</span>
                    <span className="text-blue-400 group-hover:text-blue-300">View →</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {ownedProjects.length > 6 && (
            <div className="text-center mt-6">
              <Link href="/projects" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                View all {ownedProjects.length} projects →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* My Applications Section */}
      <section id="my-applications" className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">My Applications</h2>
          <Link href="/projects" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            Browse Projects →
          </Link>
        </div>

        {applications.length === 0 ? (
          <EmptyState
            icon="📤"
            title="No Applications Yet"
            description="Browse projects and apply for roles that match your skills"
            actionLabel="Browse Projects"
            actionHref="/projects"
          />
        ) : (
          <>
            {/* Status Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'pending' as const, label: 'Pending' },
                { key: 'underReview' as const, label: 'Under Review' },
                { key: 'accepted' as const, label: 'Accepted' },
                { key: 'rejected' as const, label: 'Rejected' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {label} {applicationCounts[key] > 0 && `(${applicationCounts[key]})`}
                </button>
              ))}
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No {activeTab !== 'all' ? activeTab : ''} applications
                </div>
              ) : (
                filteredApplications.map((app: any) => {
                  const status = Object.keys(app.account.status)[0];
                  const statusColor = {
                    pending: 'bg-yellow-900 border-yellow-600 text-yellow-200',
                    underReview: 'bg-blue-900 border-blue-600 text-blue-200',
                    accepted: 'bg-green-900 border-green-600 text-green-200',
                    rejected: 'bg-red-900 border-red-600 text-red-200',
                  }[status] || 'bg-gray-800 border-gray-700 text-gray-300';

                  const roleKey = app.account.desiredRole ? Object.keys(app.account.desiredRole)[0] : '';
                  const rolePretty = roleKey ? roleKey.replace(/^[a-z]/, (c: string) => c.toUpperCase()) : 'Role';

                  return (
                    <Link
                      key={app.publicKey.toString()}
                      href={`/requests/${app.publicKey.toString()}`}
                      className={`block border rounded-lg p-4 hover:shadow-lg transition-all ${statusColor}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{rolePretty}</span>
                            <span className="text-xs opacity-75">on Project</span>
                            <span className="text-xs font-mono opacity-75">
                              {app.account.project.toString().slice(0, 4)}...{app.account.project.toString().slice(-4)}
                            </span>
                          </div>
                          <p className="text-sm opacity-90">
                            {status === 'pending' && '⏳ Waiting for review'}
                            {status === 'underReview' && '🔍 Under review by project owner'}
                            {status === 'accepted' && '✅ Accepted! Ready to collaborate'}
                            {status === 'rejected' && '❌ Not selected this time'}
                          </p>
                        </div>
                        <div className="text-xs opacity-75">
                          {new Date(app.account.timestamp * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </>
        )}
      </section>

      {/* Active Collaborations Section */}
      {!loading && activeCollaborations.length > 0 && (
        <section id="active-collabs" className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Active Collaborations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCollaborations.map((project: any) => (
              <div
                key={project.publicKey.toString()}
                className="bg-green-900 border border-green-600 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {project.account.name}
                </h3>
                <p className="text-green-200 text-sm mb-4 line-clamp-2">
                  {project.account.description}
                </p>
                <Link
                  href={`/projects/${project.publicKey.toString()}`}
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                  Open Project →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Welcome State - No Activity Yet */}
      {!loading && ownedProjects.length === 0 && applications.length === 0 && (
        <div className="mt-12">
          <EmptyState
            icon="🚀"
            title="Welcome to DevCol!"
            description="Start your Web3 developer collaboration journey by creating a project or joining existing ones"
            actionLabel="Create a Project"
            actionHref="/projects/new"
            secondaryActionLabel="Browse Projects"
            secondaryActionHref="/projects"
          />
        </div>
      )}
    </div>
  );
}
