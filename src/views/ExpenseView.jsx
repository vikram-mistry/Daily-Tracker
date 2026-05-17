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

function ExpenseView({ type, title, icon: Icon, filterDate, setFilterDate, settings }) {
  const [entries, setEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);

  const [formData, setFormData] = useState({});

  const loadEntries = useCallback(async () => {
    const all = await db.getAll(type);
    const isBill = type.startsWith('electricity') || type === 'water_bill' || type === 'other_expenses';
    let filtered = all;
    if (!isBill) {
      filtered = all.filter(e => {
        const d = new Date(e.date || e.paymentDate);
        return d.getMonth() === filterDate.getMonth() && d.getFullYear() === filterDate.getFullYear();
      });
    }
    setEntries(filtered.sort((a, b) => new Date(b.date || b.paymentDate) - new Date(a.date || a.paymentDate)));
  }, [type, filterDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totalAmount = entries.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const isBill = type.startsWith('electricity') || type === 'water_bill' || type === 'other_expenses';

  const handleShareReport = async () => {
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    let reportText = '';
    
    if (isBill) {
      reportText += `📄 *${title} Report*\n`;
      reportText += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      reportText += `💰 Total Amount : *${settings.currency}${totalAmount.toFixed(2)}*\n`;
      reportText += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const byYear = {};
      entries.forEach(e => {
        const d = new Date(e.paymentDate);
        const y = d.getFullYear();
        if (!byYear[y]) byYear[y] = { total: 0, entries: [] };
        byYear[y].total += Number(e.amount);
        byYear[y].entries.push(e);
      });
      
      Object.keys(byYear).sort((a,b)=>b-a).forEach(y => {
        reportText += `📅 *Year ${y}* — ${settings.currency}${byYear[y].total.toFixed(2)}\n`;
        byYear[y].entries.forEach(e => {
           const d = new Date(e.paymentDate);
           const mon = monthNames[d.getMonth()];
           reportText += `  ${mon} — ${settings.currency}${Number(e.amount).toFixed(2)} (Paid: ${d.getDate()} ${mon})\n`;
        });
        reportText += `\n`;
      });
    } else {
      const monthYear = `${monthNames[filterDate.getMonth()]} ${filterDate.getFullYear()}`;
      reportText += `🛒 *${title} Report — ${monthYear}*\n`;
      reportText += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      reportText += `💰 Total Amount : *${settings.currency}${totalAmount.toFixed(2)}*\n`;
      reportText += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      reportText += `📋 *Transactions:*\n\n`;
      
      entries.forEach(e => {
         const d = new Date(e.date || e.paymentDate);
         const day = String(d.getDate()).padStart(2, '0');
         const mon = monthNames[d.getMonth()].substring(0,3);
         const name = e.itemName || e.purchasedFrom || 'Item';
         reportText += `  ${day} ${mon} — ${name}: ${settings.currency}${Number(e.amount).toFixed(2)}\n`;
      });
    }
    reportText += `━━━━━━━━━━━━━━━━━━━━━━━━\nShared via Trackit App 📱`;

    try {
      if (navigator.share) await navigator.share({ title: `${title} Report`, text: reportText });
      else { await navigator.clipboard.writeText(reportText); alert('Report copied!'); }
    } catch (e) {}
  };

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
    setIsModalOpen(false);
    loadEntries();
  };

  let cardIcon = null;
  if (type === 'grocery') cardIcon = './groceries-icon.png';
  else if (type.startsWith('electricity')) cardIcon = './electricity-icon.png';
  else if (type === 'water_bill') cardIcon = './water-icon.png';
  else if (type === 'other_expenses') cardIcon = './travel-icon.png';

  return (
    <div>
      <StickyHeader title={title} date={filterDate} setDate={setFilterDate} hideMonthFilter={isBill} />
      
      <GlassCard 
        className="p-6 mb-6 relative overflow-hidden" 
        style={{
          background: settings.theme === 'dark' 
            ? 'linear-gradient(135deg, #231E3D 0%, #192336 100%)' 
            : 'linear-gradient(135deg,#F8F4FF 0%,#EEF6FF 100%)',
          borderColor: settings.theme === 'dark' ? 'rgba(103, 80, 164, 0.3)' : 'rgba(255, 255, 255, 0.6)'
        }}
      >
        {cardIcon && <img src={cardIcon} alt="Icon" className="absolute pointer-events-none" style={{width:'100px', height:'100px', right:'0px', top:'50%', transform:'translateY(-50%)', objectFit:'contain', opacity: settings.theme === 'dark' ? 0.45 : 0.85}} />}
        <div className="relative z-10 flex flex-col">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color: settings.theme === 'dark' ? 'var(--m3-on-surface-variant)' : '#79747E'}}>{isBill ? 'Total Spending' : 'Monthly Spending'}</p>
            <p className="text-4xl font-black" style={{color: settings.theme === 'dark' ? '#FFFFFF' : '#1C1B1F'}}>{settings.currency}{totalAmount}</p>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleShareReport}
            className="mt-4 flex items-center justify-center w-10 h-10 rounded-full"
            style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)', color:'#fff', boxShadow:'0 4px 12px rgba(103,80,164,0.3)'}}
          >
            <Share2 size={18} />
          </motion.button>
        </div>
      </GlassCard>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold" style={{color: 'var(--m3-on-surface)'}}>Record History</h3>
        <motion.button whileTap={{scale:0.95}} onClick={openAdd} className="px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2" style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)', color:'#fff', boxShadow:'0 2px 10px rgba(103,80,164,0.25)'}}>
          <Plus size={16}/> Add Record
        </motion.button>
      </div>

      <div className="space-y-3">
        {entries.length === 0 && <p className="text-center py-8" style={{color:'var(--m3-on-surface-muted)'}}>{isBill ? 'No records found.' : 'No records found for this month.'}</p>}
        {entries.map(e => (
          <SwipeableItem key={e.id} onDelete={() => handleDelete(e.id)} onEdit={() => { setEditingEntry(e); setFormData(e); setIsModalOpen(true); }}>
            <div className="flex justify-between items-center" onClick={() => { setViewingEntry(e); setIsViewModalOpen(true); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{background:'var(--m3-icon-btn-bg)', color:'var(--m3-icon-btn-color)'}}>
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

      <BottomSheet isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`${title} Details`} isCentered={true}>
        {viewingEntry && (
          <div className="space-y-4 text-sm" style={{color:'var(--m3-on-surface)'}}>
            {type === 'grocery' && (
              <>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Store:</span> <span>{viewingEntry.purchasedFrom}</span></div>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Date:</span> <span>{viewingEntry.date}</span></div>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Amount:</span> <span className="font-bold">{settings.currency}{viewingEntry.amount}</span></div>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Account:</span> <span>{viewingEntry.accountName || '-'}</span></div>
              </>
            )}
            {(type.startsWith('electricity') || type === 'water_bill') && (
              <>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Amount:</span> <span className="font-bold">{settings.currency}{viewingEntry.amount}</span></div>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Due Date:</span> <span>{viewingEntry.dueDate}</span></div>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Payment Date:</span> <span>{viewingEntry.paymentDate}</span></div>
              </>
            )}
            {type === 'other_expenses' && (
              <>
                {viewingEntry.itemName && <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Item:</span> <span>{viewingEntry.itemName}</span></div>}
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Amount:</span> <span className="font-bold">{settings.currency}{viewingEntry.amount}</span></div>
                <div className="flex justify-between border-b pb-2" style={{borderColor:'var(--m3-input-border)'}}><span className="font-semibold text-gray-500">Date:</span> <span>{viewingEntry.paymentDate}</span></div>
              </>
            )}
            <div className="pt-2">
              <span className="font-semibold text-gray-500 block mb-1">Note:</span>
              <p className="bg-gray-50 p-3 rounded-xl border" style={{borderColor:'var(--m3-input-border)'}}>{viewingEntry.note || 'No additional notes'}</p>
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

export default ExpenseView;