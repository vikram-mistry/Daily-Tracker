import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, Trash2, Edit3, X } from 'lucide-react';
import { db } from '../db';
import { GlassCard, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';

function GasView({ filterDate, setFilterDate, settings }) {
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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

  // Real-time listener for cloud sync completion
  useEffect(() => {
    const handleSync = () => loadEntries();
    window.addEventListener('db-synced', handleSync);
    return () => window.removeEventListener('db-synced', handleSync);
  }, [loadEntries]);

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
      const uninstall = entry.uninstallDate ? new Date(entry.uninstallDate) : new Date();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);

      if (install <= endOfMonth && uninstall >= startOfMonth) {
        const overlapStart = install > startOfMonth ? install : startOfMonth;
        const overlapEnd = uninstall < endOfMonth ? uninstall : endOfMonth;
        
        const daysInMonth = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
        activeDaysThisMonth += daysInMonth;

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
    setIsModalOpen(false);
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
      uninstallDate: '', 
      amount: '', 
      weight: settings.gasWeight, 
      notes: '' 
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <StickyHeader title="Gas Tracker" date={filterDate} setDate={setFilterDate} />

      {/* Summary Card */}
      <GlassCard className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-2 flex-1 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--label-tertiary)' }}>New Cylinders</p>
              <p className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--label-primary)' }}>{stats.cylindersUsed}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--label-tertiary)' }}>Total Spend</p>
              <p className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--label-primary)' }}>{settings.currency}{stats.totalSpend}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--label-tertiary)' }}>Active Days</p>
              <p className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--orange)' }}>{stats.activeDaysThisMonth}d</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center ml-2 flex-shrink-0" style={{ background: 'var(--orange-light)' }}>
            <Flame size={20} style={{ color: 'var(--orange)' }} />
          </div>
        </div>
      </GlassCard>

      {/* Header and Add button */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-tertiary)' }}>
          Cylinder History
        </p>
        <button 
          onClick={openAdd} 
          className="text-[13px] font-medium px-3.5 py-1 rounded-full flex items-center gap-1 text-white" 
          style={{ background: 'var(--orange)' }}
        >
          <Plus size={14} strokeWidth={2.5} /> Add Cylinder
        </button>
      </div>

      {/* Cylinder List */}
      <div className="space-y-2 pb-6">
        {entries.length === 0 && (
          <p className="text-center py-8 text-[13px]" style={{ color: 'var(--label-secondary)' }}>
            No gas records found.
          </p>
        )}
        {entries.map((entry, idx) => {
          const daysUsed = calculateDays(entry.installDate, entry.uninstallDate);
          const isActive = !entry.uninstallDate;
          return (
            <SwipeableItem key={entry.id} onDelete={() => setDeleteConfirmId(entry.id)} onEdit={() => openEdit(entry)}>
              <div 
                onClick={() => { setViewingEntry(entry); setIsViewModalOpen(true); }} 
                className="flex justify-between items-center cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" 
                    style={{ 
                      background: isActive ? 'var(--orange-light)' : 'var(--fill-tertiary)', 
                      color: isActive ? 'var(--orange)' : 'var(--label-tertiary)' 
                    }}
                  >
                    <Flame size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[15px]" style={{ color: 'var(--label-primary)' }}>
                        Cylinder #{entries.length - idx}
                      </p>
                      {isActive && (
                        <span 
                          className="text-[10px] uppercase px-2 py-0.5 rounded-full font-bold" 
                          style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--label-secondary)' }}>
                      Installed: {new Date(entry.installDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {entry.uninstallDate && (
                      <p className="text-[11px]" style={{ color: 'var(--label-tertiary)' }}>
                        Ended: {new Date(entry.uninstallDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--label-primary)' }}>
                    {settings.currency}{entry.amount}
                  </p>
                  <p className="text-[12px] font-medium mt-0.5 tabular-nums" style={{ color: isActive ? 'var(--orange)' : 'var(--label-secondary)' }}>
                    {daysUsed} Days
                  </p>
                </div>
              </div>
            </SwipeableItem>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <BottomSheet 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEntry ? "Edit Cylinder" : "Add Cylinder"} 
        isCentered={true}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--orange)' }}>
                Install Date
              </label>
              <input 
                type="date" 
                value={formData.installDate} 
                onChange={e => setFormData({ ...formData, installDate: e.target.value })} 
                className="m3-input mt-1 text-[15px]" 
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--orange)' }}>
                End Date (Optional)
              </label>
              <input 
                type="date" 
                value={formData.uninstallDate} 
                onChange={e => setFormData({ ...formData, uninstallDate: e.target.value })} 
                className="m3-input mt-1 text-[15px]" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--orange)' }}>
                Amount ({settings.currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: 'var(--label-secondary)' }}>
                  {settings.currency}
                </span>
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                  className="m3-input pl-7 mt-1 text-xl font-semibold" 
                  placeholder="0.00" 
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--orange)' }}>
                Weight (KG)
              </label>
              <input 
                type="number" 
                step="0.1" 
                value={formData.weight} 
                onChange={e => setFormData({ ...formData, weight: e.target.value })} 
                className="m3-input mt-1 text-xl font-semibold" 
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--label-secondary)' }}>
              Notes (Optional)
            </label>
            <input 
              type="text" 
              value={formData.notes || ''} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })} 
              className="m3-input mt-1 text-[15px]" 
              placeholder="e.g. Bharat Gas / HP Gas"
            />
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
              style={{ background: 'var(--orange)' }}
            >
              Save Cylinder
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* View Details Modal */}
      <BottomSheet 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Cylinder Details" 
        isCentered={true}
      >
        {viewingEntry && (
          <div className="space-y-3 text-[15px]">
            <div className="flex justify-between py-2.5" style={{ borderBottom: '0.5px solid var(--separator)' }}>
              <span style={{ color: 'var(--label-secondary)' }}>Install Date</span>
              <span className="font-medium" style={{ color: 'var(--label-primary)' }}>
                {new Date(viewingEntry.installDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between py-2.5" style={{ borderBottom: '0.5px solid var(--separator)' }}>
              <span style={{ color: 'var(--label-secondary)' }}>End Date</span>
              <span className="font-medium" style={{ color: 'var(--label-primary)' }}>
                {viewingEntry.uninstallDate ? new Date(viewingEntry.uninstallDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active'}
              </span>
            </div>
            <div className="flex justify-between py-2.5" style={{ borderBottom: '0.5px solid var(--separator)' }}>
              <span style={{ color: 'var(--label-secondary)' }}>Amount</span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--label-primary)' }}>
                {settings.currency}{viewingEntry.amount}
              </span>
            </div>
            <div className="flex justify-between py-2.5" style={{ borderBottom: '0.5px solid var(--separator)' }}>
              <span style={{ color: 'var(--label-secondary)' }}>Weight</span>
              <span className="font-medium" style={{ color: 'var(--label-primary)' }}>
                {viewingEntry.weight} kg
              </span>
            </div>
            {viewingEntry.notes && (
              <div className="pt-1">
                <span className="text-[13px] block mb-1" style={{ color: 'var(--label-secondary)' }}>Notes</span>
                <p className="p-3 rounded-xl text-[14px]" style={{ background: 'var(--input-bg)', color: 'var(--label-primary)' }}>
                  {viewingEntry.notes}
                </p>
              </div>
            )}
            
            <div className="pt-3">
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="w-full font-semibold py-3 rounded-xl text-[15px]" 
                style={{ background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <BottomSheet 
        isOpen={deleteConfirmId !== null} 
        onClose={() => setDeleteConfirmId(null)} 
        title="Delete Record?" 
        isCentered={true}
      >
        <div className="space-y-4">
          <p className="text-[15px]" style={{ color: 'var(--label-secondary)' }}>
            Are you sure you want to delete this gas cylinder record? This action cannot be undone.
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

export default GasView;