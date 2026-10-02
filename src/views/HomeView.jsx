import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Milk, Flame, HelpCircle } from 'lucide-react';
import { db } from '../db';
import { GlassCard, StickyHeader } from '../components/UI';
import { auth } from '../firebase';

export default function HomeView({ filterDate, setFilterDate, settings }) {
  const [user, setUser] = useState(auth.currentUser);
  const [milkEntries, setMilkEntries] = useState([]);
  const [gasEntries, setGasEntries] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return unsubscribe;
  }, []);

  const headerTitle = useMemo(() => {
    if (user?.displayName) {
      return `Hello ${user.displayName.split(' ')[0]}`;
    }
    return 'Hello Vikram';
  }, [user]);

  useEffect(() => {
    let active = true;
    async function loadAllData() {
      try {
        const [milk, gas] = await Promise.all([db.getAll('milk'), db.getAll('gas')]);
        if (active) {
          setMilkEntries(milk || []);
          setGasEntries(gas || []);
        }
      } catch (err) {
        console.error('Failed to load data for dashboard', err);
      }
    }
    loadAllData();

    const handleSync = () => loadAllData();
    window.addEventListener('db-synced', handleSync);
    return () => {
      active = false;
      window.removeEventListener('db-synced', handleSync);
    };
  }, [filterDate]);

  /* ── Aggregate calculations ─────────── */
  const calculations = useMemo(() => {
    const yearStr = String(filterDate.getFullYear());
    const monthStr = String(filterDate.getMonth() + 1).padStart(2, '0');
    const targetMonth = `${yearStr}-${monthStr}`;

    const milkThisMonth = milkEntries.filter((e) => e && e.date && e.date.startsWith(targetMonth));
    const milkSpend = milkThisMonth.reduce((sum, e) => sum + (e.isPaused ? 0 : Number(e.total || 0)), 0);
    const milkLiters = milkThisMonth.reduce((sum, e) => sum + (e.isPaused ? 0 : Number(e.qty || 0)), 0);

    const gasSpend = gasEntries
      .filter((e) => e && e.installDate && e.installDate.startsWith(targetMonth))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const totalSpend = milkSpend + gasSpend;

    return { totalSpend, milkSpend, milkLiters, gasSpend };
  }, [milkEntries, gasEntries, filterDate]);

  /* ── Gas cylinder prediction ────────── */
  const gasPrediction = useMemo(() => {
    const activeCylinder = gasEntries.find((e) => !e.uninstallDate);
    const completedCylinders = gasEntries.filter((e) => e.uninstallDate && e.installDate);

    let avgLifespan = 45;
    if (completedCylinders.length > 0) {
      const totalDays = completedCylinders.reduce((sum, e) => {
        const start = new Date(e.installDate);
        const end = new Date(e.uninstallDate);
        return sum + Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      }, 0);
      avgLifespan = Math.round(totalDays / completedCylinders.length);
    }

    if (activeCylinder) {
      const start = new Date(activeCylinder.installDate);
      const today = new Date();
      const daysActive = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, avgLifespan - daysActive);
      const percentLeft = Math.round(Math.max(0, (remainingDays / avgLifespan) * 100));
      const estUninstall = new Date(start.getTime() + avgLifespan * 24 * 60 * 60 * 1000);

      return {
        hasActive: true,
        daysActive,
        remainingDays,
        percentLeft,
        estUninstallDate: estUninstall.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        avgLifespan,
      };
    }

    return { hasActive: false, avgLifespan };
  }, [gasEntries]);

  return (
    <div className="space-y-4 pb-8">
      <StickyHeader title={headerTitle} date={filterDate} setDate={setFilterDate} />

      {/* ── Monthly Overview ──────────────── */}
      <GlassCard className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--label-tertiary)' }}>
          Monthly Overview
        </p>

        {calculations.totalSpend > 0 ? (
          <>
            <p className="text-[34px] font-bold tracking-tight leading-none mb-4" style={{ color: 'var(--label-primary)' }}>
              {settings.currency}{calculations.totalSpend.toFixed(0)}
            </p>

            <div style={{ borderTop: '0.5px solid var(--separator)' }}>
              {/* Milk row */}
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '0.5px solid var(--separator)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
                    <Milk size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-[15px] font-medium" style={{ color: 'var(--label-primary)' }}>Milk</span>
                </div>
                <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--label-primary)' }}>
                  {settings.currency}{calculations.milkSpend.toFixed(0)}
                </span>
              </div>

              {/* Gas row */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--orange-light)' }}>
                    <Flame size={16} style={{ color: 'var(--orange)' }} />
                  </div>
                  <span className="text-[15px] font-medium" style={{ color: 'var(--label-primary)' }}>Gas</span>
                </div>
                <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--label-primary)' }}>
                  {settings.currency}{calculations.gasSpend.toFixed(0)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
            <HelpCircle size={32} style={{ color: 'var(--label-tertiary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--label-secondary)' }}>
              No expenses logged this month.
            </p>
          </div>
        )}
      </GlassCard>

      {/* ── Gas Cylinder Status ────────────── */}
      <GlassCard className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--orange)' }}>
              Gas Cylinder
            </p>
            {gasPrediction.hasActive ? (
              <>
                <p className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: 'var(--label-primary)' }}>
                  {gasPrediction.remainingDays}
                  <span className="text-[17px] font-medium ml-1" style={{ color: 'var(--label-secondary)' }}>days left</span>
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--label-secondary)' }}>
                  Est. empty: {gasPrediction.estUninstallDate} · {gasPrediction.percentLeft}% remaining
                </p>
              </>
            ) : (
              <>
                <p className="text-[17px] font-semibold" style={{ color: 'var(--label-primary)' }}>
                  No Active Cylinder
                </p>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--label-secondary)' }}>
                  Go to Gas tab to start a new cylinder log.
                </p>
              </>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center ml-3" style={{ background: 'var(--orange-light)' }}>
            <Flame size={20} style={{ color: 'var(--orange)' }} />
          </div>
        </div>
        {gasPrediction.hasActive && (
          <div className="w-full h-1.5 rounded-full mt-4 overflow-hidden" style={{ background: 'var(--fill-tertiary)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${gasPrediction.percentLeft}%` }}
              className="h-full rounded-full"
              style={{ background: 'var(--orange)' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </GlassCard>

      {/* ── Milk Summary ──────────────────── */}
      <GlassCard className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
              Milk Delivery
            </p>
            <p className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: 'var(--label-primary)' }}>
              {calculations.milkLiters}
              <span className="text-[17px] font-medium ml-1" style={{ color: 'var(--label-secondary)' }}>liters</span>
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--label-secondary)' }}>
              {settings.currency}{calculations.milkSpend.toFixed(0)} spent this month
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center ml-3" style={{ background: 'var(--accent-light)' }}>
            <Milk size={20} style={{ color: 'var(--accent)' }} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
