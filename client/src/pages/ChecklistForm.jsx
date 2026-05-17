import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checklistApi, isOnline } from '../api/client';
import { getChecklistItemsForTour, saveChecklistItemLocal, markAsSynced } from '../db/localDB';
import DEFINITIONS, { ROLE_SECTION_ACCESS } from '../checklistDefinitions';
import ChecklistItem from '../components/ChecklistItem';
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChecklistForm() {
  const { id: tourId, type } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState({});   // { sectionKey: { itemId: item } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const pendingChanges = useRef({});
  const saveTimeout = useRef(null);

  const definition = DEFINITIONS[type];
  const allowedSections = ROLE_SECTION_ACCESS[user?.role]?.[type] ?? null;

  const sectionsToShow = definition
    ? Object.entries(definition.sections).filter(
        ([key]) => !allowedSections || allowedSections.includes(key)
      )
    : [];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let serverItems = [];
        try {
          await checklistApi.init(tourId, type);
          const res = await checklistApi.getForTour(tourId);
          serverItems = (res.data.data || []).filter(i => i.checklist_type === type);
          for (const item of serverItems) {
            await saveChecklistItemLocal({ ...item, pendingSync: 0 });
          }
        } catch {
          // Offline: load from IndexedDB
          const localItems = await getChecklistItemsForTour(tourId);
          serverItems = localItems.filter(i => i.checklist_type === type);

          // Generate from definition if empty
          if (serverItems.length === 0 && definition) {
            const { v4: uuidv4 } = await import('uuid');
            const now = new Date().toISOString();
            for (const [sectionKey, section] of Object.entries(definition.sections)) {
              for (const itemDef of section.items) {
                const newItem = {
                  id: uuidv4(), tour_id: tourId, checklist_type: type,
                  section: sectionKey,
                  item_key: itemDef.key, item_label: itemDef.label,
                  criticite: itemDef.criticite || null, poids: itemDef.poids || null,
                  sous_section: itemDef.sous_section || null, numero: itemDef.numero || null,
                  statut: null, observation: null, action_plan: null,
                  action_deadline: null, action_responsible: null, corrige_sur_place: 0,
                  photos: [], created_at: now, updated_at: now, pendingSync: 1,
                };
                await saveChecklistItemLocal(newItem);
                serverItems.push(newItem);
              }
            }
          }
        }

        // Group by section → { sectionKey: { id: item } }
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
    setItems(prev => ({
      ...prev,
      [updatedItem.section]: { ...prev[updatedItem.section], [updatedItem.id]: updatedItem },
    }));
    const now = new Date().toISOString();
    const toSave = { ...updatedItem, updated_at: now, pendingSync: 1 };
    await saveChecklistItemLocal(toSave);
    pendingChanges.current[updatedItem.id] = toSave;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      if (!isOnline()) return;
      for (const item of Object.values(pendingChanges.current)) {
        try {
          await checklistApi.update(item.id, {
            statut: item.statut, observation: item.observation,
            action_plan: item.action_plan, action_deadline: item.action_deadline,
            action_responsible: item.action_responsible,
            corrige_sur_place: item.corrige_sur_place,
          });
          await markAsSynced('checklist_items', [item.id]);
          delete pendingChanges.current[item.id];
        } catch { /* retry later */ }
      }
    }, 1500);
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    const allItems = Object.values(items).flatMap(s => Object.values(s));
    let saved = 0, errors = 0;
    for (const item of allItems) {
      try {
        await checklistApi.update(item.id, {
          statut: item.statut, observation: item.observation,
          action_plan: item.action_plan, action_deadline: item.action_deadline,
          action_responsible: item.action_responsible,
          corrige_sur_place: item.corrige_sur_place,
        });
        await markAsSynced('checklist_items', [item.id]);
        saved++;
      } catch { errors++; }
    }
    setSaving(false);
    errors === 0 ? toast.success(`${saved} élément(s) enregistré(s)`) : toast.error(`${errors} erreur(s) de sauvegarde`);
  };

  const getStats = () => {
    const all = Object.values(items).flatMap(s => Object.values(s));
    const evaluated = all.filter(i => i.statut && i.statut !== 'na');
    const conforme = all.filter(i => i.statut === 'conforme');
    const nonConforme = all.filter(i => i.statut === 'non_conforme');
    const taux = evaluated.length > 0 ? Math.round((conforme.length / evaluated.length) * 100) : 0;
    return { total: all.length, evaluated: evaluated.length, conforme: conforme.length, nonConforme: nonConforme.length, taux };
  };

  // Group items within a section by sous_section, preserving definition order
  const groupBySousSection = (sectionKey, sectionDef) => {
    const sectionItemsMap = items[sectionKey] || {};
    const groups = [];
    let currentSS = undefined;
    let currentGroup = null;

    for (const itemDef of sectionDef.items) {
      const ss = itemDef.sous_section || null;
      if (ss !== currentSS) {
        currentSS = ss;
        currentGroup = { label: ss, items: [] };
        groups.push(currentGroup);
      }
      // Find matching item in state (by item_key)
      const match = Object.values(sectionItemsMap).find(i => i.item_key === itemDef.key);
      if (match) currentGroup.items.push(match);
    }
    return groups;
  };

  if (!definition) {
    return <div className="card text-center py-12"><p className="text-gray-500">Type de checklist invalide : {type}</p></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
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
          <p className="text-sm text-gray-500">{sectionsToShow.length} sections · {stats.total} items</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving || !isOnline()}
          className="btn-primary flex items-center gap-1.5 text-sm"
          title={!isOnline() ? 'Hors ligne — sauvegarde locale automatique' : 'Tout sauvegarder'}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden sm:inline">Enregistrer</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="card">
        <div className="flex flex-wrap gap-4 text-sm mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <span className="text-gray-600">Conformité : <strong className="text-gray-900">{stats.taux}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">Conformes : <strong>{stats.conforme}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-gray-600">Non conformes : <strong>{stats.nonConforme}</strong></span>
          </div>
          <span className="text-gray-400">{stats.evaluated}/{stats.total} évalués</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all" style={{ width: `${stats.taux}%` }} />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sectionsToShow.map(([sectionKey, sectionDef]) => {
          const sectionItems = Object.values(items[sectionKey] || {});
          const evaluated = sectionItems.filter(i => i.statut && i.statut !== 'na');
          const conformes = sectionItems.filter(i => i.statut === 'conforme');
          const sectionTaux = evaluated.length > 0 ? Math.round((conformes.length / evaluated.length) * 100) : null;
          const isCollapsed = collapsed[sectionKey];
          const groups = groupBySousSection(sectionKey, sectionDef);

          return (
            <div key={sectionKey} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                className="w-full flex items-center gap-3 px-4 py-3 bg-primary-50 hover:bg-primary-100 transition-colors text-left"
              >
                <div className="flex-1">
                  <h2 className="font-semibold text-primary-800">{sectionDef.label}</h2>
                  <p className="text-xs text-primary-600">{sectionItems.length} éléments</p>
                </div>
                {sectionTaux !== null && (
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    sectionTaux >= 80 ? 'bg-green-100 text-green-700' :
                    sectionTaux >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                  }`}>
                    {sectionTaux}%
                  </span>
                )}
                {isCollapsed ? <ChevronDown className="w-5 h-5 text-primary-600 flex-shrink-0" /> : <ChevronUp className="w-5 h-5 text-primary-600 flex-shrink-0" />}
              </button>

              {!isCollapsed && (
                <div className="p-4 space-y-4">
                  {groups.length > 0 ? (
                    groups.map((group, gi) => (
                      <div key={gi}>
                        {group.label && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-px flex-1 bg-gray-200" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2">
                              {group.label}
                            </span>
                            <div className="h-px flex-1 bg-gray-200" />
                          </div>
                        )}
                        <div className="space-y-2">
                          {group.items.length > 0 ? (
                            group.items.map(item => (
                              <ChecklistItem key={item.id} item={item} onChange={handleItemChange} />
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 text-center py-2">Aucun élément</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun élément dans cette section</p>
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
