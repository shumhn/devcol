'use client';

import Link from 'next/link';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
}: EmptyStateProps) {
  return (
    <div className="flex justify-center py-12 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-(--border) bg-(--surface) shadow-lg px-8 py-12 text-center transition-colors">
        <div className="text-6xl mb-5 opacity-80 text-(--text-secondary)">{icon}</div>
        <h3 className="text-2xl font-semibold text-(--text-primary) mb-3">{title}</h3>
        <p className="text-(--text-secondary) mb-8 leading-relaxed">{description}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {actionLabel && (actionHref || onAction) && (
            actionHref ? (
              <Link
                href={actionHref}
                className="px-6 py-3 rounded-lg font-semibold transition-colors bg-[#00D4AA] hover:bg-[#00B894] text-white shadow-sm"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                onClick={onAction}
                className="px-6 py-3 rounded-lg font-semibold transition-colors bg-[#00D4AA] hover:bg-[#00B894] text-white shadow-sm"
              >
                {actionLabel}
              </button>
            )
          )}
          {secondaryActionLabel && secondaryActionHref && (
            <Link
              href={secondaryActionHref}
              className="px-6 py-3 rounded-lg font-semibold transition-colors bg-(--surface-hover) text-(--text-primary) border border-(--border) hover:border-[#00D4AA]"
            >
              {secondaryActionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
