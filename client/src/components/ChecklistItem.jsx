import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Image, X, CheckCheck } from 'lucide-react';
import PhotoCapture from './PhotoCapture';
import { photosApi } from '../api/client';
import toast from 'react-hot-toast';

const CRITICITE_STYLE = {
  Critique: 'bg-red-100 text-red-700 border border-red-300',
  Elevée:   'bg-orange-100 text-orange-700 border border-orange-300',
  Moyenne:  'bg-yellow-100 text-yellow-700 border border-yellow-300',
};

const STATUT_OPTIONS = [
  { value: 'conforme',     label: 'Respectée',      short: '✓',   color: 'green' },
  { value: 'non_conforme', label: 'Non respectée',  short: '✗',   color: 'red'   },
  { value: 'na',           label: 'N/A',            short: 'N/A', color: 'gray'  },
];

const colorClasses = {
  green: { active: 'bg-green-500 text-white border-green-500', inactive: 'bg-white text-green-700 border-green-300 hover:bg-green-50' },
  red:   { active: 'bg-red-500 text-white border-red-500',     inactive: 'bg-white text-red-700 border-red-300 hover:bg-red-50'   },
  gray:  { active: 'bg-gray-500 text-white border-gray-500',   inactive: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'  },
};

export default function ChecklistItem({ item, onChange, readOnly }) {
  const [expanded, setExpanded] = useState(item.statut === 'non_conforme');
  const [photos, setPhotos] = useState(item.photos || []);

  const handleStatut = (value) => {
    if (readOnly) return;
    const newStatut = item.statut === value ? null : value;
    const update = { ...item, statut: newStatut };
    if (newStatut !== 'non_conforme') update.corrige_sur_place = false;
    onChange(update);
    if (value === 'non_conforme') setExpanded(true);
  };

  const handleField = (field, value) => {
    onChange({ ...item, [field]: value });
  };

  const handlePhotoAdded = (photo) => {
    const updated = [...photos, photo];
    setPhotos(updated);
    onChange({ ...item, photos: updated });
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await photosApi.delete(photoId);
      const updated = photos.filter(p => p.id !== photoId);
      setPhotos(updated);
      onChange({ ...item, photos: updated });
      toast.success('Photo supprimée');
    } catch {
      toast.error('Erreur suppression photo');
    }
  };

  const isNonConforme = item.statut === 'non_conforme';
  const showDetails = isNonConforme || photos.length > 0 || item.observation;

  return (
    <div className={`border rounded-xl p-3.5 transition-colors ${
      item.statut === 'conforme'     ? 'border-green-200 bg-green-50/40' :
      item.statut === 'non_conforme' ? 'border-red-200 bg-red-50/40' :
      item.statut === 'na'           ? 'border-gray-200 bg-gray-50/30' :
      'border-gray-200 bg-white'
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        {/* Numero */}
        {item.numero && (
          <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400 w-8 text-right leading-5">
            {item.numero}.
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Criticite badge */}
          {item.criticite && (
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1.5 mb-1 ${CRITICITE_STYLE[item.criticite] || ''}`}>
              {item.criticite}
            </span>
          )}
          <p className="text-sm font-medium text-gray-900 leading-snug">{item.item_label}</p>
        </div>

        {/* Status buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {STATUT_OPTIONS.map(({ value, label, short, color }) => {
            const isActive = item.statut === value;
            const cls = colorClasses[color];
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleStatut(value)}
                disabled={readOnly}
                title={label}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${isActive ? cls.active : cls.inactive} disabled:cursor-not-allowed`}
              >
                {short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Corrigé sur place toggle (only when non_conforme) */}
      {isNonConforme && !readOnly && (
        <div className="mt-2 ml-10">
          <button
            type="button"
            onClick={() => handleField('corrige_sur_place', !item.corrige_sur_place)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
              item.corrige_sur_place
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Levé d'écart sur place
          </button>
        </div>
      )}

      {/* Details toggle */}
      {showDetails && (
        <div className="mt-2 ml-10">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Masquer' : 'Détails / photos'}
          </button>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-200 pt-3 ml-10">
          <div>
            <label className="label">Constat / Observation</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={item.observation || ''}
              onChange={(e) => handleField('observation', e.target.value)}
              placeholder="Décrire le constat..."
              disabled={readOnly}
            />
          </div>

          {isNonConforme && (
            <>
              <div>
                <label className="label">Plan d'action</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={item.action_plan || ''}
                  onChange={(e) => handleField('action_plan', e.target.value)}
                  placeholder="Action corrective à mener..."
                  disabled={readOnly}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Échéance</label>
                  <input
                    type="date"
                    className="input"
                    value={item.action_deadline || ''}
                    onChange={(e) => handleField('action_deadline', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label className="label">Responsable</label>
                  <input
                    type="text"
                    className="input"
                    value={item.action_responsible || ''}
                    onChange={(e) => handleField('action_responsible', e.target.value)}
                    placeholder="Nom du responsable"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </>
          )}

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Photos ({photos.length})</label>
              {!readOnly && (
                <PhotoCapture checklistItemId={item.id} onPhotoAdded={handlePhotoAdded} />
              )}
            </div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                    <img
                      src={photo.isLocal ? photo.data : `/api/photos/${photo.id}`}
                      alt="Inspection"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !readOnly && (
                <div className="flex items-center justify-center h-14 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Image className="w-3.5 h-3.5" /> Aucune photo
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
