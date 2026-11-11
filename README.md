# Inventory Loading Tracker

A responsive inventory-loading web app for warehouse and logistics teams. Use it on a phone, tablet, or desktop browser to track pallet counts and weights for MT and KCK, record item quantities, save named work sessions, and keep notes.

## Features

### Pallet tracking

The **Pallet Tracking** card contains two separate sections:

- **Loaded for MT**
- **Loaded for KCK**

Each section has its own table with:

| Column | Description |
| --- | --- |
| EDI | Item identifier |
| Pallet Weight | Weight per pallet, entered as a whole number |
| Item Qty | Item quantity, entered as a whole number |
| Total Pallets | Pallet count, adjusted with plus and minus buttons |
| Total Weight | Calculated as pallet weight multiplied by pallet count |

Use **Add Row** at the top or bottom of either section. Rows can be deleted individually. Each section displays its own pallet and weight totals, and the card displays combined totals for MT and KCK.

### Item lists

Three additional panels track EDI and item quantity:

- **Send to MT**
- **Send to KCK**
- **Misc**

Add or delete rows in each panel. The panels sit side by side on wider screens and stack on smaller screens.

### Notes

Add and remove free-text note rows at the bottom of the page.

### Saved sessions

Use the toolbar to name and store the current work as a session. Each save creates a separate entry; it does not overwrite earlier sessions. Open **Sessions** to view saved-session details, load a session into the current workspace, or delete an individual saved session.

**New / Wipe** clears the current workspace and restores its blank rows. It does not delete saved sessions.

### Save validation

Before storing a session, the app checks:

- A session name has been entered.
- Every non-empty pallet row has an EDI.
- Pallet weight and item quantity are non-negative whole numbers.
- EDI values that appear to match a weight or quantity are flagged for review.

If validation fails, the session is not stored. The app lists the issues and highlights affected pallet rows.

## Data and privacy

The app saves data in the browser's `localStorage`:

| Key | Contents |
| --- | --- |
| `inventory_current_state` | Current work, saved automatically as you make changes |
| `inventory_saved_sessions` | Sessions explicitly stored by the user |

Current work survives a page refresh in the same browser. Saved sessions can be loaded or individually deleted. Wiping the current workspace leaves saved sessions untouched.

Data is local to the browser and device. It is not uploaded to a database or synchronized between devices. Clearing browser storage, using another browser, or switching devices will not carry this data over. Publishing the app makes the app available at its hosted URL; it does **not** make locally stored sessions shared or cloud-backed.

## Run locally

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

The development server serves the app on port `5000` by default (or the port provided through `PORT`).

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run check` | Run the TypeScript compiler checks |
| `npm run build` | Build the production client and server |
| `npm start` | Start the production server after building |

## Tech stack

- React 18 and TypeScript
- Vite
- Tailwind CSS and shadcn/ui components
- Express server for development and production hosting
- Browser `localStorage` for current work and saved sessions

## Project layout

- `client/src/pages/inventory-tracker.tsx` — inventory tracker interface and client-side behavior
- `client/src/components/ui/` — reusable UI components
- `server/` — Express server and Vite/static hosting setup
- `shared/` — shared types and schema
- `script/build.ts` — production build script

## Data compatibility

When older browser data contains the previous single `palletRows` list, the app migrates those rows into **Loaded for MT** and initializes **Loaded for KCK** with a blank row. Other missing sections are initialized with blank rows as needed.
