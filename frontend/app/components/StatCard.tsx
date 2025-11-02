'use client';

import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
  subtitle?: string;
  href?: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon, color, subtitle, href, loading }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800',
    green: 'from-green-600 to-green-800',
    purple: 'from-purple-600 to-purple-800',
    red: 'from-red-600 to-red-800',
    yellow: 'from-yellow-600 to-yellow-800',
  };

  const content = (
    <div className={`relative overflow-hidden bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-200 ${href ? 'cursor-pointer hover:scale-105' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-white/20 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-white">{value}</p>
          )}
          {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
        </div>
        <div className="text-4xl opacity-20">{icon}</div>
      </div>
      {href && (
        <div className="absolute bottom-2 right-2 text-white/60 text-xs">
          View →
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
