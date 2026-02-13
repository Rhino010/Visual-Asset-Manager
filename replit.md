# Inventory Loading Tracker

## Overview
A single-screen, iPad/phone-friendly inventory loading tracker built as a React (Vite) web app with Tailwind CSS and shadcn components. All data persists in localStorage - no backend database needed.

## Architecture
- **Frontend-only app**: All logic runs in the browser with localStorage persistence
- **No backend API routes**: The Express server only serves the static frontend
- **Stack**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui components

## Key Files
- `client/src/pages/inventory-tracker.tsx` - The entire single-page application
- `client/src/App.tsx` - Root component that renders the inventory tracker

## Data Persistence
- `inventory_current_state` - Auto-saved on every change to localStorage
- `inventory_saved_sessions` - Array of manually saved sessions with individual load/delete

## Data Model
- `mtPalletRows` / `kckPalletRows` - Full pallet tracking rows (EDI, Pallet Weight, Item Qty, Total Pallets)
- `mtRows` / `kckRows` / `miscRows` - Mini rows (EDI + Item Qty only)
- `noteRows` - Simple text notes
- Migration function handles old `palletRows` format from earlier versions

## Features
1. **Top toolbar** - Session name input, Store/Sessions/Wipe buttons
2. **Multiple saved sessions** - Store unlimited sessions, expand Sessions panel to Load or Delete individually
3. **Pallet Tracking card** - Contains two sub-sections sharing the same table component:
   - **Loaded for MT** - Full pallet table with EDI, Pallet Weight, Item Qty, Total Pallets (+/-), Total Weight
   - **Loaded for KCK** - Same full pallet table
   - Each sub-section has +Add Row at top AND bottom, plus per-section subtotals
   - Overall combined totals shown at bottom of the card
4. **Send to MT / Send to KCK / Misc panels** - Three side-by-side mini-tables with EDI + Item Qty
5. **Notes section** - Simple note rows
6. **Validation** on Store Session: required fields, negative number prevention, accidental wrong-field checks
7. **Per-row delete** everywhere with trash buttons

## Recent Changes
- 2026-02-13: Restructured Pallet Tracking into "Loaded for MT" / "Loaded for KCK" sub-sections with shared component, per-section + overall totals, +Add Row top/bottom. Renamed mini-panels to "Send to MT" / "Send to KCK". Added data migration for old format.
- 2026-02-13: Added multiple saved sessions with individual Load/Delete
- 2026-02-07: Initial implementation of the complete inventory tracker
