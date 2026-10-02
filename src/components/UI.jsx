import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, User, Edit3, Trash2 } from 'lucide-react';
import { auth } from '../firebase';

/* ── Card ───────────────────────────────── */
const GlassCard = ({ children, className = '', onClick, style = {} }) => (
  <div
    onClick={onClick}
    style={style}
    className={`m3-card ${onClick ? 'cursor-pointer active:opacity-80' : ''} ${className}`}
  >
    {children}
  </div>
);

/* ── Swipeable List Item ────────────────── */
const SwipeableItem = ({ children, onDelete, onEdit }) => (
  <div className="relative w-full rounded-xl overflow-hidden mb-2 m3-swipe-outer">
    <div className="absolute inset-0 flex items-center justify-between px-5">
      <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent)' }}>
        <Edit3 size={15} /> Edit
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--red)' }}>
        Delete <Trash2 size={15} />
      </div>
    </div>
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={(e, info) => {
        if (info.offset.x < -80 && onDelete) onDelete();
        if (info.offset.x > 80 && onEdit) onEdit();
      }}
      className="relative rounded-xl p-4 z-10 m3-swipe-inner"
    >
      {children}
    </motion.div>
  </div>
);

/* ── Bottom Sheet / Centered Modal ──────── */
const BottomSheet = ({ isOpen, onClose, title, children, isCentered = false }) => {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          />
          <div
            className={`fixed inset-0 z-50 flex ${isCentered ? 'items-center justify-center p-5' : 'items-end'}`}
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <motion.div
              initial={isCentered ? { scale: 0.95, opacity: 0 } : { y: '100%' }}
              animate={isCentered ? { scale: 1, opacity: 1 } : { y: 0 }}
              exit={isCentered ? { scale: 0.95, opacity: 0 } : { y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className={`w-full max-w-md max-h-[85svh] overflow-y-auto m3-sheet`}
              style={{
                borderRadius: isCentered ? '14px' : '14px 14px 0 0',
                paddingBottom: isCentered ? 0 : 'max(16px, env(safe-area-inset-bottom))',
              }}
            >
              {!isCentered && (
                <div
                  className="w-9 h-[5px] rounded-full mx-auto mt-2.5 mb-1"
                  style={{ background: 'var(--sheet-handle)' }}
                />
              )}
              <div className="p-5">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-[17px] font-semibold" style={{ color: 'var(--label-primary)' }}>
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full"
                    aria-label="Close"
                  >
                    <div 
                      className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                      style={{ background: 'var(--fill-tertiary)' }}
                    >
                      <X size={14} strokeWidth={2.5} style={{ color: 'var(--label-secondary)' }} />
                    </div>
                  </button>
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

/* ── iOS-style Navigation Bar ───────────── */
const StickyHeader = ({ title, date, setDate, hideMonthFilter = false }) => {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const handlePrev = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  const handleNext = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));

  return (
    <div
      className="sticky top-0 z-30 -mx-4 px-4"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 22px), 62px)',
        paddingBottom: '14px',
        marginBottom: '16px',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid var(--separator)',
      }}
    >
      <div className="flex justify-between items-center">
        <h1
          className="text-[24px] font-bold tracking-tight"
          style={{ color: 'var(--label-primary)' }}
        >
          {title}
        </h1>
        <button
          onClick={() => window.dispatchEvent(new Event('open-profile'))}
          className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center"
          aria-label="Profile and Sync"
        >
          <div 
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--fill-tertiary)' }}
          >
            {user ? (
              user.photoURL ? (
                <>
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <span
                    className="text-xs font-semibold w-full h-full items-center justify-center hidden"
                    style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
                  >
                    {user.displayName?.[0] || 'U'}
                  </span>
                </>
              ) : (
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  {user.displayName?.[0] || 'U'}
                </span>
              )
            ) : (
              <User size={16} style={{ color: 'var(--label-tertiary)' }} />
            )}
          </div>
        </button>
      </div>

      {!hideMonthFilter && (
        <div className="flex items-center gap-2 mt-1.5">
          <button onClick={handlePrev} className="p-1 -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronLeft size={20} style={{ color: 'var(--accent)' }} />
          </button>
          <span
            className="text-[15px] font-medium min-w-[130px] text-center"
            style={{ color: 'var(--label-primary)' }}
          >
            {months[date.getMonth()]} {date.getFullYear()}
          </span>
          <button onClick={handleNext} className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronRight size={20} style={{ color: 'var(--accent)' }} />
          </button>
        </div>
      )}
    </div>
  );
};

export { GlassCard, SwipeableItem, BottomSheet, StickyHeader };