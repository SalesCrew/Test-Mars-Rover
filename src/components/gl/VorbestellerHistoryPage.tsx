import React, { useState, useEffect, useCallback } from 'react';
import {
  CaretDown,
  CaretRight,
  Package,
  Check,
  X,
  Trash,
  Plus,
  Minus,
  CircleNotch,
  CalendarBlank,
  CheckCircle
} from '@phosphor-icons/react';
import Aurora from './Aurora';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/database';
import { wellenService, type Welle } from '../../services/wellenService';
import styles from './VorbestellerHistoryPage.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface WaveInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  goalType: 'percentage' | 'value';
  goalValue?: number;
  currentValue?: number;
  displayCount: number;
  kartonwareCount: number;
}

interface ProductDetail {
  id: string;
  name: string;
  quantity: number;
  valuePerUnit: number;
  value: number;
}

interface SubmissionEntry {
  id: string;
  marketName: string;
  marketChain: string;
  marketId?: string;
  itemType: 'display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt';
  itemName: string;
  parentId?: string;
  quantity: number;
  valuePerUnit: number;
  value: number;
  timestamp: string;
  products?: ProductDetail[];
}

interface DayGroup {
  date: string;
  dateLabel: string;
  entries: SubmissionEntry[];
  dayTotal: number;
  markets: { id: string; name: string; chain: string }[];
}

type AddStep = 'type' | 'item' | 'parent' | 'product' | 'quantity';

interface SelectedItem {
  id: string;
  name: string;
  valuePerUnit: number;
  quantity: number;
}

interface AddState {
  waveId: string;
  dayDate: string;
  marketId: string;
  step: AddStep;
  itemType: string;
  parentId?: string;
  parentName?: string;
  selectedItems: SelectedItem[];
}

// ============================================================================
// HELPERS
// ============================================================================

const chainColors: Record<string, { bg: string; border: string; text: string }> = {
  'BILLA+': { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#DC2626' },
  'BILLA': { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#DC2626' },
  'SPAR': { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)', text: '#16A34A' },
  'EUROSPAR': { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)', text: '#16A34A' },
  'INTERSPAR': { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)', text: '#16A34A' },
  'HAGEBAU': { bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.3)', text: '#EA580C' },
  'PENNY': { bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.3)', text: '#EA580C' },
  'HOFER': { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', text: '#2563EB' },
  'FRESSNAPF': { bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.3)', text: '#7C3AED' },
  'default': { bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.3)', text: '#475569' },
};

const getChainColor = (chain: string) => {
  const upper = chain?.toUpperCase() || '';
  for (const key of Object.keys(chainColors)) {
    if (key !== 'default' && upper.includes(key)) return chainColors[key];
  }
  return chainColors['default'];
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatCompactDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parseInt(parts[2])}.${parseInt(parts[1])}`;
};

const formatValue = (v: number): string =>
  `€${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const typeLabel: Record<string, string> = {
  display: 'D', kartonware: 'K', palette: 'P', schuette: 'S', einzelprodukt: 'E',
};
const typeClass: Record<string, string> = {
  display: 'typeDisplay', kartonware: 'typeKartonware', palette: 'typePalette',
  schuette: 'typeSchuette', einzelprodukt: 'typeEinzelprodukt',
};
const typeLabelFull: Record<string, string> = {
  display: 'Display', kartonware: 'Kartonware', palette: 'Palette',
  schuette: 'Schütte', einzelprodukt: 'Einzelprodukt',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const VorbestellerHistoryPage: React.FC = () => {
  const { user } = useAuth();

  // Data
  const [waves, setWaves] = useState<WaveInfo[]>([]);
  const [submissionsByWave, setSubmissionsByWave] = useState<Record<string, SubmissionEntry[]>>({});
  const [waveDefinitions, setWaveDefinitions] = useState<Record<string, Welle>>({});
  const [loading, setLoading] = useState(true);
  const [loadingWave, setLoadingWave] = useState<string | null>(null);

  // UI
  const [expandedWaves, setExpandedWaves] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add
  const [addState, setAddState] = useState<AddState | null>(null);

  // ---- FETCH WAVES ----
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/wellen/dashboard/waves?glIds=${user.id}`);
        if (!res.ok) throw new Error('Failed');
        setWaves(await res.json() || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  // ---- FETCH WAVE DEFINITIONS (for add flow) ----
  const fetchWaveDefinition = useCallback(async (waveId: string) => {
    if (waveDefinitions[waveId]) return waveDefinitions[waveId];
    try {
      const allWellen = await wellenService.getAllWellen();
      const defs: Record<string, Welle> = {};
      allWellen.forEach(w => { defs[w.id] = w; });
      setWaveDefinitions(defs);
      return defs[waveId];
    } catch (e) { console.error(e); return null; }
  }, [waveDefinitions]);

  // ---- FETCH SUBMISSIONS (lazy) ----
  const fetchWaveSubmissions = useCallback(async (waveId: string, force = false) => {
    if (!user?.id) return;
    if (!force && submissionsByWave[waveId]) return;
    setLoadingWave(waveId);
    try {
      const res = await fetch(`${API_BASE_URL}/wellen/${waveId}/gl-submissions/${user.id}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSubmissionsByWave(prev => ({ ...prev, [waveId]: data || [] }));
    } catch (e) { console.error(e); }
    finally { setLoadingWave(null); }
  }, [user?.id, submissionsByWave]);

  // ---- REFETCH after mutation ----
  const refetchWave = useCallback(async (waveId: string) => {
    setSubmissionsByWave(prev => { const n = { ...prev }; delete n[waveId]; return n; });
    await fetchWaveSubmissions(waveId, true);
  }, [fetchWaveSubmissions]);

  // ---- TOGGLES ----
  const toggleWave = useCallback((waveId: string) => {
    setExpandedWaves(prev => {
      const next = new Set(prev);
      if (next.has(waveId)) { next.delete(waveId); }
      else { next.add(waveId); fetchWaveSubmissions(waveId); }
      return next;
    });
  }, [fetchWaveSubmissions]);

  const toggleItem = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }, []);

  // ---- EDIT ----
  const startEdit = useCallback((id: string, qty: number) => {
    setEditingId(id); setEditQty(qty); setConfirmDeleteId(null); setAddState(null);
  }, []);
  const cancelEdit = useCallback(() => {
    setEditingId(null); setEditQty(0); setConfirmDeleteId(null);
  }, []);

  const saveEdit = useCallback(async (submissionId: string, waveId: string) => {
    if (editQty < 1) return;
    setSaving(true);
    try {
      await wellenService.updateSubmission(submissionId, editQty);
      setEditingId(null);
      await refetchWave(waveId);
    } catch (e) { console.error(e); alert('Fehler beim Speichern'); }
    finally { setSaving(false); }
  }, [editQty, refetchWave]);

  const handleDelete = useCallback(async (submissionId: string, waveId: string) => {
    setSaving(true);
    try {
      const ids = submissionId.split(',');
      for (const id of ids) await wellenService.deleteSubmission(id.trim());
      setConfirmDeleteId(null); setEditingId(null);
      await refetchWave(waveId);
    } catch (e) { console.error(e); alert('Fehler beim Löschen'); }
    finally { setSaving(false); }
  }, [refetchWave]);

  // ---- ADD FLOW ----
  const startAdd = useCallback(async (waveId: string, dayDate: string, marketId: string) => {
    await fetchWaveDefinition(waveId);
    setAddState({
      waveId, dayDate, marketId, step: 'type',
      itemType: '', selectedItems: [],
    });
    setEditingId(null);
  }, [fetchWaveDefinition]);

  const cancelAdd = useCallback(() => setAddState(null), []);

  const toggleSelectItem = useCallback((id: string, name: string, valuePerUnit: number) => {
    setAddState(prev => {
      if (!prev) return null;
      const exists = prev.selectedItems.find(i => i.id === id);
      if (exists) {
        return { ...prev, selectedItems: prev.selectedItems.filter(i => i.id !== id) };
      }
      return { ...prev, selectedItems: [...prev.selectedItems, { id, name, valuePerUnit, quantity: 1 }] };
    });
  }, []);

  const updateSelectedQty = useCallback((id: string, qty: number) => {
    setAddState(prev => {
      if (!prev) return null;
      return { ...prev, selectedItems: prev.selectedItems.map(i => i.id === id ? { ...i, quantity: Math.max(0, qty) } : i) };
    });
  }, []);

  const submitAdd = useCallback(async () => {
    if (!addState || !user?.id) return;
    const validItems = addState.selectedItems.filter(i => i.quantity > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    try {
      const items = validItems.map(i => {
        const entry: any = {
          item_type: addState.itemType,
          item_id: i.id,
          current_number: i.quantity,
        };
        if ((addState.itemType === 'palette' || addState.itemType === 'schuette') && i.valuePerUnit) {
          entry.value_per_unit = i.valuePerUnit;
        }
        return entry;
      });
      await wellenService.updateProgressBatch(addState.waveId, {
        gebietsleiter_id: user.id,
        market_id: addState.marketId,
        items,
        timestamp: `${addState.dayDate}T12:00:00Z`,
        skipVisitUpdate: true,
      });
      const waveId = addState.waveId;
      setAddState(null);
      await refetchWave(waveId);
    } catch (e) { console.error(e); alert('Fehler beim Hinzufügen'); }
    finally { setSaving(false); }
  }, [addState, user?.id, refetchWave]);

  // ---- GROUP BY DAY ----
  const getDayGroups = useCallback((entries: SubmissionEntry[]): DayGroup[] => {
    const grouped: Record<string, SubmissionEntry[]> = {};
    entries.forEach(e => {
      const date = e.timestamp?.split('T')[0] || 'unknown';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(e);
    });
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => {
      const dayEntries = grouped[date];
      // Collect unique markets for this day
      const marketMap = new Map<string, { id: string; name: string; chain: string }>();
      dayEntries.forEach(e => {
        if (e.marketId && !marketMap.has(e.marketId)) {
          marketMap.set(e.marketId, { id: e.marketId, name: e.marketName, chain: e.marketChain });
        }
      });
      // Fallback: use marketName as key if no marketId
      if (marketMap.size === 0 && dayEntries.length > 0) {
        marketMap.set(dayEntries[0].marketName, { id: dayEntries[0].marketName, name: dayEntries[0].marketName, chain: dayEntries[0].marketChain });
      }
      return {
        date,
        dateLabel: formatDate(date),
        entries: dayEntries,
        dayTotal: dayEntries.reduce((s, e) => s + e.value, 0),
        markets: Array.from(marketMap.values()),
      };
    });
  }, []);

  const getWaveTotal = useCallback((waveId: string, wave: WaveInfo): string => {
    const subs = submissionsByWave[waveId];
    if (subs) {
      const total = subs.reduce((s, e) => s + e.value, 0);
      if (wave.goalType === 'value') return formatValue(total);
      return `${subs.reduce((s, e) => s + e.quantity, 0)} Artikel`;
    }
    if (wave.goalType === 'value' && wave.currentValue) return formatValue(wave.currentValue);
    return `${(wave.displayCount || 0) + (wave.kartonwareCount || 0)} Artikel`;
  }, [submissionsByWave]);

  // ---- RENDER: QUANTITY STEPPER ----
  const renderQuantity = (id: string, qty: number, waveId: string, isSubItem?: boolean) => {
    if (editingId === id) {
      return (
        <div className={styles.editRow}>
          <div className={styles.quantityControls}>
            <button className={styles.quantityButton} onClick={() => setEditQty(Math.max(0, editQty - 1))}>
              <Minus size={14} weight="bold" />
            </button>
            <input
              type="text"
              className={styles.quantityInput}
              value={editQty === 0 ? '' : editQty}
              onChange={e => {
                const v = e.target.value;
                if (v === '') { setEditQty(0); return; }
                const n = parseInt(v, 10);
                if (!isNaN(n) && n >= 0) setEditQty(n);
              }}
              placeholder="0"
            />
            <button className={styles.quantityButton} onClick={() => setEditQty(editQty + 1)}>
              <Plus size={14} weight="bold" />
            </button>
          </div>
          <div className={styles.editActions}>
            <button className={styles.editSave} onClick={() => saveEdit(id, waveId)} disabled={saving || editQty < 1}>
              <Check size={14} weight="bold" />
            </button>
            <button className={styles.editCancel} onClick={cancelEdit}>
              <X size={14} weight="bold" />
            </button>
            <button className={styles.deleteBtn} onClick={() => setConfirmDeleteId(id)}>
              <Trash size={14} weight="regular" />
            </button>
          </div>
        </div>
      );
    }
    return (
      <span className={isSubItem ? styles.subItemQty : styles.itemQuantity} onClick={() => startEdit(id, qty)}>
        {qty}x
      </span>
    );
  };

  const renderDeleteConfirm = (id: string, waveId: string) => {
    if (confirmDeleteId !== id) return null;
    return (
      <div className={styles.confirmDelete}>
        <span className={styles.confirmDeleteText}>Wirklich löschen?</span>
        <button className={styles.confirmDeleteYes} onClick={() => handleDelete(id, waveId)} disabled={saving}>Ja</button>
        <button className={styles.confirmDeleteNo} onClick={() => setConfirmDeleteId(null)}>Nein</button>
      </div>
    );
  };

  // ---- RENDER: ADD ROW ----
  const renderAddRow = (waveId: string, day: DayGroup) => {
    if (!addState || addState.waveId !== waveId || addState.dayDate !== day.date) {
      return (
        <button className={styles.addBtn} onClick={() => startAdd(waveId, day.date, day.markets[0]?.id || '')}>
          <Plus size={14} weight="bold" /> Eintrag hinzufügen
        </button>
      );
    }

    const waveDef = waveDefinitions[waveId];
    if (!waveDef) return <div className={styles.addRow}><CircleNotch size={16} className={styles.spinner} /></div>;

    const availableTypes = (waveDef.types || []).filter(t => {
      if (t === 'display' && waveDef.displays?.length) return true;
      if (t === 'kartonware' && waveDef.kartonwareItems?.length) return true;
      if (t === 'einzelprodukt' && waveDef.einzelproduktItems?.length) return true;
      if (t === 'palette' && waveDef.paletteItems?.length) return true;
      if (t === 'schuette' && waveDef.schutteItems?.length) return true;
      return false;
    });

    // Step: select type
    if (addState.step === 'type') {
      return (
        <div className={styles.addRow}>
          <div className={styles.addRowHeader}>
            <span className={styles.addRowTitle}>Typ wählen</span>
            <button className={styles.addRowClose} onClick={cancelAdd}><X size={14} weight="bold" /></button>
          </div>
          <div className={styles.typeSelector}>
            {availableTypes.map(t => (
              <button
                key={t}
                className={`${styles.typeOption} ${styles[typeClass[t]] || ''}`}
                onClick={() => {
                  if (t === 'palette' || t === 'schuette') {
                    setAddState(prev => prev ? { ...prev, itemType: t, step: 'parent' } : null);
                  } else {
                    setAddState(prev => prev ? { ...prev, itemType: t, step: 'item' } : null);
                  }
                }}
              >
                <span className={styles.typeOptionLabel}>{typeLabelFull[t]}</span>
              </button>
            ))}
          </div>
          {/* Market picker if multiple markets */}
          {day.markets.length > 1 && (
            <div className={styles.marketPicker}>
              <span className={styles.marketPickerLabel}>Markt:</span>
              {day.markets.map(m => (
                <button
                  key={m.id}
                  className={`${styles.marketPickerBtn} ${addState.marketId === m.id ? styles.marketPickerActive : ''}`}
                  onClick={() => setAddState(prev => prev ? { ...prev, marketId: m.id } : null)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Step: select parent palette/schuette
    if (addState.step === 'parent') {
      const parents = addState.itemType === 'palette' ? waveDef.paletteItems : waveDef.schutteItems;
      return (
        <div className={styles.addRow}>
          <div className={styles.addRowHeader}>
            <button className={styles.addRowBack} onClick={() => setAddState(prev => prev ? { ...prev, step: 'type' } : null)}>
              <CaretRight size={12} weight="bold" style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span className={styles.addRowTitle}>{typeLabelFull[addState.itemType]} wählen</span>
            <button className={styles.addRowClose} onClick={cancelAdd}><X size={14} weight="bold" /></button>
          </div>
          <div className={styles.itemList}>
            {(parents || []).map((p: any) => (
              <button
                key={p.id}
                className={styles.itemOption}
                onClick={() => setAddState(prev => prev ? { ...prev, parentId: p.id, parentName: p.name, step: 'product' } : null)}
              >
                <span className={styles.itemOptionName}>{p.name}</span>
                <span className={styles.itemOptionMeta}>{p.products?.length || 0} Produkte</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Step: select product within palette/schuette (multi-select)
    if (addState.step === 'product') {
      const parents = addState.itemType === 'palette' ? waveDef.paletteItems : waveDef.schutteItems;
      const parent = (parents || []).find((p: any) => p.id === addState.parentId);
      const selectedIds = new Set(addState.selectedItems.map(i => i.id));
      return (
        <div className={styles.addRow}>
          <div className={styles.addRowHeader}>
            <button className={styles.addRowBack} onClick={() => setAddState(prev => prev ? { ...prev, step: 'parent', selectedItems: [] } : null)}>
              <CaretRight size={12} weight="bold" style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span className={styles.addRowTitle}>{addState.parentName}</span>
            <button className={styles.addRowClose} onClick={cancelAdd}><X size={14} weight="bold" /></button>
          </div>
          <div className={styles.itemList}>
            {(parent?.products || []).map((prod: any) => (
              <button
                key={prod.id}
                className={`${styles.itemOption} ${selectedIds.has(prod.id) ? styles.itemOptionSelected : ''}`}
                onClick={() => toggleSelectItem(prod.id, prod.name, prod.valuePerVE || 0)}
              >
                <span className={styles.itemOptionName}>{prod.name}</span>
                <span className={styles.itemOptionMeta}>€{prod.valuePerVE?.toFixed(2) || '0.00'}/VE</span>
                {selectedIds.has(prod.id) && <Check size={14} weight="bold" className={styles.itemOptionCheck} />}
              </button>
            ))}
          </div>
          {addState.selectedItems.length > 0 && (
            <button
              className={styles.addNextBtn}
              onClick={() => setAddState(prev => prev ? { ...prev, step: 'quantity' } : null)}
            >
              Weiter ({addState.selectedItems.length} gewählt)
            </button>
          )}
        </div>
      );
    }

    // Step: select item (display/kartonware/einzelprodukt) - multi-select
    if (addState.step === 'item') {
      let items: any[] = [];
      if (addState.itemType === 'display') items = waveDef.displays || [];
      else if (addState.itemType === 'kartonware') items = waveDef.kartonwareItems || [];
      else if (addState.itemType === 'einzelprodukt') items = waveDef.einzelproduktItems || [];
      const selectedIds = new Set(addState.selectedItems.map(i => i.id));

      return (
        <div className={styles.addRow}>
          <div className={styles.addRowHeader}>
            <button className={styles.addRowBack} onClick={() => setAddState(prev => prev ? { ...prev, step: 'type', selectedItems: [] } : null)}>
              <CaretRight size={12} weight="bold" style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span className={styles.addRowTitle}>{typeLabelFull[addState.itemType]} wählen</span>
            <button className={styles.addRowClose} onClick={cancelAdd}><X size={14} weight="bold" /></button>
          </div>
          <div className={styles.itemList}>
            {items.map((item: any) => (
              <button
                key={item.id}
                className={`${styles.itemOption} ${selectedIds.has(item.id) ? styles.itemOptionSelected : ''}`}
                onClick={() => toggleSelectItem(item.id, item.name, item.itemValue || 0)}
              >
                <span className={styles.itemOptionName}>{item.name}</span>
                {item.itemValue ? <span className={styles.itemOptionMeta}>{formatValue(item.itemValue)}</span> : null}
                {selectedIds.has(item.id) && <Check size={14} weight="bold" className={styles.itemOptionCheck} />}
              </button>
            ))}
          </div>
          {addState.selectedItems.length > 0 && (
            <button
              className={styles.addNextBtn}
              onClick={() => setAddState(prev => prev ? { ...prev, step: 'quantity' } : null)}
            >
              Weiter ({addState.selectedItems.length} gewählt)
            </button>
          )}
        </div>
      );
    }

    // Step: set quantities for all selected items
    if (addState.step === 'quantity') {
      const backStep: AddStep = (addState.itemType === 'palette' || addState.itemType === 'schuette') ? 'product' : 'item';
      const totalValue = addState.selectedItems.reduce((s, i) => s + i.quantity * i.valuePerUnit, 0);
      const hasValidItems = addState.selectedItems.some(i => i.quantity > 0);
      return (
        <div className={styles.addRow}>
          <div className={styles.addRowHeader}>
            <button className={styles.addRowBack} onClick={() => setAddState(prev => prev ? { ...prev, step: backStep } : null)}>
              <CaretRight size={12} weight="bold" style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span className={styles.addRowTitle}>Mengen festlegen</span>
            <button className={styles.addRowClose} onClick={cancelAdd}><X size={14} weight="bold" /></button>
          </div>
          <div className={styles.addItemsList}>
            {addState.selectedItems.map(item => (
              <div key={item.id} className={styles.addItemRow}>
                <span className={styles.addItemName}>{item.name}</span>
                <div className={styles.quantityControls}>
                  <button className={styles.quantityButton} onClick={() => updateSelectedQty(item.id, item.quantity - 1)}>
                    <Minus size={14} weight="bold" />
                  </button>
                  <input
                    type="text"
                    className={styles.quantityInput}
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={e => {
                      const v = e.target.value;
                      updateSelectedQty(item.id, v === '' ? 0 : (parseInt(v, 10) || 0));
                    }}
                    placeholder="0"
                  />
                  <button className={styles.quantityButton} onClick={() => updateSelectedQty(item.id, item.quantity + 1)}>
                    <Plus size={14} weight="bold" />
                  </button>
                </div>
                {item.valuePerUnit > 0 && item.quantity > 0 && (
                  <span className={styles.addItemValue}>{formatValue(item.quantity * item.valuePerUnit)}</span>
                )}
              </div>
            ))}
          </div>
          <div className={styles.addFooter}>
            {totalValue > 0 && <span className={styles.addTotalValue}>Gesamt: {formatValue(totalValue)}</span>}
            <button className={styles.addConfirm} onClick={submitAdd} disabled={saving || !hasValidItems}>
              <Check size={16} weight="bold" />
              <span>Hinzufügen</span>
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ---- MAIN RENDER ----
  return (
    <>
      <div className={styles.auroraWrap}>
        <Aurora colorStops={["#60A5FA", "#3B82F6", "#1E40AF"]} blend={0.6} amplitude={0.8} speed={0.3} />
      </div>

      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Vorbesteller</h1>
        <p className={styles.pageSubtitle}>Deine Einträge pro Welle</p>

        {loading ? (
          <div className={styles.loadingContainer}>
            <CircleNotch size={32} weight="bold" className={styles.spinner} />
            <span>Lade Wellen...</span>
          </div>
        ) : waves.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={48} weight="regular" />
            <span>Keine Wellen gefunden</span>
          </div>
        ) : (
          waves.map(wave => {
            const isExpanded = expandedWaves.has(wave.id);
            const subs = submissionsByWave[wave.id];
            const dayGroups = subs ? getDayGroups(subs) : [];
            const isFinished = wave.status === 'finished';

            return (
              <div key={wave.id} className={`${styles.waveCard} ${isExpanded ? styles.expanded : ''}`}>
                <div className={styles.waveHeader} onClick={() => toggleWave(wave.id)}>
                  <div className={styles.waveIcon}>
                    <CalendarBlank size={20} weight="duotone" />
                  </div>
                  <div className={styles.waveInfo}>
                    <h3 className={styles.waveName}>{wave.name}</h3>
                    <div className={styles.waveMeta}>
                      <span className={styles.waveDates}>{formatCompactDate(wave.startDate)} - {formatCompactDate(wave.endDate)}</span>
                      <span className={`${styles.statusBadge} ${isFinished ? styles.statusFinished : styles.statusActive}`}>
                        {isFinished && <CheckCircle size={10} weight="fill" />}
                        {isFinished ? 'Fertig' : 'Aktiv'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.waveValue}>
                    <div className={`${styles.waveValueAmount} ${wave.goalType === 'value' ? styles.waveValueCash : styles.waveValueCount}`}>{getWaveTotal(wave.id, wave)}</div>
                    <div className={styles.waveValueLabel}>Dein Beitrag</div>
                  </div>
                  <CaretDown size={16} className={`${styles.chevron} ${isExpanded ? styles.open : ''}`} />
                </div>

                <div className={`${styles.waveBody} ${isExpanded ? styles.open : ''}`}>
                  <div className={styles.waveBodyInner}>
                    {loadingWave === wave.id ? (
                      <div className={styles.loadingContainer}>
                        <CircleNotch size={24} weight="bold" className={styles.spinner} />
                        <span>Lade Einträge...</span>
                      </div>
                    ) : !subs || subs.length === 0 ? (
                      <div className={styles.emptyState}>
                        <Package size={36} weight="regular" />
                        <span>Noch keine Einträge</span>
                      </div>
                    ) : (
                      dayGroups.map(day => (
                        <div key={day.date} className={styles.dayGroup}>
                          <div className={styles.dayHeader}>
                            <span className={styles.dayLabel}>{day.dateLabel}</span>
                            <div className={styles.dayLine} />
                            <span className={`${styles.dayValue} ${wave.goalType === 'value' ? styles.dayValueCash : styles.dayValueCount}`}>
                              {wave.goalType === 'value' ? formatValue(day.dayTotal) : `${day.entries.reduce((s, e) => s + e.quantity, 0)} Stk`}
                            </span>
                          </div>

                          {day.entries.map(entry => {
                            const hasSubs = entry.products && entry.products.length > 0;
                            const isItemExpanded = expandedItems.has(entry.id);
                            const colors = getChainColor(entry.marketChain);

                            return (
                              <div
                                key={entry.id}
                                className={`${styles.itemCard} ${hasSubs ? styles.itemCardClickable : ''}`}
                                onClick={hasSubs ? () => toggleItem(entry.id) : undefined}
                              >
                                <div className={styles.itemRow}>
                                  <div className={`${styles.itemTypeIcon} ${styles[typeClass[entry.itemType]] || ''}`}>
                                    {typeLabel[entry.itemType] || '?'}
                                  </div>
                                  <div className={styles.itemInfo}>
                                    <div className={styles.itemName}>{entry.itemName}</div>
                                    <div className={styles.itemMeta}>
                                      <span className={styles.chainBadge} style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}>
                                        {entry.marketChain}
                                      </span>
                                      {hasSubs && <span className={styles.productCount}>{entry.products!.length} Produkte</span>}
                                    </div>
                                  </div>
                                  {!hasSubs && renderQuantity(entry.id, entry.quantity, wave.id)}
                                  <span className={`${styles.itemValue} ${entry.value > 0 ? styles.itemValueCash : styles.itemValueCount}`}>
                                    {entry.value > 0 ? formatValue(entry.value) : `${entry.quantity} Stk`}
                                  </span>
                                  {hasSubs && (
                                    <button className={`${styles.expandBtn} ${isItemExpanded ? styles.expandBtnOpen : ''}`} onClick={() => toggleItem(entry.id)}>
                                      <CaretRight size={14} weight="bold" />
                                    </button>
                                  )}
                                </div>
                                {!hasSubs && renderDeleteConfirm(entry.id, wave.id)}
                                {hasSubs && (
                                  <div className={`${styles.subItems} ${isItemExpanded ? styles.subItemsOpen : ''}`} onClick={e => e.stopPropagation()}>
                                    <div className={styles.subItemsInner}>
                                      {entry.products!.map(product => (
                                        <React.Fragment key={product.id}>
                                          <div className={styles.subItem}>
                                            <span className={styles.subItemName}>{product.name}</span>
                                            {renderQuantity(product.id, product.quantity, wave.id, true)}
                                            <span className={`${styles.subItemValue} ${product.value > 0 ? styles.subItemValueCash : styles.subItemValueCount}`}>
                                              {product.value > 0 ? formatValue(product.value) : `${product.quantity} Stk`}
                                            </span>
                                          </div>
                                          {renderDeleteConfirm(product.id, wave.id)}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add button / add flow */}
                          {renderAddRow(wave.id, day)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default VorbestellerHistoryPage;
