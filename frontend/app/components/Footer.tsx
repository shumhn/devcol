'use client';

import Link from 'next/link';
import { Sora } from 'next/font/google';

const premium = Sora({ subsets: ['latin'], weight: ['400', '600'] });

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-(--surface) border-t border-(--border) ${premium.className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="text-center md:text-left">
            <p className="text-(--text-secondary) text-sm">
              © {currentYear} <span className="text-(--text-primary) font-semibold">c0Foundr</span> • Built on Solana
            </p>
          </div>

          {/* Resources */}
          <div className="flex items-center gap-5">
            <h4 className="text-sm font-semibold text-(--text-secondary)">Resources:</h4>
            <a
              href="https://solana.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--text-secondary) hover:text-[#00D4AA] transition-colors text-sm"
            >
              Solana Docs
            </a>
            <a
              href="https://www.anchor-lang.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--text-secondary) hover:text-[#00D4AA] transition-colors text-sm"
            >
              Anchor
            </a>
            <a
              href="https://www.rust-lang.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--text-secondary) hover:text-[#00D4AA] transition-colors text-sm"
            >
              Rust
            </a>
          </div>

          {/* Connect */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/shumhn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--text-secondary) hover:text-[#00D4AA] transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            <a
              href="https://x.com/devsh_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--text-secondary) hover:text-[#00D4AA] transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <button
              onClick={() => {
                window.location.href = 'mailto:theshumanhere@gmail.com';
                navigator.clipboard.writeText('theshumanhere@gmail.com').catch(() => {});
              }}
              className="text-(--text-secondary) hover:text-[#00D4AA] transition-colors"
              aria-label="Email"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
