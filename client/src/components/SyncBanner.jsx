import React from 'react';
import { WifiOff } from 'lucide-react';

export default function SyncBanner({ pendingCount }) {
  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>
        Hors ligne
        {pendingCount > 0 && (
          <> — <strong>{pendingCount}</strong> modification{pendingCount > 1 ? 's' : ''} en attente de synchronisation</>
        )}
      </span>
    </div>
  );
}
