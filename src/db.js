import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2, LayoutGrid, Train
} from 'lucide-react';
import { firestore, auth } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

const DB_NAME = 'TrackitProDB';
const DB_VERSION = 3;

class LocalDB {
  constructor() {
    this.db = null;
    this.isFallback = false;
    this.memoryStore = { 
      settings: [], milk: [], gas: [], water: [], 
      grocery: [], electricity_lotus: [], electricity_sadri: [], 
      water_bill: [], other_expenses: [], categories: [], custom: [],
      maintenance: []
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
    await this._localPut(storeName, item);
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(firestore, `users/${user.uid}/${storeName}`, String(item.id)), item);
      } catch (e) { console.error("Firebase sync error on put", e); }
    }
    return item;
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
    const stores = [
      'settings', 'milk', 'gas', 'water', 
      'grocery', 'electricity_lotus', 'electricity_sadri', 
      'water_bill', 'other_expenses', 'categories', 'custom',
      'maintenance'
    ];
    
    // 1. Sync Down from Cloud
    for (let store of stores) {
      try {
        const snap = await getDocs(collection(firestore, `users/${user.uid}/${store}`));
        const cloudDocs = snap.docs.map(d => d.data());
        for (let item of cloudDocs) {
          await this._localPut(store, item);
        }
      } catch(e) { console.error("Sync down error", e); }
    }

    // 2. Sync Up to Cloud
    for (let store of stores) {
      try {
        const allLocal = await this._localGetAll(store);
        for (let item of allLocal) {
          await setDoc(doc(firestore, `users/${user.uid}/${store}`, String(item.id)), item);
        }
      } catch(e) { console.error("Sync up error", e); }
    }
  }

  async clearAll() {
    await this.init();
    if (this.isFallback) {
      this.memoryStore = { 
        settings: [], milk: [], gas: [], water: [], 
        grocery: [], electricity_lotus: [], electricity_sadri: [], 
        water_bill: [], other_expenses: [], categories: [], custom: [],
        maintenance: []
      };
      return;
    }
    const stores = [
      'settings', 'milk', 'gas', 'water', 
      'grocery', 'electricity_lotus', 'electricity_sadri', 
      'water_bill', 'other_expenses', 'categories', 'custom',
      'maintenance'
    ];
    for (let store of stores) {
      await new Promise((resolve) => {
        const tx = this.db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = resolve;
      });
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
export async function reconcileMilkPriceFromDate(fromDate, newPrice) {
  if (!fromDate || newPrice == null || isNaN(Number(newPrice))) return 0;
  const targetPrice = Number(newPrice);
  const allMilk = await db.getAll('milk');
  let updatedCount = 0;
  for (const entry of allMilk) {
    if (entry.isPaused) continue;
    if (entry.date >= fromDate) {
      const currentQty = Number(entry.qty) || 0;
      const newTotal = Number((currentQty * targetPrice).toFixed(2));
      if (Number(entry.price) !== targetPrice || Number(entry.total) !== newTotal) {
        const updated = {
          ...entry,
          price: targetPrice,
          total: newTotal
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
export async function reconcileMilkQtyFromDate(fromDate, newQty) {
  if (!fromDate || newQty == null || isNaN(Number(newQty))) return 0;
  const targetQty = Number(newQty);
  const allMilk = await db.getAll('milk');
  let updatedCount = 0;
  for (const entry of allMilk) {
    if (entry.isPaused) continue;
    if (entry.date >= fromDate) {
      const currentPrice = Number(entry.price) || 0;
      const newTotal = Number((targetQty * currentPrice).toFixed(2));
      if (Number(entry.qty) !== targetQty || Number(entry.total) !== newTotal) {
        const updated = {
          ...entry,
          qty: targetQty,
          total: newTotal
        };
        await db.put('milk', updated);
        updatedCount++;
      }
    }
  }
  return updatedCount;
}


