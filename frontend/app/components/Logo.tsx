'use client';

import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';

const Display = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });

type LogoProps = {
  withWordmark?: boolean;
  href?: string;
  className?: string;
};

export default function Logo({ withWordmark = true, href = '/', className = '' }: LogoProps) {
  const content = (
    <div className={`flex items-center ${className}`} aria-label="DevCol">
      {/* Mark */}
      <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 grid place-items-center shadow-sm">
        <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="devcol-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00D4AA" />
              <stop offset="100%" stopColor="#00B894" />
            </linearGradient>
          </defs>
          {/* Two interlocking links to represent collaboration */}
          <rect x="9" y="18" rx="10" ry="10" width="30" height="28" stroke="url(#devcol-grad)" strokeWidth="6" />
          <rect x="25" y="18" rx="10" ry="10" width="30" height="28" stroke="#111827" strokeOpacity="0.9" strokeWidth="6" />
          {/* Spark */}
          <circle cx="52" cy="12" r="3" fill="url(#devcol-grad)" />
        </svg>
      </div>
      {withWordmark && (
        <span className={`${Display.className} ml-2 text-base font-bold tracking-tight text-gray-900`}>
          DevCol
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="select-none">
        {content}
      </Link>
    );
  }
  return content;
}
