import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Calendar, Trash2, Edit3, Droplet, Download, Upload, Info, 
  ChevronRight, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { db, getEffectiveMilkPrice, getEffectiveMilkQty, reconcileMilkPriceFromDate, reconcileMilkQtyFromDate } from '../db';
import { GlassCard, BottomSheet, StickyHeader } from '../components/UI';
import { auth, provider, signInWithPopup, signOut } from '../firebase';

// Static iOS grouped table row
const SettingsRow = ({ label, children, isLast = false, isDestructive = false }) => (
  <div 
    className="flex justify-between items-center py-3 px-4 min-h-[44px]" 
    style={{ borderBottom: isLast ? 'none' : '0.5px solid var(--separator)' }}
  >
    <span 
      className="text-[15px] font-normal" 
      style={{ color: isDestructive ? 'var(--red)' : 'var(--label-primary)' }}
    >
      {label}
    </span>
    <div className="flex items-center justify-end">{children}</div>
  </div>
);

function SettingsView({ settings, updateSettings, db }) {
  const [user, setUser] = useState(auth.currentUser);

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
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return unsubscribe;
  }, []);

  const handleExport = async () => {
    try {
      const data = {
        settings: await db.getAll('settings'),
        milk: await db.getAll('milk'),
        gas: await db.getAll('gas')
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
    return [...history]
      .filter(r => r && r.fromDate)
      .sort((a, b) => String(b.fromDate).localeCompare(String(a.fromDate)));
  }, [settings.milkPriceHistory]);

  const activePriceRuleId = useMemo(() => {
    const history = settings.milkPriceHistory || [];
    const applicable = [...history]
      .filter(r => r && r.fromDate && r.fromDate <= todayStr)
      .sort((a, b) => String(a.fromDate).localeCompare(String(b.fromDate)));
    return applicable.length > 0 ? applicable[applicable.length - 1].id : null;
  }, [settings.milkPriceHistory, todayStr]);

  const openAddPriceModal = async () => {
    setEditingPriceRule(null);
    const currentSettings = (await db.get('settings', 'main')) || settings;
    const activeRate = getEffectiveMilkPrice(todayStr, currentSettings);
    setPriceForm({
      price: String(activeRate || 84),
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

    const currentSettings = (await db.get('settings', 'main')) || settings;
    const currentHistory = currentSettings.milkPriceHistory || [];
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
      ...currentSettings, 
      milkPriceHistory: updatedHistory,
      ...(priceForm.fromDate <= todayStr ? { milkPrice: priceNum } : {})
    };
    const saved = await updateSettings(updatedSettings);
    setPriceModalOpen(false);
    setEditingPriceRule(null);

    // SAFEGUARD: Only reconcile active entries on or after priceForm.fromDate using fresh settings
    const count = await reconcileMilkPriceFromDate(priceForm.fromDate, priceNum, saved);
    alert(`Price rate of ${saved.currency || '₹'}${priceNum}/L saved! Updated ${count} milk ${count === 1 ? 'entry' : 'entries'} on or after ${formatDateDisplay(priceForm.fromDate)}. All earlier entries remain untouched.`);
  };

  const handleDeletePriceRule = async (id) => {
    if (!window.confirm('Delete this rate change from schedule? Note: Past recorded entries will not be altered.')) return;
    const currentSettings = (await db.get('settings', 'main')) || settings;
    const currentHistory = currentSettings.milkPriceHistory || [];
    const updatedHistory = currentHistory.filter(r => r.id !== id);
    const updatedSettings = { ...currentSettings, milkPriceHistory: updatedHistory };
    await updateSettings(updatedSettings);
    alert('Price rate removed from schedule.');
  };

  // Quantity Schedule Management
  const sortedQtyHistory = useMemo(() => {
    const history = settings.milkQtyHistory || [];
    return [...history]
      .filter(r => r && r.fromDate)
      .sort((a, b) => String(b.fromDate).localeCompare(String(a.fromDate)));
  }, [settings.milkQtyHistory]);

  const activeQtyRuleId = useMemo(() => {
    const history = settings.milkQtyHistory || [];
    const applicable = [...history]
      .filter(r => r && r.fromDate && r.fromDate <= todayStr)
      .sort((a, b) => String(a.fromDate).localeCompare(String(b.fromDate)));
    return applicable.length > 0 ? applicable[applicable.length - 1].id : null;
  }, [settings.milkQtyHistory, todayStr]);

  const openAddQtyModal = async () => {
    setEditingQtyRule(null);
    const currentSettings = (await db.get('settings', 'main')) || settings;
    const activeQty = getEffectiveMilkQty(todayStr, currentSettings);
    setQtyForm({
      qty: String(activeQty || 1),
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

    const currentSettings = (await db.get('settings', 'main')) || settings;
    const currentHistory = currentSettings.milkQtyHistory || [];
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
      ...currentSettings, 
      milkQtyHistory: updatedHistory,
      ...(qtyForm.fromDate <= todayStr ? { milkQty: qtyNum } : {})
    };
    const saved = await updateSettings(updatedSettings);
    setQtyModalOpen(false);
    setEditingQtyRule(null);

    // SAFEGUARD: Only reconcile active entries on or after qtyForm.fromDate using fresh settings
    const count = await reconcileMilkQtyFromDate(qtyForm.fromDate, qtyNum, saved);
    alert(`Daily quantity of ${qtyNum}L saved! Updated ${count} milk ${count === 1 ? 'entry' : 'entries'} on or after ${formatDateDisplay(qtyForm.fromDate)}. All earlier entries remain untouched.`);
  };

  const handleDeleteQtyRule = async (id) => {
    if (!window.confirm('Delete this quantity change from schedule? Note: Past recorded entries will not be altered.')) return;
    const currentSettings = (await db.get('settings', 'main')) || settings;
    const currentHistory = currentSettings.milkQtyHistory || [];
    const updatedHistory = currentHistory.filter(r => r.id !== id);
    const updatedSettings = { ...currentSettings, milkQtyHistory: updatedHistory };
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
    <div className="pb-12">
      <StickyHeader title="Settings" hideMonthFilter={true} />

      <div className="space-y-6">
        {/* ── General Section ────────────── */}
        <section>
          <p className="text-[12px] font-semibold uppercase tracking-wider pl-4 mb-2" style={{ color: 'var(--label-tertiary)' }}>
            General
          </p>
          <GlassCard>
            <SettingsRow label="Currency Symbol">
              <input 
                type="text" 
                value={currencyDraft} 
                onChange={e => setCurrencyDraft(e.target.value)} 
                onBlur={commitCurrency}
                onKeyDown={e => e.key === 'Enter' && commitCurrency()}
                className="text-right font-medium w-14 py-1 px-2 rounded-lg"
                style={{ background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
              />
            </SettingsRow>
            <SettingsRow label="Appearance" isLast={true}>
              <select 
                value={settings.theme} 
                onChange={e => updateSettings({ theme: e.target.value })} 
                className="text-right font-medium py-1 px-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </SettingsRow>
          </GlassCard>
        </section>

        {/* ── Milk Rates & Delivery Schedule ── */}
        <section>
          <div className="px-4 mb-2">
            <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-tertiary)' }}>
              Milk Rates &amp; Schedule
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--label-secondary)' }}>
              Scheduled rates &amp; quantities pre-fill as defaults for milk delivery logs.
            </p>
          </div>

          {/* Price Rate Schedule */}
          <div className="mb-4">
            <div className="flex justify-between items-center px-4 mb-2">
              <span className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                Active Rate: {settings.currency}{currentActiveRate} / L
              </span>
              <button 
                onClick={openAddPriceModal}
                className="text-[12px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 text-white"
                style={{ background: 'var(--accent)' }}
              >
                <Plus size={13} strokeWidth={2.5} /> Change Rate
              </button>
            </div>

            <GlassCard className="p-2 space-y-1.5">
              {sortedPriceHistory.length === 0 ? (
                <div className="py-3 px-3 text-center">
                  <p className="text-[13px]" style={{ color: 'var(--label-secondary)' }}>
                    Using base rate of {settings.currency}{currentActiveRate}/L.
                  </p>
                </div>
              ) : (
                sortedPriceHistory.map((rule) => {
                  const isActive = rule.id === activePriceRuleId;
                  return (
                    <div 
                      key={rule.id} 
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: isActive ? 'var(--green-light)' : 'var(--fill-quaternary)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px]" 
                          style={{ 
                            background: isActive ? 'var(--green)' : 'var(--fill-tertiary)', 
                            color: isActive ? '#fff' : 'var(--label-secondary)' 
                          }}
                        >
                          {settings.currency}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[15px] tabular-nums" style={{ color: 'var(--label-primary)' }}>
                              {settings.currency}{rule.price} <span className="text-[12px] font-normal" style={{ color: 'var(--label-secondary)' }}>/ L</span>
                            </span>
                            {isActive && (
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full" 
                                style={{ background: 'var(--green)', color: '#fff' }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--label-secondary)' }}>
                            <Calendar size={11} /> From {formatDateDisplay(rule.fromDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditPriceModal(rule)}
                          className="p-2 rounded-full"
                          style={{ color: 'var(--accent)' }}
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeletePriceRule(rule.id)}
                          className="p-2 rounded-full"
                          style={{ color: 'var(--red)' }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </GlassCard>
          </div>

          {/* Quantity Schedule */}
          <div>
            <div className="flex justify-between items-center px-4 mb-2">
              <span className="text-[13px] font-medium" style={{ color: 'var(--green)' }}>
                Active Quantity: {currentActiveQty} L / day
              </span>
              <button 
                onClick={openAddQtyModal}
                className="text-[12px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 text-white"
                style={{ background: 'var(--green)' }}
              >
                <Plus size={13} strokeWidth={2.5} /> Change Qty
              </button>
            </div>

            <GlassCard className="p-2 space-y-1.5">
              {sortedQtyHistory.length === 0 ? (
                <div className="py-3 px-3 text-center">
                  <p className="text-[13px]" style={{ color: 'var(--label-secondary)' }}>
                    Using base quantity of {currentActiveQty} L.
                  </p>
                </div>
              ) : (
                sortedQtyHistory.map((rule) => {
                  const isActive = rule.id === activeQtyRuleId;
                  return (
                    <div 
                      key={rule.id} 
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: isActive ? 'var(--green-light)' : 'var(--fill-quaternary)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px]" 
                          style={{ 
                            background: isActive ? 'var(--green)' : 'var(--fill-tertiary)', 
                            color: isActive ? '#fff' : 'var(--label-secondary)' 
                          }}
                        >
                          <Droplet size={15} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[15px] tabular-nums" style={{ color: 'var(--label-primary)' }}>
                              {rule.qty} <span className="text-[12px] font-normal" style={{ color: 'var(--label-secondary)' }}>L / day</span>
                            </span>
                            {isActive && (
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full" 
                                style={{ background: 'var(--green)', color: '#fff' }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--label-secondary)' }}>
                            <Calendar size={11} /> From {formatDateDisplay(rule.fromDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditQtyModal(rule)}
                          className="p-2 rounded-full"
                          style={{ color: 'var(--accent)' }}
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeleteQtyRule(rule.id)}
                          className="p-2 rounded-full"
                          style={{ color: 'var(--red)' }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </GlassCard>
          </div>
        </section>

        {/* ── Gas Defaults ───────────────── */}
        <section>
          <p className="text-[12px] font-semibold uppercase tracking-wider pl-4 mb-2" style={{ color: 'var(--label-tertiary)' }}>
            Gas Defaults
          </p>
          <GlassCard>
            <SettingsRow label="Cylinder Weight (KG)" isLast={true}>
              <input 
                type="number" 
                step="0.1" 
                value={gasWeightDraft} 
                onChange={e => setGasWeightDraft(e.target.value)}
                onBlur={commitGasWeight}
                onKeyDown={e => e.key === 'Enter' && commitGasWeight()}
                className="text-right font-medium w-20 py-1 px-2 rounded-lg"
                style={{ background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
              />
            </SettingsRow>
          </GlassCard>
        </section>

        {/* ── Data & Storage ─────────────── */}
        <section>
          <p className="text-[12px] font-semibold uppercase tracking-wider pl-4 mb-2" style={{ color: 'var(--label-tertiary)' }}>
            Data &amp; Storage
          </p>
          <GlassCard>
            <button 
              onClick={handleExport} 
              className="w-full flex items-center justify-between py-3.5 px-4 cursor-pointer"
              style={{ borderBottom: '0.5px solid var(--separator)' }}
            >
              <span className="flex items-center gap-3 text-[15px]" style={{ color: 'var(--label-primary)' }}>
                <Download size={18} style={{ color: 'var(--accent)' }} /> Backup Data (JSON)
              </span>
              <ChevronRight size={16} style={{ color: 'var(--label-tertiary)' }} />
            </button>
            <div className="relative w-full">
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport} 
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              />
              <div 
                className="w-full flex items-center justify-between py-3.5 px-4"
                style={{ borderBottom: '0.5px solid var(--separator)' }}
              >
                <span className="flex items-center gap-3 text-[15px]" style={{ color: 'var(--label-primary)' }}>
                  <Upload size={18} style={{ color: 'var(--orange)' }} /> Restore Backup
                </span>
                <ChevronRight size={16} style={{ color: 'var(--label-tertiary)' }} />
              </div>
            </div>
            <button 
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete ALL data? This action cannot be undone.')) {
                  await db.clearAll(); 
                  window.location.reload();
                }
              }} 
              className="w-full flex items-center justify-between py-3.5 px-4 cursor-pointer"
            >
              <span className="flex items-center gap-3 text-[15px]" style={{ color: 'var(--red)' }}>
                <Trash2 size={18} /> Delete All Data
              </span>
              <ChevronRight size={16} style={{ color: 'var(--label-tertiary)' }} />
            </button>
          </GlassCard>
        </section>

        {/* ── App Footer ─────────────────── */}
        <div className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
          <div 
            className="w-10 h-10 rounded-xl mb-2 flex items-center justify-center" 
            style={{ background: 'var(--fill-tertiary)' }}
          >
            <Info size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-primary)' }}>
            Trackit Pro
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--label-secondary)' }}>
            Version 1.2.0 • Offline DB with Cloud Sync
          </p>
          <p className="text-[12px] mt-3 font-medium" style={{ color: 'var(--accent)' }}>
            Made by Vikram Mistry
          </p>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--accent)' }}>
              Effective From Date
            </label>
            <input 
              type="date" 
              value={priceForm.fromDate} 
              onChange={e => setPriceForm({ ...priceForm, fromDate: e.target.value })} 
              className="m3-input mt-1 text-[15px]" 
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--accent)' }}>
              Price Per Liter ({settings.currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold" style={{ color: 'var(--label-secondary)' }}>
                {settings.currency}
              </span>
              <input 
                type="number" 
                step="any" 
                placeholder="e.g. 90"
                value={priceForm.price} 
                onChange={e => setPriceForm({ ...priceForm, price: e.target.value })} 
                className="m3-input mt-1 pl-7 text-xl font-semibold" 
              />
            </div>
          </div>

          <p className="text-[12px] leading-relaxed p-3 rounded-xl" style={{ background: 'var(--fill-quaternary)', color: 'var(--label-secondary)' }}>
            This rate applies strictly to deliveries on or after this date. All earlier deliveries remain completely untouched.
          </p>

          <div className="pt-2 flex gap-2.5">
            <button 
              onClick={() => setPriceModalOpen(false)} 
              className="flex-1 font-semibold py-3 rounded-xl text-[15px]" 
              style={{ background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSavePriceRule} 
              className="flex-[2] font-semibold py-3 rounded-xl text-[15px] text-white" 
              style={{ background: 'var(--accent)' }}
            >
              Save &amp; Apply
            </button>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--green)' }}>
              Effective From Date
            </label>
            <input 
              type="date" 
              value={qtyForm.fromDate} 
              onChange={e => setQtyForm({ ...qtyForm, fromDate: e.target.value })} 
              className="m3-input mt-1 text-[15px]" 
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider pl-0.5" style={{ color: 'var(--green)' }}>
              Daily Quantity (Liters)
            </label>
            <div className="relative">
              <input 
                type="number" 
                step="0.5" 
                placeholder="e.g. 1.5"
                value={qtyForm.qty} 
                onChange={e => setQtyForm({ ...qtyForm, qty: e.target.value })} 
                className="m3-input mt-1 text-xl font-semibold" 
              />
            </div>
          </div>

          <p className="text-[12px] leading-relaxed p-3 rounded-xl" style={{ background: 'var(--fill-quaternary)', color: 'var(--label-secondary)' }}>
            This quantity applies strictly to deliveries on or after this date. All earlier deliveries remain completely untouched.
          </p>

          <div className="pt-2 flex gap-2.5">
            <button 
              onClick={() => setQtyModalOpen(false)} 
              className="flex-1 font-semibold py-3 rounded-xl text-[15px]" 
              style={{ background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveQtyRule} 
              className="flex-[2] font-semibold py-3 rounded-xl text-[15px] text-white" 
              style={{ background: 'var(--green)' }}
            >
              Save &amp; Apply
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default SettingsView;