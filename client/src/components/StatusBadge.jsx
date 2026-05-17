import React from 'react';
import { Check, X, Minus } from 'lucide-react';

const configs = {
  conforme: {
    label: 'Conforme',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: Check,
  },
  non_conforme: {
    label: 'Non conforme',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: X,
  },
  na: {
    label: 'N/A',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: Minus,
  },
  en_cours: {
    label: 'En cours',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: null,
  },
  termine: {
    label: 'Terminé',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: Check,
  },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.className} ${sizeClass}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
