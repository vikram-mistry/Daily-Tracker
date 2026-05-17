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
      {/* Glass Animation */}
      <GlassCard 
        className="p-6 mb-8 flex flex-col items-center relative overflow-hidden" 
        style={{
          background: settings.theme === 'dark' 
            ? 'linear-gradient(135deg, #1A3E7C 0%, #1D3557 100%)' 
            : 'linear-gradient(135deg,#DBEAFE 0%,#EFF6FF 100%)',
          borderColor: settings.theme === 'dark' ? 'rgba(37, 99, 235, 0.4)' : 'rgba(255, 255, 255, 0.6)'
        }}
      >
        <div className="relative rounded-b-[32px] rounded-t-lg overflow-hidden shadow-inner" style={{width:'76px', height:'116px', border:'3px solid rgba(37,99,235,0.3)', background: settings.theme === 'dark' ? 'rgba(15,44,89,0.6)' : 'rgba(239,246,255,0.6)'}}>
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
          <p className="text-4xl font-black tracking-tighter" style={{color: settings.theme === 'dark' ? '#FFFFFF' : '#1A1C1E'}}>{totalForSelectedDay}<span className="text-lg ml-1" style={{color: settings.theme === 'dark' ? '#90CAF9' : '#1565C0'}}>L</span></p>
          <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{color: settings.theme === 'dark' ? '#90CAF9' : '#1E3A5F'}}>
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
            style={{
              background: settings.theme === 'dark' ? '#1E3C72' : '#DBEAFE', 
              border: settings.theme === 'dark' ? '1px solid rgba(144,202,249,0.2)' : '1px solid rgba(37,99,235,0.2)', 
              color: settings.theme === 'dark' ? '#90CAF9' : '#1565C0'
            }}
          >
            <Droplet size={18} />
            <span className="text-xs">{qty}L</span>
          </motion.button>
        ))}
      </div>

      {/* Water Calendar Grid */}
      <h3 className="text-base font-bold mb-4" style={{color: 'var(--m3-on-surface)'}}>Monthly View</h3>
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
              style={{
                background: isSelected 
                  ? (settings.theme === 'dark' ? '#A7F3D0' : '#C2F0D8') 
                  : dTotal > 0 
                    ? (settings.theme === 'dark' ? 'rgba(167,243,208,0.2)' : 'rgba(194,240,216,0.4)') 
                    : 'rgba(103,80,164,0.06)'
              }}
            >
              <span className="text-xs font-bold" style={{color: isSelected ? '#064E3B' : (dTotal > 0 ? 'var(--m3-on-surface)' : 'var(--m3-on-surface-muted)')}}>{dayNum}</span>
              {dTotal > 0 && <span className="text-[8px] font-black leading-none mt-0.5" style={{color: settings.theme === 'dark' ? '#34D399' : '#27AE90'}}>{dTotal}L</span>}
            </motion.button>
          );
        })}
      </div>

      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${new Date(selectedDate).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})} Intake`} isCentered={true}>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {dayEntries.length === 0 && (
            <div className="text-center py-8">
               <p className="mb-4" style={{color:'var(--m3-on-surface-muted)'}}>No intake logged for this day.</p>
               <motion.button whileTap={{scale:0.95}} onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-full text-xs font-bold" style={{background:'var(--m3-nav-icon-active-bg)', color:'var(--m3-nav-icon-active-color)'}}>Add Now</motion.button>
            </div>
          )}
          {[...dayEntries].reverse().map(e => (
            <div key={e.id} className="flex justify-between items-center p-4 rounded-2xl" style={{background:'var(--m3-swipe-inner)', border:'1px solid var(--m3-swipe-inner-border)'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{background: settings.theme === 'dark' ? '#1E3C72' : '#DBEAFE', color: settings.theme === 'dark' ? '#90CAF9' : '#1565C0'}}>
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


export default WaterView;