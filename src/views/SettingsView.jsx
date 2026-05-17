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

function SettingsView({ settings, updateSettings, db }) {
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
        custom: await db.getAll('custom')
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
        await db.clearAll();
        if(data.settings) for(let i of data.settings) await db.put('settings', i);
        if(data.milk) for(let i of data.milk) await db.put('milk', i);
        if(data.gas) for(let i of data.gas) await db.put('gas', i);
        if(data.water) for(let i of data.water) await db.put('water', i);
        if(data.grocery) for(let i of data.grocery) await db.put('grocery', i);
        if(data.electricity_lotus) for(let i of data.electricity_lotus) await db.put('electricity_lotus', i);
        if(data.electricity_sadri) for(let i of data.electricity_sadri) await db.put('electricity_sadri', i);
        if(data.water_bill) for(let i of data.water_bill) await db.put('water_bill', i);
        if(data.other_expenses) for(let i of data.other_expenses) await db.put('other_expenses', i);
        if(data.categories) for(let i of data.categories) await db.put('categories', i);
        if(data.custom) for(let i of data.custom) await db.put('custom', i);
        alert('Data imported successfully! App will reload.');
        window.location.reload();
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const SettingBlock = ({ label, children }) => (
    <div className="flex justify-between items-center py-4 last:border-0" style={{borderBottom:'1px solid var(--m3-divider)'}}>
      <span className="font-medium" style={{color:'var(--m3-on-surface)'}}>{label}</span>
      <div className="w-1/2 text-right">{children}</div>
    </div>
  );

  return (
    <div className="pb-8">
      <div className="sticky top-0 pt-12 pb-4 px-2 z-30 mb-6" style={{background:'var(--m3-header-bg)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid var(--m3-header-border)'}}>
        <h1 className="text-2xl font-bold tracking-tight" style={{color:'var(--m3-on-surface)'}}>Settings</h1>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>General</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Currency Symbol">
              <div className="flex items-center justify-end gap-2">
                <input type="text" value={settings.currency} onChange={e => updateSettings({ currency: e.target.value })} className="m3-input text-right w-12" style={{padding:'8px', borderRadius:'12px'}} />
                <span className="text-sm font-medium" style={{color:'var(--m3-on-surface-muted)'}}>Rupee</span>
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

        {/* Water Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>Water Goals</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Daily Target (L)">
              <input type="number" step="0.1" value={settings.waterTarget} onChange={e => updateSettings({ waterTarget: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Milk Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>Milk Defaults</h3>
          <GlassCard className="px-5">
            <SettingBlock label={`Default Price (${settings.currency}/L)`}>
              <input type="number" value={settings.milkPrice} onChange={e => updateSettings({ milkPrice: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
            <SettingBlock label="Default Quantity (L)">
              <input type="number" step="0.5" value={settings.milkQty} onChange={e => updateSettings({ milkQty: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Gas Settings */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'#79747E'}}>Gas Defaults</h3>
          <GlassCard className="px-5">
            <SettingBlock label="Cylinder Weight (KG)">
              <input type="number" step="0.1" value={settings.gasWeight} onChange={e => updateSettings({ gasWeight: Number(e.target.value) })} className="m3-input text-right" style={{padding:'8px', borderRadius:'12px'}} />
            </SettingBlock>
          </GlassCard>
        </section>

        {/* Data Management */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest pl-4 mb-2" style={{color:'var(--m3-section-label)'}}>Data &amp; Storage</h3>
          <GlassCard className="p-2">
            <button onClick={handleExport} className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{color:'var(--m3-on-surface)'}}>
              <span className="flex items-center gap-3"><Download size={20} style={{color:'#4A90D9'}}/> Backup Data (JSON)</span>
              <ChevronRight size={16} style={{color:'var(--m3-on-surface-muted)'}}/>
            </button>
            <div className="relative w-full">
              <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{color:'var(--m3-on-surface)'}}>
                <span className="flex items-center gap-3"><Upload size={20} style={{color:'#E67E22'}}/> Restore Backup</span>
                <ChevronRight size={16} style={{color:'var(--m3-on-surface-muted)'}}/>
              </div>
            </div>
            <button onClick={async () => {
              if(window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                await db.clearAll(); window.location.reload();
              }
            }} className="w-full flex items-center justify-between p-4 rounded-xl transition-colors" style={{color:'#C0392B'}}>
              <span className="flex items-center gap-3"><Trash2 size={20}/> Delete All Data</span>
            </button>
          </GlassCard>
        </section>

        {/* Footer */}
        <div className="pt-8 pb-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center" style={{background:'linear-gradient(135deg,#EADDFF,#C8E6FF)'}}>
            <Info size={20} style={{color:'#6750A4'}} />
          </div>
          <p className="text-sm font-bold tracking-widest uppercase mb-1" style={{color:'#1C1B1F'}}>Trackit Pro</p>
          <p className="text-[10px] mb-4" style={{color:'#79747E'}}>Version 1.1.0 • Local Offline DB</p>
          <div className="flex gap-2 text-[10px] px-3 py-1 rounded-full" style={{background:'#F3EEFF', color:'#79747E', border:'1px solid #EDE7F6'}}>
            <span>React</span>•<span>Tailwind</span>•<span>IndexedDB</span>•<span>PWA</span>
          </div>
          <p className="text-xs mt-6 font-semibold" style={{color:'#6750A4'}}>Made by Vikram Mistry</p>
        </div>
      </div>
    </div>
  );
}


export default SettingsView;