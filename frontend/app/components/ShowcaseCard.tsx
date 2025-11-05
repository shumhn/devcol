'use client';

import Link from 'next/link';

interface ShowcaseCardProps {
  href: string;
  name: string;
  tagline?: string;
  description?: string;
  logoUrl?: string | null;
  techStack?: string[];
}

export default function ShowcaseCard({ href, name, tagline, description, logoUrl, techStack = [] }: ShowcaseCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-(--border) hover:border-[#00D4AA] bg-(--surface) hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-4 p-5">
        <div className="shrink-0 w-12 h-12 rounded-lg border border-(--border) bg-(--surface-hover) overflow-hidden">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/next/no-img-element
            <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-[#00D4AA] text-base">◎</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-(--text-primary) font-bold truncate">{name}</h3>
          </div>
          {tagline ? (
            <p className="text-sm text-(--text-secondary) line-clamp-1">{tagline}</p>
          ) : (
            <p className="text-sm text-(--text-secondary) line-clamp-2">{description}</p>
          )}
          {techStack && techStack.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {techStack.slice(0, 5).map((t, i) => (
                <span key={i} className="text-[10px] text-(--text-muted) bg-(--surface-hover) rounded px-2 py-0.5 font-medium">
                  {t}
                </span>
              ))}
              {techStack.length > 5 && (
                <span className="text-[10px] text-(--text-secondary)">+{techStack.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

    </Link>
  );
}
