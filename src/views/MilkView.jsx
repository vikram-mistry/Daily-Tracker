import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplet, PauseCircle, Share2, Plus, Trash2, Edit3, Check, Milk,
} from 'lucide-react';
import { db, getEffectiveMilkPrice, getEffectiveMilkQty } from '../db';
import { GlassCard, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';

function MilkView({ filterDate, setFilterDate, settings }) {
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Selection Mode for Pause
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: todayStr,
    qty: getEffectiveMilkQty(todayStr, settings),
    price: getEffectiveMilkPrice(todayStr, settings),
  });

  const loadEntries = useCallback(async () => {
    const all = await db.getAll('milk');
    const yearStr = String(filterDate.getFullYear());
    const monthStr = String(filterDate.getMonth() + 1).padStart(2, '0');
    const targetMonth = `${yearStr}-${monthStr}`;
    const filtered = all.filter((e) => e && e.date && e.date.startsWith(targetMonth));
    setEntries(filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }, [filterDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    const handleSync = () => loadEntries();
    window.addEventListener('db-synced', handleSync);
    return () => window.removeEventListener('db-synced', handleSync);
  }, [loadEntries]);

  /* ── Stats ─────────────────────────── */
  const stats = useMemo(() => {
    let qty = 0, amount = 0, active = 0, pause = 0;
    entries.forEach((e) => {
      if (e.isPaused) pause++;
      else { active++; qty += Number(e.qty); amount += Number(e.total); }
    });
    return { qty, amount, active, pause };
  }, [entries]);

  /* ── Handlers ──────────────────────── */
  const handleSave = async () => {
    const total = formData.qty * formData.price;
    const item = {
      id: editingEntry?.id || Date.now().toString(),
      date: formData.date,
      qty: formData.qty,
      price: formData.price,
      total,
      isPaused: false,
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
    const existing = entries.find((e) => e.date === dateStr);
    if (existing) {
      if (!existing.isPaused) {
        await db.put('milk', { ...existing, isPaused: true, qty: 0, total: 0 });
      } else {
        const effQty = getEffectiveMilkQty(dateStr, settings);
        const effPrice = getEffectiveMilkPrice(dateStr, settings);
        await db.put('milk', {
          ...existing,
          isPaused: false,
          qty: effQty,
          price: effPrice,
          total: Number((effQty * effPrice).toFixed(2)),
        });
      }
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
    setFormData({
      date: dateStr,
      qty: getEffectiveMilkQty(dateStr, settings),
      price: getEffectiveMilkPrice(dateStr, settings),
    });
    setIsModalOpen(true);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  /* ── Share Report ──────────────────── */
  const handleShareReport = async () => {
    const monthYear = `${monthNames[filterDate.getMonth()]} ${filterDate.getFullYear()}`;
    const sorted = [...entries].filter((e) => !e.isPaused).sort((a, b) => new Date(a.date) - new Date(b.date));
    const pausedDays = entries.filter((e) => e.isPaused);

    const lines = [
      `🏠 *Lotus Residency CHS Milk Bill Report — ${monthYear}*`,
      `📍 Address: 1904 / A-WING`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 Total Quantity : *${stats.qty} L*`,
      `💰 Total Amount   : *${settings.currency}${stats.amount.toFixed(2)}*`,
      `✅ Active Days    : ${stats.active}`,
      `⏸️ Paused Days   : ${stats.pause}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 *Daily Breakdown:*`,
      ``,
      ...sorted.map((e) => {
        const d = new Date(e.date);
        const day = String(d.getDate()).padStart(2, '0');
        const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
        return `  ${day} ${mon}  —  ${e.qty}L  ×  ${settings.currency}${e.price}  =  ${settings.currency}${Number(e.total).toFixed(2)}`;
      }),
      ...(pausedDays.length > 0
        ? [
            ``,
            `⏸️ *Paused Dates:*`,
            ...pausedDays.map((e) => {
              const d = new Date(e.date);
              const day = String(d.getDate()).padStart(2, '0');
              const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
              return `  ${day} ${mon}  —  No Delivery`;
            }),
          ]
        : []),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💳 *Please pay: ${settings.currency}${stats.amount.toFixed(2)}*`,
      ``,
      `Shared via Trackit App 📱`,
    ];

    const reportText = lines.join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: `Lotus Residency CHS Milk Bill Report – ${monthYear}`, text: reportText });
      } else {
        await navigator.clipboard.writeText(reportText);
        alert('Report copied to clipboard!');
      }
    } catch (err) {
      // User cancelled share
    }
  };

  /* ── Calendar days ─────────────────── */
  const daysInMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0).getDate();
  const calYearStr = String(filterDate.getFullYear());
  const calMonthStr = String(filterDate.getMonth() + 1).padStart(2, '0');
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) =>
    `${calYearStr}-${calMonthStr}-${String(i + 1).padStart(2, '0')}`
  );
  const firstDayOffset = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1).getDay();

  const totalTrackedDays = stats.active + stats.pause;
  const deliveryRate = totalTrackedDays > 0 ? Math.round((stats.active / totalTrackedDays) * 100) : 0;

  return (
    <div>
      <StickyHeader title="Milk" date={filterDate} setDate={setFilterDate} />

      {/* ── Summary Hero Card ───────────────── */}
      <GlassCard className="p-4 mb-4">
        {/* Top Tier: Amount & Quantity on left, Share & Cow/Milk icon on right */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                Milk Delivery
              </span>
              <span className="text-[11px]" style={{ color: 'var(--label-tertiary)' }}>•</span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--label-secondary)' }}>
                {monthNames[filterDate.getMonth()]}
              </span>
            </div>
            <p className="text-[32px] font-bold tracking-tight leading-none" style={{ color: 'var(--label-primary)' }}>
              {settings.currency}{Number(stats.amount).toFixed(2)}
            </p>
            <p className="text-[13px] font-medium mt-1.5" style={{ color: 'var(--label-secondary)' }}>
              {stats.qty} <span style={{ color: 'var(--label-tertiary)' }}>Liters delivered this month</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleShareReport}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity active:opacity-70"
              style={{ background: 'var(--accent-light)' }}
              title="Share Bill Report"
              aria-label="Share Bill Report"
            >
              <Share2 size={17} style={{ color: 'var(--accent)' }} />
            </button>
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden" 
              style={{ background: 'var(--accent-light)' }}
            >
              <img 
                src="./cow-icon.png" 
                alt="Milk" 
                className="w-8 h-8 object-contain" 
                onError={(e) => { 
                  e.target.style.display = 'none'; 
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; 
                }} 
              />
              <Milk size={22} style={{ color: 'var(--accent)', display: 'none' }} />
            </div>
          </div>
        </div>

        {/* Subtle Separator */}
        <div className="my-3.5" style={{ borderTop: '0.5px solid var(--separator)' }} />

        {/* Bottom Tier: 2 values shifted down into visual status pills */}
        <div className="grid grid-cols-2 gap-2.5">
          <div 
            className="flex items-center gap-2.5 p-2.5 rounded-xl"
            style={{ background: 'var(--green-light)' }}
          >
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--green)', color: '#fff' }}
            >
              <Check size={14} strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--green)' }}>
                Active Days
              </p>
              <p className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--label-primary)' }}>
                {stats.active} <span className="text-[11px] font-normal" style={{ color: 'var(--label-secondary)' }}>days</span>
              </p>
            </div>
          </div>

          <div 
            className="flex items-center gap-2.5 p-2.5 rounded-xl"
            style={{ background: 'var(--orange-light)' }}
          >
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--orange)', color: '#fff' }}
            >
              <PauseCircle size={15} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--orange)' }}>
                Paused Days
              </p>
              <p className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--label-primary)' }}>
                {stats.pause} <span className="text-[11px] font-normal" style={{ color: 'var(--label-secondary)' }}>days</span>
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Consistency Progress Bar */}
        {totalTrackedDays > 0 && (
          <div className="mt-3 pt-2.5" style={{ borderTop: '0.5px solid var(--separator)' }}>
            <div className="flex justify-between items-center text-[11px] mb-1.5">
              <span style={{ color: 'var(--label-tertiary)' }}>Delivery Rate</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--green)' }}>
                {deliveryRate}% on track
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fill-tertiary)' }}>
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ 
                  width: `${deliveryRate}%`, 
                  background: 'var(--green)' 
                }} 
              />
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Calendar Header ───────────────── */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-tertiary)' }}>
          Daily Tracking
        </p>
        <button
          onClick={() => { setIsSelectMode(!isSelectMode); setSelectedDates([]); }}
          className="text-[13px] font-medium px-3 py-1 rounded-full"
          style={{
            background: isSelectMode ? 'var(--green-light)' : 'var(--fill-quaternary)',
            color: isSelectMode ? 'var(--green)' : 'var(--label-secondary)',
          }}
        >
          {isSelectMode ? 'Cancel' : 'Bulk Pause'}
        </button>
      </div>

      {/* ── Calendar Grid ─────────────────── */}
      <GlassCard className="p-3 mb-4">
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-medium py-1" style={{ color: 'var(--label-tertiary)' }}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty offset cells */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {calendarDays.map((dateStr) => {
            const entry = entries.find((e) => e.date === dateStr);
            const isSelected = selectedDates.includes(dateStr);
            const dayNum = parseInt(dateStr.split('-')[2], 10);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            let bg = 'transparent';
            let textColor = 'var(--label-primary)';
            let border = 'none';

            if (isSelected) {
              bg = 'var(--accent)';
              textColor = '#FFFFFF';
            } else if (entry?.isPaused) {
              bg = 'var(--orange-light)';
              textColor = 'var(--orange)';
            } else if (entry) {
              bg = 'var(--green-light)';
              textColor = 'var(--label-primary)';
            } else {
              bg = 'var(--fill-quaternary)';
              textColor = 'var(--label-secondary)';
            }

            if (isToday && !isSelected) {
              border = '2px solid var(--accent)';
            }

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (isSelectMode) {
                    setSelectedDates((prev) =>
                      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
                    );
                  } else {
                    if (entry && entry.isPaused) togglePauseStatus(dateStr);
                    else if (entry) openEdit(entry);
                    else openAdd(dateStr);
                  }
                }}
                onContextMenu={(e) => { e.preventDefault(); togglePauseStatus(dateStr); }}
                className="aspect-square rounded-lg flex flex-col items-center justify-center relative"
                style={{ background: bg, border, minHeight: 40 }}
              >
                <span className="text-[13px] font-medium" style={{ color: textColor }}>{dayNum}</span>
                {entry && !entry.isPaused && (
                  <span className="text-[9px] font-semibold" style={{ color: 'var(--green)' }}>
                    {entry.qty}L
                  </span>
                )}
                {entry?.isPaused && (
                  <PauseCircle size={10} className="absolute bottom-0.5" style={{ color: 'var(--orange)' }} />
                )}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* ── Bulk Action Bar ───────────────── */}
      <AnimatePresence>
        {isSelectMode && selectedDates.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto"
          >
            <button
              onClick={handleBulkPause}
              className="w-full font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 text-[15px] text-white"
              style={{ background: 'var(--orange)' }}
            >
              <PauseCircle size={18} />
              Mark {selectedDates.length} {selectedDates.length === 1 ? 'Day' : 'Days'} as Paused
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Entries List ──────────────────── */}
      <div className="mt-2">
        <div className="flex justify-between items-center mb-3">
          <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-tertiary)' }}>
            Entries
          </p>
          <button
            onClick={() => openAdd()}
            className="text-[13px] font-medium px-3 py-1 rounded-full flex items-center gap-1"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {entries.length === 0 && (
          <p className="text-center py-6 text-[13px]" style={{ color: 'var(--label-secondary)' }}>
            No entries this month.
          </p>
        )}

        {entries.map((entry) => (
          <SwipeableItem key={entry.id} onDelete={() => setDeleteConfirmId(entry.id)} onEdit={() => openEdit(entry)}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: entry.isPaused ? 'var(--orange-light)' : 'var(--accent-light)',
                    color: entry.isPaused ? 'var(--orange)' : 'var(--accent)',
                  }}
                >
                  {entry.isPaused ? <PauseCircle size={18} /> : <Droplet size={18} />}
                </div>
                <div>
                  <p className="text-[15px] font-medium" style={{ color: 'var(--label-primary)' }}>
                    {new Date(entry.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--label-secondary)' }}>
                    {entry.isPaused ? 'Paused' : `${entry.qty}L @ ${settings.currency}${entry.price}`}
                  </p>
                </div>
              </div>
              <p className="text-[15px] font-semibold tabular-nums" style={{ color: entry.isPaused ? 'var(--label-tertiary)' : 'var(--label-primary)' }}>
                {entry.isPaused ? '—' : `${settings.currency}${Number(entry.total).toFixed(2)}`}
              </p>
            </div>
          </SwipeableItem>
        ))}
      </div>

      {/* ── Add/Edit Modal ────────────────── */}
      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry ? 'Edit Milk Entry' : 'Add Milk Entry'}
        isCentered={true}
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--accent)' }}>
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => {
                const newDate = e.target.value;
                if (!editingEntry) {
                  setFormData({
                    date: newDate,
                    qty: getEffectiveMilkQty(newDate, settings),
                    price: getEffectiveMilkPrice(newDate, settings),
                  });
                } else {
                  setFormData({ ...formData, date: newDate });
                }
              }}
              className="m3-input mt-1 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--accent)' }}>
              Quantity (L)
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
              className="m3-input mt-1 text-xl font-semibold"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--accent)' }}>
              Price / L
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: 'var(--label-secondary)' }}>
                {settings.currency}
              </span>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="m3-input mt-1 pl-7 text-xl font-semibold"
              />
            </div>
          </div>
          <div className="pt-3 flex gap-2.5">
            {editingEntry && (
              <button
                onClick={() => handleDelete(editingEntry.id)}
                className="flex-1 font-semibold py-3 rounded-xl text-[15px]"
                style={{ background: 'var(--red-light)', color: 'var(--red)' }}
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-[2] font-semibold py-3 rounded-xl text-[15px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              Save Entry
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Delete Confirmation ────────────── */}
      <BottomSheet
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Record?"
        isCentered={true}
      >
        <div className="space-y-4">
          <p className="text-[15px]" style={{ color: 'var(--label-secondary)' }}>
            Are you sure you want to delete this milk entry? This action cannot be undone.
          </p>
          <div className="flex gap-2.5 mt-4">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 font-semibold py-3 rounded-xl text-[15px]"
              style={{ background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null); }}
              className="flex-1 font-semibold py-3 rounded-xl text-[15px] text-white"
              style={{ background: 'var(--red)' }}
            >
              Delete
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default MilkView;