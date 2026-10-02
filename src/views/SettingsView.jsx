import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2, LayoutGrid, Train,
  LogIn, LogOut, RefreshCw, Clock, History, CheckCircle2
} from 'lucide-react';
import { db, getEffectiveMilkPrice, getEffectiveMilkQty, reconcileMilkPriceFromDate, reconcileMilkQtyFromDate } from '../db';
import { GlassCard, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';
import { auth, provider, signInWithPopup, signOut } from '../firebase';

// Static top-level component to avoid re-mounting inputs on parent re-render (fixes keyboard blur bug)
const SettingBlock = ({ label, children }) => (
  <div className="flex justify-between items-center py-4 last:border-0" style={{ borderBottom: '1px solid var(--m3-divider)' }}>
    <span className="font-medium" style={{ color: 'var(--m3-on-surface)' }}>{label}</span>
    <div className="w-1/2 text-right">{children}</div>
  </div>
);

function SettingsView({ settings, updateSettings, db }) {
  const [user, setUser] = useState(auth.currentUser);
  const [syncing, setSyncing] = useState(false);

  // Local draft states for general & gas inputs to prevent keyboard blur
  const [currencyDraft, setCurrencyDraft] = useState(settings.currency ?? '₹');
  const [gasWeightDraft, setGasWeightDraft] = useState(settings.gasWeight !== undefined ? String(settings.gasWeight) : '14.2');

  useEffect(() => {
    setCurrencyDraft(settings.currency ?? '₹');
  }, [settings.currency]);

  useEffect(() => {
    setGasWeightDraft(settings.gasWeight !== undefined ? String(settings.gasWeight) : '14.2');
  }, [settings.gasWeight]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentActiveRate = useMemo(() => getEffectiveMilkPrice(todayStr, settings), [todayStr, settings]);
  const currentActiveQty = useMemo(() => getEffectiveMilkQty(todayStr, settings), [todayStr, settings]);

  // Modals for Price and Quantity Schedules
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [editingPriceRule, setEditingPriceRule] = useState(null);
  const [priceForm, setPriceForm] = useState({
    price: '',
    fromDate: todayStr
  });

  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [editingQtyRule, setEditingQtyRule] = useState(null);
  const [qtyForm, setQtyForm] = useState({
    qty: '',
    fromDate: todayStr
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        db.syncUpAndDown();
      }
    });
    return unsubscribe;
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      alert('Logged in successfully! Syncing your data...');
    } catch (e) {
      alert('Login failed: ' + e.message);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out? Your offline data remains safe.')) {
      try {
        await signOut(auth);
        setUser(null);
        alert('Logged out successfully.');
      } catch (e) {
        alert('Sign out failed.');
      }
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await db.syncUpAndDown();
      alert('Sync Complete!');
    } catch (e) {
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

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
        custom: await db.getAll('custom'),
        maintenance: await db.getAll('maintenance')
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
        await db.restoreBackup(data);
        alert('Data imported and synced to cloud successfully! App will reload.');
        window.location.reload();
      } catch (err) {
        console.error("Import error", err);
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const commitCurrency = () => {
    if (currencyDraft !== settings.currency) {
      updateSettings({ currency: currencyDraft || '₹' });
    }
  };

  const commitGasWeight = () => {
    const val = parseFloat(gasWeightDraft);
    if (!isNaN(val) && val > 0 && val !== settings.gasWeight) {
      updateSettings({ gasWeight: val });
    } else {
      setGasWeightDraft(String(settings.gasWeight ?? 14.2));
    }
  };

  // Price Schedule Management
  const sortedPriceHistory = useMemo(() => {
    const history = settings.milkPriceHistory || [];
    return [...history].sort((a, b) => b.fromDate.localeCompare(a.fromDate));
  }, [settings.milkPriceHistory]);

  const activePriceRuleId = useMemo(() => {
    const history = settings.milkPriceHistory || [];
    const applicable = [...history].filter(r => r.fromDate <= todayStr).sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    return applicable.length > 0 ? applicable[applicable.length - 1].id : null;
  }, [settings.milkPriceHistory, todayStr]);

  const openAddPriceModal = () => {
    setEditingPriceRule(null);
    setPriceForm({
      price: String(currentActiveRate || 84),
      fromDate: todayStr
    });
    setPriceModalOpen(true);
  };

  const openEditPriceModal = (rule) => {
    setEditingPriceRule(rule);
    setPriceForm({
      price: String(rule.price),
      fromDate: rule.fromDate
    });
    setPriceModalOpen(true);
  };

  const handleSavePriceRule = async () => {
    const priceNum = parseFloat(priceForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price per liter.');
      return;
    }
    if (!priceForm.fromDate) {
      alert('Please select an effective from date.');
      return;
    }

    const currentHistory = settings.milkPriceHistory || [];
    let updatedHistory;

    if (editingPriceRule) {
      updatedHistory = currentHistory.map(r => 
        r.id === editingPriceRule.id ? { ...r, price: priceNum, fromDate: priceForm.fromDate } : r
      );
    } else {
      updatedHistory = [
        ...currentHistory,
        {
          id: Date.now().toString(),
          price: priceNum,
          fromDate: priceForm.fromDate
        }
      ];
    }

    const updatedSettings = { 
      ...settings, 
      milkPriceHistory: updatedHistory,
      ...(priceForm.fromDate <= todayStr ? { milkPrice: priceNum } : {})
    };
    await updateSettings(updatedSettings);
    setPriceModalOpen(false);
    setEditingPriceRule(null);

    // SAFEGUARD: Only reconcile active entries on or after priceForm.fromDate
    const count = await reconcileMilkPriceFromDate(priceForm.fromDate, priceNum);
    alert(`Price rate of ${settings.currency}${priceNum}/L saved! Updated ${count} milk ${count === 1 ? 'entry' : 'entries'} on or after ${formatDateDisplay(priceForm.fromDate)}. All earlier entries remain untouched.`);
  };

  const handleDeletePriceRule = async (id) => {
    if (!window.confirm('Delete this rate change from schedule? Note: Past recorded entries will not be altered.')) return;
    const currentHistory = settings.milkPriceHistory || [];
    const updatedHistory = currentHistory.filter(r => r.id !== id);
    const updatedSettings = { ...settings, milkPriceHistory: updatedHistory };
    await updateSettings(updatedSettings);
    alert('Price rate removed from schedule.');
  };

  // Quantity Schedule Management
  const sortedQtyHistory = useMemo(() => {
    const history = settings.milkQtyHistory || [];
    return [...history].sort((a, b) => b.fromDate.localeCompare(a.fromDate));
  }, [settings.milkQtyHistory]);

  const activeQtyRuleId = useMemo(() => {
    const history = settings.milkQtyHistory || [];
    const applicable = [...history].filter(r => r.fromDate <= todayStr).sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    return applicable.length > 0 ? applicable[applicable.length - 1].id : null;
  }, [settings.milkQtyHistory, todayStr]);

  const openAddQtyModal = () => {
    setEditingQtyRule(null);
    setQtyForm({
      qty: String(currentActiveQty || 1),
      fromDate: todayStr
    });
    setQtyModalOpen(true);
  };

  const openEditQtyModal = (rule) => {
    setEditingQtyRule(rule);
    setQtyForm({
      qty: String(rule.qty),
      fromDate: rule.fromDate
    });
    setQtyModalOpen(true);
  };

  const handleSaveQtyRule = async () => {
    const qtyNum = parseFloat(qtyForm.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Please enter a valid quantity in liters.');
      return;
    }
    if (!qtyForm.fromDate) {
      alert('Please select an effective from date.');
      return;
    }

    const currentHistory = settings.milkQtyHistory || [];
    let updatedHistory;

    if (editingQtyRule) {
      updatedHistory = currentHistory.map(r => 
        r.id === editingQtyRule.id ? { ...r, qty: qtyNum, fromDate: qtyForm.fromDate } : r
      );
    } else {
      updatedHistory = [
        ...currentHistory,
        {
          id: Date.now().toString(),
          qty: qtyNum,
          fromDate: qtyForm.fromDate
        }
      ];
    }

    const updatedSettings = { 
      ...settings, 
      milkQtyHistory: updatedHistory,
      ...(qtyForm.fromDate <= todayStr ? { milkQty: qtyNum } : {})
    };
    await updateSettings(updatedSettings);
    setQtyModalOpen(false);
    setEditingQtyRule(null);

    // SAFEGUARD: Only reconcile active entries on or after qtyForm.fromDate
    const count = await reconcileMilkQtyFromDate(qtyForm.fromDate, qtyNum);
    alert(`Daily quantity of ${qtyNum}L saved! Updated ${count} milk ${count === 1 ? 'entry' : 'entries'} on or after ${formatDateDisplay(qtyForm.fromDate)}. All earlier entries remain untouched.`);
  };

  const handleDeleteQtyRule = async (id) => {
    if (!window.confirm('Delete this quantity change from schedule? Note: Past recorded entries will not be altered.')) return;
    const currentHistory = settings.milkQtyHistory || [];
    const updatedHistory = currentHistory.filter(r => r.id !== id);
    const updatedSettings = { ...settings, milkQtyHistory: updatedHistory };
    await updateSettings(updatedSettings);
    alert('Quantity rule removed from schedule.');
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="pb-8">
      <StickyHeader title="Settings" hideMonthFilter={true} />

      <div className="space-y-6">
        {/* General Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{ color: '#79747E' }}>General</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Currency Symbol">
              <div className="flex items-center justify-end gap-2">
                <input 
                  type="text" 
                  value={currencyDraft} 
                  onChange={e => setCurrencyDraft(e.target.value)} 
                  onBlur={commitCurrency}
                  onKeyDown={e => e.key === 'Enter' && commitCurrency()}
                  className="m3-input text-right w-12" 
                  style={{ padding: '8px', borderRadius: '12px' }} 
                />
                <span className="text-sm font-medium" style={{ color: 'var(--m3-on-surface-muted)' }}>Symbol</span>
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

        {/* Milk Settings */}
        <section>
          <div className="pl-4 pr-1 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#79747E' }}>Milk Rates &amp; Delivery Schedule</h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--m3-on-surface-muted)' }}>
              Scheduled rates &amp; quantities automatically pre-fill as defaults when adding entries in the Milk tab.
            </p>
          </div>

          {/* Price Rate Schedule */}
          <div className="mb-5">
            <div className="flex justify-between items-center pl-4 pr-2 mb-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#79747E' }}>Price Rate Schedule</span>
                <p className="text-[12px] font-semibold" style={{ color: '#6750A4' }}>
                  Current Rate: {settings.currency}{currentActiveRate} / L
                </p>
              </div>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={openAddPriceModal}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                style={{ background: 'linear-gradient(135deg, #6750A4, #4A90D9)', color: '#fff' }}
              >
                <Plus size={14} /> Change Rate
              </motion.button>
            </div>

            <GlassCard className="p-3">
              {sortedPriceHistory.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs" style={{ color: 'var(--m3-on-surface-muted)' }}>
                    Using base rate of {settings.currency}{currentActiveRate}/L.
                  </p>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: '#6750A4' }}>
                    Tap "+ Change Rate" to set a new price from a specific date.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedPriceHistory.map((rule) => {
                    const isActive = rule.id === activePriceRuleId;
                    return (
                      <div 
                        key={rule.id} 
                        className="flex items-center justify-between p-3 rounded-xl border transition-all"
                        style={{
                          background: isActive ? (settings.theme === 'dark' ? 'rgba(52, 211, 153, 0.12)' : '#E8F5E9') : 'var(--m3-input-bg)',
                          borderColor: isActive ? (settings.theme === 'dark' ? '#34D399' : '#81C784') : 'var(--m3-input-border)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--m3-primary-container)', color: 'var(--m3-on-primary-container)' }}>
                            {settings.currency}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base" style={{ color: 'var(--m3-on-surface)' }}>
                                {settings.currency}{rule.price} <span className="text-xs font-normal text-[var(--m3-on-surface-muted)]">/ L</span>
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#2E7D32', color: '#fff' }}>
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--m3-on-surface-muted)' }}>
                              <Calendar size={11} /> From {formatDateDisplay(rule.fromDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditPriceModal(rule)}
                            className="p-2 rounded-full"
                            style={{ color: '#4A90D9' }}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeletePriceRule(rule.id)}
                            className="p-2 rounded-full"
                            style={{ color: '#E05C5C' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Quantity Schedule */}
          <div>
            <div className="flex justify-between items-center pl-4 pr-2 mb-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#79747E' }}>Delivery Quantity Schedule</span>
                <p className="text-[12px] font-semibold" style={{ color: '#16A085' }}>
                  Current Delivery: {currentActiveQty} L / day
                </p>
              </div>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={openAddQtyModal}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                style={{ background: 'linear-gradient(135deg, #1ABC9C, #16A085)', color: '#fff' }}
              >
                <Plus size={14} /> Change Qty
              </motion.button>
            </div>

            <GlassCard className="p-3">
              {sortedQtyHistory.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs" style={{ color: 'var(--m3-on-surface-muted)' }}>
                    Using base quantity of {currentActiveQty} L.
                  </p>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: '#16A085' }}>
                    Tap "+ Change Qty" to set a new quantity from a specific date.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedQtyHistory.map((rule) => {
                    const isActive = rule.id === activeQtyRuleId;
                    return (
                      <div 
                        key={rule.id} 
                        className="flex items-center justify-between p-3 rounded-xl border transition-all"
                        style={{
                          background: isActive ? (settings.theme === 'dark' ? 'rgba(26, 188, 156, 0.12)' : '#E0F2F1') : 'var(--m3-input-bg)',
                          borderColor: isActive ? (settings.theme === 'dark' ? '#1ABC9C' : '#80CBC4') : 'var(--m3-input-border)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(26, 188, 156, 0.15)', color: '#16A085' }}>
                            <Droplet size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base" style={{ color: 'var(--m3-on-surface)' }}>
                                {rule.qty} <span className="text-xs font-normal text-[var(--m3-on-surface-muted)]">L / day</span>
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#00796B', color: '#fff' }}>
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--m3-on-surface-muted)' }}>
                              <Calendar size={11} /> From {formatDateDisplay(rule.fromDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditQtyModal(rule)}
                            className="p-2 rounded-full"
                            style={{ color: '#4A90D9' }}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteQtyRule(rule.id)}
                            className="p-2 rounded-full"
                            style={{ color: '#E05C5C' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        </section>

        {/* Gas Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{ color: '#79747E' }}>Gas Defaults</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Cylinder Weight (KG)">
              <input 
                type="number" 
                step="0.1" 
                value={gasWeightDraft} 
                onChange={e => setGasWeightDraft(e.target.value)}
                onBlur={commitGasWeight}
                onKeyDown={e => e.key === 'Enter' && commitGasWeight()}
                className="m3-input text-right w-24" 
                style={{ padding: '8px', borderRadius: '12px' }} 
              />
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Data Management */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{ color: 'var(--m3-section-label)' }}>Data &amp; Storage</h3>
          <GlassCard className="p-2">
            <button onClick={handleExport} className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{ color: 'var(--m3-on-surface)' }}>
              <span className="flex items-center gap-3"><Download size={20} style={{ color: '#4A90D9' }} /> Backup Data (JSON)</span>
              <ChevronRight size={16} style={{ color: 'var(--m3-on-surface-muted)' }} />
            </button>
            <div className="relative w-full">
              <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{ color: 'var(--m3-on-surface)' }}>
                <span className="flex items-center gap-3"><Upload size={20} style={{ color: '#E67E22' }} /> Restore Backup</span>
                <ChevronRight size={16} style={{ color: 'var(--m3-on-surface-muted)' }} />
              </div>
            </div>
            <button onClick={async () => {
              if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                await db.clearAll(); window.location.reload();
              }
            }} className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{ color: '#C0392B' }}>
              <span className="flex items-center gap-3"><Trash2 size={20} /> Delete All Data</span>
            </button>
          </GlassCard>
        </section>

        {/* Footer */}
        <div className="pt-8 pb-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EADDFF,#C8E6FF)' }}>
            <Info size={20} style={{ color: '#6750A4' }} />
          </div>
          <p className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: '#1C1B1F' }}>Trackit Pro</p>
          <p className="text-[10px] mb-4" style={{ color: '#79747E' }}>Version 1.2.0 • Local Offline DB with Firebase Sync</p>
          <div className="flex gap-2 text-[10px] px-3 py-1 rounded-full" style={{ background: '#F3EEFF', color: '#79747E', border: '1px solid #EDE7F6' }}>
            <span>React</span>•<span>Tailwind</span>•<span>IndexedDB</span>•<span>PWA</span>
          </div>
          <p className="text-xs mt-6 font-semibold" style={{ color: '#6750A4' }}>Made by Vikram Mistry</p>
        </div>
      </div>

      {/* Add/Edit Price Rate Modal */}
      <BottomSheet 
        isOpen={priceModalOpen} 
        onClose={() => setPriceModalOpen(false)} 
        title={editingPriceRule ? "Edit Milk Price Rate" : "Add Milk Price Change"}
        isCentered={true}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: '#6750A4' }}>Effective From Date</label>
            <input 
              type="date" 
              value={priceForm.fromDate} 
              onChange={e => setPriceForm({ ...priceForm, fromDate: e.target.value })} 
              className="m3-input mt-1 text-sm" 
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: '#6750A4' }}>Price Per Liter ({settings.currency})</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--m3-on-surface-muted)' }}>{settings.currency}</span>
              <input 
                type="number" 
                step="any" 
                placeholder="e.g. 90"
                value={priceForm.price} 
                onChange={e => setPriceForm({ ...priceForm, price: e.target.value })} 
                className="m3-input mt-1 pl-7 text-xl font-bold" 
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed p-3 rounded-xl" style={{ background: 'var(--m3-input-bg)', color: 'var(--m3-on-surface-muted)' }}>
            💡 This rate applies strictly to deliveries on or after this date. All earlier deliveries remain completely untouched.
          </p>

          <div className="pt-2 flex gap-3">
            <motion.button 
              whileTap={{ scale: 0.97 }} 
              onClick={() => setPriceModalOpen(false)} 
              className="flex-1 font-bold py-3.5 rounded-2xl border" 
              style={{ background: 'var(--m3-input-bg)', borderColor: 'var(--m3-input-border)', color: 'var(--m3-on-surface)' }}
            >
              Cancel
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.97 }} 
              onClick={handleSavePriceRule} 
              className="flex-[2] font-bold py-3.5 rounded-2xl text-white shadow-lg" 
              style={{ background: 'linear-gradient(135deg, #6750A4, #4A90D9)' }}
            >
              Save &amp; Apply
            </motion.button>
          </div>
        </div>
      </BottomSheet>

      {/* Add/Edit Quantity Modal */}
      <BottomSheet 
        isOpen={qtyModalOpen} 
        onClose={() => setQtyModalOpen(false)} 
        title={editingQtyRule ? "Edit Milk Quantity" : "Add Milk Quantity Change"}
        isCentered={true}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: '#16A085' }}>Effective From Date</label>
            <input 
              type="date" 
              value={qtyForm.fromDate} 
              onChange={e => setQtyForm({ ...qtyForm, fromDate: e.target.value })} 
              className="m3-input mt-1 text-sm" 
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: '#16A085' }}>Daily Quantity (Liters)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.5" 
                placeholder="e.g. 1.5"
                value={qtyForm.qty} 
                onChange={e => setQtyForm({ ...qtyForm, qty: e.target.value })} 
                className="m3-input mt-1 text-xl font-bold" 
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed p-3 rounded-xl" style={{ background: 'var(--m3-input-bg)', color: 'var(--m3-on-surface-muted)' }}>
            💡 This quantity applies strictly to deliveries on or after this date. All earlier deliveries remain completely untouched.
          </p>

          <div className="pt-2 flex gap-3">
            <motion.button 
              whileTap={{ scale: 0.97 }} 
              onClick={() => setQtyModalOpen(false)} 
              className="flex-1 font-bold py-3.5 rounded-2xl border" 
              style={{ background: 'var(--m3-input-bg)', borderColor: 'var(--m3-input-border)', color: 'var(--m3-on-surface)' }}
            >
              Cancel
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.97 }} 
              onClick={handleSaveQtyRule} 
              className="flex-[2] font-bold py-3.5 rounded-2xl text-white shadow-lg" 
              style={{ background: 'linear-gradient(135deg, #1ABC9C, #16A085)' }}
            >
              Save &amp; Apply
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default SettingsView;