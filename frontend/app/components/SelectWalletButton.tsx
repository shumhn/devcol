'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PublicKey } from '@solana/web3.js';

export default function InlineWalletSelector() {
  const { publicKey, wallets, disconnect } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<PublicKey | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Track if component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Sync with wallet adapter context
  useEffect(() => {
    setConnectedWallet(publicKey);
  }, [publicKey]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Small delay to prevent immediate close on open
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleConnect = async (wallet: any) => {
    if (!wallet || wallet.readyState !== 'Installed' || connecting) return;

    try {
      setConnecting(true);
      setIsOpen(false); // Close dropdown
      console.log('🔗 Connecting to:', wallet.adapter.name);
      
      // Direct adapter connection
      await wallet.adapter.connect();
      
      // Get the public key from the adapter
      const pubKey = wallet.adapter.publicKey;
      console.log('✅ Connected! Address:', pubKey?.toString());
      
      // Update local state immediately
      setConnectedWallet(pubKey);
    } catch (e: any) {
      console.error('❌ Connection error:', e);
      alert(`Failed to connect: ${e?.message || e}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsOpen(false); // Close dropdown
      await disconnect();
      setConnectedWallet(null);
    } catch (e) {
      console.error('Disconnect error:', e);
    }
  };

  const installedWallets = wallets.filter(w => w.readyState === 'Installed');

  // Use either connectedWallet or publicKey (whichever is available)
  const displayKey = connectedWallet || publicKey;
  
  // Render dropdown via portal to body (bypasses all stacking contexts)
  const renderDropdownPortal = () => {
    if (!isOpen || !mounted || connecting) return null;
    
    return createPortal(
      <div className="fixed inset-0 z-[99999999]" style={{ pointerEvents: 'auto' }}>
        {/* Invisible overlay to close on outside click */}
        <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
        
        {/* Dropdown positioned near button */}
        <div 
          ref={dropdownRef}
          className="absolute right-6 top-20 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 py-2"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {displayKey ? (
            // Connected: Show address and disconnect option
            <>
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Connected Wallet</p>
                <p className="text-sm text-gray-900 font-medium mt-1 truncate">{displayKey.toString()}</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect Wallet
              </button>
            </>
          ) : (
            // Not connected: Show wallet options
            <>
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choose Wallet</p>
              </div>
              {installedWallets.length > 0 ? (
                installedWallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleConnect(wallet)}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 group"
                  >
                    {wallet.adapter.icon && (
                      <img 
                        src={wallet.adapter.icon} 
                        alt={wallet.adapter.name}
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">{wallet.adapter.name}</p>
                      <p className="text-xs text-gray-500">Detected</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No wallets detected. Please install Phantom or Solflare.
                </div>
              )}
            </>
          )}
        </div>
      </div>,
      document.body
    );
  };
  
  if (displayKey) {
    return (
      <>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg shadow-lg hover:shadow-xl border border-purple-500/50 transition-all duration-200"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-white font-semibold tracking-wide">
            {displayKey.toString().slice(0, 4)}...{displayKey.toString().slice(-4)}
          </span>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {renderDropdownPortal()}
      </>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={connecting}
        className="group relative px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed border border-purple-500/50 disabled:border-gray-400"
      >
        <span className="flex items-center gap-2.5">
          {connecting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-semibold">Connecting...</span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold">Select Wallet</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </span>
        {!connecting && (
          <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        )}
      </button>
      {renderDropdownPortal()}
    </>
  );
}