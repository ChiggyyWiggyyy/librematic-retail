# 🕶️ LibreMatic Retail
**Open-Source Workforce & Retail Management Solution**

LibreMatic is a cross-platform application designed to replace expensive, proprietary retail management software. Built initially for a high-end sunglasses and accessories store in Germany, just a dummy model for now, it unifies **Shift Planning**, **Inventory Management**, and **Defect Tracking** into a single "Universal App" that runs on Web (for Managers) and Mobile (for Employees).

---

## 🎯 The Goal
Retail managers often juggle three different tools: Excel for rosters, a legacy system for inventory, and WhatsApp for communication. LibreMatic solves this by centralizing operations:
- **Managers** get a Desktop command center.
- **Employees** get a mobile app to check shifts, clock in, and log issues.
- **Data** is synchronized in real-time across all devices.

---

## 🛠️ Tech Stack

We chose a **"Universal Monolith"** architecture to keep development fast and maintenance low.

| Tool | Purpose | Why we chose it |
| :--- | :--- | :--- |
| **Expo (React Native)** | Frontend Framework | Write **one codebase** that compiles to iOS, Android, and Web simultaneously. |
| **Supabase** | Backend-as-a-Service | PostgreSQL Database, Authentication, and File Storage. Zero server maintenance. |
| **NativeWind** | Styling | Brings **Tailwind CSS** to mobile. Consistent look on 4K monitors and mobile screens. |
| **Zustand & React Query** | State Management | Efficient server caching and local state management. |

---

## 🚀 Key Features

### 1. 📅 Dynamic Roster System
- **Dual View:** Toggle between a **Weekly Table** (detailed planning) and a **Monthly Calendar** (capacity overview).
- **Ghost Profiles:** Assign shifts to staff who haven't downloaded the app yet. When they sign up, the system links their account to their schedule automatically.
- **Shift Swaps:** Employees can offer shifts to a marketplace; managers approve/deny the swap.

### 2. 👓 "Unlimited" Inventory
- **Performance:** Uses virtualized lists (`FlatList`) to handle thousands of SKUs (Sunglasses, Watches) without lag.
- **Categorization:** Instant filtering by category and real-time search.

### 3. ⚠️ Defect & Quality Control
- **The Loop:** Employee identifies damage -> Snaps a photo -> Submits report -> Stock count auto-decrements -> Manager receives report in Inbox.
- **Evidence:** Photos are securely stored in Supabase Storage buckets.

### 4. 📂 Immutable Documents & HR
- **File Send:** Managers can send contracts/policies. Once sent, they cannot be deleted by the manager, creating a permanent record.
- **Time Clock:** Geolocation-ready Clock In/Out widget with live timer.
- **Working Hours:** Tracks actual vs. contract hours (Arbeitszeitkonto) for German labor compliance.

---

## 📂 Project Structure

LibreMatic uses **Expo Router** for navigation. The file structure mirrors the screens.

```text
librematic/
├── app/                        # 🚀 APP NAVIGATION & SCREENS
│   ├── _layout.tsx             # Root Provider (Auth checks, Theme)
│   ├── index.tsx               # Login Screen
│   ├── signup.tsx              # Registration Screen
│   │
│   └── dashboard/              # 🔒 PROTECTED AREA (Logged in users)
│       ├── index.tsx           # The Main Hub (Menu Grid)
│       ├── roster.tsx          # Shift Planner
│       ├── shift-details.tsx   # Shift Actions (Swap/Edit)
│       │
│       ├── inventory/          # 🕶️ Inventory Module
│       │   ├── index.tsx       # Unlimited Scrolling List
│       │   └── add.tsx         # Add Item Form
│       │
│       ├── defects/            # ⚠️ Quality Control
│       │   └── index.tsx       # Defect Reporting Form + Camera Logic
│       │
│       ├── inbox/              # 📥 Manager Console
│       │   └── index.tsx       # Incoming Reports & Market
│       │
│       ├── documents/          # 📂 File System
│       │   ├── index.tsx       # File List (Received/Sent)
│       │   └── send.tsx        # Upload Form
│       │
│       ├── timesheets/         # ⏱️ Payroll
│       ├── hours/              # ⏳ Leave & Balance
│       └── settings/           # ⚙️ Configuration
│
├── components/                 # 🧩 UI COMPONENTS
│   └── TimeClock.tsx           # The Clock-In Widget
│
├── lib/                        # 🧠 SHARED LOGIC
│   └── supabase.ts             # Database Connection & Config
│
└── assets/                     # 🖼️ STATIC ASSETS