import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, LayoutDashboard, ClipboardList, Users, LogOut,
  Wifi, WifiOff, RefreshCw, Menu, X, ChevronDown
} from 'lucide-react';

export default function Navbar({ syncState }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { online, syncing, pendingCount, sync } = syncState || {};

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/tours', label: 'Tournées', icon: ClipboardList },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Administration', icon: Users }] : []),
  ];

  const isActive = (to) => location.pathname.startsWith(to);

  const roleLabel = {
    admin: 'Administrateur',
    responsable_hse: 'Responsable HSE',
    animateur_hse: 'Animateur HSE',
  }[user?.role] || user?.role;

  return (
    <nav className="bg-primary-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <div className="bg-white/20 rounded-lg p-1.5">
              <Shield className="w-5 h-5" />
            </div>
            <span className="hidden sm:block">SafeCheck OCP</span>
            <span className="sm:hidden">SafeCheck</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to) ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Sync indicator */}
            <button
              onClick={sync}
              disabled={syncing || !online}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
              title={online ? 'Synchroniser' : 'Hors ligne'}
            >
              {online ? (
                <Wifi className="w-4 h-4 text-green-300" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-300" />
              )}
              {syncing && <RefreshCw className="w-3 h-3 animate-spin" />}
              {pendingCount > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full px-1.5 min-w-[1.25rem] text-center">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                  {user?.full_name}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white text-gray-900 rounded-xl shadow-xl w-48 py-1 border border-gray-200 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 truncate">{user?.full_name}</p>
                    <p className="text-xs text-primary-600">{roleLabel}</p>
                    {user?.company && <p className="text-xs text-gray-500 truncate">{user.company}</p>}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/20 py-2">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to) ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Close user menu on outside click */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </nav>
  );
}
