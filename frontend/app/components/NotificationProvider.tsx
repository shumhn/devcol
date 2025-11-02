'use client';

import { useNotifications } from '../hooks/useNotifications';

export function NotificationProvider() {
  useNotifications();
  return null;
}
