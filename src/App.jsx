import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, PauseCircle, PlayCircle, Download, Upload, Info, Share2,
  Home, LogIn, LogOut, RefreshCw, User
} from 'lucide-react';
import { db, DEFAULT_SETTINGS } from './db';
import { GlassCard, BottomSheet, StickyHeader } from './components/UI';
import HomeView from './views/HomeView';
import MilkView from './views/MilkView';
import GasView from './views/GasView';
import SettingsView from './views/SettingsView';
import { auth, provider, signInWithPopup, signOut, updateProfile } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // home, milk, gas, settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  
  // Firebase Auth and Sync State
  const [user, setUser] = useState(auth.currentUser);
  const [syncing, setSyncing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Global Month/Year filter
  const [filterDate, setFilterDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          await db.syncUpAndDown();
          const fresh = await db.get('settings', 'main');
          if (fresh) setSettings(fresh);
        } catch (e) {
          console.error("Auth sync error", e);
        }
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

    // Live listener to keep settings in sync whenever db-synced fires
    const handleDbSynced = async () => {
      try {
        const fresh = await db.get('settings', 'main');
        if (fresh) setSettings(fresh);
      } catch (err) {
        console.error("Failed to refresh settings on db-synced", err);
      }
    };
    window.addEventListener('db-synced', handleDbSynced);

    return () => {
      unsubscribe();
      window.removeEventListener('open-profile', handleOpenProfile);
      window.removeEventListener('db-synced', handleDbSynced);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      await db.syncUpAndDown();
      const fresh = await db.get('settings', 'main');
      if (fresh) setSettings(fresh);
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
      const fresh = await db.get('settings', 'main');
      if (fresh) setSettings(fresh);
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
      } catch (err) {
        console.error("Failed to load DB", err);
      } finally {
        setIsReady(true);
      }
    };
    loadData();
  }, []);

  const updateSettings = async (newSettings) => {
    const current = (await db.get('settings', 'main')) || DEFAULT_SETTINGS;
    const updated = {
      ...current,
      ...newSettings,
      updatedAt: Date.now()
    };
    setSettings(updated);
    await db.put('settings', updated);
    return updated;
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
              {activeTab === 'settings' && <SettingsView settings={settings} updateSettings={updateSettings} db={db} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 w-full px-4 pb-6 pt-2 z-40" style={{background:'var(--m3-nav-gradient)'}}>
          <div className="flex items-center justify-around rounded-full py-2 px-3" style={{background:'var(--m3-nav-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid var(--m3-nav-border)', boxShadow:'var(--m3-nav-shadow)'}}>
            <NavIcon icon={Home} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavIcon icon={Milk} label="Milk" isActive={activeTab === 'milk'} onClick={() => setActiveTab('milk')} />
            <NavIcon icon={Flame} label="Gas" isActive={activeTab === 'gas'} onClick={() => setActiveTab('gas')} />
            <NavIcon icon={Settings} label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </div>

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

const NavIcon = ({ icon: Icon, label, isActive, onClick }) => (
  <motion.button whileTap={{scale:0.9}} onClick={onClick} className="flex flex-col items-center gap-1 w-16">
    <div className="p-1.5 rounded-full transition-all duration-300" style={{background: isActive ? 'var(--m3-nav-icon-active-bg)' : 'transparent'}}>
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{color: isActive ? 'var(--m3-nav-icon-active-color)' : 'var(--m3-nav-icon-color)'}} />
    </div>
    <span className="text-[10px] font-semibold transition-colors duration-300" style={{color: isActive ? 'var(--m3-nav-icon-active-color)' : 'var(--m3-nav-icon-color)'}}>{label}</span>
  </motion.button>
);

