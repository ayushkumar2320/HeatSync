/**
 * BackendStatusContext.tsx
 * Global backend connectivity probe.
 * Runs once on mount, exposes { backendOnline, checking, checkedAt } to all pages.
 * When offline, all data displayed is the static heatx15DayData.json snapshot —
 * this status must be clearly communicated to the user.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { checkBackendHealth } from '../services/apiService';

export type BackendStatus = 'CHECKING' | 'ONLINE' | 'OFFLINE';

interface BackendStatusValue {
  status: BackendStatus;
  checkedAt: Date | null;
  /** Snapshot date embedded in heatx15DayData.json — used when offline */
  snapshotDate: string | null;
}

const BackendStatusContext = createContext<BackendStatusValue>({
  status: 'CHECKING',
  checkedAt: null,
  snapshotDate: null,
});

export function useBackendStatus() {
  return useContext(BackendStatusContext);
}

/** Wraps the whole app — probe runs once, result is broadcast via context */
export function BackendStatusProvider({ children, snapshotDate }: {
  children: React.ReactNode;
  snapshotDate: string | null;
}) {
  const [status, setStatus] = useState<BackendStatus>('CHECKING');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkBackendHealth().then(result => {
      if (!cancelled) {
        setStatus(result.online ? 'ONLINE' : 'OFFLINE');
        setCheckedAt(new Date());
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <BackendStatusContext.Provider value={{ status, checkedAt, snapshotDate }}>
      {children}
    </BackendStatusContext.Provider>
  );
}
