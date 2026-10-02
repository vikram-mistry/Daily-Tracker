import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2, LayoutGrid, Train
} from 'lucide-react';
import { firestore, auth } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const DB_NAME = 'TrackitProDB';
const DB_VERSION = 3;

class LocalDB {
  constructor() {
    this.db = null;
    this.isFallback = false;
    this.memoryStore = { 
      settings: [], milk: [], gas: []
    };
  }

  async init() {
    if (this.db || this.isFallback) return;
    return new Promise((resolve) => {
      let idb;
      try {
        idb = window.indexedDB;
      } catch (err) {
        console.warn('IndexedDB access blocked. Using memory fallback.');
        this.isFallback = true;
        return resolve();
      }

      if (!idb) {
        this.isFallback = true;
        return resolve();
      }

      try {
        const request = idb.open(DB_NAME, DB_VERSION);
        request.onerror = (e) => {
          this.isFallback = true;
          resolve();
        };
        request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          const stores = [
            'settings', 'milk', 'gas', 'water', 
            'grocery', 'electricity_lotus', 'electricity_sadri', 
            'water_bill', 'other_expenses', 'categories', 'custom',
            'maintenance'
          ];
          stores.forEach(store => {
            if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
          });
        };
      } catch (e) {
         this.isFallback = true;
         resolve();
      }
    });
  }

  async _localGet(storeName, key) {
    await this.init();
    if (this.isFallback) return this.memoryStore[storeName].find(item => item.id === key);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _localGetAll(storeName) {
    await this.init();
    if (this.isFallback) return [...this.memoryStore[storeName]];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _localPut(storeName, item) {
    await this.init();
    if (this.isFallback) {
      const index = this.memoryStore[storeName].findIndex(i => i.id === item.id);
      if (index > -1) this.memoryStore[storeName][index] = item;
      else this.memoryStore[storeName].push(item);
      return item;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _localDelete(storeName, key) {
    await this.init();
    if (this.isFallback) {
      this.memoryStore[storeName] = this.memoryStore[storeName].filter(item => item.id !== key);
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==== SYNC WRAPPERS ====
  async get(storeName, key) {
    return this._localGet(storeName, key);
  }

  async getAll(storeName) {
    return this._localGetAll(storeName);
  }

  async put(storeName, item) {
    const stamped = {
      ...item,
      updatedAt: item.updatedAt || Date.now()
    };
    await this._localPut(storeName, stamped);
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(firestore, `users/${user.uid}/${storeName}`, String(stamped.id)), stamped);
      } catch (e) { console.error("Firebase sync error on put", e); }
    }
    return stamped;
  }

  async delete(storeName, key) {
    await this._localDelete(storeName, key);
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(firestore, `users/${user.uid}/${storeName}`, String(key)));
      } catch (e) { console.error("Firebase sync error on delete", e); }
    }
  }

  async syncUpAndDown() {
    const user = auth.currentUser;
    if (!user) return;
    const stores = ['settings', 'milk', 'gas'];
    
    for (const store of stores) {
      try {
        const snap = await getDocs(collection(firestore, `users/${user.uid}/${store}`));
        const cloudDocs = snap.docs.map(d => d.data());
        const cloudMap = new Map();
        cloudDocs.forEach(item => {
          if (item && item.id != null) cloudMap.set(String(item.id), item);
        });

        const localItems = await this._localGetAll(store);
        const localMap = new Map();
        localItems.forEach(item => {
          if (item && item.id != null) localMap.set(String(item.id), item);
        });

        // 1. Sync Down: update local ONLY if cloud item has strictly newer updatedAt or local missing
        for (const [id, cloudItem] of cloudMap.entries()) {
          const localItem = localMap.get(id);
          if (!localItem) {
            await this._localPut(store, cloudItem);
            localMap.set(id, cloudItem);
          } else {
            const cloudTime = Number(cloudItem.updatedAt) || 0;
            const localTime = Number(localItem.updatedAt) || 0;
            if (cloudTime > localTime) {
              await this._localPut(store, cloudItem);
              localMap.set(id, cloudItem);
            }
          }
        }

        // 2. Sync Up: upload local items to cloud in batches if local is newer or cloud missing
        const toUpload = [];
        for (const [id, localItem] of localMap.entries()) {
          const cloudItem = cloudMap.get(id);
          if (!cloudItem) {
            toUpload.push(localItem);
          } else {
            const cloudTime = Number(cloudItem.updatedAt) || 0;
            const localTime = Number(localItem.updatedAt) || 0;
            if (localTime >= cloudTime) {
              toUpload.push(localItem);
            }
          }
        }

        if (toUpload.length > 0) {
          for (let i = 0; i < toUpload.length; i += 400) {
            const batch = writeBatch(firestore);
            const chunk = toUpload.slice(i, i + 400);
            chunk.forEach(item => {
              const ref = doc(firestore, `users/${user.uid}/${store}`, String(item.id));
              batch.set(ref, item);
            });
            await batch.commit();
          }
        }
      } catch (e) {
        console.error("Sync error for store:", store, e);
      }
    }
  }

  async clearAll() {
    await this.init();
    if (this.isFallback) {
      this.memoryStore = { 
        settings: [], milk: [], gas: []
      };
      return;
    }
    const stores = ['settings', 'milk', 'gas'];
    for (let store of stores) {
      await new Promise((resolve) => {
        const tx = this.db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = resolve;
      });
    }
  }

  async restoreBackup(data) {
    await this.init();
    const user = auth.currentUser;
    const stores = ['settings', 'milk', 'gas'];

    // 1. Clear local IndexedDB stores
    await this.clearAll();

    // 2. If logged in, clear cloud Firestore collections using batched deletes
    if (user) {
      for (const store of stores) {
        try {
          const snap = await getDocs(collection(firestore, `users/${user.uid}/${store}`));
          const docs = snap.docs;
          for (let i = 0; i < docs.length; i += 400) {
            const batch = writeBatch(firestore);
            const chunk = docs.slice(i, i + 400);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        } catch (e) {
          console.error("Error clearing cloud collection for restore:", store, e);
        }
      }
    }

    // 3. Put all restored items into local IndexedDB and Cloud Firestore in batches
    const now = Date.now();
    for (const store of stores) {
      if (data[store] && Array.isArray(data[store])) {
        const items = data[store].map(item => ({
          ...item,
          updatedAt: item.updatedAt || now
        }));

        for (const item of items) {
          await this._localPut(store, item);
        }

        if (user) {
          for (let i = 0; i < items.length; i += 400) {
            const batch = writeBatch(firestore);
            const chunk = items.slice(i, i + 400);
            chunk.forEach(item => {
              const ref = doc(firestore, `users/${user.uid}/${store}`, String(item.id));
              batch.set(ref, item);
            });
            await batch.commit();
          }
        }
      }
    }
  }
}

export const db = new LocalDB();

export const DEFAULT_SETTINGS = {
  id: 'main', theme: 'light', currency: '₹', 
  milkPrice: 84, milkQty: 1, gasWeight: 14.2,
  milkPriceHistory: [],
  milkQtyHistory: []
};

export function getEffectiveMilkPrice(dateStr, settings) {
  if (!settings) return 84;
  const history = settings.milkPriceHistory || [];
  if (!history.length) return Number(settings.milkPrice) || 84;
  
  const sorted = [...history]
    .filter(r => r && r.fromDate && r.price != null && !isNaN(Number(r.price)))
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    
  if (!sorted.length) return Number(settings.milkPrice) || 84;

  const applicable = sorted.filter(r => r.fromDate <= dateStr);
  if (applicable.length > 0) {
    return Number(applicable[applicable.length - 1].price);
  }
  
  return Number(sorted[0].price) || Number(settings.milkPrice) || 84;
}

export function getEffectiveMilkQty(dateStr, settings) {
  if (!settings) return 1;
  const history = settings.milkQtyHistory || [];
  if (!history.length) return Number(settings.milkQty) || 1;
  
  const sorted = [...history]
    .filter(r => r && r.fromDate && r.qty != null && !isNaN(Number(r.qty)))
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    
  if (!sorted.length) return Number(settings.milkQty) || 1;

  const applicable = sorted.filter(r => r.fromDate <= dateStr);
  if (applicable.length > 0) {
    return Number(applicable[applicable.length - 1].qty);
  }
  
  return Number(sorted[0].qty) || Number(settings.milkQty) || 1;
}

// Safeguarded: ONLY reconcile active entries on or after fromDate.
// Leaves custom quantity intact, only updates price and total for entries >= fromDate.
export async function reconcileMilkPriceFromDate(fromDate, newPrice, currentSettings) {
  if (!fromDate) return 0;
  const settings = currentSettings || (await db.get('settings', 'main')) || DEFAULT_SETTINGS;
  const allMilk = await db.getAll('milk');
  let updatedCount = 0;
  const now = Date.now();
  for (const entry of allMilk) {
    if (entry.isPaused) continue;
    if (entry.date >= fromDate) {
      const effectivePrice = getEffectiveMilkPrice(entry.date, settings);
      const currentQty = (entry.qty != null && !isNaN(Number(entry.qty)) && Number(entry.qty) > 0)
        ? Number(entry.qty)
        : getEffectiveMilkQty(entry.date, settings);
      const newTotal = Number((currentQty * effectivePrice).toFixed(2));
      if (Number(entry.price) !== effectivePrice || Number(entry.total) !== newTotal) {
        const updated = {
          ...entry,
          price: effectivePrice,
          qty: currentQty,
          total: newTotal,
          updatedAt: now
        };
        await db.put('milk', updated);
        updatedCount++;
      }
    }
  }
  return updatedCount;
}

// Safeguarded: ONLY reconcile active entries on or after fromDate.
// Leaves custom price intact, only updates quantity and total for entries >= fromDate.
export async function reconcileMilkQtyFromDate(fromDate, newQty, currentSettings) {
  if (!fromDate) return 0;
  const settings = currentSettings || (await db.get('settings', 'main')) || DEFAULT_SETTINGS;
  const allMilk = await db.getAll('milk');
  let updatedCount = 0;
  const now = Date.now();
  for (const entry of allMilk) {
    if (entry.isPaused) continue;
    if (entry.date >= fromDate) {
      const effectiveQty = getEffectiveMilkQty(entry.date, settings);
      const currentPrice = (entry.price != null && !isNaN(Number(entry.price)) && Number(entry.price) > 0)
        ? Number(entry.price)
        : getEffectiveMilkPrice(entry.date, settings);
      const newTotal = Number((effectiveQty * currentPrice).toFixed(2));
      if (Number(entry.qty) !== effectiveQty || Number(entry.total) !== newTotal) {
        const updated = {
          ...entry,
          qty: effectiveQty,
          price: currentPrice,
          total: newTotal,
          updatedAt: now
        };
        await db.put('milk', updated);
        updatedCount++;
      }
    }
  }
  return updatedCount;
}


