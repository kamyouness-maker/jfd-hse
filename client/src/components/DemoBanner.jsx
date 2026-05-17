import React from 'react';
import { FlaskConical } from 'lucide-react';

export default function DemoBanner() {
  return (
    <div className="bg-amber-500 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2">
      <FlaskConical size={15} />
      <span>
        <strong>Mode Démo</strong> — Les données sont simulées localement.
        Installez le serveur pour la version complète avec synchronisation et rapports PDF.
      </span>
    </div>
  );
}
