import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Milk, Flame, Droplet, Zap, ShoppingCart, Train, Package, 
  AlertCircle, CheckCircle, HelpCircle, ReceiptIndianRupee
} from 'lucide-react';
import { db } from '../db';
import { GlassCard, StickyHeader } from '../components/UI';
import { auth } from '../firebase';

const ICONS_MAP = {
  Droplet, Zap, Wifi: Zap, ShoppingCart, Wrench: Package, Package, Train
};

export default function HomeView({ filterDate, setFilterDate, settings }) {
  const [user, setUser] = useState(auth.currentUser);
  const [milkEntries, setMilkEntries] = useState([]);
  const [gasEntries, setGasEntries] = useState([]);
  const [groceryEntries, setGroceryEntries] = useState([]);
  const [lotusEntries, setLotusEntries] = useState([]);
  const [sadriEntries, setSadriEntries] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);
  const [travelEntries, setTravelEntries] = useState([]);
  const [customEntries, setCustomEntries] = useState([]);
  const [categories, setCategories] = useState([]);

  const [activeSlice, setActiveSlice] = useState(null);

  // Reset active slice when month changes to prevent stale highlights
  useEffect(() => {
    setActiveSlice(null);
  }, [filterDate]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  const headerTitle = useMemo(() => {
    if (user?.displayName) {
      const firstName = user.displayName.split(' ')[0];
      return `Hello ${firstName}`;
    }
    return 'Hello Vikram';
  }, [user]);

  useEffect(() => {
    let active = true;
    async function loadAllData() {
      try {
        const [
          milk, gas, grocery, lotus, sadri, maintenance, travel, custom, cats
        ] = await Promise.all([
          db.getAll('milk'),
          db.getAll('gas'),
          db.getAll('grocery'),
          db.getAll('electricity_lotus'),
          db.getAll('electricity_sadri'),
          db.getAll('maintenance'),
          db.getAll('other_expenses'),
          db.getAll('custom'),
          db.getAll('categories')
        ]);

        if (active) {
          setMilkEntries(milk);
          setGasEntries(gas);
          setGroceryEntries(grocery);
          setLotusEntries(lotus);
          setSadriEntries(sadri);
          setMaintenanceEntries(maintenance);
          setTravelEntries(travel);
          setCustomEntries(custom);
          setCategories(cats || []);
        }
      } catch (err) {
        console.error("Failed to load data for dashboard", err);
      }
    }
    loadAllData();
    return () => {
      active = false;
    };
  }, [filterDate]);

  // Aggregate Calculations
  const calculations = useMemo(() => {
    const month = filterDate.getMonth();
    const year = filterDate.getFullYear();

    // 1. Milk
    const milkThisMonth = milkEntries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const milkSpend = milkThisMonth.reduce((sum, e) => sum + (e.isPaused ? 0 : Number(e.total || 0)), 0);
    const milkLiters = milkThisMonth.reduce((sum, e) => sum + (e.isPaused ? 0 : Number(e.qty || 0)), 0);

    // 2. Gas
    const gasSpend = gasEntries
      .filter(e => {
        const d = new Date(e.installDate);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 3. Grocery
    const grocerySpend = groceryEntries
      .filter(e => {
        const d = new Date(e.date || e.paymentDate);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 4. Lotus Electricity
    const lotusSpend = lotusEntries
      .filter(e => {
        const d = new Date(e.paymentDate || e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 5. Sadri Electricity
    const sadriSpend = sadriEntries
      .filter(e => {
        const d = new Date(e.paymentDate || e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 6. Maintenance
    const maintenanceSpend = maintenanceEntries
      .filter(e => {
        const d = new Date(e.paymentDate || e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 7. Travel (Other expenses)
    const travelSpend = travelEntries
      .filter(e => {
        const d = new Date(e.paymentDate || e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 8. Custom Categories
    const customSpendByCategory = {};
    customEntries.forEach(e => {
      const d = new Date(e.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        customSpendByCategory[e.categoryId] = (customSpendByCategory[e.categoryId] || 0) + Number(e.amount || 0);
      }
    });

    // Compile into chart-ready data
    const items = [
      { key: 'milk', label: 'Milk', value: milkSpend, color: '#6750A4', icon: Milk },
      { key: 'gas', label: 'Gas', value: gasSpend, color: '#E67E22', icon: Flame },
      { key: 'grocery', label: 'Grocery', value: grocerySpend, color: '#27AE90', icon: ShoppingCart },
      { key: 'elec-lotus', label: 'Elec (Lotus)', value: lotusSpend, color: '#F2C94C', icon: Zap },
      { key: 'elec-sadri', label: 'Elec (Sadri)', value: sadriSpend, color: '#F2994A', icon: Zap },
      { key: 'maintenance', label: 'Maintenance', value: maintenanceSpend, color: '#1ABC9C', icon: ReceiptIndianRupee },
      { key: 'other', label: 'Travel', value: travelSpend, color: '#9B51E0', icon: Train }
    ];

    categories.forEach(c => {
      const val = customSpendByCategory[c.id] || 0;
      if (val > 0) {
        items.push({
          key: `custom-${c.id}`,
          label: c.name,
          value: val,
          color: c.color || '#4F4F4F',
          icon: ICONS_MAP[c.icon] || Package
        });
      }
    });

    const activeItems = items.filter(item => item.value > 0);
    const totalSpend = activeItems.reduce((sum, item) => sum + item.value, 0);

    return {
      activeItems,
      totalSpend,
      milkLiters,
      milkSpend
    };
  }, [milkEntries, gasEntries, groceryEntries, lotusEntries, sadriEntries, maintenanceEntries, travelEntries, customEntries, categories, filterDate]);

  // Utility Bill Status Evaluator
  const billStatus = useMemo(() => {
    const month = filterDate.getMonth();
    const year = filterDate.getFullYear();

    const checkStatus = (entries) => {
      const record = entries.find(e => {
        const d = new Date(e.paymentDate || e.dueDate);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      return record ? { paid: true, amount: record.amount } : { paid: false };
    };

    return [
      { id: 'lotus', name: 'Lotus Elec', ...checkStatus(lotusEntries) },
      { id: 'sadri', name: 'Sadri Elec', ...checkStatus(sadriEntries) },
      { id: 'maintenance', name: 'Maintenance', ...checkStatus(maintenanceEntries) }
    ];
  }, [lotusEntries, sadriEntries, maintenanceEntries, filterDate]);

  // Gas Cylinder Longevity Evaluator
  const gasPrediction = useMemo(() => {
    const activeCylinder = gasEntries.find(e => !e.uninstallDate);
    const completedCylinders = gasEntries.filter(e => e.uninstallDate && e.installDate);

    let avgLifespan = 45; // Default fallback
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
      const estUninstall = new Date(start.getTime() + remainingDays * 24 * 60 * 60 * 1000);

      return {
        hasActive: true,
        daysActive,
        remainingDays,
        percentLeft,
        estUninstallDate: estUninstall.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        avgLifespan
      };
    }

    return { hasActive: false, avgLifespan };
  }, [gasEntries]);

  // Donut SVG Setup
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~314.16

  const donutSlices = useMemo(() => {
    const gapPercent = 0.008; // small gap between slices
    const totalGap = calculations.activeItems.length > 1 ? gapPercent * calculations.activeItems.length : 0;
    const usablePercent = 1 - totalGap;
    let accumulatedPercent = 0;
    const slices = [];
    for (const item of calculations.activeItems) {
      const rawPercent = item.value / calculations.totalSpend;
      const scaledPercent = rawPercent * usablePercent;
      const strokeDashoffset = circumference - (scaledPercent * circumference);
      const rotation = (accumulatedPercent * 360) - 90;
      accumulatedPercent += scaledPercent + gapPercent;
      slices.push({
        ...item,
        percent: rawPercent,
        strokeDashoffset,
        rotation
      });
    }
    return slices;
  }, [calculations.activeItems, calculations.totalSpend, circumference]);

  const activeSliceData = useMemo(() => {
    if (!activeSlice) return null;
    return donutSlices.find(s => s.key === activeSlice);
  }, [activeSlice, donutSlices]);

  return (
    <div className="space-y-6 pb-12">
      <StickyHeader title={headerTitle} date={filterDate} setDate={setFilterDate} />

      {/* Expense Summary & Donut Card */}
      <GlassCard className="p-6 flex flex-col items-center">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--m3-on-surface-muted)' }}>
          Monthly Expense Distribution
        </h3>

        {calculations.totalSpend > 0 ? (
          <div className="flex flex-col items-center w-full gap-6">
            {/* SVG Donut Chart */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg key={`donut-${filterDate.getMonth()}-${filterDate.getFullYear()}`} width="100%" height="100%" viewBox="0 0 130 130" className="overflow-visible">
                {/* Background base circle */}
                <circle cx="65" cy="65" r={radius} fill="transparent" stroke="var(--m3-input-bg)" strokeWidth={strokeWidth} />
                
                {donutSlices.map((slice, idx) => (
                  <motion.circle
                    key={`${slice.key}-${filterDate.getMonth()}-${filterDate.getFullYear()}`}
                    cx="65"
                    cy="65"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={activeSlice === slice.key ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: slice.strokeDashoffset }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                    style={{ 
                      transform: `rotate(${slice.rotation}deg)`, 
                      transformOrigin: '65px 65px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveSlice(activeSlice === slice.key ? null : slice.key)}
                  />
                ))}
              </svg>

              {/* Total display inside circle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--m3-on-surface-muted)' }}>
                  {activeSliceData ? activeSliceData.label : 'Total Spend'}
                </span>
                <span className="text-2xl font-black" style={{ color: 'var(--m3-on-surface)' }}>
                  {settings.currency}
                  {activeSliceData ? activeSliceData.value.toFixed(0) : calculations.totalSpend.toFixed(0)}
                </span>
                {activeSliceData && (
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    {Math.round(activeSliceData.percent * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* List breakdown under chart */}
            <div className="w-full grid grid-cols-2 gap-3">
              {donutSlices.map(slice => (
                <button
                  key={slice.key}
                  onClick={() => setActiveSlice(activeSlice === slice.key ? null : slice.key)}
                  className="flex items-center gap-2 p-2 rounded-xl text-left transition-colors"
                  style={{
                    background: activeSlice === slice.key ? 'var(--m3-input-bg)' : 'transparent',
                    border: activeSlice === slice.key ? '1px solid var(--m3-input-border)' : '1px solid transparent'
                  }}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--m3-on-surface)' }}>{slice.label}</p>
                    <p className="text-[10px] font-bold" style={{ color: 'var(--m3-on-surface-muted)' }}>
                      {settings.currency}{slice.value.toFixed(0)} ({Math.round(slice.percent * 100)}%)
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <HelpCircle size={40} style={{ color: 'var(--m3-on-surface-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--m3-on-surface-muted)' }}>
              No expenses logged for this month.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Grid of Highlight Cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* Gas Prediction Card */}
        <GlassCard 
          className="p-5 relative overflow-hidden"
          style={{
            background: settings.theme === 'dark' 
              ? 'linear-gradient(135deg, #3D2515 0%, #1A120B 100%)' 
              : 'linear-gradient(135deg, #FFEECD 0%, #FFF9EE 100%)',
            borderColor: settings.theme === 'dark' ? 'rgba(230, 126, 34, 0.25)' : 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: settings.theme === 'dark' ? '#FFB74D' : '#D35400' }}>
                Gas Cylinder Status
              </p>
              {gasPrediction.hasActive ? (
                <>
                  <p className="text-2xl font-black" style={{ color: 'var(--m3-on-surface)' }}>
                    {gasPrediction.remainingDays} Days Remaining
                  </p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--m3-on-surface-muted)' }}>
                    Est. Empty: {gasPrediction.estUninstallDate} ({gasPrediction.percentLeft}% Left)
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-black" style={{ color: 'var(--m3-on-surface)' }}>
                    No Active Cylinder
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--m3-on-surface-muted)' }}>
                    Go to Gas tab to start a new cylinder log.
                  </p>
                </>
              )}
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              <Flame size={20} />
            </div>
          </div>
          {gasPrediction.hasActive && (
            <div className="w-full bg-orange-200 dark:bg-orange-900/50 h-2 rounded-full mt-4 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${gasPrediction.percentLeft}%` }}
                className="bg-orange-500 h-full rounded-full"
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          )}
        </GlassCard>

        {/* Milk Card */}
        <GlassCard 
          className="p-5"
          style={{
            background: settings.theme === 'dark' 
              ? 'linear-gradient(135deg, #2A3C5C 0%, #1A2840 100%)' 
              : 'linear-gradient(135deg, #C8E6FF 0%, #E8F4FF 100%)',
            borderColor: settings.theme === 'dark' ? 'rgba(103, 80, 164, 0.25)' : 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: settings.theme === 'dark' ? '#90CAF9' : '#1F618D' }}>
                Milk Delivery Status
              </p>
              <p className="text-2xl font-black" style={{ color: 'var(--m3-on-surface)' }}>
                {calculations.milkLiters} Liters
              </p>
              <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--m3-on-surface-muted)' }}>
                Month Spend: {settings.currency}{calculations.milkSpend.toFixed(0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Milk size={20} />
            </div>
          </div>
        </GlassCard>

        {/* Utility Bills Status Card */}
        <GlassCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--m3-on-surface-muted)' }}>
            Utility Bills (This Month)
          </p>
          <div className="space-y-3">
            {billStatus.map(bill => (
              <div key={bill.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--m3-divider)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bill.paid ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {bill.id === 'maintenance' ? <ReceiptIndianRupee size={16} /> : <Zap size={16} />}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--m3-on-surface)' }}>{bill.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {bill.paid ? (
                    <>
                      <span className="text-xs font-bold" style={{ color: 'var(--m3-on-surface)' }}>
                        {settings.currency}{bill.amount}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                        <CheckCircle size={14} /> Paid
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                      <AlertCircle size={14} /> Unpaid
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
