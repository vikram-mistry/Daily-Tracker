# 🥛 Trackit Pro

**Trackit Pro** is a personal tracking Progressive Web App (PWA) designed specifically for iPhone and mobile web. Built with an **offline-first philosophy** and an **Apple Human Interface Guidelines (HIG)** aesthetic, Trackit Pro makes it effortless to monitor daily milk deliveries, manage cooking gas cylinder lifecycles, and track monthly household utility costs.

[![Live App](https://img.shields.io/badge/Live_App-Visit_Site-007AFF?style=for-the-badge&logo=safari&logoColor=white)](https://vikram-mistry.github.io/Daily-Tracker/)
[![Version](https://img.shields.io/badge/Version-2.1.0-blue?style=for-the-badge)](https://github.com/vikram-mistry/Daily-Tracker)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-34C759?style=for-the-badge&logo=pwa&logoColor=white)](https://vikram-mistry.github.io/Daily-Tracker/)
[![Offline First](https://img.shields.io/badge/Offline--First-IndexedDB-FF9500?style=for-the-badge)](https://github.com/vikram-mistry/Daily-Tracker)
[![Firebase Sync](https://img.shields.io/badge/Cloud_Sync-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

---

## 📱 Live App

👉 **[https://vikram-mistry.github.io/Daily-Tracker/](https://vikram-mistry.github.io/Daily-Tracker/)**

Add it to your iPhone Home Screen via Safari (**Share → Add to Home Screen**) for a native app experience with offline capability and instant loading.

---

## ✨ Features

### 🍎 Apple-Inspired Design System (iOS HIG)
* **Native Look & Feel**: Built around Apple system colors (System Blue, Green, Orange, Red), SF Pro typography hierarchy, and grouped inset cards.
* **Compact Single-Row Navigation**: Dynamic month switcher (`< Sep '26 >`) embedded beside the header title to maximize vertical content space.
* **Docked iOS Tab Bar**: Full-width bottom navigation accounting for `env(safe-area-inset-bottom)` and minimum 44×44px touch targets.
* **Flawless Dark Mode**: Context-aware color tokens (`--bg`, `--surface`, `--label-primary`, `--separator`) provide a high-contrast experience without neon oversaturation.

### 🏠 Home Dashboard
* **Monthly Spending Breakdown**: Clean, scannable overview displaying total monthly spend itemized into Milk and Gas with category badges.
* **Gas Cylinder Longevity Card**: Real-time forecast estimating remaining days and projected empty date based on your historical cylinder consumption logs.
* **Milk Delivery Summary**: Monthly volume tracking (Liters delivered) and total expense.

### 🥛 Milk Tracker
* **Interactive Calendar Grid**: At-a-glance view of daily milk deliveries with color-coded status (green for delivered, orange for paused, and blue accent ring for today).
* **Delivery Progress**: Visual indicator tracking days delivered in the month (e.g., `2 of 30 days`) with a blue progress bar that fills up over the month.
* **Bulk Pause & Quick Pause**: Select multiple dates to mark vacations or holidays in one tap, or right-click / long-press any date to toggle pause immediately.
* **One-Tap WhatsApp Share**: Instantly generates an itemized milk bill report (including Society address, daily breakdown, paused dates, and total amount due) and opens it directly in WhatsApp.
* **Native System Share**: Compatible with iOS Share Sheet, AirDrop, Messages, or clipboard copy.
* **Swipe Gestures**: Swipe left to delete with confirmation or swipe right to edit any logged entry.

### ⛽ Gas Cylinder Management
* **Cylinder Lifecycle Tracking**: Record installation date, empty/replacement date, refill amount, cylinder weight (kg), and vendor notes.
* **Automatic Usage Metrics**: Accurately computes active usage duration (in days) per cylinder, including cross-month spans.
* **Cylinder History**: Grouped inset cards with "Active" status badges, quick-view modal sheets, and swipe-to-manage actions.

### ⚙️ Settings & Schedule Automation
* **Rate Change Schedule**: Define future or past milk price changes (e.g. ₹84 to ₹90/L effective from Sept 1). Entries on or after the effective date automatically update with safety safeguards preserving earlier historical records.
* **Quantity Change Schedule**: Schedule daily quantity adjustments (e.g. 1.5L to 1L effective from Sept 30) with selective date reconciliation.
* **Gas Defaults**: Set your default cylinder refill weight (default 14.2 kg).
* **Currency & Appearance**: Customize currency symbol (₹, $, €, etc.) and toggle between Light and Dark themes.

### ☁️ Cloud Sync & Data Safeguards
* **Google Authentication**: Single-tap sign-in to securely link your data to your Google account.
* **Real-Time Bi-Directional Sync**: Background sync with Firebase Cloud Firestore using Last-Write-Wins and union-merge rule preservation.
* **100% Offline Support**: Full CRUD capability powered by local browser IndexedDB; seamlessly syncs when your connection is restored.
* **JSON Backup & Restore**: One-tap manual export of all records (`settings`, `milk`, `gas`) as a JSON file, with immediate restore and re-sync support.

---

## 🛠 Tech Stack

* **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Animations**: [Framer Motion](https://www.framer.com/motion/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Local Storage**: IndexedDB (Native Web API)
* **Cloud Backend**: [Firebase](https://firebase.google.com/) (Cloud Firestore & Authentication)
* **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Service Worker with auto-update caching)

---

## 📲 How to Install on iPhone

1. Open **[https://vikram-mistry.github.io/Daily-Tracker/](https://vikram-mistry.github.io/Daily-Tracker/)** in **Safari**.
2. Tap the **Share** button (the square with an upward arrow at the bottom of the screen).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right corner.
5. Trackit Pro will appear on your Home Screen as a standalone, fullscreen iOS app.

---

## 💻 Development & Deployment

### Local Development
```bash
# Clone the repository
git clone https://github.com/vikram-mistry/Daily-Tracker.git

# Navigate to project directory
cd Daily-Tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build & Deploy
```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## 📄 License & Credits

Designed and developed by **Vikram Mistry**.  
Built for personal daily tracking with privacy and offline reliability first.
