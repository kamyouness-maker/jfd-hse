export const DEMO_USER = {
  id: 1,
  username: 'demo_admin',
  full_name: 'Administrateur Démo',
  role: 'admin',
  company: 'OCP JFC2',
};

export const DEMO_TOURS = [
  {
    id: 'demo-tour-1',
    user_id: 1,
    title: 'Tournée Zone A',
    location: 'Atelier principal - Zone A',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    status: 'termine',
    notes: 'Inspection complète réalisée.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    user_name: 'Administrateur Démo',
  },
  {
    id: 'demo-tour-2',
    user_id: 1,
    title: 'Tournée Zone B',
    location: 'Atelier secondaire - Zone B',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: 'termine',
    notes: '',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    user_name: 'Administrateur Démo',
  },
  {
    id: 'demo-tour-3',
    user_id: 1,
    title: "Tournée du jour",
    location: 'Unité de production',
    date: new Date().toISOString().split('T')[0],
    status: 'en_cours',
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_name: 'Administrateur Démo',
  },
];

export const DEMO_DASHBOARD = {
  taux_conformite_global: 78,
  ecarts_ouverts: 5,
  plans_action_retard: 2,
  total_tournees: 3,
  conformite_par_section: [
    { section: 'Autorisation', taux: 90 },
    { section: 'Consignation', taux: 85 },
    { section: 'Hauteur', taux: 60 },
    { section: 'Espace confiné', taux: 80 },
    { section: 'Circulation', taux: 75 },
    { section: 'Mode opératoire', taux: 70 },
    { section: 'EPI', taux: 95 },
  ],
  evolution: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
    taux: Math.round(65 + Math.random() * 25),
  })),
  passeport_hse: [
    { entite: 'Entreprise Alpha', non_conformites: 8, dernier_ecart: '2026-05-15' },
    { entite: 'Entreprise Beta', non_conformites: 5, dernier_ecart: '2026-05-14' },
    { entite: 'Technicien Martin', non_conformites: 3, dernier_ecart: '2026-05-12' },
  ],
};

export const DEMO_USERS = [
  { id: 1, username: 'demo_admin', full_name: 'Administrateur Démo', role: 'admin', company: 'OCP JFC2', is_active: 1 },
  { id: 2, username: 'resp_hse', full_name: 'Ahmed Benali', role: 'responsable_hse', company: 'OCP JFC2', is_active: 1 },
  { id: 3, username: 'anim_ext', full_name: 'Karim Ouzine', role: 'animateur_hse', company: 'Entreprise Alpha', is_active: 1 },
];
