import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toursApi } from '../api/client';
import { getAllToursLocal, saveTourLocal } from '../db/localDB';
import StatusBadge from '../components/StatusBadge';
import { Plus, MapPin, Calendar, User, ChevronRight, Loader2, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

function NewTourModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) { toast.error('Date requise'); return; }
    setLoading(true);
    const id = uuidv4();
    const tourData = { ...form, id, status: 'en_cours' };
    try {
      const res = await toursApi.create(tourData);
      await saveTourLocal({ ...res.data.data, pendingSync: false });
      onCreate(res.data.data);
      toast.success('Tournée créée');
      onClose();
    } catch {
      // Offline fallback
      const localTour = {
        ...tourData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pendingSync: true,
        deleted: 0,
      };
      await saveTourLocal(localTour);
      onCreate(localTour);
      toast.success('Tournée créée localement');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Nouvelle tournée</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Titre (optionnel)</label>
            <input
              type="text"
              className="input"
              value={form.title}
              onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Tournée inspection chantier A"
            />
          </div>
          <div>
            <label className="label">Lieu</label>
            <input
              type="text"
              className="input"
              value={form.location}
              onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="Secteur, zone..."
            />
          </div>
          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Observations générales..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tours() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const res = await toursApi.getAll();
      setTours(res.data.data);
    } catch {
      // Offline fallback
      const local = await getAllToursLocal();
      setTours(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTours(); }, []);

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Supprimer cette tournée ?')) return;
    setDeleting(id);
    try {
      await toursApi.delete(id);
      setTours(prev => prev.filter(t => t.id !== id));
      toast.success('Tournée supprimée');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur suppression');
    } finally {
      setDeleting(null);
    }
  };

  const canDelete = (tour) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'responsable_hse') return tour.user_id === user.id || !tour.user_id;
    return false;
  };

  const filtered = tours.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.title || '').toLowerCase().includes(q) ||
      (t.location || '').toLowerCase().includes(q) ||
      (t.user_full_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournées</h1>
          <p className="text-gray-500 text-sm">Gestion des tournées d'inspection</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle tournée</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Rechercher une tournée..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {search ? 'Aucune tournée trouvée' : 'Aucune tournée. Créez votre première tournée.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tour) => (
            <Link
              key={tour.id}
              to={`/tours/${tour.id}`}
              className="card flex items-center gap-4 hover:shadow-md transition-all hover:border-primary-200 block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {tour.title || `Tournée du ${tour.date}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {tour.date}
                      </span>
                      {tour.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {tour.location}
                        </span>
                      )}
                      {tour.user_full_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {tour.user_full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={tour.status} />
                    {canDelete(tour) && (
                      <button
                        onClick={(e) => handleDelete(tour.id, e)}
                        disabled={deleting === tour.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        {deleting === tour.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <NewTourModal
          onClose={() => setShowModal(false)}
          onCreate={(tour) => setTours(prev => [tour, ...prev])}
        />
      )}
    </div>
  );
}
