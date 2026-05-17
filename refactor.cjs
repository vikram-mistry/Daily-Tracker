const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');

const importsStr = `import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Milk, Flame, Plus, Settings, Calendar, ChevronLeft, ChevronRight, 
  Trash2, Edit3, X, Check, Droplet, Zap, Wifi, ShoppingCart, 
  Wrench, Package, PauseCircle, PlayCircle, Download, Upload, Info, Share2, LayoutGrid, Train
} from 'lucide-react';
`;

const parts = content.split('// ==========================================');

if (!fs.existsSync('src/components')) fs.mkdirSync('src/components');
if (!fs.existsSync('src/views')) fs.mkdirSync('src/views');

// 1. DB
const dbCode = importsStr + parts[2].replace('const db = new LocalDB();', 'export const db = new LocalDB();\nexport { DEFAULT_SETTINGS };');
fs.writeFileSync('src/db.js', dbCode);

// 2. UI Components
const uiCode = importsStr + `import { db } from '../db';\n` + parts[4] + parts[8] + '\nexport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader };';
fs.writeFileSync('src/components/UI.jsx', uiCode);

const makeView = (idx, name) => {
    const code = importsStr + `import { db } from '../db';\nimport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';\n` + parts[idx] + `\nexport default ${name};`;
    fs.writeFileSync(`src/views/${name}.jsx`, code);
};

makeView(10, 'MilkView');
makeView(12, 'GasView');
makeView(14, 'CustomCategoryView');
makeView(16, 'SettingsView');
makeView(18, 'WaterView');
makeView(20, 'ExpenseView');

// 9. Main App
const appCode = importsStr + `import { db, DEFAULT_SETTINGS } from './db';
import { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from './components/UI';
import MilkView from './views/MilkView';
import GasView from './views/GasView';
import CustomCategoryView from './views/CustomCategoryView';
import SettingsView from './views/SettingsView';
import WaterView from './views/WaterView';
import ExpenseView from './views/ExpenseView';
` + parts[6];

fs.writeFileSync('src/App.jsx', appCode);

console.log("Refactor complete!");
