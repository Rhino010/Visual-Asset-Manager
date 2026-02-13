import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Minus,
  Trash2,
  Save,
  RotateCcw,
  FilePlus2,
  AlertTriangle,
  Package,
  ClipboardList,
  StickyNote,
  Layers,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CURRENT_STATE_KEY = "inventory_current_state";
const SAVED_SESSIONS_KEY = "inventory_saved_sessions";

let idCounter = 0;
function makeId(): string {
  return `${Date.now()}-${++idCounter}`;
}

interface PalletRow {
  id: string;
  edi: string;
  palletWeight: string;
  itemQty: string;
  totalPallets: number;
}

interface MiniRow {
  id: string;
  edi: string;
  itemQty: string;
}

interface NoteRow {
  id: string;
  text: string;
}

interface AppState {
  sessionName: string;
  mtPalletRows: PalletRow[];
  kckPalletRows: PalletRow[];
  mtRows: MiniRow[];
  kckRows: MiniRow[];
  miscRows: MiniRow[];
  noteRows: NoteRow[];
}

interface SavedSession extends AppState {
  sessionId: string;
  savedAt: string;
}

interface ValidationError {
  rowId: string;
  section: string;
  message: string;
}

function emptyPalletRow(): PalletRow {
  return { id: makeId(), edi: "", palletWeight: "", itemQty: "", totalPallets: 0 };
}

function emptyMiniRow(): MiniRow {
  return { id: makeId(), edi: "", itemQty: "" };
}

function emptyNoteRow(): NoteRow {
  return { id: makeId(), text: "" };
}

function defaultState(): AppState {
  return {
    sessionName: "",
    mtPalletRows: [emptyPalletRow()],
    kckPalletRows: [emptyPalletRow()],
    mtRows: [emptyMiniRow()],
    kckRows: [emptyMiniRow()],
    miscRows: [emptyMiniRow()],
    noteRows: [emptyNoteRow()],
  };
}

function migrateState(raw: any): AppState {
  const state = { ...raw };
  if (state.palletRows && !state.mtPalletRows) {
    state.mtPalletRows = state.palletRows;
    state.kckPalletRows = [emptyPalletRow()];
    delete state.palletRows;
  }
  if (!state.mtPalletRows) state.mtPalletRows = [emptyPalletRow()];
  if (!state.kckPalletRows) state.kckPalletRows = [emptyPalletRow()];
  if (!state.mtRows) state.mtRows = [emptyMiniRow()];
  if (!state.kckRows) state.kckRows = [emptyMiniRow()];
  if (!state.miscRows) state.miscRows = [emptyMiniRow()];
  if (!state.noteRows) state.noteRows = [emptyNoteRow()];
  if (!state.sessionName) state.sessionName = "";
  return state as AppState;
}

function loadCurrentState(): AppState {
  try {
    const raw = localStorage.getItem(CURRENT_STATE_KEY);
    if (raw) return migrateState(JSON.parse(raw));
  } catch {}
  return defaultState();
}

function loadSavedSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(SAVED_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((s: any) => ({ ...migrateState(s), sessionId: s.sessionId, savedAt: s.savedAt }));
    }
  } catch {}
  return [];
}

function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(sessions));
}

function parseIntSafe(val: string): number {
  if (val.trim() === "") return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function rowHasData(row: PalletRow): boolean {
  return (
    row.edi.trim() !== "" ||
    row.palletWeight.trim() !== "" ||
    row.itemQty.trim() !== "" ||
    row.totalPallets > 0
  );
}

function sectionPalletTotal(rows: PalletRow[]): number {
  return rows.reduce((s, r) => s + r.totalPallets, 0);
}

function sectionWeightTotal(rows: PalletRow[]): number {
  return rows.reduce((s, r) => s + parseIntSafe(r.palletWeight) * r.totalPallets, 0);
}

function PalletSection({
  sectionKey,
  label,
  rows,
  errors,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
}: {
  sectionKey: string;
  label: string;
  rows: PalletRow[];
  errors: ValidationError[];
  onUpdateRow: (id: string, field: keyof PalletRow, value: string | number) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
}) {
  const rowHasError = (id: string) => errors.some((e) => e.rowId === id);
  const sectionPallets = sectionPalletTotal(rows);
  const sectionWeight = sectionWeightTotal(rows);

  const addRowButton = (position: string) => (
    <Button
      data-testid={`button-add-${sectionKey}-row-${position}`}
      size="sm"
      variant="outline"
      onClick={onAddRow}
    >
      <Plus className="w-4 h-4" />
      Add Row
    </Button>
  );

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/20 border-b">
        <span className="font-medium text-sm">{label}</span>
        {addRowButton("top")}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">EDI</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pallet Weight</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item Qty</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total Pallets</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total Weight</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const weight = parseIntSafe(row.palletWeight) * row.totalPallets;
              const hasErr = rowHasError(row.id);
              return (
                <tr
                  key={row.id}
                  data-testid={`${sectionKey}-row-${row.id}`}
                  className={`border-b last:border-b-0 ${hasErr ? "bg-destructive/5" : ""}`}
                >
                  <td className="px-3 py-1.5">
                    <Input
                      data-testid={`input-edi-${row.id}`}
                      value={row.edi}
                      onChange={(e) => onUpdateRow(row.id, "edi", e.target.value)}
                      placeholder="EDI..."
                      className={`min-w-[100px] ${hasErr ? "border-destructive" : ""}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      data-testid={`input-pallet-weight-${row.id}`}
                      type="number"
                      value={row.palletWeight}
                      onChange={(e) => onUpdateRow(row.id, "palletWeight", e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="min-w-[90px]"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      data-testid={`input-item-qty-${row.id}`}
                      type="number"
                      value={row.itemQty}
                      onChange={(e) => onUpdateRow(row.id, "itemQty", e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="min-w-[90px]"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        data-testid={`button-dec-pallets-${row.id}`}
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          onUpdateRow(row.id, "totalPallets", Math.max(0, row.totalPallets - 1))
                        }
                        disabled={row.totalPallets <= 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span
                        data-testid={`text-total-pallets-${row.id}`}
                        className="w-8 text-center font-medium tabular-nums"
                      >
                        {row.totalPallets}
                      </span>
                      <Button
                        data-testid={`button-inc-pallets-${row.id}`}
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          onUpdateRow(row.id, "totalPallets", row.totalPallets + 1)
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <span
                      data-testid={`text-total-weight-${row.id}`}
                      className="font-semibold tabular-nums"
                    >
                      {weight.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      data-testid={`button-delete-${sectionKey}-${row.id}`}
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteRow(row.id)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No rows yet. Click "Add Row" to start tracking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t bg-muted/20">
        {addRowButton("bottom")}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{label} Pallets:</span>
            <Badge data-testid={`text-${sectionKey}-total-pallets`} variant="secondary" className="tabular-nums">
              {sectionPallets}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{label} Weight:</span>
            <Badge data-testid={`text-${sectionKey}-total-weight`} variant="secondary" className="tabular-nums">
              {sectionWeight.toLocaleString()}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventoryTracker() {
  const [state, setState] = useState<AppState>(loadCurrentState);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>(loadSavedSessions);
  const [showSessions, setShowSessions] = useState(false);
  const { toast } = useToast();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem(CURRENT_STATE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => fn(prev));
    setErrors([]);
  }, []);

  const updatePalletRow = useCallback(
    (section: "mtPalletRows" | "kckPalletRows", id: string, field: keyof PalletRow, value: string | number) => {
      update((s) => ({
        ...s,
        [section]: s[section].map((r) =>
          r.id === id ? { ...r, [field]: value } : r
        ),
      }));
    },
    [update]
  );

  const updateMiniRow = useCallback(
    (section: "mtRows" | "kckRows" | "miscRows", id: string, field: keyof MiniRow, value: string) => {
      update((s) => ({
        ...s,
        [section]: (s[section] as MiniRow[]).map((r) =>
          r.id === id ? { ...r, [field]: value } : r
        ),
      }));
    },
    [update]
  );

  const validatePalletRows = (rows: PalletRow[], sectionLabel: string): ValidationError[] => {
    const errs: ValidationError[] = [];
    for (const row of rows) {
      if (rowHasData(row) && !row.edi.trim()) {
        errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: EDI is required when row has data` });
      }
      const pw = parseIntSafe(row.palletWeight);
      const iq = parseIntSafe(row.itemQty);
      if (pw < 0) {
        errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: Pallet Weight cannot be negative` });
      }
      if (iq < 0) {
        errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: Item Quantity cannot be negative` });
      }
      if (row.palletWeight.trim() !== "" && row.palletWeight.trim() !== String(pw)) {
        errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: Pallet Weight must be a valid integer` });
      }
      if (row.itemQty.trim() !== "" && row.itemQty.trim() !== String(iq)) {
        errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: Item Quantity must be a valid integer` });
      }
      if (row.edi.trim() && rowHasData(row)) {
        if (row.palletWeight.trim() && row.edi.trim() === row.palletWeight.trim()) {
          errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: EDI looks like the Pallet Weight value - double check` });
        }
        if (row.itemQty.trim() && row.edi.trim() === row.itemQty.trim()) {
          errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: EDI looks like the Item Quantity value - double check` });
        }
        const ediNum = parseInt(row.edi.trim(), 10);
        if (!isNaN(ediNum)) {
          if (pw !== 0 && ediNum === pw) {
            errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: EDI is a number matching Pallet Weight - double check` });
          }
          if (iq !== 0 && ediNum === iq) {
            errs.push({ rowId: row.id, section: sectionLabel, message: `${sectionLabel}: EDI is a number matching Item Quantity - double check` });
          }
        }
      }
    }
    return errs;
  };

  const validate = (): ValidationError[] => {
    const errs: ValidationError[] = [];
    if (!state.sessionName.trim()) {
      errs.push({ rowId: "session", section: "toolbar", message: "Session name is required" });
    }
    errs.push(...validatePalletRows(state.mtPalletRows, "Loaded for MT"));
    errs.push(...validatePalletRows(state.kckPalletRows, "Loaded for KCK"));
    return errs;
  };

  const handleStore = () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast({
        title: "Validation Failed",
        description: `${validationErrors.length} issue(s) found. Please fix highlighted rows.`,
        variant: "destructive",
      });
      return;
    }
    const session: SavedSession = {
      ...state,
      sessionId: makeId(),
      savedAt: new Date().toISOString(),
    };
    const updated = [session, ...sessions];
    setSessions(updated);
    saveSessions(updated);
    toast({ title: "Session Saved", description: `"${session.sessionName}" saved successfully.` });
  };

  const handleLoadSession = (session: SavedSession) => {
    const { sessionId: _id, savedAt: _at, ...rest } = session;
    setState(migrateState(rest) as AppState);
    setErrors([]);
    setShowSessions(false);
    toast({ title: "Session Loaded", description: `"${session.sessionName}" loaded.` });
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = sessions.filter((s) => s.sessionId !== sessionId);
    setSessions(updated);
    saveSessions(updated);
    toast({ title: "Session Deleted", description: "The saved session has been removed." });
  };

  const handleWipe = () => {
    setState(defaultState());
    setErrors([]);
    localStorage.removeItem(CURRENT_STATE_KEY);
    toast({ title: "Cleared", description: "Current data wiped. Saved sessions are still available." });
  };

  const rowHasError = (id: string) => errors.some((e) => e.rowId === id);

  const overallPallets = sectionPalletTotal(state.mtPalletRows) + sectionPalletTotal(state.kckPalletRows);
  const overallWeight = sectionWeightTotal(state.mtPalletRows) + sectionWeightTotal(state.kckPalletRows);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-auto">
              <Package className="w-5 h-5 text-primary" />
              <span className="font-semibold text-base">Inventory Tracker</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Input
                data-testid="input-session-name"
                placeholder="Session name..."
                value={state.sessionName}
                onChange={(e) => update((s) => ({ ...s, sessionName: e.target.value }))}
                className={`w-full sm:w-48 ${rowHasError("session") ? "border-destructive ring-1 ring-destructive" : ""}`}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button data-testid="button-store-session" onClick={handleStore} size="sm">
                  <Save className="w-4 h-4" />
                  <span className="hidden xs:inline">Store</span>
                </Button>
                <Button
                  data-testid="button-toggle-sessions"
                  onClick={() => setShowSessions(!showSessions)}
                  variant="outline"
                  size="sm"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="hidden xs:inline">Sessions</span>
                  {sessions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {sessions.length}
                    </Badge>
                  )}
                  {showSessions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
                <Button data-testid="button-wipe" onClick={handleWipe} variant="ghost" size="sm">
                  <FilePlus2 className="w-4 h-4" />
                  <span className="hidden xs:inline">New / Wipe</span>
                </Button>
              </div>
            </div>
          </div>
          {errors.length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {errors.map((e, i) => (
                  <div key={i}>{e.message}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        {showSessions && (
          <div className="border-t bg-muted/30">
            <div className="max-w-7xl mx-auto px-3 py-3">
              <div className="text-sm font-medium text-muted-foreground mb-2">Saved Sessions</div>
              {sessions.length === 0 ? (
                <p data-testid="text-no-sessions" className="text-sm text-muted-foreground py-2">
                  No saved sessions yet. Fill in data and click "Store" to save one.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sessions.map((s) => {
                    const palletCount = sectionPalletTotal(s.mtPalletRows || []) + sectionPalletTotal(s.kckPalletRows || []);
                    const rowCount = (s.mtPalletRows || []).length + (s.kckPalletRows || []).length;
                    return (
                      <div
                        key={s.sessionId}
                        data-testid={`session-item-${s.sessionId}`}
                        className="flex items-center justify-between gap-3 rounded-md border bg-background p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{s.sessionName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(s.savedAt).toLocaleString()} &middot; {rowCount} row{rowCount !== 1 ? "s" : ""} &middot; {palletCount} pallet{palletCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            data-testid={`button-load-session-${s.sessionId}`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadSession(s)}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Load
                          </Button>
                          <Button
                            data-testid={`button-delete-session-${s.sessionId}`}
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteSession(s.sessionId)}
                            className="text-muted-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Pallet Tracking</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <PalletSection
              sectionKey="mt-pallet"
              label="Loaded for MT"
              rows={state.mtPalletRows}
              errors={errors}
              onUpdateRow={(id, field, value) => updatePalletRow("mtPalletRows", id, field, value)}
              onAddRow={() => update((s) => ({ ...s, mtPalletRows: [...s.mtPalletRows, emptyPalletRow()] }))}
              onDeleteRow={(id) => update((s) => ({ ...s, mtPalletRows: s.mtPalletRows.filter((r) => r.id !== id) }))}
            />
            <PalletSection
              sectionKey="kck-pallet"
              label="Loaded for KCK"
              rows={state.kckPalletRows}
              errors={errors}
              onUpdateRow={(id, field, value) => updatePalletRow("kckPalletRows", id, field, value)}
              onAddRow={() => update((s) => ({ ...s, kckPalletRows: [...s.kckPalletRows, emptyPalletRow()] }))}
              onDeleteRow={(id) => update((s) => ({ ...s, kckPalletRows: s.kckPalletRows.filter((r) => r.id !== id) }))}
            />
            <div className="flex flex-wrap items-center justify-end gap-4 px-4 py-3 bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Overall Pallets:</span>
                <Badge data-testid="text-overall-total-pallets" className="tabular-nums">
                  {overallPallets}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Overall Weight:</span>
                <Badge data-testid="text-overall-total-weight" className="tabular-nums">
                  {overallWeight.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["mtRows", "kckRows", "miscRows"] as const).map((section) => {
            const label = section === "mtRows" ? "Send to MT" : section === "kckRows" ? "Send to KCK" : "Misc";
            const rows = state[section];
            return (
              <Card key={section}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">{label}</CardTitle>
                  </div>
                  <Button
                    data-testid={`button-add-${section}`}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        [section]: [...(s[section] as MiniRow[]), emptyMiniRow()],
                      }))
                    }
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">EDI</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item Qty</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id} data-testid={`${section}-row-${row.id}`} className="border-b last:border-b-0">
                            <td className="px-3 py-1.5">
                              <Input
                                data-testid={`input-${section}-edi-${row.id}`}
                                value={row.edi}
                                onChange={(e) => updateMiniRow(section, row.id, "edi", e.target.value)}
                                placeholder="EDI..."
                                className="min-w-[80px]"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input
                                data-testid={`input-${section}-qty-${row.id}`}
                                type="number"
                                value={row.itemQty}
                                onChange={(e) => updateMiniRow(section, row.id, "itemQty", e.target.value)}
                                placeholder="0"
                                min="0"
                                step="1"
                                className="min-w-[70px]"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <Button
                                data-testid={`button-delete-${section}-${row.id}`}
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  update((s) => ({
                                    ...s,
                                    [section]: (s[section] as MiniRow[]).filter((r) => r.id !== row.id),
                                  }))
                                }
                                className="text-muted-foreground"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground text-xs">
                              No rows. Click "Add" above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Notes</CardTitle>
            </div>
            <Button
              data-testid="button-add-note"
              size="sm"
              variant="outline"
              onClick={() =>
                update((s) => ({ ...s, noteRows: [...s.noteRows, emptyNoteRow()] }))
              }
            >
              <Plus className="w-4 h-4" />
              Add Note
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.noteRows.map((row) => (
              <div key={row.id} data-testid={`note-row-${row.id}`} className="flex items-center gap-2">
                <Input
                  data-testid={`input-note-${row.id}`}
                  value={row.text}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      noteRows: s.noteRows.map((r) =>
                        r.id === row.id ? { ...r, text: e.target.value } : r
                      ),
                    }))
                  }
                  placeholder="Add a note..."
                  className="flex-1"
                />
                <Button
                  data-testid={`button-delete-note-${row.id}`}
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      noteRows: s.noteRows.filter((r) => r.id !== row.id),
                    }))
                  }
                  className="text-muted-foreground shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {state.noteRows.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                No notes yet. Click "Add Note" above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
