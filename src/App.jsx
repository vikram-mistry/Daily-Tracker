import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2
} from 'lucide-react';

// ==========================================
// 1. INDEXED-DB WRAPPER (OFFLINE STORAGE)
// ==========================================
const DB_NAME = 'TrackitProDB';
const DB_VERSION = 1;

class LocalDB {
  constructor() {
    this.db = null;
    this.isFallback = false;
    this.memoryStore = { 
      settings: [], milk: [], gas: [], water: [], 
      grocery: [], electricity_lotus: [], electricity_sadri: [], 
      water_bill: [], other_expenses: [], categories: [], custom: [] 
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
            'water_bill', 'other_expenses', 'categories', 'custom'
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

  async get(storeName, key) {
    await this.init();
    if (this.isFallback) return this.memoryStore[storeName].find(item => item.id === key);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    await this.init();
    if (this.isFallback) return [...this.memoryStore[storeName]];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, item) {
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

  async delete(storeName, key) {
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

  async clearAll() {
    await this.init();
    if (this.isFallback) {
      this.memoryStore = { 
        settings: [], milk: [], gas: [], water: [], 
        grocery: [], electricity_lotus: [], electricity_sadri: [], 
        water_bill: [], other_expenses: [], categories: [], custom: [] 
      };
      return;
    }
    const stores = [
      'settings', 'milk', 'gas', 'water', 
      'grocery', 'electricity_lotus', 'electricity_sadri', 
      'water_bill', 'other_expenses', 'categories', 'custom'
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

const db = new LocalDB();

// Default Settings
const DEFAULT_SETTINGS = {
  id: 'main', theme: 'light', currency: '₹', 
  milkPrice: 84, milkQty: 1, gasWeight: 14.2,
  waterTarget: 4
};

// ==========================================
// 2. HELPER COMPONENTS & ICONS
// ==========================================
const GlassCard = ({ children, className = '', onClick, style = {} }) => (
  <motion.div 
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    style={style}
    className={`m3-card ${className}`}
  >
    {children}
  </motion.div>
);

const IconButton = ({ icon: Icon, onClick, className = '', active }) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    style={active 
      ? {background:'var(--m3-icon-btn-active-bg)', color:'var(--m3-icon-btn-active-color)'}
      : {background:'var(--m3-icon-btn-bg)', color:'var(--m3-icon-btn-color)'}}
    className={`p-3 rounded-full flex items-center justify-center transition-colors ${className}`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
  </motion.button>
);

const ICONS_MAP = { Droplet, Zap, Wifi, ShoppingCart, Wrench, Package };

// Swipeable List Item
const SwipeableItem = ({ children, onDelete, onEdit }) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-3 m3-swipe-outer">
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-2 font-semibold text-sm" style={{color:'#4A90D9'}}><Edit3 size={18}/> Edit</div>
        <div className="flex items-center gap-2 font-semibold text-sm" style={{color:'#E05C5C'}}>Delete <Trash2 size={18}/></div>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={(e, info) => {
          if (info.offset.x < -80 && onDelete) onDelete();
          if (info.offset.x > 80 && onEdit) onEdit();
        }}
        className="relative rounded-2xl p-4 z-10 m3-swipe-inner"
      >
        {children}
      </motion.div>
    </div>
  );
};

// ==========================================
// 3. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('milk'); // milk, gas, settings, custom-{id}
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState([]);
  const [isReady, setIsReady] = useState(false);
  
  // Modals state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  
  // Global Month/Year filter
  const [filterDate, setFilterDate] = useState(new Date());

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedSettings = await db.get('settings', 'main');
        if (storedSettings) setSettings(storedSettings);
        else await db.put('settings', DEFAULT_SETTINGS);

        const storedCats = await db.getAll('categories');
        setCategories(storedCats || []);
      } catch (err) {
        console.error("Failed to load DB", err);
      } finally {
        setIsReady(true);
      }
    };
    loadData();
  }, []);

  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await db.put('settings', updated);
  };

  if (!isReady) return (
    <div style={{minHeight:'100vh', background:'linear-gradient(160deg,#F0EBFF 0%,#E8F4FF 40%,#E8FFF4 100%)', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'16px'}}>
        <div className="m3-pulse" style={{width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#EADDFF,#C8E6FF)'}} />
        <p style={{color:'#6750A4', fontWeight:600, fontSize:14}}>Loading Trackit…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full" data-theme={settings.theme} style={{background:'var(--m3-bg)', color:'var(--m3-on-surface)'}}>
      {/* Mobile Wrapper */}
      <div className="max-w-md mx-auto h-screen flex flex-col relative overflow-hidden" style={{background:'var(--m3-bg-app)'}}>
        
        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto pb-24 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="p-4"
            >
              {activeTab === 'milk' && <MilkView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'gas' && <GasView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'water' && <WaterView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'settings' && <SettingsView settings={settings} updateSettings={updateSettings} db={db} />}
              {activeTab === 'grocery' && <ExpenseView type="grocery" title="Grocery" icon={ShoppingCart} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'elec-lotus' && <ExpenseView type="electricity_lotus" title="Electricity (Lotus)" icon={Zap} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'elec-sadri' && <ExpenseView type="electricity_sadri" title="Electricity (Sadri)" icon={Zap} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'water-bill' && <ExpenseView type="water_bill" title="Water Bill" icon={Droplet} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'other' && <ExpenseView type="other_expenses" title="Other" icon={Package} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              
              {activeTab.startsWith('custom-') && (
                <CustomCategoryView 
                  categoryId={activeTab.replace('custom-', '')} 
                  categories={categories}
                  settings={settings}
                  filterDate={filterDate}
                  setFilterDate={setFilterDate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 w-full px-4 pb-6 pt-2 z-40" style={{background:'var(--m3-nav-gradient)'}}>
          <div className="flex items-center justify-around rounded-full py-2 px-2" style={{background:'var(--m3-nav-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid var(--m3-nav-border)', boxShadow:'var(--m3-nav-shadow)'}}>
            <NavIcon icon={Milk} label="Milk" isActive={activeTab === 'milk'} onClick={() => setActiveTab('milk')} />
            <NavIcon icon={Flame} label="Gas" isActive={activeTab === 'gas'} onClick={() => setActiveTab('gas')} />
            <NavIcon icon={Droplet} label="Water" isActive={activeTab === 'water'} onClick={() => setActiveTab('water')} />
            
            {/* FAB (Add More) */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAddSheetOpen(true)}
              className="-mt-6 z-50 p-4 rounded-full"
              style={{background:'linear-gradient(135deg,#7C3AED,#6750A4)', color:'#fff', boxShadow:'0 4px 20px rgba(103,80,164,0.4)', border:'4px solid var(--m3-fab-border)'}}
            >
              <Plus size={26} />
            </motion.button>

            <NavIcon icon={Settings} label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </div>

        {/* Add More Bottom Sheet */}
        <BottomSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} title="Track Expenses" isCentered={true}>
          <div className="grid grid-cols-2 gap-4 mt-6">
             <ExpenseMenuItem icon={ShoppingCart} label="Grocery" onClick={() => { setActiveTab('grocery'); setIsAddSheetOpen(false); }} color="#10b981" />
             <ExpenseMenuItem icon={Zap} label="Elec (Lotus)" onClick={() => { setActiveTab('elec-lotus'); setIsAddSheetOpen(false); }} color="#f59e0b" />
             <ExpenseMenuItem icon={Zap} label="Elec (Sadri)" onClick={() => { setActiveTab('elec-sadri'); setIsAddSheetOpen(false); }} color="#f59e0b" />
             <ExpenseMenuItem icon={Droplet} label="Water Bill" onClick={() => { setActiveTab('water-bill'); setIsAddSheetOpen(false); }} color="#3b82f6" />
             <ExpenseMenuItem icon={Package} label="Other" onClick={() => { setActiveTab('other'); setIsAddSheetOpen(false); }} color="#8b5cf6" />
          </div>
        </BottomSheet>
      </div>
    </div>
  );
}

const ExpenseMenuItem = ({ icon: Icon, label, onClick, color }) => (
  <motion.button whileTap={{scale:0.96}} onClick={onClick} className="flex items-center gap-3 p-4 rounded-2xl transition-all" style={{background:'#FFFFFF', border:'1px solid #EDE7F6', boxShadow:'0 1px 8px rgba(103,80,164,0.07)'}}>
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
      <Icon size={20} />
    </div>
    <span className="font-semibold text-sm" style={{color:'#1C1B1F'}}>{label}</span>
  </motion.button>
);

const NavIcon = ({ icon: Icon, label, isActive, onClick }) => (
  <motion.button whileTap={{scale:0.9}} onClick={onClick} className="flex flex-col items-center gap-1 w-16">
    <div className="p-1.5 rounded-full transition-all duration-300" style={{background: isActive ? 'var(--m3-nav-icon-active-bg)' : 'transparent'}}>
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{color: isActive ? 'var(--m3-nav-icon-active-color)' : 'var(--m3-nav-icon-color)'}} />
    </div>
    <span className="text-[10px] font-semibold transition-colors duration-300" style={{color: isActive ? 'var(--m3-nav-icon-active-color)' : 'var(--m3-nav-icon-color)'}}>{label}</span>
  </motion.button>
);

// ==========================================
// 4. UI COMPONENTS (SHEET, HEADER)
// ==========================================
const BottomSheet = ({ isOpen, onClose, title, children, isCentered = false }) => {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)'}}
          />
          <div className={`fixed inset-0 z-50 flex ${isCentered ? 'items-center justify-center p-4' : 'items-end'}`} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <motion.div
              initial={isCentered ? { scale: 0.9, opacity: 0 } : { y: '100%' }}
              animate={isCentered ? { scale: 1, opacity: 1 } : { y: 0 }}
              exit={isCentered ? { scale: 0.9, opacity: 0 } : { y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`w-full max-w-lg max-h-[80svh] overflow-y-auto m3-sheet
                ${isCentered ? 'relative' : ''}`}
              style={{borderRadius: isCentered ? '28px' : '28px 28px 0 0', paddingBottom: isCentered ? 0 : 48}}
            >
              {!isCentered && <div className="w-10 h-1 rounded-full mx-auto mt-5 mb-4" style={{background:'var(--m3-on-surface-muted)', opacity:0.4}} />}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold tracking-tight" style={{color:'var(--m3-on-surface)'}}>{title}</h2>
                  <motion.button whileTap={{scale:0.9}} onClick={onClose} className="p-2 rounded-full" style={{background:'var(--m3-close-btn-bg)', color:'var(--m3-close-btn-color)'}}><X size={18}/></motion.button>
                </div>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

const StickyHeader = ({ title, date, setDate }) => {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const handlePrev = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  const handleNext = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  return (
    <div className="sticky top-0 pt-12 pb-4 px-2 z-30 flex justify-between items-end mb-6" style={{background:'var(--m3-header-bg)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid var(--m3-header-border)'}}>
      <h1 className="text-2xl font-bold tracking-tight" style={{color:'var(--m3-on-surface)'}}>{title}</h1>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{background:'var(--m3-input-bg)', border:'1px solid var(--m3-input-border)'}}>
        <motion.button whileTap={{scale:0.85}} onClick={handlePrev} style={{color:'#6750A4'}}><ChevronLeft size={16}/></motion.button>
        <span className="text-sm font-semibold min-w-[68px] text-center" style={{color:'var(--m3-on-surface)'}}>
          {monthNames[date.getMonth()]} {date.getFullYear()}
        </span>
        <motion.button whileTap={{scale:0.85}} onClick={handleNext} style={{color:'#6750A4'}}><ChevronRight size={16}/></motion.button>
      </div>
    </div>
  );
};

// ==========================================
// 5. MILK MODULE
// ==========================================
function MilkView({ filterDate, setFilterDate, settings }) {
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isListExpanded, setIsListExpanded] = useState(false);
  
  // Selection Mode for Pause
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);

  // Form State
  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    qty: settings.milkQty, 
    price: settings.milkPrice 
  });

  const loadEntries = useCallback(async () => {
    const all = await db.getAll('milk');
    const filtered = all.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === filterDate.getMonth() && d.getFullYear() === filterDate.getFullYear();
    });
    setEntries(filtered.sort((a, b) => new Date(b.date) - new Date(a.date)));
  }, [filterDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Calculations
  const stats = useMemo(() => {
    let qty = 0, amount = 0, active = 0, pause = 0;
    entries.forEach(e => {
      if (e.isPaused) { pause++; } 
      else { active++; qty += Number(e.qty); amount += Number(e.total); }
    });
    return { qty, amount, active, pause };
  }, [entries]);

  const handleSave = async () => {
    const total = formData.qty * formData.price;
    const item = {
      id: editingEntry?.id || Date.now().toString(),
      date: formData.date,
      qty: formData.qty,
      price: formData.price,
      total,
      isPaused: false
    };
    await db.put('milk', item);
    setIsModalOpen(false);
    loadEntries();
  };

  const handleDelete = async (id) => {
    await db.delete('milk', id);
    loadEntries();
  };

  const togglePauseStatus = async (dateStr) => {
    const existing = entries.find(e => e.date === dateStr);
    if (existing) {
      await db.put('milk', { ...existing, isPaused: !existing.isPaused, qty: 0, total: 0 });
    } else {
      await db.put('milk', { id: Date.now().toString(), date: dateStr, isPaused: true, qty: 0, price: 0, total: 0 });
    }
    loadEntries();
  };

  const handleBulkPause = async () => {
    for (let date of selectedDates) {
      await togglePauseStatus(date);
    }
    setIsSelectMode(false);
    setSelectedDates([]);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({ date: entry.date, qty: entry.qty, price: entry.price });
    setIsModalOpen(true);
  };

  const openAdd = (dateStr = new Date().toISOString().split('T')[0]) => {
    setEditingEntry(null);
    setFormData({ date: dateStr, qty: settings.milkQty, price: settings.milkPrice });
    setIsModalOpen(true);
  };

  // Generate a text report and share via native share sheet
  const handleShareReport = async () => {
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthYear = `${monthNames[filterDate.getMonth()]} ${filterDate.getFullYear()}`;
    
    // Sort entries ascending by date for the report
    const sorted = [...entries].filter(e => !e.isPaused).sort((a, b) => new Date(a.date) - new Date(b.date));
    const pausedDays = entries.filter(e => e.isPaused);

    const lines = [
      `🥛 *Milk Report — ${monthYear}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 Total Quantity : *${stats.qty} L*`,
      `💰 Total Amount   : *${settings.currency}${stats.amount.toFixed(2)}*`,
      `✅ Active Days    : ${stats.active}`,
      `⏸️ Paused Days   : ${stats.pause}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 *Daily Breakdown:*`,
      ``,
      ...sorted.map(e => {
        const d = new Date(e.date);
        const day = String(d.getDate()).padStart(2, '0');
        const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
        return `  ${day} ${mon}  —  ${e.qty}L  ×  ${settings.currency}${e.price}  =  ${settings.currency}${Number(e.total).toFixed(2)}`;
      }),
      ...(pausedDays.length > 0 ? [
        ``,
        `⏸️ *Paused Dates:*`,
        ...pausedDays.map(e => {
          const d = new Date(e.date);
          const day = String(d.getDate()).padStart(2, '0');
          const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
          return `  ${day} ${mon}  —  No Delivery`;
        })
      ] : []),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💳 *Please pay: ${settings.currency}${stats.amount.toFixed(2)}*`,
      ``,
      `Shared via Trackit App 📱`,
    ];

    const reportText = lines.join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: `Milk Report – ${monthYear}`, text: reportText });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(reportText);
        alert('Report copied to clipboard!');
      }
    } catch (err) {
      // User cancelled share — ignore
    }
  };

  // Generate Calendar Days
  const daysInMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({length: daysInMonth}, (_, i) => {
    const d = new Date(filterDate.getFullYear(), filterDate.getMonth(), i + 1);
    // Adjust to local timezone string format YYYY-MM-DD
    const dateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
    return dateStr;
  });

  return (
    <div>
      <StickyHeader title="Milk Tracker" date={filterDate} setDate={setFilterDate} />
      
      {/* Summary Card */}
      <GlassCard className="p-5 mb-6 relative overflow-hidden" style={{background:'linear-gradient(135deg,#C8E6FF 0%,#EDE7F6 100%)'}}>
        <img src="./milk-icon.png" alt="Milk" className="absolute -right-4 -top-4 w-24 h-24 opacity-50 rotate-12 pointer-events-none drop-shadow-lg" />
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Total Amount</p>
            <p className="text-3xl font-bold" style={{color:'#1A1C1E'}}>{settings.currency}{stats.amount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Total Quantity</p>
            <p className="text-3xl font-bold" style={{color:'#1A1C1E'}}>{stats.qty} L</p>
          </div>
          <div className="pt-3" style={{borderTop:'1px solid rgba(103,80,164,0.15)'}}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Active Days</p>
            <p className="text-xl font-bold" style={{color:'#1B6E3A'}}>{stats.active}</p>
          </div>
          <div className="pt-3" style={{borderTop:'1px solid rgba(103,80,164,0.15)'}}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Pause Days</p>
            <p className="text-xl font-bold" style={{color:'#B85C00'}}>{stats.pause}</p>
          </div>
        </div>

        {/* Share Report Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleShareReport}
          className="relative z-10 mt-5 w-full flex items-center justify-center gap-2 font-bold py-3 rounded-2xl"
          style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)', color:'#fff', boxShadow:'0 4px 16px rgba(103,80,164,0.3)'}}
        >
          <Share2 size={18} />
          Share Monthly Report
        </motion.button>
      </GlassCard>

      {/* Calendar Grid */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold" style={{color:'var(--m3-on-surface)'}}>Daily Tracking</h3>
        <motion.button
          whileTap={{scale:0.95}}
          onClick={() => { setIsSelectMode(!isSelectMode); setSelectedDates([]); }}
          className="text-sm font-semibold px-4 py-1.5 rounded-full"
          style={isSelectMode ? {background:'#FFCAA5', color:'#7C3010'} : {background:'#EDE7F6', color:'#6750A4'}}
        >
          {isSelectMode ? 'Cancel' : 'Bulk Pause'}
        </motion.button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold" style={{color:'#79747E'}}>{d}</div>
        ))}  
        
        {/* Empty slots for offset */}
        {Array.from({length: new Date(filterDate.getFullYear(), filterDate.getMonth(), 1).getDay()}).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {calendarDays.map(dateStr => {
          const entry = entries.find(e => e.date === dateStr);
          const isSelected = selectedDates.includes(dateStr);
          const dayNum = parseInt(dateStr.split('-')[2], 10);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={dateStr}
              onClick={() => {
                if (isSelectMode) {
                  setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
                } else {
                  if (entry && entry.isPaused) togglePauseStatus(dateStr); // Unpause
                  else if (entry) openEdit(entry);
                  else openAdd(dateStr);
                }
              }}
              onContextMenu={(e) => { e.preventDefault(); togglePauseStatus(dateStr); }} // Quick pause on long press/right click
              className={`
                aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all border
                ${isToday ? 'border-[#6750A4]' : 'border-transparent'}
                ${isSelected ? 'border-[#E67E22]' : 
                  entry?.isPaused ? 'border-dashed border-[#E67E22] opacity-60' : 
                  entry ? 'border-[#4A90D9]/40' : 'border-transparent'}
              `}
              style={{
                background: isSelected ? '#FFCAA5' : entry?.isPaused ? '#FFF3E0' : entry ? '#C8E6FF' : 'rgba(103,80,164,0.06)'
              }}
            >
              <span className="text-sm font-semibold" style={{color: entry ? '#1C1B1F' : '#79747E'}}>{dayNum}</span>
              {entry && !entry.isPaused && <span className="text-[9px] font-bold" style={{color:'#4A90D9'}}>{entry.qty}L</span>}
              {entry?.isPaused && <PauseCircle size={12} className="mt-1 absolute bottom-1" style={{color:'#E67E22'}} />}
            </motion.button>
          );
        })}
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {isSelectMode && selectedDates.length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-4 right-4 z-40">
            <motion.button whileTap={{scale:0.97}} onClick={handleBulkPause} className="w-full font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#FF9A5C,#E67E22)', color:'#fff'}}>
              <PauseCircle size={20} /> Mark {selectedDates.length} {selectedDates.length === 1 ? 'Day' : 'Days'} as Paused
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List View (Recent) */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold" style={{color:'var(--m3-on-surface)'}}>Entries List</h3>
          <motion.button
            whileTap={{scale:0.95}}
            onClick={() => setIsListExpanded(!isListExpanded)}
            className="text-sm font-semibold px-4 py-1.5 rounded-full"
            style={{background:'#C8E6FF', color:'#1A5276'}}
          >
            {isListExpanded ? 'Collapse' : 'Expand'}
          </motion.button>
        </div>
        
        <AnimatePresence>
          {isListExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {entries.length === 0 && <p className="text-center py-4 text-sm" style={{color:'var(--m3-on-surface-muted)'}}>No entries this month.</p>}
              {entries.map(entry => (
                <SwipeableItem key={entry.id} onDelete={() => handleDelete(entry.id)} onEdit={() => openEdit(entry)}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{background: entry.isPaused ? 'var(--m3-error-container)' : 'var(--m3-primary-container)', color: entry.isPaused ? 'var(--m3-on-error-container)' : 'var(--m3-on-primary-container)'}}>
                        {entry.isPaused ? <PauseCircle size={20}/> : <Droplet size={20}/>}
                      </div>
                      <div>
                        <p className="font-semibold" style={{color:'var(--m3-on-surface)'}}>{new Date(entry.date).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}</p>
                        <p className="text-xs" style={{color:'var(--m3-on-surface-muted)'}}>{entry.isPaused ? 'Paused' : `${entry.qty}L @ ${settings.currency}${entry.price}`}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{color: entry.isPaused ? 'var(--m3-on-surface-muted)' : 'var(--m3-on-surface)'}}>
                         {entry.isPaused ? '-' : `${settings.currency}${entry.total}`}
                       </p>
                    </div>
                  </div>
                </SwipeableItem>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <BottomSheet 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEntry ? "Edit Milk Entry" : "Add Milk Entry"}
        isCentered={true}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'#6750A4'}}>Date</label>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="m3-input mt-1 text-sm" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'#6750A4'}}>Quantity (L)</label>
              <input type="number" step="0.5" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} className="m3-input mt-1 text-xl font-bold" />
            </div>
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'#6750A4'}}>Price/L</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'var(--m3-on-surface-muted)'}}>{settings.currency}</span>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="m3-input mt-1 pl-7 text-xl font-bold" />
              </div>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
             {editingEntry && (
                <motion.button whileTap={{scale:0.97}} onClick={() => handleDelete(editingEntry.id)} className="flex-1 font-bold py-4 rounded-2xl" style={{background:'#FFEBEB', color:'#C0392B'}}>Delete</motion.button>
             )}
            <motion.button whileTap={{scale:0.97}} onClick={handleSave} className="flex-[2] font-bold py-4 rounded-2xl" style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)', color:'#fff', boxShadow:'0 4px 16px rgba(103,80,164,0.3)'}}>
              Save Entry
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ==========================================
// 6. GAS MODULE
// ==========================================
function GasView({ filterDate, setFilterDate, settings }) {
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [formData, setFormData] = useState({ 
    installDate: new Date().toISOString().split('T')[0], 
    uninstallDate: '',
    amount: '',
    weight: settings.gasWeight,
    notes: ''
  });

  const loadEntries = useCallback(async () => {
    const all = await db.getAll('gas');
    // Sort descending by install date
    setEntries(all.sort((a, b) => new Date(b.installDate) - new Date(a.installDate)));
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Utility to calculate days used correctly handling cross-month logic.
  const calculateDays = (start, end) => {
    if (!start) return 0;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(); // If no end date, use today
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  // Filter stats for the selected month/year
  const stats = useMemo(() => {
    const month = filterDate.getMonth();
    const year = filterDate.getFullYear();
    let cylindersUsed = 0, totalSpend = 0, activeDaysThisMonth = 0;

    entries.forEach(entry => {
      const install = new Date(entry.installDate);
      const uninstall = entry.uninstallDate ? new Date(entry.uninstallDate) : new Date(); // Active assumed until today

      // Check if cylinder was active during this month
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);

      if (install <= endOfMonth && uninstall >= startOfMonth) {
        // It overlaps with the selected month
        const overlapStart = install > startOfMonth ? install : startOfMonth;
        const overlapEnd = uninstall < endOfMonth ? uninstall : endOfMonth;
        
        const daysInMonth = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
        activeDaysThisMonth += daysInMonth;

        // If installed in this month, count towards spend/cylinders
        if (install.getMonth() === month && install.getFullYear() === year) {
          cylindersUsed++;
          totalSpend += Number(entry.amount);
        }
      }
    });

    return { cylindersUsed, totalSpend, activeDaysThisMonth };
  }, [entries, filterDate]);

  const handleSave = async () => {
    const item = {
      id: editingEntry?.id || Date.now().toString(),
      ...formData
    };
    await db.put('gas', item);
    setIsModalOpen(false);
    loadEntries();
  };

  const handleDelete = async (id) => {
    await db.delete('gas', id);
    loadEntries();
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setFormData(entry);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingEntry(null);
    setFormData({ 
      installDate: new Date().toISOString().split('T')[0], 
      uninstallDate: '', amount: '', weight: settings.gasWeight, notes: '' 
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <StickyHeader title="Gas Tracker" date={filterDate} setDate={setFilterDate} />

      {/* Summary Card */}
      <GlassCard className="p-5 mb-6" style={{background:'linear-gradient(135deg,#FFE0C8 0%,#FFECD8 100%)'}}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>New Cylinders</p>
            <p className="text-3xl font-bold" style={{color:'#1C1B1F'}}>{stats.cylindersUsed}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Total Spend</p>
            <p className="text-3xl font-bold" style={{color:'#1C1B1F'}}>{settings.currency}{stats.totalSpend}</p>
          </div>
          <div className="col-span-2 pt-3" style={{borderTop:'1px solid rgba(230,126,34,0.15)'}}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Usage Days This Month</p>
            <p className="text-xl font-bold" style={{color:'#E67E22'}}>{stats.activeDaysThisMonth} Days</p>
          </div>
        </div>
      </GlassCard>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold" style={{color:'var(--m3-on-surface)'}}>Cylinder History</h3>
        <motion.button whileTap={{scale:0.95}} onClick={openAdd} className="text-sm font-semibold px-4 py-1.5 rounded-full flex items-center gap-1" style={{background:'linear-gradient(135deg,#FF9A5C,#E67E22)', color:'#fff', boxShadow:'0 2px 10px rgba(230,126,34,0.25)'}}>
          <Plus size={16}/> Add New
        </motion.button>
      </div>

      <div className="space-y-4">
        {entries.length === 0 && <p className="text-center py-4 text-sm" style={{color:'var(--m3-on-surface-muted)'}}>No gas records found.</p>}
        {entries.map((entry, idx) => {
           const daysUsed = calculateDays(entry.installDate, entry.uninstallDate);
           const isActive = !entry.uninstallDate;
           return (
            <SwipeableItem key={entry.id} onDelete={() => handleDelete(entry.id)} onEdit={() => openEdit(entry)}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 mt-1 rounded-2xl flex items-center justify-center`} style={{background: isActive ? '#FFE0C8' : '#F5F5F5', border: isActive ? '1.5px solid #E67E22' : '1px solid #EDE7F6', color: isActive ? '#E67E22' : '#79747E'}}>
                    <Flame size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg" style={{color:'var(--m3-on-surface)'}}>Cylinder #{entries.length - idx}</p>
                      {isActive && <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold" style={{background:'#FF9A5C', color:'#fff'}}>Active</span>}
                    </div>
                    <p className="text-xs mt-1" style={{color:'#79747E'}}>Installed: {new Date(entry.installDate).toLocaleDateString()}</p>
                    {entry.uninstallDate && (
                       <p className="text-xs mt-0.5" style={{color:'#79747E'}}>Ended: {new Date(entry.uninstallDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold" style={{color:'var(--m3-on-surface)'}}>{settings.currency}{entry.amount}</p>
                  <p className="text-sm font-semibold mt-1" style={{color: isActive ? '#E67E22' : '#79747E'}}>{daysUsed} Days</p>
                </div>
              </div>
            </SwipeableItem>
           )
        })}
      </div>

      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntry ? "Edit Cylinder" : "Add Cylinder"} isCentered={true}>
         <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1 block truncate" style={{color:'#6750A4'}}>Install Date</label>
              <input type="date" value={formData.installDate} onChange={e => setFormData({...formData, installDate: e.target.value})} className="m3-input mt-1" />
            </div>
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1 block truncate" style={{color:'#6750A4'}}>End Date (Optional)</label>
              <input type="date" value={formData.uninstallDate} onChange={e => setFormData({...formData, uninstallDate: e.target.value})} className="m3-input mt-1" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'#6750A4'}}>Amount</label>
               <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{color:'var(--m3-on-surface-muted)'}}>{settings.currency}</span>
                <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="m3-input pl-8 mt-1 text-xl font-bold" placeholder="0.00" />
              </div>
            </div>
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'#6750A4'}}>Weight (KG)</label>
              <input type="number" step="0.1" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="m3-input mt-1 text-xl font-bold" />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
             {editingEntry && (
                <motion.button whileTap={{scale:0.97}} onClick={() => handleDelete(editingEntry.id)} className="flex-1 font-bold py-4 rounded-2xl" style={{background:'#FFEBEB', color:'#C0392B'}}>Delete</motion.button>
             )}
            <motion.button whileTap={{scale:0.97}} onClick={handleSave} className="flex-[2] font-bold py-4 rounded-2xl" style={{background:'linear-gradient(135deg,#FF9A5C,#E67E22)', color:'#fff', boxShadow:'0 4px 16px rgba(230,126,34,0.3)'}}>
              Save Cylinder
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ==========================================
// 7. CUSTOM CATEGORY MODULE
// ==========================================
function CustomCategoryView({ categoryId, categories, settings, filterDate, setFilterDate }) {
  const category = categories.find(c => c.id === categoryId) || {};
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    qty: category.defaultQty || 1,
    amount: category.defaultAmount || 0,
    notes: ''
  });

  const loadEntries = useCallback(async () => {
    const all = await db.getAll('custom');
    const filtered = all.filter(e => {
      const d = new Date(e.date);
      return e.categoryId === categoryId && d.getMonth() === filterDate.getMonth() && d.getFullYear() === filterDate.getFullYear();
    });
    setEntries(filtered.sort((a, b) => new Date(b.date) - new Date(a.date)));
  }, [categoryId, filterDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const stats = useMemo(() => {
    return entries.reduce((acc, curr) => {
      acc.qty += Number(curr.qty || 0);
      acc.amount += Number(curr.amount || 0);
      return acc;
    }, { qty: 0, amount: 0 });
  }, [entries]);

  const handleSave = async () => {
    const item = {
      id: editingEntry?.id || Date.now().toString(),
      categoryId,
      ...formData
    };
    await db.put('custom', item);
    setIsModalOpen(false);
    loadEntries();
  };

  const handleDelete = async (id) => {
    await db.delete('custom', id);
    loadEntries();
  };

  const openAdd = () => {
    setEditingEntry(null);
    setFormData({ date: new Date().toISOString().split('T')[0], qty: category.defaultQty || 1, amount: category.defaultAmount || '', notes: '' });
    setIsModalOpen(true);
  };

  const CatIcon = ICONS_MAP[category.icon] || Package;

  return (
    <div>
      <StickyHeader title={category.name} date={filterDate} setDate={setFilterDate} />

      <GlassCard className="p-5 mb-6" style={{ background: `linear-gradient(135deg, ${category.color}25, ${category.color}10)` }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Total {category.unit || 'Units'}</p>
            <p className="text-3xl font-bold" style={{color:'#1C1B1F'}}>{stats.qty}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:'#49454F'}}>Total Spend</p>
            <p className="text-3xl font-bold" style={{color:'#1C1B1F'}}>{settings.currency}{stats.amount}</p>
          </div>
        </div>
      </GlassCard>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold" style={{color:'#1C1B1F'}}>Records</h3>
        <motion.button whileTap={{scale:0.95}} onClick={openAdd} className="text-sm font-semibold text-white px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg" style={{ backgroundColor: category.color }}>
          <Plus size={16}/> Add Entry
        </motion.button>
      </div>

      <div className="space-y-4">
        {entries.length === 0 && <p className="text-center py-4 text-sm" style={{color:'#79747E'}}>No entries yet.</p>}
        {entries.map(entry => (
          <SwipeableItem key={entry.id} onDelete={() => handleDelete(entry.id)} onEdit={() => { setEditingEntry(entry); setFormData(entry); setIsModalOpen(true); }}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'#F3EEFF', border:'1px solid #EDE7F6', color: category.color}}>
                  <CatIcon size={20}/>
                </div>
                <div>
                  <p className="font-semibold" style={{color:'var(--m3-on-surface)'}}>{new Date(entry.date).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}</p>
                  <p className="text-xs" style={{color:'var(--m3-on-surface-muted)'}}>{entry.qty} {category.unit}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{color:'var(--m3-on-surface)'}}>{settings.currency}{entry.amount}</p>
              </div>
            </div>
          </SwipeableItem>
        ))}
      </div>

      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntry ? `Edit ${category.name}` : `Add ${category.name}`} isCentered={true}>
         <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'var(--m3-on-surface-muted)'}}>Date</label>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="m3-input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'var(--m3-on-surface-muted)'}}>Quantity</label>
              <input type="number" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} className="m3-input mt-1 text-xl font-bold" />
            </div>
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{color:'var(--m3-on-surface-muted)'}}>Total Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{color:'var(--m3-on-surface-muted)'}}>{settings.currency}</span>
                <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="m3-input pl-8 mt-1 text-xl font-bold" placeholder="0.00" />
              </div>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button onClick={handleSave} className="flex-1 text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: category.color }}>
              Save Entry
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ==========================================
// 8. SETTINGS & DATA MANAGEMENT MODULE
// ==========================================
function SettingsView({ settings, updateSettings, db }) {
  const handleExport = async () => {
    try {
      const data = {
        settings: await db.getAll('settings'),
        milk: await db.getAll('milk'),
        gas: await db.getAll('gas'),
        water: await db.getAll('water'),
        grocery: await db.getAll('grocery'),
        electricity_lotus: await db.getAll('electricity_lotus'),
        electricity_sadri: await db.getAll('electricity_sadri'),
        water_bill: await db.getAll('water_bill'),
        other_expenses: await db.getAll('other_expenses'),
        categories: await db.getAll('categories'),
        custom: await db.getAll('custom')
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackit-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      alert('Data exported successfully!');
    } catch (e) {
      alert('Export failed.');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        await db.clearAll();
        if(data.settings) for(let i of data.settings) await db.put('settings', i);
        if(data.milk) for(let i of data.milk) await db.put('milk', i);
        if(data.gas) for(let i of data.gas) await db.put('gas', i);
        if(data.water) for(let i of data.water) await db.put('water', i);
        if(data.grocery) for(let i of data.grocery) await db.put('grocery', i);
        if(data.electricity_lotus) for(let i of data.electricity_lotus) await db.put('electricity_lotus', i);
        if(data.electricity_sadri) for(let i of data.electricity_sadri) await db.put('electricity_sadri', i);
        if(data.water_bill) for(let i of data.water_bill) await db.put('water_bill', i);
        if(data.other_expenses) for(let i of data.other_expenses) await db.put('other_expenses', i);
        if(data.categories) for(let i of data.categories) await db.put('categories', i);
        if(data.custom) for(let i of data.custom) await db.put('custom', i);
        alert('Data imported successfully! App will reload.');
        window.location.reload();
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const SettingBlock = ({ label, children }) => (
    <div className="flex justify-between items-center py-4 last:border-0" style={{borderBottom:'1px solid var(--m3-divider)'}}>
      <span className="font-medium" style={{color:'var(--m3-on-surface)'}}>{label}</span>
      <div className="w-1/2 text-right">{children}</div>
    </div>
  );

  return (
    <div className="pb-8">
      <div className="sticky top-0 pt-12 pb-4 px-2 z-30 mb-6" style={{background:'var(--m3-header-bg)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid var(--m3-header-border)'}}>
        <h1 className="text-2xl font-bold tracking-tight" style={{color:'var(--m3-on-surface)'}}>Settings</h1>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>General</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Currency Symbol">
              <div className="flex items-center justify-end gap-2">
                <input type="text" value={settings.currency} onChange={e => updateSettings({ currency: e.target.value })} className="m3-input text-right w-12" style={{padding:'8px', borderRadius:'12px'}} />
                <span className="text-sm font-medium" style={{color:'var(--m3-on-surface-muted)'}}>Rupee</span>
              </div>
            </SettingBlock>
            <SettingBlock label="Theme">
              <select value={settings.theme} onChange={e => updateSettings({ theme: e.target.value })} className="m3-select text-right">
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Water Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>Water Goals</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Daily Target (L)">
              <input type="number" step="0.1" value={settings.waterTarget} onChange={e => updateSettings({ waterTarget: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Milk Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>Milk Defaults</h3>
          <GlassCard className="px-5">
            <SettingBlock label={`Default Price (${settings.currency}/L)`}>
              <input type="number" value={settings.milkPrice} onChange={e => updateSettings({ milkPrice: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
            <SettingBlock label="Default Quantity (L)">
              <input type="number" step="0.5" value={settings.milkQty} onChange={e => updateSettings({ milkQty: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Gas Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>Gas Defaults</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Cylinder Weight (KG)">
              <input type="number" step="0.1" value={settings.gasWeight} onChange={e => updateSettings({ gasWeight: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Data Management */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'var(--m3-section-label)'}}>Data &amp; Storage</h3>
          <GlassCard className="p-2">
            <button onClick={handleExport} className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{color:'var(--m3-on-surface)'}}>
              <span className="flex items-center gap-3"><Download size={20} style={{color:'#4A90D9'}}/> Backup Data (JSON)</span>
              <ChevronRight size={16} style={{color:'var(--m3-on-surface-muted)'}}/>
            </button>
            <div className="relative w-full">
              <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{color:'var(--m3-on-surface)'}}>
                <span className="flex items-center gap-3"><Upload size={20} style={{color:'#E67E22'}}/> Restore Backup</span>
                <ChevronRight size={16} style={{color:'var(--m3-on-surface-muted)'}}/>
              </div>
            </div>
            <button onClick={async () => {
              if(window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                await db.clearAll(); window.location.reload();
              }
            }} className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{color:'#C0392B'}}>
              <span className="flex items-center gap-3"><Trash2 size={20}/> Delete All Data</span>
            </button>
          </GlassCard>
        </section>

        {/* Footer */}
        <div className="pt-8 pb-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center" style={{background:'linear-gradient(135deg,#EADDFF,#C8E6FF)'}}>
            <Info size={20} style={{color:'#6750A4'}} />
          </div>
          <p className="text-sm font-bold tracking-widest uppercase mb-1" style={{color:'#1C1B1F'}}>Trackit Pro</p>
          <p className="text-[10px] mb-4" style={{color:'#79747E'}}>Version 1.1.0 • Local Offline DB</p>
          <div className="flex gap-2 text-[10px] px-3 py-1 rounded-full" style={{background:'#F3EEFF', color:'#79747E', border:'1px solid #EDE7F6'}}>
            <span>React</span>•<span>Tailwind</span>•<span>IndexedDB</span>•<span>PWA</span>
          </div>
          <p className="text-xs mt-6 font-semibold" style={{color:'#6750A4'}}>Made by Vikram Mistry</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. WATER MODULE
// ==========================================
function WaterView({ filterDate, setFilterDate, settings }) {
  const [allEntries, setAllEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const target = settings.waterTarget || 4;

  const loadEntries = useCallback(async () => {
    const all = await db.getAll('water');
    setAllEntries(all);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const dayEntries = allEntries.filter(e => e.date === selectedDate);
  const totalForSelectedDay = dayEntries.reduce((acc, curr) => acc + Number(curr.qty), 0);
  const percentage = Math.min((totalForSelectedDay / target) * 100, 100);

  const addWater = async (qty) => {
    const item = {
      id: Date.now().toString(),
      date: selectedDate,
      qty
    };
    await db.put('water', item);
    loadEntries();
  };

  // Calendar Logic
  const daysInMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({length: daysInMonth}, (_, i) => {
    const d = new Date(filterDate.getFullYear(), filterDate.getMonth(), i + 1);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  });

  return (
    <div>
      <StickyHeader title="Water Intake" date={filterDate} setDate={setFilterDate} />
      
      {/* Glass Animation */}
      <GlassCard className="p-6 mb-8 flex flex-col items-center relative overflow-hidden" style={{background:'linear-gradient(135deg,#DBEAFE 0%,#EFF6FF 100%)'}}>
        <div className="relative rounded-b-[32px] rounded-t-lg overflow-hidden shadow-inner" style={{width:'76px', height:'116px', border:'3px solid rgba(37,99,235,0.3)', background:'rgba(239,246,255,0.6)'}}>
           {/* Water Filling */}
           <motion.div 
             initial={{ height: 0 }}
             animate={{ height: `${percentage}%` }}
             className="absolute bottom-0 left-0 right-0"
             style={{background:'linear-gradient(to top, #1565C0, #1976D2, #42A5F5)'}}
             transition={{ type: 'spring', damping: 25, stiffness: 60 }}
           >
             {/* Wave Animation SVG */}
             <svg className="absolute -top-4 left-0 w-[200%] h-6 animate-wave" viewBox="0 0 100 20" preserveAspectRatio="none" style={{fill:'rgba(66,165,245,0.8)'}}>
               <path d="M0 10 Q 25 20 50 10 T 100 10 V 20 H 0 Z" />
             </svg>
             <svg className="absolute -top-3 left-[-100%] w-[200%] h-6 animate-wave-slow" viewBox="0 0 100 20" preserveAspectRatio="none" style={{fill:'rgba(144,202,249,0.4)'}}>
               <path d="M0 10 Q 25 20 50 10 T 100 10 V 20 H 0 Z" />
             </svg>

             {/* Bubbles */}
             <motion.div 
               animate={{ y: [-10, -100], opacity: [0, 0.8, 0], x: [0, 10, -10, 0] }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="absolute bottom-4 left-1/4 w-1.5 h-1.5 bg-white/40 rounded-full blur-[1px]"
             />
             <motion.div 
               animate={{ y: [-20, -120], opacity: [0, 0.5, 0], x: [10, -5, 5, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
               className="absolute bottom-8 right-1/3 w-1 h-1 bg-white/30 rounded-full blur-[1px]"
             />
           </motion.div>
           
           {/* Glass Shine */}
           <div className="absolute top-0 left-2 w-1.5 h-full bg-white/20 skew-x-[-10deg] blur-sm" />
        </div>
        
        <div className="mt-5 text-center">
          <p className="text-4xl font-black tracking-tighter" style={{color:'#1A1C1E'}}>{totalForSelectedDay}<span className="text-lg ml-1" style={{color:'#1565C0'}}>L</span></p>
          <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{color:'#1E3A5F'}}>
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})} Goal: {target}L • {Math.round(percentage)}%
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-4 gap-3 mb-8">
        {[0.25, 0.5, 0.75, 1].map(qty => (
          <motion.button
            key={qty}
            whileTap={{ scale: 0.9 }}
            onClick={() => addWater(qty)}
            className="font-bold py-4 rounded-3xl flex flex-col items-center gap-1 transition-all"
            style={{background:'#DBEAFE', border:'1px solid rgba(37,99,235,0.2)', color:'#1565C0'}}
          >
            <Droplet size={18} />
            <span className="text-xs">{qty}L</span>
          </motion.button>
        ))}
      </div>

      {/* Water Calendar Grid */}
      <h3 className="text-base font-bold mb-4" style={{color:'#1C1B1F'}}>Monthly View</h3>
      <div className="grid grid-cols-7 gap-2 mb-8">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-black" style={{color:'#79747E'}}>{d}</div>
        ))}
        {Array.from({length: new Date(filterDate.getFullYear(), filterDate.getMonth(), 1).getDay()}).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {calendarDays.map(dateStr => {
          const dTotal = allEntries.filter(e => e.date === dateStr).reduce((acc, curr) => acc + Number(curr.qty), 0);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const dayNum = parseInt(dateStr.split('-')[2], 10);

          return (
            <motion.button 
              key={dateStr}
              whileTap={{ scale: 0.9 }}
              onClick={() => { 
                if (selectedDate === dateStr) {
                  // Second click on same date - open history
                  setIsModalOpen(true);
                } else {
                  // First click on a different date - just update glass
                  setSelectedDate(dateStr);
                }
              }}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all
                ${isSelected ? 'border-[#27AE90]' : 'border-transparent'}
                ${isToday && !isSelected ? 'border-[#79747E]/40' : ''}
                ${dTotal > 0 && !isSelected ? 'border-[#27AE90]/30' : ''}
              `}
              style={{background: isSelected ? '#C2F0D8' : dTotal > 0 ? 'rgba(194,240,216,0.4)' : 'rgba(103,80,164,0.06)'}}
            >
              <span className="text-xs font-bold" style={{color: dTotal > 0 || isSelected ? '#1C1B1F' : '#79747E'}}>{dayNum}</span>
              {dTotal > 0 && <span className="text-[8px] font-black leading-none mt-0.5" style={{color:'#27AE90'}}>{dTotal}L</span>}
            </motion.button>
          );
        })}
      </div>

      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${new Date(selectedDate).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})} Intake`} isCentered={true}>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {dayEntries.length === 0 && (
            <div className="text-center py-8">
               <p className="mb-4" style={{color:'#79747E'}}>No intake logged for this day.</p>
               <motion.button whileTap={{scale:0.95}} onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-full text-xs font-bold" style={{background:'#C2F0D8', color:'#1A6B4A'}}>Add Now</motion.button>
            </div>
          )}
          {[...dayEntries].reverse().map(e => (
            <div key={e.id} className="flex justify-between items-center p-4 rounded-2xl" style={{background:'var(--m3-swipe-inner)', border:'1px solid var(--m3-swipe-inner-border)'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'#DBEAFE', color:'#1565C0'}}>
                  <Droplet size={18} />
                </div>
                <div>
                  <p className="font-bold" style={{color:'var(--m3-on-surface)'}}>{e.qty}L</p>
                  <p className="text-[10px] font-bold uppercase" style={{color:'var(--m3-on-surface-muted)'}}>{new Date(Number(e.id)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              <motion.button whileTap={{scale:0.9}} onClick={async () => { await db.delete('water', e.id); loadEntries(); }} className="p-2 rounded-full transition-colors" style={{color:'#C0392B'}}>
                <Trash2 size={18}/>
              </motion.button>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

// ==========================================
// 10. EXPENSE MODULE (GROCERY, ELEC, etc)
// ==========================================
function ExpenseView({ type, title, icon: Icon, filterDate, setFilterDate, settings }) {
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [formData, setFormData] = useState({});

  const loadEntries = useCallback(async () => {
    const all = await db.getAll(type);
    const filtered = all.filter(e => {
      const d = new Date(e.date || e.paymentDate);
      return d.getMonth() === filterDate.getMonth() && d.getFullYear() === filterDate.getFullYear();
    });
    setEntries(filtered.sort((a, b) => new Date(b.date || b.paymentDate) - new Date(a.date || a.paymentDate)));
  }, [type, filterDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totalAmount = entries.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const openAdd = () => {
    setEditingEntry(null);
    const today = new Date().toISOString().split('T')[0];
    if (type === 'grocery') setFormData({ purchasedFrom: '', date: today, amount: '', accountName: '', note: '' });
    else if (type.startsWith('electricity') || type === 'water_bill') setFormData({ amount: '', dueDate: today, paymentDate: today, note: '' });
    else setFormData({ itemName: '', amount: '', paymentDate: today, note: '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const item = { id: editingEntry?.id || Date.now().toString(), ...formData };
    await db.put(type, item);
    setIsModalOpen(false);
    loadEntries();
  };

  const handleDelete = async (id) => {
    await db.delete(type, id);
    loadEntries();
  };

  return (
    <div>
      <StickyHeader title={title} date={filterDate} setDate={setFilterDate} />
      
      <GlassCard className="p-6 mb-6" style={{background:'linear-gradient(135deg,#F8F4FF 0%,#EEF6FF 100%)', border:'1px solid #EDE7F6'}}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'#79747E'}}>Monthly Spending</p>
        <p className="text-4xl font-black" style={{color:'#1C1B1F'}}>{settings.currency}{totalAmount}</p>
      </GlassCard>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold" style={{color:'#1C1B1F'}}>Record History</h3>
        <motion.button whileTap={{scale:0.95}} onClick={openAdd} className="px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2" style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)', color:'#fff', boxShadow:'0 2px 10px rgba(103,80,164,0.25)'}}>
          <Plus size={16}/> Add Record
        </motion.button>
      </div>

      <div className="space-y-3">
        {entries.length === 0 && <p className="text-center py-8" style={{color:'var(--m3-on-surface-muted)'}}>No records found for this month.</p>}
        {entries.map(e => (
          <SwipeableItem key={e.id} onDelete={() => handleDelete(e.id)} onEdit={() => { setEditingEntry(e); setFormData(e); setIsModalOpen(true); }}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background:'#F3EEFF', color:'#6750A4'}}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate" style={{color:'var(--m3-on-surface)'}}>
                    {e.itemName || e.purchasedFrom || title}
                  </p>
                  <p className="text-[10px] uppercase font-bold" style={{color:'var(--m3-on-surface-muted)'}}>
                    {new Date(e.date || e.paymentDate).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}
                    {e.accountName && ` • ${e.accountName}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black" style={{color:'var(--m3-on-surface)'}}>{settings.currency}{e.amount}</p>
              </div>
            </div>
          </SwipeableItem>
        ))}
      </div>

      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingEntry ? 'Edit' : 'Add'} ${title}`} isCentered={true}>
        <div className="space-y-4">
          {type === 'grocery' && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Purchased From</label>
                <input type="text" value={formData.purchasedFrom} onChange={e => setFormData({...formData, purchasedFrom: e.target.value})} className="m3-input" placeholder="Store Name" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="m3-input" />
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{color:'var(--m3-on-surface-muted)'}}>{settings.currency}</span>
                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="m3-input pl-8" placeholder="0.00" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Account Name</label>
                <input type="text" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="m3-input" placeholder="Payment Method" />
              </div>
            </>
          )}

          {(type.startsWith('electricity') || type === 'water_bill') && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{color:'var(--m3-on-surface-muted)'}}>{settings.currency}</span>
                  <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="m3-input pl-8" placeholder="0.00" />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="m3-input" />
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Payment Date</label>
                  <input type="date" value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} className="m3-input" />
                </div>
              </div>
            </>
          )}

          {type === 'other_expenses' && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Item Name</label>
                <input type="text" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} className="m3-input" placeholder="Describe expense" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{color:'var(--m3-on-surface-muted)'}}>{settings.currency}</span>
                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="m3-input pl-8" placeholder="0.00" />
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Payment Date</label>
                  <input type="date" value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} className="m3-input" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider pl-1 mb-1 block" style={{color:'#6750A4'}}>Note</label>
            <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="m3-input min-h-[80px]" placeholder="Add details..." />
          </div>

          <div className="pt-4 flex gap-3">
            {editingEntry && (
              <motion.button whileTap={{scale:0.97}} onClick={() => handleDelete(editingEntry.id)} className="flex-1 font-bold py-4 rounded-2xl" style={{background:'#FFEBEB', color:'#C0392B'}}>Delete</motion.button>
            )}
            <motion.button whileTap={{scale:0.97}} onClick={handleSave} className="flex-[2] font-bold py-4 rounded-2xl" style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)', color:'#fff', boxShadow:'0 4px 16px rgba(103,80,164,0.3)'}}>
              {editingEntry ? 'Update' : 'Submit'}
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
