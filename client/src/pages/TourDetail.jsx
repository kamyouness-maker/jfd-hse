import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toursApi, reportsApi } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import {
  ArrowLeft, ClipboardList, FileText, Download, Edit3,
  Save, X, Loader2, Calendar, MapPin, User, StickyNote
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TourDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await toursApi.getOne(id);
        setTour(res.data.data);
        setEditForm(res.data.data);
      } catch {
        toast.error('Tournée introuvable');
        navigate('/tours');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await toursApi.update(id, {
        title: editForm.title,
        location: editForm.location,
        date: editForm.date,
        status: editForm.status,
        notes: editForm.notes,
      });
      setTour(res.data.data);
      setEditing(false);
      toast.success('Tournée mise à jour');
    } catch {
      toast.error('Erreur mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await reportsApi.tourPdf(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-tournee-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur génération PDF');
    } finally {
      setDownloading(false);
    }
  };

  const canEdit = () => {
    if (!tour) return false;
    if (user?.role === 'admin') return true;
    if (user?.role === 'responsable_hse') return true;
    if (user?.role === 'animateur_hse') return tour.user_id === user.id;
    return false;
  };

  const allowedChecklists = () => {
    // animateur_hse can access both checklist types
    return [
      { type: 'standards_hse', label: 'Standards HSE', icon: '📋' },
      { type: 'equipements', label: 'Équipements', icon: '🔧' },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!tour) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tours')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {tour.title || `Tournée du ${tour.date}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={tour.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit() && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Modifier
            </button>
          )}
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Tour info card */}
      <div className="card">
        {editing ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Modifier la tournée</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Titre</label>
                <input type="text" className="input" value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Lieu</label>
                <input type="text" className="input" value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={editForm.date || ''} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Statut</label>
                <select className="input" value={editForm.status || 'en_cours'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={3} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEditing(false); setEditForm(tour); }} className="btn-secondary flex items-center gap-1.5">
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">Informations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <span>Date: <strong className="text-gray-900">{tour.date}</strong></span>
              </div>
              {tour.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>Lieu: <strong className="text-gray-900">{tour.location}</strong></span>
                </div>
              )}
              {tour.user_full_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>Responsable: <strong className="text-gray-900">{tour.user_full_name}</strong></span>
                </div>
              )}
            </div>
            {tour.notes && (
              <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                <StickyNote className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap">{tour.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checklist links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Checklists</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allowedChecklists().map(({ type, label, icon }) => (
            <Link
              key={type}
              to={`/tours/${id}/checklist/${type}`}
              className="card flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="text-3xl">{icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{label}</h3>
                <p className="text-sm text-gray-500">
                  {type === 'standards_hse' ? '7 sections · 36 éléments' : '7 sections · 35 éléments'}
                </p>
              </div>
              <ClipboardList className="w-5 h-5 text-primary-600" />
            </Link>
          ))}
        </div>
      </div>

      {/* PDF download */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Rapport PDF</h3>
              <p className="text-sm text-gray-600">Générer le rapport complet de la tournée</p>
            </div>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn-primary flex items-center gap-2"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Télécharger
          </button>
        </div>
      </div>
    </div>
  );
}
