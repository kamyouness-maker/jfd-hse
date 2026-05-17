import { useState, useEffect, useCallback } from 'react';
import { getPendingChanges, markAsSynced, getPendingCount } from '../db/localDB';
import { syncApi, isOnline } from '../api/client';
import toast from 'react-hot-toast';

export function useSync() {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const { tours, checklistItems, photos } = await getPendingChanges();
      if (tours.length === 0 && checklistItems.length === 0 && photos.length === 0) {
        setLastSync(new Date());
        return;
      }

      const response = await syncApi.push({ tours, checklistItems, photos });
      if (response.data.success) {
        // Mark synced
        await markAsSynced('tours', tours.map(t => t.id));
        await markAsSynced('checklist_items', checklistItems.map(i => i.id));
        await markAsSynced('photos', photos.map(p => p.id));
        setLastSync(new Date());
        await refreshPendingCount();
        const total = tours.length + checklistItems.length + photos.length;
        if (total > 0) {
          toast.success(`${total} modification(s) synchronisée(s)`);
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
      // Don't show error toast on sync failure — will retry
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast.success('Connexion rétablie — synchronisation en cours...');
      sync();
    };
    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count
    refreshPendingCount();

    // Periodic sync every 30 seconds if online
    const interval = setInterval(() => {
      if (navigator.onLine) sync();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [sync, refreshPendingCount]);

  return { online, syncing, pendingCount, lastSync, sync, refreshPendingCount };
}
