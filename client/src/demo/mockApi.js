import { DEMO_USER, DEMO_TOURS, DEMO_DASHBOARD, DEMO_USERS } from './demoData';
import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'safecheck-demo';
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tours')) db.createObjectStore('tours', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('checklist_items')) db.createObjectStore('checklist_items', { keyPath: 'id' });
    },
  });
}

function ok(data) {
  return { data: { success: true, data } };
}

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export async function mockRequest(method, url, body) {
  await new Promise((r) => setTimeout(r, 150)); // simulate latency

  // Auth
  if (url.includes('/auth/login')) {
    return ok({ token: 'demo-token', user: DEMO_USER });
  }
  if (url.includes('/auth/me')) {
    return ok(DEMO_USER);
  }

  // Dashboard
  if (url.includes('/dashboard')) {
    return ok(DEMO_DASHBOARD);
  }

  // Users
  if (url.includes('/users') && method === 'GET') {
    return ok(DEMO_USERS);
  }

  // Tours
  if (url.match(/\/tours$/) && method === 'GET') {
    const db = await getDB();
    const localTours = await db.getAll('tours');
    const all = [...DEMO_TOURS, ...localTours].sort((a, b) => b.date.localeCompare(a.date));
    return ok(all);
  }

  if (url.match(/\/tours$/) && method === 'POST') {
    const db = await getDB();
    const newTour = { ...body, id: uuidv4(), user_id: 1, user_name: DEMO_USER.full_name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await db.put('tours', newTour);
    return ok(newTour);
  }

  const tourMatch = url.match(/\/tours\/([\w-]+)$/);
  if (tourMatch) {
    const id = tourMatch[1];
    if (method === 'GET') {
      const db = await getDB();
      const local = await db.get('tours', id);
      const demo = DEMO_TOURS.find((t) => t.id === id);
      return ok(local || demo || null);
    }
    if (method === 'PUT') {
      const db = await getDB();
      const existing = (await db.get('tours', id)) || DEMO_TOURS.find((t) => t.id === id) || {};
      const updated = { ...existing, ...body, id, updated_at: new Date().toISOString() };
      await db.put('tours', updated);
      return ok(updated);
    }
    if (method === 'DELETE') {
      const db = await getDB();
      await db.delete('tours', id);
      return ok({ id });
    }
  }

  // Checklist
  const checklistGet = url.match(/\/tours\/([\w-]+)\/checklist$/);
  if (checklistGet && method === 'GET') {
    const db = await getDB();
    const all = await db.getAll('checklist_items');
    return ok(all.filter((i) => i.tour_id === checklistGet[1]));
  }

  const checklistInit = url.match(/\/tours\/([\w-]+)\/checklist\/init/);
  if (checklistInit && method === 'POST') {
    return ok([]);
  }

  if (url.includes('/checklist/') && method === 'PUT') {
    const db = await getDB();
    const id = url.split('/checklist/')[1];
    const existing = (await db.get('checklist_items', id)) || {};
    const updated = { ...existing, ...body, id, updated_at: new Date().toISOString() };
    await db.put('checklist_items', updated);
    return ok(updated);
  }

  // Photos — not supported in demo
  if (url.includes('/photos')) {
    return ok({ id: uuidv4(), url: null });
  }

  // Reports — not available in demo
  if (url.includes('/reports')) {
    throw new Error('PDF non disponible en mode démo. Installez le serveur pour générer les rapports.');
  }

  // Sync — no-op
  if (url.includes('/sync')) {
    return ok({ synced: 0 });
  }

  return ok(null);
}
