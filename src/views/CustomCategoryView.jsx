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

function CustomCategoryView({ categoryId, categories, settings, filterDate, setFilterDate }) {
  const category = categories.find(c => c.id === categoryId) || {};
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);

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
    setIsModalOpen(false);
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
            <div className="flex justify-between items-center" onClick={() => { setViewingEntry(entry); setIsViewModalOpen(true); }}>
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

      <BottomSheet isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`${category.name} Details`} isCentered={true}>
        {viewingEntry && (
          <div className="space-y-4 text-sm" style={{color:'var(--m3-on-surface)'}}>
            <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Date:</span> <span>{new Date(viewingEntry.date).toLocaleDateString()}</span></div>
            <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Quantity:</span> <span>{viewingEntry.qty} {category.unit}</span></div>
            <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Amount:</span> <span className="font-bold">{settings.currency}{viewingEntry.amount}</span></div>
            <div className="pt-2">
              <span className="font-semibold text-gray-500 block mb-1">Notes:</span>
              <p className="bg-gray-50 p-3 rounded-xl border" style={{borderColor:'var(--m3-input-border)'}}>{viewingEntry.notes || 'No notes available'}</p>
            </div>
            
            <div className="pt-4 flex gap-3">
              <motion.button whileTap={{scale:0.97}} onClick={() => setIsViewModalOpen(false)} className="w-full font-bold py-3 rounded-2xl" style={{background:'var(--m3-input-bg)', color:'var(--m3-on-surface)'}}>
                Close
              </motion.button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}


export default CustomCategoryView;