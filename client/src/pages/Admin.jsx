import React, { useEffect, useState } from 'react';
import { usersApi } from '../api/client';
import checklistDefinitions from '../checklistDefinitions';
import {
  Users, Plus, Edit3, Trash2, Shield, ClipboardList,
  ChevronDown, ChevronUp, Loader2, Check, X, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  admin: 'Administrateur',
  responsable_hse: 'Responsable HSE',
  animateur_hse: 'Animateur HSE',
};

function UserModal({ user: editUser, onClose, onSave }) {
  const [form, setForm] = useState(
    editUser || { username: '', password: '', full_name: '', role: 'animateur_hse', company: '', is_active: true }
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.role) { toast.error('Champs requis'); return; }
    if (!editUser && (!form.username || !form.password)) { toast.error('Identifiants requis'); return; }
    setLoading(true);
    try {
      let result;
      if (editUser) {
        const updates = { full_name: form.full_name, role: form.role, company: form.company, is_active: form.is_active };
        if (form.password) updates.password = form.password;
        result = await usersApi.update(editUser.id, updates);
      } else {
        result = await usersApi.create(form);
      }
      onSave(result.data.data);
      toast.success(editUser ? 'Utilisateur modifié' : 'Utilisateur créé');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{editUser ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!editUser && (
            <div>
              <label className="label">Nom d'utilisateur *</label>
              <input type="text" className="input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
            </div>
          )}
          <div>
            <label className="label">Nom complet *</label>
            <input type="text" className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">{editUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                value={form.password || ''}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required={!editUser}
                minLength={editUser ? 0 : 6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Rôle *</label>
            <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Entreprise</label>
            <input type="text" className="input" value={form.company || ''} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
          </div>
          {editUser && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 text-primary-600"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Actif</label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editUser ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [expandedDef, setExpandedDef] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await usersApi.getAll();
        setUsers(res.data.data);
      } catch {
        toast.error('Erreur chargement utilisateurs');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    setDeleting(id);
    try {
      await usersApi.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('Utilisateur supprimé');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleSave = (user) => {
    if (editUser) {
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    } else {
      setUsers(prev => [...prev, user]);
    }
  };

  const roleColor = {
    admin: 'bg-purple-100 text-purple-700',
    responsable_hse: 'bg-blue-100 text-blue-700',
    animateur_hse: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm">Gestion des utilisateurs et des templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'checklists', label: 'Templates Checklist', icon: ClipboardList },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditUser(null); setShowModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvel utilisateur
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Utilisateur</th>
                      <th className="text-left px-4 py-3">Rôle</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Entreprise</th>
                      <th className="text-left px-4 py-3">Statut</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{u.full_name}</div>
                          <div className="text-xs text-gray-500">@{u.username}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColor[u.role]}`}>
                            {ROLE_LABELS[u.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{u.company || '—'}</td>
                        <td className="px-4 py-3">
                          {u.is_active ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <Check className="w-3 h-3" />
                              Actif
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <X className="w-3 h-3" />
                              Inactif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditUser(u); setShowModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={deleting === u.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              {deleting === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checklists tab */}
      {activeTab === 'checklists' && (
        <div className="space-y-4">
          {Object.entries(checklistDefinitions).map(([typeKey, def]) => (
            <div key={typeKey} className="card">
              <button
                onClick={() => setExpandedDef(expandedDef === typeKey ? null : typeKey)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <ClipboardList className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{def.label}</h3>
                    <p className="text-xs text-gray-500">{Object.keys(def.sections).length} sections</p>
                  </div>
                </div>
                {expandedDef === typeKey ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedDef === typeKey && (
                <div className="mt-4 space-y-3">
                  {Object.entries(def.sections).map(([sectionKey, section]) => (
                    <div key={sectionKey} className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="bg-primary-50 px-4 py-2">
                        <h4 className="font-medium text-primary-800 text-sm">{section.label}</h4>
                        <p className="text-xs text-primary-600">{Object.keys(section.items).length} éléments</p>
                      </div>
                      <ul className="divide-y divide-gray-100">
                        {Object.entries(section.items).map(([itemKey, itemLabel]) => (
                          <li key={itemKey} className="px-4 py-2 flex items-center gap-2 text-sm">
                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{itemKey}</span>
                            <span className="text-gray-700">{itemLabel}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
