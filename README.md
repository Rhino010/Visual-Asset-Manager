# Inventory Loading Tracker

A single-screen, iPad and phone-friendly inventory loading tracker built as a React web app. Designed for warehouse and logistics teams to track pallets, item quantities, and weights during inventory loading operations.

---

## Features

### 1. Session Management (Top Toolbar)

The top toolbar stays fixed at the top of the screen so it's always accessible, even when scrolling through large data sets.

- **Session Name**: A text input where you name your current work session. This name is required before you can save.
- **Store Session**: Saves all current data (every table, every row, every note) as a new saved session. You can store as many sessions as you need — each one is kept separately with its own name and timestamp. Before saving, the app runs validation checks and will block the save if any issues are found, highlighting problem areas in red.
- **Sessions Panel**: Click the "Sessions" button to expand a dropdown panel showing all your saved sessions. Each session displays its name, save date/time, number of rows, and pallet count. From here you can:
  - **Load** any session to restore it into the working area
  - **Delete** any individual session with the trash button
- **New / Wipe Current**: Clears all current data and resets the screen to empty defaults (one blank row in each section). This does **not** delete any saved sessions — you can still load them afterward.

### 2. Pallet Tracking Table (Main Section)

This is the primary data entry area, displayed as a full-width table with the following columns:

- **EDI**: A text field for the Electronic Data Interchange identifier. Required on any row that has other data filled in.
- **Pallet Weight**: An integer number field for the weight of a single pallet. Empty is treated as zero.
- **Item Quantity**: An integer number field to record how many items are on the pallet. Stored and displayed as-is.
- **Total Pallets**: Shows the number of pallets as a count with large, tap-friendly **+** and **-** buttons. Cannot go below zero. Starts at zero.
- **Total Weight**: Automatically calculated as `Pallet Weight x Total Pallets`. Updates instantly whenever either value changes. This field is read-only.
- **Delete**: Each row has a trash icon button to remove that specific row.

**Running Totals** appear at the bottom of this table:
- **Total Pallets**: The sum of all "Total Pallets" values across every row.
- **Total Weight**: The sum of all "Total Weight" values across every row.

Both totals update in real time as you add, edit, or delete rows.

**Add Row** button lets you add as many pallet tracking rows as needed.

### 3. MT / KCK / Misc Breakdown Panels

Below the main table, three panels appear side by side (or stacked on smaller screens):

- **MT** — for MT-category items
- **KCK** — for KCK-category items
- **Misc** — for miscellaneous items

Each panel is a mini-table with:
- **EDI**: Text input for the item identifier.
- **Item Quantity**: Integer number input.
- **Delete**: Trash button to remove the row.
- **Add Row**: Button to add more rows to that specific panel.

Each panel starts with one empty row by default.

### 4. Notes Section

At the bottom of the page, a simple notes area allows you to record free-text observations:

- Each note is a single-line text input.
- Each note row has a delete button.
- **Add Note** button lets you add more note rows.
- Starts with one empty note row by default.

### 5. Validation (On Store Session)

When you click **Store Session**, the app checks for the following before allowing the save:

- **Session name is required** — you must enter a name.
- **EDI is required on active rows** — any pallet row that has any data entered (weight, quantity, or pallets) must also have an EDI value.
- **No negative numbers** — Pallet Weight and Item Quantity cannot be negative.
- **Integer enforcement** — Pallet Weight and Item Quantity must be valid whole numbers.
- **Accidental wrong-field detection** — If the EDI field contains a value that exactly matches the Pallet Weight or Item Quantity (suggesting the user typed a number in the wrong field), the app flags it with a warning message.

If any validation fails, the save is blocked and:
- A notification appears listing the issues.
- Problem rows are highlighted with a red background.
- The offending input fields get a red border.

### 6. Responsive Design

- On tablets and desktops, the MT/KCK/Misc panels display side by side in three columns.
- On phones, these panels stack vertically for easier use.
- The main pallet table supports horizontal scrolling on small screens.
- All buttons are large and tap-friendly for touchscreen use.
- The toolbar is sticky at the top so controls are always reachable.

---

## Data Storage

This application uses **localStorage** (your browser's built-in storage) for all data persistence. There is no external database — everything stays on your device in your browser.

### How It Works

Two separate localStorage entries are used:

| Key | Purpose | When Updated |
|-----|---------|--------------|
| `inventory_current_state` | Stores the current working data (everything on screen) | Automatically on every single change — typing, clicking +/-, adding or deleting rows |
| `inventory_saved_sessions` | Stores all manually saved sessions as a list | When you click "Store Session" (adds a new entry) or delete a session (removes it) |

### Current State (Auto-Save)

Every time you make any change — type a character, press a +/- button, add a row, delete a row, or edit a note — the entire current state is automatically saved to `inventory_current_state`. This means:

- **Refreshing the page** does not lose your work.
- **Closing and reopening the browser** brings back exactly where you left off.
- No "save" button is needed for in-progress work.

### Saved Sessions (Manual Save & Delete)

When you click **Store Session**, the current state plus a timestamp is saved as a new entry in the sessions list. Key behaviors:

- **Multiple sessions can be saved.** Each store creates a new session entry — previous sessions are not overwritten.
- **Loading** a session replaces the current working data with that session's data.
- **Deleting** a session removes it permanently from the saved list. This does not affect your current working data or any other sessions.
- **Wiping** clears the current working state but does **not** delete any saved sessions. You can still load them.

### Data Structure

The current state uses this structure:

```
{
  sessionName: "My Loading Session",
  palletRows: [
    { id, edi, palletWeight, itemQty, totalPallets }
  ],
  mtRows: [
    { id, edi, itemQty }
  ],
  kckRows: [
    { id, edi, itemQty }
  ],
  miscRows: [
    { id, edi, itemQty }
  ],
  noteRows: [
    { id, text }
  ]
}
```

Each saved session adds:
```
{
  sessionId: "unique-id",
  savedAt: "2026-02-07T12:00:00.000Z",
  ...all the fields above
}
```

### Important Notes About Storage

- **Data lives in your browser only.** If you clear your browser data, switch browsers, or use a different device, your data will not be there.
- **No cloud sync.** Data is not uploaded anywhere or shared between devices.
- **No login required.** Since everything is local, there are no user accounts or passwords.
- **Storage limits.** Browsers typically allow 5-10 MB of localStorage per site, which is more than enough for inventory tracking data.
