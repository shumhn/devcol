'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from './useAnchorProgram';
import { showToast } from '../components/Toast';

export function useNotifications() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [lastChecked, setLastChecked] = useState<Record<string, string>>({});
  const checkInProgress = useRef(false);

  useEffect(() => {
    if (!program || !publicKey) return;

    const checkForUpdates = async () => {
      if (checkInProgress.current) return;
      checkInProgress.current = true;

      try {
        // Fetch all requests sent by this user
        const filters = [
          { memcmp: { offset: 8, bytes: publicKey.toBase58() } }, // 8 disc = start of `from`
        ];
        const requests = await (program as any).account.collaborationRequest.all(filters);

        requests.forEach((req: any) => {
          const key = req.publicKey.toString();
          const status = Object.keys(req.account.status)[0];
          const prevStatus = lastChecked[key];

          // Notify on status change
          if (prevStatus && prevStatus !== status) {
            if (status === 'underReview') {
              showToast('info', '🔍 Your collaboration request is now under review!', 6000);
            } else if (status === 'accepted') {
              showToast('success', '🎉 Your collaboration request was accepted!', 8000);
            } else if (status === 'rejected') {
              showToast('error', '❌ Your collaboration request was rejected.', 8000);
            }
          }

          // Update last known status
          setLastChecked(prev => ({ ...prev, [key]: status }));
        });
      } catch (e) {
        console.warn('Notification check failed:', e);
      } finally {
        checkInProgress.current = false;
      }
    };

    // Initial check
    checkForUpdates();

    // Poll every 30s
    const interval = setInterval(checkForUpdates, 30000);

    // Check on focus/visibility
    const onFocus = () => checkForUpdates();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };

    try {
      window.addEventListener('focus', onFocus);
    } catch {}
    try {
      document.addEventListener('visibilitychange', onVisibility);
    } catch {}

    return () => {
      clearInterval(interval);
      try {
        window.removeEventListener('focus', onFocus);
      } catch {}
      try {
        document.removeEventListener('visibilitychange', onVisibility);
      } catch {}
    };
  }, [program, publicKey]);
}
