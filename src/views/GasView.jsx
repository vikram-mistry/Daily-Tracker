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
      uninstallDate: '', amount: '', weight: settings.gasWeight, notes: '' 
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <StickyHeader title="Gas Tracker" date={filterDate} setDate={setFilterDate} />

      {/* Summary Card */}
      <GlassCard 
        className="p-5 mb-6 relative overflow-hidden" 
        style={{
          background: settings.theme === 'dark' 
            ? 'linear-gradient(135deg, #57341C 0%, #3D2515 100%)' 
            : 'linear-gradient(135deg, #FFE0C8 0%, #FFECD8 100%)',
          borderColor: settings.theme === 'dark' ? 'rgba(230, 126, 34, 0.4)' : 'rgba(255, 255, 255, 0.6)'
        }}
      >
        <img src="./gas-icon.png" alt="Gas" className="absolute pointer-events-none" style={{width:'100px', height:'100px', right:'0px', top:'45%', transform:'translateY(-50%)', objectFit:'contain', opacity: settings.theme === 'dark' ? 0.7 : 0.85}} />
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color: settings.theme === 'dark' ? 'var(--m3-on-surface-variant)' : '#49454F'}}>New Cylinders</p>
            <p className="text-3xl font-bold" style={{color: settings.theme === 'dark' ? '#FFFFFF' : '#1C1B1F'}}>{stats.cylindersUsed}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color: settings.theme === 'dark' ? 'var(--m3-on-surface-variant)' : '#49454F'}}>Total Spend</p>
            <p className="text-3xl font-bold" style={{color: settings.theme === 'dark' ? '#FFFFFF' : '#1C1B1F'}}>{settings.currency}{stats.totalSpend}</p>
          </div>
          <div className="col-span-2 pt-3" style={{borderTop: settings.theme === 'dark' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(230,126,34,0.15)'}}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color: settings.theme === 'dark' ? 'var(--m3-on-surface-variant)' : '#49454F'}}>Usage Days This Month</p>
            <p className="text-xl font-bold" style={{color: settings.theme === 'dark' ? '#FFB74D' : '#E67E22'}}>{stats.activeDaysThisMonth} Days</p>
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
             <SwipeableItem key={entry.id} onDelete={() => setDeleteConfirmId(entry.id)} onEdit={() => openEdit(entry)}>
               <div onClick={() => { setViewingEntry(entry); setIsViewModalOpen(true); }} className="flex justify-between items-start">
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

      <BottomSheet isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Gas Details" isCentered={true}>
        {viewingEntry && (
          <div className="space-y-4 text-sm" style={{color:'var(--m3-on-surface)'}}>
            <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Install Date:</span> <span>{new Date(viewingEntry.installDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">End Date:</span> <span>{viewingEntry.uninstallDate ? new Date(viewingEntry.uninstallDate).toLocaleDateString() : 'Active'}</span></div>
            <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Amount:</span> <span className="font-bold">{settings.currency}{viewingEntry.amount}</span></div>
            <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Weight:</span> <span>{viewingEntry.weight} kg</span></div>
            <div className="pt-2">
              <span className="font-semibold text-gray-500 block mb-1">Notes:</span>
              <p className="p-3 rounded-xl border" style={{background:'var(--m3-input-bg)', borderColor:'var(--m3-input-border)'}}>{viewingEntry.notes || 'No notes available'}</p>
            </div>
            
            <div className="pt-4 flex gap-3">
              <motion.button whileTap={{scale:0.97}} onClick={() => setIsViewModalOpen(false)} className="w-full font-bold py-3 rounded-2xl" style={{background:'var(--m3-input-bg)', color:'var(--m3-on-surface)'}}>
                Close
              </motion.button>
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
          <p style={{ color: 'var(--m3-on-surface-variant)' }}>
            Are you sure you want to delete this gas cylinder record? This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <motion.button 
              whileTap={{ scale: 0.97 }} 
              onClick={() => setDeleteConfirmId(null)} 
              className="flex-1 font-bold py-3.5 rounded-2xl border" 
              style={{ background: 'var(--m3-input-bg)', borderColor: 'var(--m3-input-border)', color: 'var(--m3-on-surface)' }}
            >
              Cancel
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.97 }} 
              onClick={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null); }} 
              className="flex-1 font-bold py-3.5 rounded-2xl text-white" 
              style={{ background: '#E05C5C' }}
            >
              Delete
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}


export default GasView;