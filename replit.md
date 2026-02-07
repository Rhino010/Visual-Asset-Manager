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
- `inventory_saved_session` - Manually saved session (one at a time, overwrites previous)

## Features
1. **Top toolbar** - Session name input, Store/Recall/Wipe buttons
2. **Pallet Tracking Table** - EDI, Pallet Weight, Item Qty, Total Pallets (+/- buttons), auto-calculated Total Weight, running totals
3. **MT / KCK / Misc panels** - Three side-by-side mini-tables with EDI + Item Qty
4. **Notes section** - Simple note rows
5. **Validation** on Store Session: required fields, negative number prevention, accidental wrong-field checks
6. **Per-row delete** everywhere with trash buttons
7. **Add row** buttons for each section

## Recent Changes
- 2026-02-07: Initial implementation of the complete inventory tracker
