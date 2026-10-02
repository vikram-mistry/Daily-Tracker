import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Milk, Flame, Settings, Home, LogIn, LogOut, RefreshCw, User,
} from 'lucide-react';
import { db, DEFAULT_SETTINGS } from './db';
import { BottomSheet } from './components/UI';
import HomeView from './views/HomeView';
import MilkView from './views/MilkView';
import GasView from './views/GasView';
import SettingsView from './views/SettingsView';
import { auth, provider, signInWithPopup, signOut, updateProfile } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  // Firebase Auth & Sync
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
          console.error('Auth sync error', e);
        }
        const googlePhoto = u.providerData?.[0]?.photoURL;
        if (googlePhoto && googlePhoto !== u.photoURL) {
          updateProfile(u, { photoURL: googlePhoto })
            .then(() => setUser((prev) => (prev ? { ...prev, photoURL: googlePhoto } : null)))
            .catch((e) => console.log('Google photo cache synced', e));
        }
      }
    });

    const handleOpenProfile = () => setIsProfileOpen(true);
    window.addEventListener('open-profile', handleOpenProfile);

    const handleDbSynced = async () => {
      try {
        const fresh = await db.get('settings', 'main');
        if (fresh) setSettings(fresh);
      } catch (err) {
        console.error('Failed to refresh settings on db-synced', err);
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
        const stored = await db.get('settings', 'main');
        if (stored) setSettings(stored);
        else await db.put('settings', DEFAULT_SETTINGS);
      } catch (err) {
        console.error('Failed to load DB', err);
      } finally {
        setIsReady(true);
      }
    };
    loadData();
  }, []);

  const updateSettings = async (newSettings) => {
    const current = (await db.get('settings', 'main')) || DEFAULT_SETTINGS;
    const updated = { ...current, ...newSettings, updatedAt: Date.now() };
    setSettings(updated);
    await db.put('settings', updated);
    return updated;
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  /* ── Loading ─────────────────────────── */
  if (!isReady)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="ios-spinner" />
          <p style={{ color: 'var(--label-secondary)', fontWeight: 500, fontSize: 13 }}>
            Loading…
          </p>
        </div>
      </div>
    );

  /* ── Render ──────────────────────────── */
  return (
    <div
      className="min-h-screen w-full"
      data-theme={settings.theme}
      style={{ background: 'var(--bg)', color: 'var(--label-primary)' }}
    >
      <div
        className="max-w-md mx-auto h-screen flex flex-col relative overflow-hidden"
        style={{ background: 'var(--bg)' }}
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-20 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="px-4 pb-4"
            >
              {activeTab === 'home' && (
                <HomeView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />
              )}
              {activeTab === 'milk' && (
                <MilkView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />
              )}
              {activeTab === 'gas' && (
                <GasView filterDate={filterDate} setFilterDate={setFilterDate} settings={settings} />
              )}
              {activeTab === 'settings' && (
                <SettingsView settings={settings} updateSettings={updateSettings} db={db} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── iOS Tab Bar ──────────────────── */}
        <div
          className="absolute bottom-0 w-full z-40"
          style={{
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '0.5px solid var(--nav-border)',
          }}
        >
          <div
            className="flex items-stretch justify-around"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <TabItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <TabItem icon={Milk} label="Milk" active={activeTab === 'milk'} onClick={() => setActiveTab('milk')} />
            <TabItem icon={Flame} label="Gas" active={activeTab === 'gas'} onClick={() => setActiveTab('gas')} />
            <TabItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </div>

        {/* ── Profile / Sync Sheet ─────────── */}
        <BottomSheet
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          title="Account & Sync"
          isCentered={true}
        >
          {user ? (
            <div className="space-y-5 text-center py-1">
              <div className="flex flex-col items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                  >
                    {user.displayName ? user.displayName[0] : 'U'}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-[17px]" style={{ color: 'var(--label-primary)' }}>
                    {user.displayName || 'Google User'}
                  </h3>
                  <p className="text-[13px]" style={{ color: 'var(--label-secondary)' }}>
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[15px] text-white"
                  style={{ background: 'var(--accent)', opacity: syncing ? 0.6 : 1 }}
                >
                  <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing…' : 'Sync Data Now'}
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[15px]"
                  style={{ color: 'var(--red)' }}
                >
                  <LogOut size={17} />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-3">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-light)' }}
              >
                <User size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="font-semibold text-[17px] mb-1" style={{ color: 'var(--label-primary)' }}>
                Cloud Backup & Sync
              </h3>
              <p className="text-[13px] mb-5 px-2" style={{ color: 'var(--label-secondary)' }}>
                Sync your data securely with your Google account and access it across all your devices.
              </p>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 font-semibold py-3.5 rounded-xl text-[15px] text-white"
                style={{ background: 'var(--accent)' }}
              >
                <LogIn size={18} />
                Sign in with Google
              </button>
            </div>
          )}
        </BottomSheet>
      </div>
    </div>
  );
}

/* ── Tab Bar Item ──────────────────────── */
function TabItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] pt-1.5 pb-1 flex-1"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.2 : 1.5}
        style={{ color: active ? 'var(--nav-active)' : 'var(--nav-inactive)' }}
      />
      <span
        className="text-[10px] leading-tight"
        style={{
          color: active ? 'var(--nav-active)' : 'var(--nav-inactive)',
          fontWeight: active ? 500 : 400,
        }}
      >
        {label}
      </span>
    </button>
  );
}
