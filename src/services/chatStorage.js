// IndexedDB & Local Storage Service for DigiCrop Multi-Chat & Profiles
import { getUserProfileFromStorage, saveUserProfileToStorage } from '../screens/Settings';

const DB_NAME = 'digicrop_chat_db';
const DB_VERSION = 1;
const STORE_NAME = 'chats';

const PROFILES_KEY = 'digicrop_user_profiles';
const ACTIVE_PROFILE_KEY = 'digicrop_active_profile_id';
const SECTION_COLLAPSE_KEY_PREFIX = 'digicrop_section_collapsed_';

let dbInstance = null;

function getIDB() {
  if (typeof window !== 'undefined' && (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB)) {
    return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  }
  return null;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const idb = getIDB();
    if (!idb) {
      return reject(new Error('IndexedDB not supported in this environment.'));
    }
    if (dbInstance) {
      return resolve(dbInstance);
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('profileId', 'profileId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error || new Error('Could not open IndexedDB'));
    };
  });
}

// In-memory fallback if IndexedDB is completely unavailable
const memoryFallback = new Map();

// ----------------------------------------------------
// PROFILES SYSTEM
// ----------------------------------------------------
export function getProfiles() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(PROFILES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {}

  // Create default profile if none exists
  const existingSettingsProfile = getUserProfileFromStorage();
  const name = existingSettingsProfile?.displayName?.trim() || 'User';
  const defaultProfile = {
    id: 'profile_default',
    name: name,
    createdAt: Date.now(),
  };

  saveProfiles([defaultProfile]);
  setActiveProfileId('profile_default');
  return [defaultProfile];
}

export function saveProfiles(profilesList) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesList));
    }
  } catch (e) {}
}

export function getActiveProfileId() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const id = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (id) return id;
    }
  } catch (e) {}

  const profiles = getProfiles();
  return profiles[0]?.id || 'profile_default';
}

export function setActiveProfileId(id) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    }
  } catch (e) {}
  
  // Sync Settings display name to match active profile
  const activeProf = getProfiles().find(p => p.id === id);
  if (activeProf) {
    saveUserProfileToStorage({ displayName: activeProf.name });
  }
}

export function getActiveProfile() {
  const activeId = getActiveProfileId();
  const profiles = getProfiles();
  return profiles.find(p => p.id === activeId) || profiles[0];
}

export function createProfile(name) {
  const cleanName = (name || '').trim() || 'User';
  const profiles = getProfiles();
  const newProfile = {
    id: 'profile_' + Date.now() + Math.random().toString(36).substring(2, 6),
    name: cleanName,
    createdAt: Date.now(),
  };
  const updatedList = [...profiles, newProfile];
  saveProfiles(updatedList);
  setActiveProfileId(newProfile.id);
  return newProfile;
}

export function renameProfile(id, newName) {
  const cleanName = (newName || '').trim();
  if (!cleanName) return null;
  const profiles = getProfiles();
  const updated = profiles.map(p => (p.id === id ? { ...p, name: cleanName } : p));
  saveProfiles(updated);
  if (getActiveProfileId() === id) {
    saveUserProfileToStorage({ displayName: cleanName });
  }
  return updated.find(p => p.id === id);
}

export async function deleteProfile(id) {
  const profiles = getProfiles();
  if (profiles.length <= 1) {
    throw new Error('Cannot delete the last remaining profile.');
  }

  // Remove profile's chats
  await clearChatsForProfile(id);

  const updatedProfiles = profiles.filter(p => p.id !== id);
  saveProfiles(updatedProfiles);

  if (getActiveProfileId() === id) {
    setActiveProfileId(updatedProfiles[0].id);
  }

  return updatedProfiles[0];
}

// Section collapsed states per profile
export function getSectionCollapseState(profileId, sectionKey) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(`${SECTION_COLLAPSE_KEY_PREFIX}${profileId}_${sectionKey}`);
      if (stored !== null) return stored === 'true';
    }
  } catch (e) {}
  return false; // Default expanded
}

export function setSectionCollapseState(profileId, sectionKey, isCollapsed) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${SECTION_COLLAPSE_KEY_PREFIX}${profileId}_${sectionKey}`, String(isCollapsed));
    }
  } catch (e) {}
}

// ----------------------------------------------------
// CHATS SYSTEM (IndexedDB filtered by profileId)
// ----------------------------------------------------
export async function getAllChats(profileId) {
  const targetProfileId = profileId || getActiveProfileId();

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const chats = req.result || [];
          const filtered = chats.filter(c => (c.profileId || 'profile_default') === targetProfileId);
          filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          resolve(filtered);
        };
        req.onerror = () => {
          console.warn('Failed to getAll from IDB, using fallback');
          const fallbackList = Array.from(memoryFallback.values()).filter(c => (c.profileId || 'profile_default') === targetProfileId);
          fallbackList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          resolve(fallbackList);
        };
      } catch (err) {
        console.warn('IDB transaction error in getAllChats:', err);
        const fallbackList = Array.from(memoryFallback.values()).filter(c => (c.profileId || 'profile_default') === targetProfileId);
        fallbackList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(fallbackList);
      }
    });
  } catch (e) {
    const fallbackList = Array.from(memoryFallback.values()).filter(c => (c.profileId || 'profile_default') === targetProfileId);
    fallbackList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return fallbackList;
  }
}

export async function getChat(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(memoryFallback.get(id) || null);
      } catch (err) {
        resolve(memoryFallback.get(id) || null);
      }
    });
  } catch (e) {
    return memoryFallback.get(id) || null;
  }
}

export async function saveChat(chat) {
  if (!chat || !chat.id) return chat;
  const currentProfileId = chat.profileId || getActiveProfileId();

  const item = {
    ...chat,
    profileId: currentProfileId,
    isStarred: !!chat.isStarred,
    isPinned: !!chat.isPinned,
    updatedAt: chat.updatedAt || Date.now(),
    createdAt: chat.createdAt || Date.now(),
  };

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve(item);
        req.onerror = (evt) => {
          console.error('IDB put error:', evt.target.error);
          memoryFallback.set(item.id, item);
          resolve(item);
        };
      } catch (err) {
        memoryFallback.set(item.id, item);
        resolve(item);
      }
    });
  } catch (e) {
    memoryFallback.set(item.id, item);
    return item;
  }
}

export async function toggleStarChat(id) {
  const chat = await getChat(id);
  if (!chat) return null;
  const updated = { ...chat, isStarred: !chat.isStarred, updatedAt: Date.now() };
  await saveChat(updated);
  return updated;
}

export async function togglePinChat(id) {
  const chat = await getChat(id);
  if (!chat) return null;
  const updated = { ...chat, isPinned: !chat.isPinned, updatedAt: Date.now() };
  await saveChat(updated);
  return updated;
}

export async function deleteChat(id) {
  if (!id) return;
  memoryFallback.delete(id);
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

export async function clearChatsForProfile(profileId) {
  const targetId = profileId || getActiveProfileId();

  // Clear memory fallback items
  for (const [key, val] of memoryFallback.entries()) {
    if ((val.profileId || 'profile_default') === targetId) {
      memoryFallback.delete(key);
    }
  }

  try {
    const db = await openDB();
    const all = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const toDelete = all.filter(c => (c.profileId || 'profile_default') === targetId);

    if (toDelete.length > 0) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      toDelete.forEach(c => store.delete(c.id));
    }
    return true;
  } catch (e) {
    console.warn('Error clearing chats for profile:', e);
    return false;
  }
}

export async function clearAllChats() {
  const activeId = getActiveProfileId();
  return clearChatsForProfile(activeId);
}

// Migrate any chats previously stored without a profileId
export async function migrateFromLocalStorage() {
  try {
    const activeProfile = getActiveProfile();

    // 1. Ensure existing IDB chats have profileId
    const db = await openDB();
    const allChats = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (err) {
        resolve([]);
      }
    });

    let modified = false;
    for (const chat of allChats) {
      if (!chat.profileId) {
        chat.profileId = activeProfile.id;
        await saveChat(chat);
        modified = true;
      }
    }

    // 2. Legacy localStorage migration
    if (typeof window !== 'undefined' && window.localStorage) {
      const legacyKey = 'digicrop_legacy_chat_migrated';
      if (!window.localStorage.getItem(legacyKey)) {
        const savedConvsRaw = window.localStorage.getItem('digicrop_saved_conversations');
        if (savedConvsRaw) {
          try {
            const parsed = JSON.parse(savedConvsRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const item of parsed) {
                const id = 'migrated_' + (item.id || Date.now() + Math.random().toString(36).substring(2, 6));
                await saveChat({
                  id,
                  profileId: activeProfile.id,
                  title: (item.title || 'Migrated Conversation').slice(0, 40),
                  createdAt: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
                  updatedAt: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
                  messages: [
                    { text: item.title || 'Saved Question', sender: 'user' },
                    { text: item.desc || '', sender: 'bot', sources: ['Saved Notes'] }
                  ],
                  selectedDatasetIds: ['general'],
                });
              }
            }
          } catch (e) {
            console.warn('Migration error:', e);
          }
        }
        window.localStorage.setItem(legacyKey, 'true');
      }
    }
  } catch (e) {
    console.warn('Migration failed gracefully:', e);
  }
}
