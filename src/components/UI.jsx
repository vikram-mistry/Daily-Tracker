import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2, LayoutGrid, Train
} from 'lucide-react';
import { db } from '../db';

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

const StickyHeader = ({ title, date, setDate, hideMonthFilter = false }) => {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const handlePrev = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  const handleNext = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  return (
    <div className="sticky top-0 pt-12 pb-4 px-2 z-30 flex justify-between items-end mb-6" style={{background:'var(--m3-header-bg)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid var(--m3-header-border)'}}>
      <h1 className="text-2xl font-bold tracking-tight pl-12" style={{color:'var(--m3-on-surface)'}}>{title}</h1>
      {!hideMonthFilter && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{background:'var(--m3-input-bg)', border:'1px solid var(--m3-input-border)'}}>
          <motion.button whileTap={{scale:0.85}} onClick={handlePrev} style={{color:'#6750A4'}}><ChevronLeft size={16}/></motion.button>
          <span className="text-sm font-semibold min-w-[68px] text-center" style={{color:'var(--m3-on-surface)'}}>
            {monthNames[date.getMonth()]} {date.getFullYear()}
          </span>
          <motion.button whileTap={{scale:0.85}} onClick={handleNext} style={{color:'#6750A4'}}><ChevronRight size={16}/></motion.button>
        </div>
      )}
    </div>
  );
};


export { GlassCard, SwipeableItem, BottomSheet, StickyHeader };