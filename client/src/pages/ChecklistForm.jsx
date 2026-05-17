import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checklistApi, isOnline } from '../api/client';
import {
  getChecklistItemsForTour, saveChecklistItemLocal,
  markAsSynced
} from '../db/localDB';
import checklistDefinitions, { ROLE_SECTION_ACCESS } from '../checklistDefinitions';
import ChecklistItem from '../components/ChecklistItem';
import {
  ArrowLeft, Save, CheckCircle2, AlertTriangle,
  Loader2, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChecklistForm() {
  const { id: tourId, type } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const pendingChanges = useRef({});
  const saveTimeout = useRef(null);

  const definition = checklistDefinitions[type];
  const allowedSections = ROLE_SECTION_ACCESS[user?.role]?.[type] || null;

  const sectionsToShow = definition ? Object.entries(definition.sections).filter(
    ([key]) => !allowedSections || allowedSections.includes(key)
  ) : [];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Try to init from server
        let serverItems = [];
        try {
          const initRes = await checklistApi.init(tourId, type);
          serverItems = initRes.data.data;
          // Fetch full items with photos
          const fetchRes = await checklistApi.getForTour(tourId);
          serverItems = fetchRes.data.data.filter(i => i.checklist_type === type);

          // Save to local
          for (const item of serverItems) {
            await saveChecklistItemLocal({ ...item, pendingSync: 0 });
          }
        } catch {
          // Offline: load from local
          const localItems = await getChecklistItemsForTour(tourId);
          serverItems = localItems.filter(i => i.checklist_type === type);

          // If no local items, create from definition
          if (serverItems.length === 0 && definition) {
            const { v4: uuidv4 } = await import('uuid');
            for (const [sectionKey, section] of Object.entries(definition.sections)) {
              for (const [itemKey, itemLabel] of Object.entries(section.items)) {
                const newItem = {
                  id: uuidv4(),
                  tour_id: tourId,
                  checklist_type: type,
                  section: sectionKey,
                  item_key: itemKey,
                  item_label: itemLabel,
                  statut: null,
                  observation: null,
                  action_plan: null,
                  action_deadline: null,
                  action_responsible: null,
                  photos: [],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  pendingSync: 1,
                };
                await saveChecklistItemLocal(newItem);
                serverItems.push(newItem);
              }
            }
          }
        }

        // Group by section
        const grouped = {};
        for (const item of serverItems) {
          if (!grouped[item.section]) grouped[item.section] = {};
          grouped[item.section][item.id] = { ...item, photos: item.photos || [] };
        }
        setItems(grouped);
      } catch (err) {
        console.error('Checklist init error:', err);
        toast.error('Erreur chargement checklist');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [tourId, type]);

  const handleItemChange = useCallback(async (updatedItem) => {
    // Optimistic update
    setItems(prev => ({
      ...prev,
      [updatedItem.section]: {
        ...prev[updatedItem.section],
        [updatedItem.id]: updatedItem,
      },
    }));

    // Save to local immediately
    const now = new Date().toISOString();
    const itemToSave = { ...updatedItem, updated_at: now, pendingSync: 1 };
    await saveChecklistItemLocal(itemToSave);

    // Track pending change
    pendingChanges.current[updatedItem.id] = itemToSave;

    // Debounced server save
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const toSync = Object.values(pendingChanges.current);
      if (toSync.length === 0 || !isOnline()) return;

      for (const item of toSync) {
        try {
          await checklistApi.update(item.id, {
            statut: item.statut,
            observation: item.observation,
            action_plan: item.action_plan,
            action_deadline: item.action_deadline,
            action_responsible: item.action_responsible,
          });
          await markAsSynced('checklist_items', [item.id]);
          delete pendingChanges.current[item.id];
        } catch {
          // Will sync later
        }
      }
    }, 1500);
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    const allItems = Object.values(items).flatMap(section => Object.values(section));
    let saved = 0;
    const errors = [];

    for (const item of allItems) {
      try {
        await checklistApi.update(item.id, {
          statut: item.statut,
          observation: item.observation,
          action_plan: item.action_plan,
          action_deadline: item.action_deadline,
          action_responsible: item.action_responsible,
        });
        await markAsSynced('checklist_items', [item.id]);
        saved++;
      } catch {
        errors.push(item.id);
      }
    }

    setSaving(false);
    if (errors.length === 0) {
      toast.success(`${saved} élément(s) enregistré(s)`);
    } else {
      toast.error(`${errors.length} erreur(s) de sauvegarde`);
    }
  };

  const getStats = () => {
    const allItems = Object.values(items).flatMap(section => Object.values(section));
    const total = allItems.length;
    const evaluated = allItems.filter(i => i.statut && i.statut !== 'na').length;
    const conforme = allItems.filter(i => i.statut === 'conforme').length;
    const nonConforme = allItems.filter(i => i.statut === 'non_conforme').length;
    const taux = evaluated > 0 ? Math.round((conforme / evaluated) * 100) : 0;
    return { total, evaluated, conforme, nonConforme, taux };
  };

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!definition) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Type de checklist invalide: {type}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/tours/${tourId}`)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{definition.label}</h1>
          <p className="text-sm text-gray-500">{sectionsToShow.length} sections</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving || !isOnline()}
          className="btn-primary flex items-center gap-1.5 text-sm"
          title={!isOnline() ? 'Hors ligne — sauvegarde automatique' : 'Tout sauvegarder'}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Enregistrer</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="card">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <span className="text-gray-600">Conformité: <strong className="text-gray-900">{stats.taux}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">Conformes: <strong>{stats.conforme}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-gray-600">Non conformes: <strong>{stats.nonConforme}</strong></span>
          </div>
          <div className="text-gray-400">{stats.evaluated}/{stats.total} évalués</div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${stats.taux}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sectionsToShow.map(([sectionKey, section]) => {
          const sectionItems = items[sectionKey] ? Object.values(items[sectionKey]) : [];
          const sectionEvaluated = sectionItems.filter(i => i.statut && i.statut !== 'na');
          const sectionConforme = sectionItems.filter(i => i.statut === 'conforme');
          const sectionTaux = sectionEvaluated.length > 0
            ? Math.round((sectionConforme.length / sectionEvaluated.length) * 100)
            : null;
          const collapsed = collapsedSections[sectionKey];

          return (
            <div key={sectionKey} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(sectionKey)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-primary-50 hover:bg-primary-100 transition-colors text-left"
              >
                <div className="flex-1">
                  <h2 className="font-semibold text-primary-800">{section.label}</h2>
                  <p className="text-xs text-primary-600">{sectionItems.length} éléments</p>
                </div>
                {sectionTaux !== null && (
                  <div className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    sectionTaux >= 80 ? 'bg-green-100 text-green-700' :
                    sectionTaux >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {sectionTaux}%
                  </div>
                )}
                {collapsed ? (
                  <ChevronDown className="w-5 h-5 text-primary-600 flex-shrink-0" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-primary-600 flex-shrink-0" />
                )}
              </button>

              {/* Section items */}
              {!collapsed && (
                <div className="p-4 space-y-3">
                  {sectionItems.length > 0 ? (
                    sectionItems
                      .sort((a, b) => a.item_key.localeCompare(b.item_key))
                      .map(item => (
                        <ChecklistItem
                          key={item.id}
                          item={item}
                          onChange={handleItemChange}
                        />
                      ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Aucun élément dans cette section
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
