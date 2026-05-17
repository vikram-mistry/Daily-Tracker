import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2, LayoutGrid, Train
} from 'lucide-react';
import { db } from '../db';
import { GlassCard, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';

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
    setIsModalOpen(false);
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
        <img src="./cow-icon.png" alt="Happy Cow" className="absolute pointer-events-none" style={{width:'100px', height:'100px', right:'0px', bottom:'20px', objectFit:'contain', opacity:0.85}} />
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
          whileTap={{ scale: 0.9 }}
          onClick={handleShareReport}
          className="relative z-10 mt-4 flex items-center justify-center w-10 h-10 rounded-full"
          style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)', color:'#fff', boxShadow:'0 4px 12px rgba(103,80,164,0.3)'}}
        >
          <Share2 size={18} />
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


export default MilkView;