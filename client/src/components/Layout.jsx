import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import SyncBanner from './SyncBanner';
import { useSync } from '../hooks/useSync';

export default function Layout() {
  const syncState = useSync();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar syncState={syncState} />
      {!syncState.online && <SyncBanner pendingCount={syncState.pendingCount} />}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <Outlet context={syncState} />
      </main>
    </div>
  );
}
