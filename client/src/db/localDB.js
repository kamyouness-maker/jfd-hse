import { openDB } from 'idb';

const DB_NAME = 'safecheck-ocp';
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tours store
        if (!db.objectStoreNames.contains('tours')) {
          const toursStore = db.createObjectStore('tours', { keyPath: 'id' });
          toursStore.createIndex('user_id', 'user_id');
          toursStore.createIndex('pendingSync', 'pendingSync');
        }

        // Checklist items store
        if (!db.objectStoreNames.contains('checklist_items')) {
          const checklistStore = db.createObjectStore('checklist_items', { keyPath: 'id' });
          checklistStore.createIndex('tour_id', 'tour_id');
          checklistStore.createIndex('pendingSync', 'pendingSync');
        }

        // Photos store (base64)
        if (!db.objectStoreNames.contains('photos')) {
          const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
          photosStore.createIndex('checklist_item_id', 'checklist_item_id');
          photosStore.createIndex('pendingSync', 'pendingSync');
        }

        // Pending sync queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// Tours
export async function saveTourLocal(tour) {
  const db = await getDB();
  await db.put('tours', { ...tour, pendingSync: tour.pendingSync !== false });
}

export async function getTourLocal(id) {
  const db = await getDB();
  return db.get('tours', id);
}

export async function getAllToursLocal() {
  const db = await getDB();
  const all = await db.getAll('tours');
  return all.filter(t => !t.deleted);
}

export async function deleteTourLocal(id) {
  const db = await getDB();
  const tour = await db.get('tours', id);
  if (tour) {
    await db.put('tours', { ...tour, deleted: 1, pendingSync: true, updated_at: new Date().toISOString() });
  }
}

// Checklist items
export async function saveChecklistItemLocal(item) {
  const db = await getDB();
  await db.put('checklist_items', { ...item, pendingSync: item.pendingSync !== false });
}

export async function getChecklistItemsForTour(tourId) {
  const db = await getDB();
  return db.getAllFromIndex('checklist_items', 'tour_id', tourId);
}

export async function getChecklistItemLocal(id) {
  const db = await getDB();
  return db.get('checklist_items', id);
}

// Photos
export async function savePhotoLocal(photo) {
  const db = await getDB();
  await db.put('photos', { ...photo, pendingSync: photo.pendingSync !== false });
}

export async function getPhotosForItem(checklistItemId) {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'checklist_item_id', checklistItemId);
}

export async function deletePhotoLocal(id) {
  const db = await getDB();
  await db.delete('photos', id);
}

// Get all pending sync items
export async function getPendingChanges() {
  const db = await getDB();
  const [tours, checklistItems, photos] = await Promise.all([
    db.getAllFromIndex('tours', 'pendingSync', 1),
    db.getAllFromIndex('checklist_items', 'pendingSync', 1),
    db.getAllFromIndex('photos', 'pendingSync', 1),
  ]);
  return { tours, checklistItems, photos };
}

// Mark items as synced
export async function markAsSynced(type, ids) {
  const db = await getDB();
  const tx = db.transaction(type, 'readwrite');
  for (const id of ids) {
    const item = await tx.store.get(id);
    if (item) {
      await tx.store.put({ ...item, pendingSync: 0 });
    }
  }
  await tx.done;
}

export async function getPendingCount() {
  const { tours, checklistItems, photos } = await getPendingChanges();
  return tours.length + checklistItems.length + photos.length;
}
