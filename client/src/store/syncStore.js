import { create } from 'zustand';

export const useSyncStore = create((set) => ({
  online: navigator.onLine,
  syncing: false,
  pendingCount: 0,
  lastSync: null,
  setOnline: (online) => set({ online }),
  setSyncing: (syncing) => set({ syncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSync: (lastSync) => set({ lastSync }),
}));
