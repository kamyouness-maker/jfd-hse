import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, AlertTriangle, Clock, CheckCircle2,
  Users, RefreshCw, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const SECTION_LABELS = {
  autorisation: 'Autorisation',
  consignation: 'Consignation',
  hauteur: 'Hauteur',
  espace_confine: 'Espace confiné',
  circulation: 'Circulation',
  mode_operatoire: 'Mode opér.',
  epi: 'EPI',
  acces: 'Accès',
  soudage: 'Soudage',
  extinction: 'Extinction',
  levage: 'Levage',
  pression: 'Pression',
  engins: 'Engins',
  outillage: 'Outillage',
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function getBarColor(taux) {
  if (taux >= 80) return '#2d9e2d';
  if (taux >= 60) return '#f59e0b';
  return '#ef4444';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.get();
      setData(res.data.data);
    } catch {
      toast.error('Erreur chargement tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data) return null;

  const evolutionData = data.evolution.filter(e => e.taux !== null);
  const sectionData = data.conformite_par_section.map(s => ({
    ...s,
    name: SECTION_LABELS[s.section] || s.section,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm">Vue d'ensemble des inspections HSE</p>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Taux de conformité global"
          value={`${data.taux_conformite_global}%`}
          color="bg-primary-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Écarts ouverts"
          value={data.ecarts_ouverts}
          sub="Non-conformités sans plan"
          color="bg-orange-500"
        />
        <StatCard
          icon={Clock}
          label="Plans d'action en retard"
          value={data.plans_action_retard}
          sub="Échéances dépassées"
          color="bg-red-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Score sections"
          value={sectionData.length}
          sub="Sections évaluées"
          color="bg-blue-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conformity by section */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conformité par section</h2>
          {sectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectionData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} unit="%" />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Conformité']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="taux" radius={[4, 4, 0, 0]}>
                  {sectionData.map((entry, idx) => (
                    <Cell key={idx} fill={getBarColor(entry.taux)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Evolution over 30 days */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution (30 derniers jours)</h2>
          {evolutionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolutionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  tickFormatter={(d) => d.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} unit="%" />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Conformité']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="taux"
                  stroke="#1a7a1a"
                  strokeWidth={2}
                  dot={{ fill: '#1a7a1a', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Aucune donnée sur les 30 derniers jours
            </div>
          )}
        </div>
      </div>

      {/* Passeport HSE (admin/responsable only) */}
      {['admin', 'responsable_hse'].includes(user?.role) && data.passeport_hse && data.passeport_hse.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Passeport HSE — Non-conformités récurrentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <th className="text-left px-4 py-2 rounded-tl-lg">Inspecteur</th>
                  <th className="text-left px-4 py-2">Entreprise</th>
                  <th className="text-right px-4 py-2 rounded-tr-lg">Non-conformités</th>
                </tr>
              </thead>
              <tbody>
                {data.passeport_hse.map((entry, idx) => (
                  <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.company || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-xs">
                        {entry.nc_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
