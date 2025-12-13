***

### File 2: `DEV_LOG.md`
*This file documents the technical problems we solved, so you (or others) know what to do if things break.*

```markdown
# 📚 LibreMatic Dev Log: Challenges & Solutions

**Project Goal:** Build a Universal Retail Management App (Web + Mobile).
**Current Architecture:** React Native Expo (Monorepo) using File-based Routing.

This document outlines the specific technical challenges encountered during development and the solutions applied.

---

## 1. Architecture & Styling

### 🛑 The "Invisible UI" (NativeWind)
**Problem:** The UI appeared as plain text without styling, or crashed with `window is not defined`.
**Cause:** Tailwind CSS (NativeWind) struggles with server-side rendering logic where the `window` object doesn't exist.
**Solution:** We switched to standard **React Native `StyleSheet`**.
*   *Benefit:* 100% stability across all platforms.
*   *Benefit:* Zero configuration overhead.

---

## 2. Database Logic (Supabase)

### 🛑 The "Ghost Employee" Constraint
**Problem:** We couldn't assign shifts to employees (e.g., "Peng") because they hadn't downloaded the app yet. Supabase rejected the data because the `user_id` didn't exist in the Auth table.
**Solution:**
1.  **Removed Strict Foreign Keys:** Allowed `profiles` to exist without a matching Auth User.
2.  **SQL Trigger:** Created a `handle_new_user` function. When "Peng" finally signs up, the system detects his email and **merges** his new Auth ID with his existing Ghost Profile, instantly giving him access to his accumulated shifts.

### 🛑 The Empty Inbox (RLS Policies)
**Problem:** Managers couldn't see Defect Reports or Shifts they created for others. The lists returned `0 items`.
**Cause:** Row Level Security (RLS) policies were too strict (e.g., "Users can only see their own data").
**Solution:**
1.  Updated Policies to allow users with `role = 'Manager'` to view **ALL** rows.
2.  Ran SQL `UPDATE` scripts to backfill missing data (e.g., setting `status='Open'` on old defect reports).

---

## 3. The Roster System

### 🛑 The Timezone Trap
**Problem:** A shift scheduled for "Wednesday" appeared blank on the Roster table.
**Cause:** The Database stores time in UTC. A shift at `00:00` Berlin time is saved as `23:00` (Previous Day) in UTC. The app was looking for exact string matches.
**Solution:** Implemented **Strict Calendar Matching**.
*   *Code:* `shiftDate.toDateString() === columnDate.toDateString()`
*   This ignores the "Time" component completely and only compares Day, Month, and Year.

### 🛑 The "Single User" Limit
**Problem:** Managers could only select one person per shift. Rush hours require multiple staff.
**Solution:**
1.  Changed state from `selectedUser` (string) to `selectedUsers` (array).
2.  Updated the Submit logic to perform a **Bulk Insert** into the database.

---

## 4. Mobile vs. Web Compatibility

### 🛑 The Delete Button Crash
**Problem:** Clicking "Delete Shift" worked on iPhone but crashed the Web Browser.
**Cause:** `Alert.alert()` in React Native allows custom buttons (Confirm/Cancel), but the Web browser does not support this API fully.
**Solution:** Added **Platform Guards**.
```typescript
if (Platform.OS === 'web') {
  const confirm = window.confirm("Are you sure?"); // Use Browser Native
} else {
  Alert.alert(...); // Use Mobile Native
}