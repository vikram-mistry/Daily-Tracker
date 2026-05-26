# 🥛 Trackit Pro

**Trackit Pro** is a premium, mobile-first personal tracking application designed specifically for iOS Safari. Built with an offline-first philosophy, it allows you to track daily essentials like milk, gas, water, and household expenses without needing a backend server.

![Trackit Pro Banner](https://img.shields.io/badge/Trackit--Pro-Premium-blue?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge)
![Offline First](https://img.shields.io/badge/Offline-First-orange?style=for-the-badge)

---

## ✨ Features

### 🏠 Home Hub Analytics
*   **Interactive Expense Distribution**: A beautiful, custom SVG donut chart detailing monthly spending allocations across all categories (Milk, Gas, Grocery, Bills, Travel, etc.) with animated slice highlighting.
*   **Gas Cylinder Longevity Predictor**: Automatically projects remaining usage days and estimated empty date based on your historical cylinder consumption logs.
*   **Utility Bills Payment Status**: Quick-glance checklist of monthly bills (Lotus Electricity, Sadri Electricity, Water Bill) dynamically checked and flagged as `Paid` or `Unpaid`.

### 🥛 Milk Tracker
*   **Monthly Calendar View**: Visual tracking of daily milk intake.
*   **Bulk Actions**: Easily "Bulk Pause" milk delivery for vacations or holidays.
*   **Automatic Totals**: Real-time calculation of monthly quantity and total cost.
*   **Smart Entry**: Quick-add or edit entries with a single tap.
*   **Delete Safeguards**: Accidental deletion prevention using responsive bottom-sheet confirmation dialogs.
*   **Premium Aesthetic**: Features a custom "Buffalo Milk" glass icon for a personalized touch.

### 🌊 Water Intake (Hydration)
*   **Apple-Style Animation**: Premium "Liquid Glass" animation with curvy waves and rising bubbles.
*   **Interactive History**: Tap any date in the calendar to update the glass and view/delete that day's intake.
*   **Daily Goals**: Set your 4L (or custom) target and watch the glass fill up.
*   **Monthly Trends**: A dedicated calendar view showing total hydration for every day of the month.

### ⛽ Gas Management
*   **Cylinder Lifecycle**: Track installation and uninstallation dates.
*   **Usage Insights**: Automatically calculates how many days each cylinder lasted.
*   **History**: Maintain a complete log of your gas consumption and spending with delete confirmation safeguards.

### ➕ Household Expenses
*   **Categorized Tracking**: Dedicated modules for **Grocery**, **Electricity (Lotus & Sadri)**, **Water Bill**, and **Other**.
*   **Smart Navigation**: Grocery logging is accessible directly via the central FAB (Floating Action Button) menu.
*   **Detailed Records**: Track purchase dates, payment accounts, and specific notes.
*   **Monthly Summaries**: View exactly where your money is going each month.

### ☁️ Cloud Sync & Account
*   **Google Authentication**: Secure single-tap sign-in with your Google account.
*   **Automated Cloud Backups**: Seamlessly sync your data to private Firebase Cloud Firestore storage, enabling reliable cross-device sync and automatic backups.
*   **Unified Access**: A global profile menu on the top-left of every tab provides quick account status, profile details, and manual sync commands.

### 🌓 Advanced Dark Mode & Glassmorphism
*   **Glassmorphic Headers & Nav**: Highly sophisticated semi-transparent top header (`rgba(26,24,37,0.65)`) and bottom navigation bar, offering beautiful real-time background blurring as you scroll.
*   **Dynamic Theme-Aware Cards**: All tracker cards (Milk, Gas, Water, and Custom category cards) dynamically shift between pastel gradients in light mode and deep, rich gradients in dark mode.
*   **Portal Dark Mode Alignment**: Portals and popup dialogs (BottomSheets) are fully integrated with the dark mode theme and adapt instantly.

---

## 🛠 Tech Stack

*   **Frontend**: React + Vite
*   **Styling**: Tailwind CSS v4
*   **Animations**: Framer Motion
*   **Icons**: Lucide React
*   **Database**: IndexedDB (Native Browser Storage) + Firebase Cloud Firestore (Secure Cloud Sync)

---

## 🚀 Installation (iPhone)

1.  Open the [Live URL](https://vikram-mistry.github.io/trackit-pro/) in **Safari**.
2.  Tap the **Share** button (box with upward arrow).
3.  Scroll down and select **"Add to Home Screen"**.
4.  The app will now appear on your home screen with a custom icon and work exactly like a native app.

---

## 💻 Development & Deployment

### Local Setup
```bash
npm install
npm run dev
```

### Deploy to GitHub Pages
```bash
npm run deploy
```

### Backup & Restore
In addition to automated Google Cloud Sync, you can export your entire database as a JSON file from the **Settings** menu and restore it manually on any device.

---

*Made with ❤️ by Vikram Mistry*
