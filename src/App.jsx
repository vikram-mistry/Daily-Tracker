import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2, LayoutGrid, Train,
  Home
} from 'lucide-react';
import { db, DEFAULT_SETTINGS } from './db';
import { GlassCard, SwipeableItem, BottomSheet, StickyHeader } from './components/UI';
import HomeView from './views/HomeView';
import MilkView from './views/MilkView';
import GasView from './views/GasView';
import CustomCategoryView from './views/CustomCategoryView';
import SettingsView from './views/SettingsView';
import WaterView from './views/WaterView';
import ExpenseView from './views/ExpenseView';
import { auth, provider, signInWithPopup, signOut, updateProfile } from './firebase';
import { LogIn, LogOut, RefreshCw, User } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // home, milk, gas, settings, custom-{id}
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState([]);
  const [isReady, setIsReady] = useState(false);
  
  // Firebase Auth and Sync State
  const [user, setUser] = useState(auth.currentUser);
  const [syncing, setSyncing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Modals state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  
  // Global Month/Year filter
  const [filterDate, setFilterDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        db.syncUpAndDown();
        const googlePhoto = u.providerData?.[0]?.photoURL;
        if (googlePhoto && googlePhoto !== u.photoURL) {
          updateProfile(u, { photoURL: googlePhoto })
            .then(() => {
              setUser(prev => prev ? { ...prev, photoURL: googlePhoto } : null);
            })
            .catch((e) => console.log("Google photo cache synced", e));
        }
      }
    });

    const handleOpenProfile = () => setIsProfileOpen(true);
    window.addEventListener('open-profile', handleOpenProfile);

    return () => {
      unsubscribe();
      window.removeEventListener('open-profile', handleOpenProfile);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      alert('Logged in successfully! Syncing your data...');
      setIsProfileOpen(false);
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
        setIsProfileOpen(false);
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

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedSettings = await db.get('settings', 'main');
        if (storedSettings) setSettings(storedSettings);
        else await db.put('settings', DEFAULT_SETTINGS);

        const storedCats = await db.getAll('categories');
        setCategories(storedCats || []);
      } catch (err) {
        console.error("Failed to load DB", err);
      } finally {
        setIsReady(true);
      }
    };
    loadData();
  }, []);

  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await db.put('settings', updated);
  };

  // Sync document body theme attribute for React Portals
  useEffect(() => {
    document.body.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  if (!isReady) return (
    <div style={{minHeight:'100vh', background:'linear-gradient(160deg,#F0EBFF 0%,#E8F4FF 40%,#E8FFF4 100%)', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'16px'}}>
        <div className="m3-pulse" style={{width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#EADDFF,#C8E6FF)'}} />
        <p style={{color:'#6750A4', fontWeight:600, fontSize:14}}>Loading Trackit…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full" data-theme={settings.theme} style={{background:'var(--m3-bg)', color:'var(--m3-on-surface)'}}>
      {/* Mobile Wrapper */}
      <div className="max-w-md mx-auto h-screen flex flex-col relative overflow-hidden" style={{background:'var(--m3-bg-app)'}}>
        
        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto pb-24 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="p-4"
            >
              {activeTab === 'home' && <HomeView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'milk' && <MilkView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'gas' && <GasView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'water' && <WaterView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'settings' && <SettingsView settings={settings} updateSettings={updateSettings} db={db} />}
              {activeTab === 'grocery' && <ExpenseView type="grocery" title="Grocery" icon={ShoppingCart} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'elec-lotus' && <ExpenseView type="electricity_lotus" title="Electricity (Lotus)" icon={Zap} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'elec-sadri' && <ExpenseView type="electricity_sadri" title="Electricity (Sadri)" icon={Zap} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'water-bill' && <ExpenseView type="water_bill" title="Water Bill" icon={Droplet} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              {activeTab === 'other' && <ExpenseView type="other_expenses" title="Travel" icon={Train} filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />}
              
              {activeTab.startsWith('custom-') && (
                <CustomCategoryView 
                  categoryId={activeTab.replace('custom-', '')} 
                  categories={categories}
                  settings={settings}
                  filterDate={filterDate}
                  setFilterDate={setFilterDate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 w-full px-4 pb-6 pt-2 z-40" style={{background:'var(--m3-nav-gradient)'}}>
          <div className="flex items-center justify-around rounded-full py-2 px-2" style={{background:'var(--m3-nav-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid var(--m3-nav-border)', boxShadow:'var(--m3-nav-shadow)'}}>
            <NavIcon icon={Home} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavIcon icon={Milk} label="Milk" isActive={activeTab === 'milk'} onClick={() => setActiveTab('milk')} />
            
            {/* FAB (Add More) */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAddSheetOpen(true)}
              className="-mt-6 z-50 p-4 rounded-full"
              style={{background:'linear-gradient(135deg,#7C3AED,#6750A4)', color:'#fff', boxShadow:'0 4px 20px rgba(103,80,164,0.4)', border:'4px solid var(--m3-fab-border)'}}
            >
              <LayoutGrid size={24} />
            </motion.button>

            <NavIcon icon={Flame} label="Gas" isActive={activeTab === 'gas'} onClick={() => setActiveTab('gas')} />
            <NavIcon icon={Settings} label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </div>

        {/* Add More Bottom Sheet */}
        <BottomSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} title="Track Expenses" isCentered={true}>
          <div className="grid grid-cols-2 gap-4 mt-6">
             <ExpenseMenuItem icon={ShoppingCart} label="Grocery" onClick={() => { setActiveTab('grocery'); setIsAddSheetOpen(false); }} color="#27ae90" />
             <ExpenseMenuItem icon={Droplet} label="Water" onClick={() => { setActiveTab('water'); setIsAddSheetOpen(false); }} color="#3b82f6" />
             <ExpenseMenuItem icon={Zap} label="Elec (Lotus)" onClick={() => { setActiveTab('elec-lotus'); setIsAddSheetOpen(false); }} color="#f59e0b" />
             <ExpenseMenuItem icon={Zap} label="Elec (Sadri)" onClick={() => { setActiveTab('elec-sadri'); setIsAddSheetOpen(false); }} color="#f59e0b" />
             <ExpenseMenuItem icon={Droplet} label="Water Bill" onClick={() => { setActiveTab('water-bill'); setIsAddSheetOpen(false); }} color="#3b82f6" />
             <ExpenseMenuItem icon={Train} label="Travel" onClick={() => { setActiveTab('other'); setIsAddSheetOpen(false); }} color="#8b5cf6" />
          </div>
        </BottomSheet>

        {/* Google Cloud Sync / Profile Modal */}
        <BottomSheet isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Account & Sync" isCentered={true}>
          {user ? (
            <div className="space-y-6 text-center py-2" style={{color:'var(--m3-on-surface)'}}>
              <div className="flex flex-col items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-16 h-16 rounded-full border shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-purple-100 text-purple-600 font-bold text-2xl">
                    {user.displayName ? user.displayName[0] : 'U'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{user.displayName || 'Google User'}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm text-white"
                  style={{background:'linear-gradient(135deg,#7C3AED,#6750A4)', opacity: syncing ? 0.7 : 1}}
                >
                  <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing Cloud...' : 'Sync Data Now'}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm border text-red-500 border-red-200"
                >
                  <LogOut size={18} />
                  Sign Out
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4" style={{color:'var(--m3-on-surface)'}}>
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 flex items-center justify-center mb-4 text-purple-600 border border-purple-100">
                <User size={32} />
              </div>
              <h3 className="font-bold text-lg mb-2">Cloud Backup & Sync</h3>
              <p className="text-sm text-gray-500 mb-6 px-4">Sync your expenses securely to your private cloud storage and access them across all your devices.</p>
              
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 font-bold py-4 rounded-2xl text-sm text-white shadow-md"
                style={{background:'linear-gradient(135deg,#6750A4,#4A90D9)'}}
              >
                <LogIn size={20} />
                Sign in with Google
              </motion.button>
            </div>
          )}
        </BottomSheet>
      </div>
    </div>
  );
}

const ExpenseMenuItem = ({ icon: Icon, label, onClick, color }) => (
  <motion.button whileTap={{scale:0.96}} onClick={onClick} className="flex items-center gap-3 p-4 rounded-2xl transition-all" style={{background:'var(--m3-swipe-inner)', border:'1px solid var(--m3-swipe-inner-border)', boxShadow:'var(--m3-swipe-inner-shadow)'}}>
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20`, color }}>
      <Icon size={20} />
    </div>
    <span className="font-semibold text-sm" style={{color:'var(--m3-on-surface)'}}>{label}</span>
  </motion.button>
);

const NavIcon = ({ icon: Icon, label, isActive, onClick }) => (
  <motion.button whileTap={{scale:0.9}} onClick={onClick} className="flex flex-col items-center gap-1 w-16">
    <div className="p-1.5 rounded-full transition-all duration-300" style={{background: isActive ? 'var(--m3-nav-icon-active-bg)' : 'transparent'}}>
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{color: isActive ? 'var(--m3-nav-icon-active-color)' : 'var(--m3-nav-icon-color)'}} />
    </div>
    <span className="text-[10px] font-semibold transition-colors duration-300" style={{color: isActive ? 'var(--m3-nav-icon-active-color)' : 'var(--m3-nav-icon-color)'}}>{label}</span>
  </motion.button>
);

