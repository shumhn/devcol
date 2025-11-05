'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { EmptyState } from '../components/EmptyState';
import { Sora } from 'next/font/google';

const premium = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { profile, ownedProjects, applications, receivedRequests, activeCollaborations, stats, loading, error } = useDashboardData();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'underReview' | 'accepted' | 'rejected'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | 'open' | 'closed'>('all');

  // No wallet connected
  if (!publicKey) {
    return (
      <div className={`min-h-screen bg-(--background) ${premium.className}`}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <EmptyState
            icon="🔌"
            title="Connect Your Wallet"
            description="Connect your Phantom wallet to view your personalized dashboard"
            actionLabel="Connect Wallet"
            onAction={() => {}}
          />
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen bg-(--background) ${premium.className}`}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-10 bg-(--surface) rounded-lg w-48 mb-2 animate-pulse"></div>
            <div className="h-6 bg-(--surface) rounded-lg w-64 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-(--surface) border border-(--border) rounded-2xl h-32 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No profile yet
  if (!profile) {
    return (
      <div className={`min-h-screen bg-(--background) ${premium.className}`}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <EmptyState
            icon="👤"
            title="Create Your Profile"
            description="Get started by creating your developer profile to join projects and collaborate"
            actionLabel="Create Profile"
            actionHref="/profile"
          />
        </div>
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

  // Filter projects
  const filteredProjects = projectFilter === 'all' 
    ? ownedProjects 
    : ownedProjects.filter((p: any) => {
        const isOpen = p.account.acceptingCollaborations?.open;
        return projectFilter === 'open' ? isOpen : !isOpen;
      });

  return (
    <div className={`min-h-screen bg-(--background) ${premium.className}`}>
      <div className="max-w-7xl mx-auto px-4 py-8 bg-(--background)">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-(--text-primary) tracking-tight mb-2">Dashboard</h1>
          <p className="text-(--text-secondary) text-lg">Welcome back, <span className="text-[#00D4AA] font-semibold">{profile?.display_name || profile?.username || 'Developer'}</span>!</p>
        </div>

        {/* Stats Grid - Premium Bright Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Projects Created */}
          <Link
            href={stats.projectsCreated > 0 ? '#my-projects' : '/projects/new'}
            className="group bg-linear-to-br from-green-500 to-green-600 rounded-2xl shadow-sm hover:shadow-lg transition-all p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-white">{loading ? '...' : stats.projectsCreated}</span>
            </div>
            <h3 className="text-white/90 text-sm font-semibold mb-1">Projects Created</h3>
            <p className="text-white/70 text-xs">Your active projects</p>
          </Link>

          {/* Pending Reviews */}
          <Link
            href={stats.pendingReviews > 0 ? '#pending-requests' : '/requests'}
            className="group bg-linear-to-br from-sky-500 to-sky-600 rounded-2xl shadow-sm hover:shadow-lg transition-all p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-white">{loading ? '...' : stats.pendingReviews}</span>
            </div>
            <h3 className="text-white/90 text-sm font-semibold mb-1">Pending Reviews</h3>
            <p className="text-white/70 text-xs">{stats.pendingReviews > 0 ? 'Requires attention' : 'All caught up'}</p>
          </Link>

          {/* Active Collaborations */}
          <Link
            href={stats.activeCollabs > 0 ? '#active-collabs' : '/projects'}
            className="group bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl shadow-sm hover:shadow-lg transition-all p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-white">{loading ? '...' : stats.activeCollabs}</span>
            </div>
            <h3 className="text-white/90 text-sm font-semibold mb-1">Active Collaborations</h3>
            <p className="text-white/70 text-xs">Projects you're working on</p>
          </Link>

          {/* Total Applications */}
          <Link
            href={stats.totalApplications > 0 ? '#my-applications' : '/projects'}
            className="group bg-(--surface) border-2 border-(--border) hover:border-(--border) hover:shadow-lg rounded-2xl shadow-sm transition-all p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-(--surface-hover) rounded-xl">
                <svg className="w-6 h-6 text-(--text-secondary)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-(--text-primary)">{loading ? '...' : stats.totalApplications}</span>
            </div>
            <h3 className="text-(--text-secondary) text-sm font-semibold mb-1">Total Applications</h3>
            <p className="text-(--text-muted) text-xs">Requests you've sent</p>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-2xl p-4 mb-8">
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Urgent Action Items */}
        {!loading && stats.pendingReviews > 0 && (
          <div id="pending-requests" className="bg-linear-to-r from-red-900/20 to-orange-900/20 border-l-4 border-red-500 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-(--text-primary) flex items-center gap-2 mb-1">
                  <span className="text-red-500">●</span> Urgent: {stats.pendingReviews} Request{stats.pendingReviews !== 1 ? 's' : ''} Awaiting Review
                </h2>
                <p className="text-(--text-secondary) text-sm">Review and respond to collaboration requests for your projects</p>
              </div>
              <Link
                href="/requests"
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Review Now →
              </Link>
            </div>
          </div>
        )}

        {/* My Projects Section */}
        {!loading && ownedProjects.length > 0 && (
          <section id="my-projects" className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-(--text-primary)">My Projects</h2>
                <p className="text-(--text-secondary) text-sm mt-1">Manage and track your projects</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Filter Tabs */}
                <div className="flex gap-2 bg-(--surface) border border-(--border) rounded-lg p-1">
                  {([
                    { key: 'all', label: 'All', count: ownedProjects.length },
                    { key: 'open', label: 'Open', count: ownedProjects.filter((p: any) => p.account.acceptingCollaborations?.open).length },
                    { key: 'closed', label: 'Closed', count: ownedProjects.filter((p: any) => !p.account.acceptingCollaborations?.open).length },
                  ] as const).map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setProjectFilter(key)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                        projectFilter === key
                          ? 'bg-(--surface-hover) text-(--text-primary)'
                          : 'text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)'
                      }`}
                    >
                      {label} <span className="text-xs ml-1">({count})</span>
                    </button>
                  ))}
                </div>
                <Link
                  href="/projects/new"
                  className="bg-[#00D4AA] hover:bg-[#00B894] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                  + New Project
                </Link>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="bg-(--surface) border border-(--border) rounded-2xl p-12 text-center">
                <p className="text-(--text-secondary) mb-4">No {projectFilter} projects found</p>
                {projectFilter !== 'all' && (
                  <button
                    onClick={() => setProjectFilter('all')}
                    className="text-[#00D4AA] hover:underline font-semibold"
                  >
                    View all projects
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project: any) => {
                  const isOpen = project.account.acceptingCollaborations?.open;
                  return (
                    <Link
                      key={project.publicKey.toString()}
                      href={`/projects/${project.publicKey.toString()}`}
                      className="group bg-(--surface) border border-(--border) hover:border-(--border) hover:shadow-lg transition-all rounded-2xl p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-(--text-primary) group-hover:text-(--text-primary) line-clamp-1">
                          {project.account.name}
                        </h3>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                          isOpen
                            ? 'bg-green-900/20 text-green-300'
                            : 'bg-(--surface-hover) text-(--text-secondary)'
                        }`}>
                          {isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-(--text-secondary) line-clamp-2 mb-4 leading-relaxed">
                        {project.account.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-(--text-muted)">
                          {new Date(project.account.timestamp.toNumber() * 1000).toLocaleDateString()}
                        </span>
                        <span className="text-[#00D4AA] font-semibold group-hover:underline">
                          View details →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* My Applications Section */}
        {!loading && applications.length > 0 && (
          <section id="my-applications" className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-(--text-primary)">My Applications</h2>
                <p className="text-(--text-secondary) text-sm mt-1">Track your collaboration requests</p>
              </div>
              <Link
                href="/requests"
                className="text-[#00D4AA] hover:underline font-semibold text-sm"
              >
                View All →
              </Link>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {([
                { key: 'all', label: 'All', color: 'gray' },
                { key: 'pending', label: 'Pending', color: 'yellow' },
                { key: 'underReview', label: 'Under Review', color: 'blue' },
                { key: 'accepted', label: 'Accepted', color: 'green' },
                { key: 'rejected', label: 'Rejected', color: 'red' },
              ] as const).map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? 'bg-(--surface-hover) text-(--text-primary)'
                      : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:border-(--border)'
                  }`}
                >
                  {label} <span className="text-xs ml-1">({applicationCounts[key]})</span>
                </button>
              ))}
            </div>

            {filteredApplications.length === 0 ? (
              <div className="bg-(--surface) border border-(--border) rounded-2xl p-12 text-center">
                <p className="text-(--text-secondary) mb-4">No {activeTab} applications found</p>
                {activeTab !== 'all' && (
                  <button
                    onClick={() => setActiveTab('all')}
                    className="text-[#00D4AA] hover:underline font-semibold"
                  >
                    View all applications
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.slice(0, 5).map((app: any) => {
                  const status = Object.keys(app.account.status)[0];
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-900/20 text-yellow-300',
                    underReview: 'bg-blue-900/20 text-blue-300',
                    accepted: 'bg-green-900/20 text-green-300',
                    rejected: 'bg-red-900/20 text-red-300',
                  };

                  return (
                    <Link
                      key={app.publicKey.toString()}
                      href={`/requests/${app.publicKey.toString()}`}
                      className="group bg-(--surface) border border-(--border) hover:border-(--border) hover:shadow-md transition-all rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-(--text-primary)">
                            Application to Project
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[status]}`}>
                            {status}
                          </span>
                        </div>
                        <p className="text-xs text-(--text-secondary) line-clamp-1">
                          {app.account.message.slice(0, 100)}...
                        </p>
                      </div>
                      <span className="text-[#00D4AA] font-semibold text-sm group-hover:underline shrink-0">
                        View →
                      </span>
                    </Link>
                  );
                })}
                {filteredApplications.length > 5 && (
                  <Link
                    href="/requests"
                    className="block text-center text-[#00D4AA] hover:underline font-semibold text-sm py-3"
                  >
                    View all {filteredApplications.length} applications →
                  </Link>
                )}
              </div>
            )}
          </section>
        )}

        {/* Active Collaborations */}
        {!loading && activeCollaborations.length > 0 && (
          <section id="active-collabs" className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-(--text-primary)">Active Collaborations</h2>
                <p className="text-(--text-secondary) text-sm mt-1">Projects you're actively contributing to</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCollaborations.map((project: any) => (
                <Link
                  key={project.publicKey.toString()}
                  href={`/projects/${project.publicKey.toString()}`}
                  className="group bg-linear-to-br from-green-900/20 to-teal-900/20 border border-green-700 hover:border-green-500 hover:shadow-lg transition-all rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-(--text-primary) group-hover:text-(--text-primary) line-clamp-1">
                      {project.account.name}
                    </h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500 text-white font-semibold shrink-0">
                      Active
                    </span>
                  </div>
                  <p className="text-(--text-secondary) line-clamp-2 mb-4 leading-relaxed">
                    {project.account.description}
                  </p>
                  <span className="text-[#00D4AA] font-semibold text-sm group-hover:underline">
                    Open project →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty State - No Projects or Applications */}
        {!loading && ownedProjects.length === 0 && applications.length === 0 && (
          <div className="bg-(--surface) border border-(--border) rounded-2xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-2xl font-bold text-(--text-primary) mb-2">Get Started!</h3>
              <p className="text-(--text-secondary) mb-6">
                Browse projects and apply for roles that match your skills
              </p>
              <Link
                href="/projects"
                className="inline-block bg-[#00D4AA] hover:bg-[#00B894] text-white px-8 py-3 rounded-lg font-bold transition-colors"
              >
                Browse Projects →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
