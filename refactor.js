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

function extractSection(startLine, endLine) {
    const lines = content.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
}

if (!fs.existsSync('src/components')) fs.mkdirSync('src/components');
if (!fs.existsSync('src/views')) fs.mkdirSync('src/views');

// 1. DB
const dbCode = importsStr + extractSection(10, 153).replace('const db = new LocalDB();', 'export const db = new LocalDB();\nexport { DEFAULT_SETTINGS };');
fs.writeFileSync('src/db.js', dbCode);

// 2. UI Components
const uiCode = importsStr + `import { db } from '../db';\n` + extractSection(155, 411) + '\nexport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader };';
fs.writeFileSync('src/components/UI.jsx', uiCode);

// 3. MilkView
const milkCode = importsStr + `import { db } from '../db';\nimport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';\n` + extractSection(413, 770) + '\nexport default MilkView;';
fs.writeFileSync('src/views/MilkView.jsx', milkCode);

// 4. GasView
const gasCode = importsStr + `import { db } from '../db';\nimport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';\n` + extractSection(772, 992) + '\nexport default GasView;';
fs.writeFileSync('src/views/GasView.jsx', gasCode);

// 5. CustomCategoryView
const customCode = importsStr + `import { db } from '../db';\nimport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';\n` + extractSection(994, 1150) + '\nexport default CustomCategoryView;';
fs.writeFileSync('src/views/CustomCategoryView.jsx', customCode);

// 6. SettingsView
const settingsCode = importsStr + `import { db } from '../db';\nimport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';\n` + extractSection(1152, 1319) + '\nexport default SettingsView;';
fs.writeFileSync('src/views/SettingsView.jsx', settingsCode);

// 7. WaterView
const waterCode = importsStr + `import { db } from '../db';\nimport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';\n` + extractSection(1321, 1491) + '\nexport default WaterView;';
fs.writeFileSync('src/views/WaterView.jsx', waterCode);

// 8. ExpenseView
const expenseCode = importsStr + `import { db } from '../db';\nimport { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from '../components/UI';\n` + extractSection(1493, 1781) + '\nexport default ExpenseView;';
fs.writeFileSync('src/views/ExpenseView.jsx', expenseCode);

// 9. Main App
const appCode = importsStr + `import { db, DEFAULT_SETTINGS } from './db';
import { GlassCard, NavIcon, SwipeableItem, BottomSheet, StickyHeader } from './components/UI';
import MilkView from './views/MilkView';
import GasView from './views/GasView';
import CustomCategoryView from './views/CustomCategoryView';
import SettingsView from './views/SettingsView';
import WaterView from './views/WaterView';
import ExpenseView from './views/ExpenseView';

` + extractSection(166, 348); // I need to adjust App component lines

fs.writeFileSync('src/App.jsx.new', appCode);

console.log("Refactor split complete!");
