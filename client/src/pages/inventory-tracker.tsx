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
} from "lucide-react";

const CURRENT_STATE_KEY = "inventory_current_state";
const SAVED_SESSION_KEY = "inventory_saved_session";

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
  palletRows: PalletRow[];
  mtRows: MiniRow[];
  kckRows: MiniRow[];
  miscRows: MiniRow[];
  noteRows: NoteRow[];
}

interface SavedSession extends AppState {
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
    palletRows: [emptyPalletRow()],
    mtRows: [emptyMiniRow()],
    kckRows: [emptyMiniRow()],
    miscRows: [emptyMiniRow()],
    noteRows: [emptyNoteRow()],
  };
}

function loadCurrentState(): AppState {
  try {
    const raw = localStorage.getItem(CURRENT_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultState();
}

function loadSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SAVED_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
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

export default function InventoryTracker() {
  const [state, setState] = useState<AppState>(loadCurrentState);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [savedInfo, setSavedInfo] = useState<{ name: string; time: string } | null>(() => {
    const s = loadSavedSession();
    return s ? { name: s.sessionName, time: s.savedAt } : null;
  });
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
    (id: string, field: keyof PalletRow, value: string | number) => {
      update((s) => ({
        ...s,
        palletRows: s.palletRows.map((r) =>
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

  const validate = (): ValidationError[] => {
    const errs: ValidationError[] = [];
    if (!state.sessionName.trim()) {
      errs.push({ rowId: "session", section: "toolbar", message: "Session name is required" });
    }
    for (const row of state.palletRows) {
      if (rowHasData(row) && !row.edi.trim()) {
        errs.push({ rowId: row.id, section: "pallet", message: "EDI is required when row has data" });
      }
      const pw = parseIntSafe(row.palletWeight);
      const iq = parseIntSafe(row.itemQty);
      if (pw < 0) {
        errs.push({ rowId: row.id, section: "pallet", message: "Pallet Weight cannot be negative" });
      }
      if (iq < 0) {
        errs.push({ rowId: row.id, section: "pallet", message: "Item Quantity cannot be negative" });
      }
      if (row.palletWeight.trim() !== "" && row.palletWeight.trim() !== String(pw)) {
        errs.push({ rowId: row.id, section: "pallet", message: "Pallet Weight must be a valid integer" });
      }
      if (row.itemQty.trim() !== "" && row.itemQty.trim() !== String(iq)) {
        errs.push({ rowId: row.id, section: "pallet", message: "Item Quantity must be a valid integer" });
      }
      if (row.edi.trim() && rowHasData(row)) {
        if (row.palletWeight.trim() && row.edi.trim() === row.palletWeight.trim()) {
          errs.push({ rowId: row.id, section: "pallet", message: "EDI looks like the Pallet Weight value - double check" });
        }
        if (row.itemQty.trim() && row.edi.trim() === row.itemQty.trim()) {
          errs.push({ rowId: row.id, section: "pallet", message: "EDI looks like the Item Quantity value - double check" });
        }
        const ediNum = parseInt(row.edi.trim(), 10);
        if (!isNaN(ediNum)) {
          if (pw !== 0 && ediNum === pw) {
            errs.push({ rowId: row.id, section: "pallet", message: "EDI is a number matching Pallet Weight - double check" });
          }
          if (iq !== 0 && ediNum === iq) {
            errs.push({ rowId: row.id, section: "pallet", message: "EDI is a number matching Item Quantity - double check" });
          }
        }
      }
    }
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
    const session: SavedSession = { ...state, savedAt: new Date().toISOString() };
    localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify(session));
    setSavedInfo({ name: session.sessionName, time: session.savedAt });
    toast({ title: "Session Saved", description: `"${session.sessionName}" saved successfully.` });
  };

  const handleRecall = () => {
    const saved = loadSavedSession();
    if (!saved) {
      toast({ title: "No Saved Session", description: "There is no saved session to recall.", variant: "destructive" });
      return;
    }
    const { savedAt: _savedAt, ...rest } = saved;
    setState(rest);
    setErrors([]);
    toast({ title: "Session Recalled", description: `"${saved.sessionName}" loaded.` });
  };

  const handleWipe = () => {
    setState(defaultState());
    setErrors([]);
    localStorage.removeItem(CURRENT_STATE_KEY);
    toast({ title: "Cleared", description: "Current data wiped. Saved session is still available." });
  };

  const rowHasError = (id: string) => errors.some((e) => e.rowId === id);

  const totalPallets = state.palletRows.reduce((s, r) => s + r.totalPallets, 0);
  const totalWeight = state.palletRows.reduce(
    (s, r) => s + parseIntSafe(r.palletWeight) * r.totalPallets,
    0
  );

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
                <Button data-testid="button-recall-session" onClick={handleRecall} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden xs:inline">Recall</span>
                </Button>
                <Button data-testid="button-wipe" onClick={handleWipe} variant="ghost" size="sm">
                  <FilePlus2 className="w-4 h-4" />
                  <span className="hidden xs:inline">New / Wipe</span>
                </Button>
              </div>
            </div>
          </div>
          {savedInfo && (
            <div className="mt-1.5">
              <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                Saved: {savedInfo.name} at {new Date(savedInfo.time).toLocaleString()}
              </Badge>
            </div>
          )}
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
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4 space-y-4">
        {/* Section 1: Main Pallet Tracking */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Pallet Tracking</CardTitle>
            </div>
            <Button
              data-testid="button-add-pallet-row"
              size="sm"
              variant="outline"
              onClick={() => update((s) => ({ ...s, palletRows: [...s.palletRows, emptyPalletRow()] }))}
            >
              <Plus className="w-4 h-4" />
              Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-0">
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
                  {state.palletRows.map((row) => {
                    const weight = parseIntSafe(row.palletWeight) * row.totalPallets;
                    const hasErr = rowHasError(row.id);
                    return (
                      <tr
                        key={row.id}
                        data-testid={`pallet-row-${row.id}`}
                        className={`border-b last:border-b-0 ${hasErr ? "bg-destructive/5" : ""}`}
                      >
                        <td className="px-3 py-1.5">
                          <Input
                            data-testid={`input-edi-${row.id}`}
                            value={row.edi}
                            onChange={(e) => updatePalletRow(row.id, "edi", e.target.value)}
                            placeholder="EDI..."
                            className={`min-w-[100px] ${hasErr ? "border-destructive" : ""}`}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            data-testid={`input-pallet-weight-${row.id}`}
                            type="number"
                            value={row.palletWeight}
                            onChange={(e) => updatePalletRow(row.id, "palletWeight", e.target.value)}
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
                            onChange={(e) => updatePalletRow(row.id, "itemQty", e.target.value)}
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
                                updatePalletRow(row.id, "totalPallets", Math.max(0, row.totalPallets - 1))
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
                                updatePalletRow(row.id, "totalPallets", row.totalPallets + 1)
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
                            data-testid={`button-delete-pallet-${row.id}`}
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              update((s) => ({
                                ...s,
                                palletRows: s.palletRows.filter((r) => r.id !== row.id),
                              }))
                            }
                            className="text-muted-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {state.palletRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        No rows yet. Click "Add Row" to start tracking pallets.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-4 px-4 py-3 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total Pallets:</span>
                <Badge data-testid="text-running-total-pallets" variant="secondary" className="tabular-nums">
                  {totalPallets}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total Weight:</span>
                <Badge data-testid="text-running-total-weight" variant="secondary" className="tabular-nums">
                  {totalWeight.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: MT / KCK / Misc breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["mtRows", "kckRows", "miscRows"] as const).map((section) => {
            const label = section === "mtRows" ? "MT" : section === "kckRows" ? "KCK" : "Misc";
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

        {/* Section 3: Notes */}
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
