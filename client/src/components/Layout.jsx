import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import SyncBanner from './SyncBanner';
import DemoBanner from './DemoBanner';
import { useSync } from '../hooks/useSync';
import { isDemoMode } from '../api/client';

export default function Layout() {
  const syncState = useSync();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isDemoMode && <DemoBanner />}
      <Navbar syncState={syncState} />
      {!isDemoMode && !syncState.online && <SyncBanner pendingCount={syncState.pendingCount} />}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <Outlet context={syncState} />
      </main>
    </div>
  );
}
