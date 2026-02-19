import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, CalendarBlank, Camera, TrendUp, User, Package, CheckCircle, Clock, CalendarDots, Users, Plus, Minus, Trash, CaretDown, CaretLeft, CaretRight, Check, MagnifyingGlass, Storefront, PaperPlaneTilt } from '@phosphor-icons/react';
import { API_BASE_URL } from '../../config/database';
import { wellenService, type Welle } from '../../services/wellenService';
import { gebietsleiterService, type Gebietsleiter } from '../../services/gebietsleiterService';
import { marketService } from '../../services/marketService';
import type { AdminMarket } from '../../types/market-types';
import { CustomDatePicker } from './CustomDatePicker';
import styles from './WaveProgressDetailModal.module.css';

const AdminTimePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState<'hour' | 'minute' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const parts = value.split(':');
  const hour = parts[0] || '00';
  const minute = parts[1] || '00';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = ref.current?.querySelector(`.${styles.atpList}`) as HTMLElement | null;
    if (!list) return;
    const active = list.querySelector(`.${styles.atpOptionActive}`) as HTMLElement | null;
    if (active) active.scrollIntoView({ block: 'center' });
  }, [open]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const pick = (type: 'hour' | 'minute', v: string) => {
    onChange(type === 'hour' ? `${v}:${minute}` : `${hour}:${v}`);
    setOpen(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, '');
    if (raw.length === 2 && !raw.includes(':')) raw += ':';
    if (raw.length > 5) raw = raw.slice(0, 5);
    const m = raw.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (m) {
      const h = Math.min(23, parseInt(m[1] || '0')).toString().padStart(2, '0');
      const min = m[2] ? Math.min(59, parseInt(m[2] || '0')).toString().padStart(2, '0') : minute;
      onChange(`${h}:${min}`);
    }
  };

  const displayValue = `${hour} : ${minute}`;

  return (
    <div className={styles.atpWrapper} ref={ref}>
      <div className={styles.atpInputWrapper}>
        <input
          type="text"
          className={styles.atpInput}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={e => {
            e.target.value = `${hour}:${minute}`;
            e.target.select();
          }}
          onBlur={e => {
            e.target.value = displayValue;
          }}
        />
        <Clock
          size={16}
          weight="regular"
          className={styles.atpIcon}
          onClick={() => setOpen(open ? null : 'hour')}
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        />
      </div>
      {open && (
        <div className={styles.atpDropdown}>
          <div className={styles.atpDropdownHeader}>
            <button
              type="button"
              className={`${styles.atpTab} ${open === 'hour' ? styles.atpTabActive : ''}`}
              onClick={() => setOpen('hour')}
            >Stunde</button>
            <button
              type="button"
              className={`${styles.atpTab} ${open === 'minute' ? styles.atpTabActive : ''}`}
              onClick={() => setOpen('minute')}
            >Minute</button>
          </div>
          <div className={styles.atpList}>
            {(open === 'hour' ? hours : minutes).map(v => (
              <button
                key={v}
                type="button"
                className={`${styles.atpOption} ${v === (open === 'hour' ? hour : minute) ? styles.atpOptionActive : ''}`}
                onClick={() => pick(open, v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface WaveProgressDetailModalProps {
  welle: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    goalType: 'percentage' | 'value';
    goalPercentage?: number | null;
    goalValue?: number | null;
    fotoOnly?: boolean;
  };
  onClose: () => void;
}

interface FotoEntry {
  id: string;
  photoUrl: string;
  tags: string[];
  comment: string | null;
  glId: string;
  glName: string;
  marketId: string;
  marketName: string;
  marketChain: string;
  marketAddress: string;
  createdAt: string;
}

interface ProductDetail {
  id: string;
  name: string;
  quantity: number;
  valuePerUnit: number;
  value: number;
}

interface GLProgress {
  id: string;
  glName: string;
  glEmail: string;
  marketName: string;
  marketChain: string;
  marketAddress: string;
  marketPostalCode: string;
  marketCity: string;
  itemType: 'display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt';
  itemName: string;
  quantity: number;
  value: number;
  timestamp: string;
  photoUrl?: string;
  parentId?: string;
  products?: ProductDetail[];
}

type ViewMode = 'gl' | 'days';

export const WaveProgressDetailModal: React.FC<WaveProgressDetailModalProps> = ({ welle, onClose }) => {
  const [progressData, setProgressData] = useState<GLProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedGLs, setCollapsedGLs] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('gl');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Foto-only states
  const [fotoEntries, setFotoEntries] = useState<FotoEntry[]>([]);
  const [fotoLightboxIndex, setFotoLightboxIndex] = useState<number | null>(null);

  // Admin submission states
  const [adminStep, setAdminStep] = useState<null | 1 | 2 | 3 | 4>(null);
  const [adminFullWave, setAdminFullWave] = useState<Welle | null>(null);
  const [adminGLs, setAdminGLs] = useState<Gebietsleiter[]>([]);
  const [adminMarkets, setAdminMarkets] = useState<AdminMarket[]>([]);
  const [adminSelectedGL, setAdminSelectedGL] = useState<{ id: string; name: string } | null>(null);
  const [adminSelectedMarket, setAdminSelectedMarket] = useState<AdminMarket | null>(null);
  const [adminItemQty, setAdminItemQty] = useState<Record<string, number>>({});
  const [adminFotoPhotos, setAdminFotoPhotos] = useState<Array<{ image: string; tags: string[]; comment?: string }>>([]);
  const [adminFotoComment, setAdminFotoComment] = useState('');
  const [adminFotoSelectedTags, setAdminFotoSelectedTags] = useState<Set<string>>(new Set());
  const [adminSubmitDate, setAdminSubmitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [adminSubmitTime, setAdminSubmitTime] = useState(() => {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
  });
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminGLSearch, setAdminGLSearch] = useState('');
  const [adminMarketSearch, setAdminMarketSearch] = useState('');
  const [adminLoadingData, setAdminLoadingData] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState(false);
  const adminFotoInputRef = useRef<HTMLInputElement>(null);

  const toggleGL = (glName: string) => {
    setCollapsedGLs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(glName)) {
        newSet.delete(glName);
      } else {
        newSet.add(glName);
      }
      return newSet;
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case 'display': return 'Display';
      case 'kartonware': return 'Kartonware';
      case 'palette': return 'Palette';
      case 'schuette': return 'Schütte';
      case 'einzelprodukt': return 'Einzelprodukt';
      default: return itemType;
    }
  };

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/wellen/${welle.id}/all-progress`);
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }
        const data = await response.json();
        // Handle foto-only response
        if (data.type === 'foto') {
          setFotoEntries(data.photos || []);
        } else if (Array.isArray(data)) {
          setProgressData(data);
        } else {
          setProgressData(data.entries || []);
        }
      } catch (error) {
        console.error('Error fetching wave progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [welle.id]);

  // Group progress by GL
  const progressByGL = progressData.reduce((acc, prog) => {
    if (!acc[prog.glName]) {
      acc[prog.glName] = [];
    }
    acc[prog.glName].push(prog);
    return acc;
  }, {} as Record<string, GLProgress[]>);

  // Group progress by date (Vienna timezone)
  const progressByDate = useMemo(() => {
    const grouped: Record<string, GLProgress[]> = {};
    
    progressData.forEach(prog => {
      const date = new Date(prog.timestamp);
      const dateKey = new Intl.DateTimeFormat('de-AT', {
        timeZone: 'Europe/Vienna',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(prog);
    });

    // Sort by date descending (newest first)
    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      const dateA = a[0].split('.').reverse().join('-');
      const dateB = b[0].split('.').reverse().join('-');
      return dateB.localeCompare(dateA);
    });

    return Object.fromEntries(sortedEntries);
  }, [progressData]);

  // Foto-only: unique GLs count and group by GL
  const fotoByGL = useMemo(() => {
    const grouped: Record<string, FotoEntry[]> = {};
    fotoEntries.forEach(f => {
      if (!grouped[f.glName]) grouped[f.glName] = [];
      grouped[f.glName].push(f);
    });
    return grouped;
  }, [fotoEntries]);

  const fotoFormatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fotoLightboxPhoto = fotoLightboxIndex !== null ? fotoEntries[fotoLightboxIndex] : null;

  // Format timestamp to Vienna time
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('de-AT', {
      timeZone: 'Europe/Vienna',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  // Format time only
  const formatTimeOnly = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('de-AT', {
      timeZone: 'Europe/Vienna',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format date for display in days view header
  const formatDateHeader = (dateKey: string) => {
    const [day, month, year] = dateKey.split('.');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const weekday = new Intl.DateTimeFormat('de-AT', { weekday: 'long' }).format(date);
    return `${weekday}, ${dateKey}`;
  };

  // Calculate total value for a GL's progress
  const calculateGLTotal = (progresses: GLProgress[]) => {
    return progresses.reduce((sum, p) => sum + p.value, 0);
  };

  // Calculate total count for a GL's progress
  const calculateGLCount = (progresses: GLProgress[]) => {
    return progresses.reduce((sum, p) => sum + p.quantity, 0);
  };

  // Check if GL has any value-based entries
  const hasValueEntries = (progresses: GLProgress[]) => {
    return progresses.some(p => p.value > 0);
  };

  // Start editing a submission
  const startEditing = (progress: GLProgress, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(progress.id);
    setEditQuantity(progress.quantity);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditQuantity(0);
  };

  // Save edited quantity
  const saveQuantity = async (progressId: string) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      // For palette/schuette, the ID might be comma-separated
      const ids = progressId.split(',');
      
      if (ids.length === 1) {
        await wellenService.updateSubmission(progressId, editQuantity);
      } else {
        // For grouped entries, update each individually proportionally
        // For now, we'll just handle single entries
        await wellenService.updateSubmission(ids[0], editQuantity);
      }
      
      // Update local state
      setProgressData(prev => prev.map(p => 
        p.id === progressId ? { ...p, quantity: editQuantity } : p
      ));
      
      setEditingId(null);
    } catch (error) {
      console.error('Error saving quantity:', error);
      alert('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  // Save edited quantity for a product within a palette/schuette
  const saveProductQuantity = async (progressId: string, _productId: string, submissionId: string, productIndex: number) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await wellenService.updateSubmission(submissionId, editQuantity);
      
      // Update local state - update the specific product within the progress entry
      setProgressData(prev => prev.map(p => {
        if (p.id === progressId && p.products) {
          const updatedProducts = p.products.map((prod, idx) => {
            if (idx === productIndex) {
              const newValue = editQuantity * prod.valuePerUnit;
              return { ...prod, quantity: editQuantity, value: newValue };
            }
            return prod;
          });
          // Recalculate total value for this progress entry
          const newTotalValue = updatedProducts.reduce((sum, prod) => sum + prod.value, 0);
          return { ...p, products: updatedProducts, value: newTotalValue };
        }
        return p;
      }));
      
      setEditingId(null);
    } catch (error) {
      console.error('Error saving product quantity:', error);
      alert('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete submission
  const deleteSubmission = async (progressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Eintrag wirklich löschen?')) return;
    
    try {
      const ids = progressId.split(',');
      
      for (const id of ids) {
        await wellenService.deleteSubmission(id);
      }
      
      // Remove from local state
      setProgressData(prev => prev.filter(p => p.id !== progressId));
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Fehler beim Löschen');
    }
  };

  // Increment/decrement quantity
  const adjustQuantity = (delta: number) => {
    setEditQuantity(prev => Math.max(0, prev + delta));
  };

  // --- Admin Submission Helpers ---
  const openAdminSubmit = async () => {
    setAdminLoadingData(true);
    setAdminStep(1);
    try {
      const [fullWave, gls, markets] = await Promise.all([
        wellenService.getWelleById(welle.id),
        gebietsleiterService.getAllGebietsleiter(),
        marketService.getAllMarkets(),
      ]);
      setAdminFullWave(fullWave);
      setAdminGLs(gls.filter(g => !g.is_test));
      setAdminMarkets(markets);
    } catch (err) {
      console.error('Error loading admin submit data:', err);
      setAdminStep(null);
    } finally {
      setAdminLoadingData(false);
    }
  };

  const resetAdminSubmit = () => {
    setAdminStep(null);
    setAdminSelectedGL(null);
    setAdminSelectedMarket(null);
    setAdminItemQty({});
    setAdminFotoPhotos([]);
    setAdminFotoComment('');
    setAdminFotoSelectedTags(new Set());
    setAdminGLSearch('');
    setAdminMarketSearch('');
    setAdminSubmitting(false);
    setAdminSuccess(false);
    setAdminSubmitDate(new Date().toISOString().split('T')[0]);
    const n = new Date();
    setAdminSubmitTime(`${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`);
  };

  const adminGoBack = () => {
    if (adminStep === 1) { resetAdminSubmit(); return; }
    if (adminStep === 2) { setAdminSelectedGL(null); setAdminMarketSearch(''); setAdminStep(1); return; }
    if (adminStep === 3) { setAdminSelectedMarket(null); setAdminItemQty({}); setAdminFotoPhotos([]); setAdminFotoSelectedTags(new Set()); setAdminFotoComment(''); setAdminStep(2); return; }
    if (adminStep === 4) { setAdminStep(3); return; }
  };

  const filteredAdminGLs = useMemo(() => {
    if (!adminGLSearch.trim()) return adminGLs;
    const q = adminGLSearch.toLowerCase().trim();
    return adminGLs.filter(gl => gl.name.toLowerCase().includes(q) || gl.email.toLowerCase().includes(q));
  }, [adminGLs, adminGLSearch]);

  const filteredAdminMarkets = useMemo(() => {
    if (!adminFullWave?.assignedMarketIds) return { myMarkets: [] as AdminMarket[], otherMarkets: [] as AdminMarket[] };
    const waveMarketIds = new Set(adminFullWave.assignedMarketIds);
    let waveMarkets = adminMarkets.filter(m => waveMarketIds.has(m.id));

    if (adminMarketSearch.trim()) {
      const words = adminMarketSearch.toLowerCase().trim().split(/\s+/);
      waveMarkets = waveMarkets.filter(m => {
        const hay = `${m.name} ${m.address} ${m.city} ${m.postalCode} ${m.chain}`.toLowerCase();
        return words.every(w => hay.includes(w));
      });
    }

    const myMarkets = adminSelectedGL ? waveMarkets.filter(m => m.gebietsleiter === adminSelectedGL.id) : [];
    const myIds = new Set(myMarkets.map(m => m.id));
    const otherMarkets = waveMarkets.filter(m => !myIds.has(m.id));
    return { myMarkets, otherMarkets };
  }, [adminMarkets, adminFullWave, adminSelectedGL, adminMarketSearch]);

  const adminItemsTotal = useMemo(() => {
    let count = 0;
    let value = 0;
    if (!adminFullWave) return { count, value };

    const addSimple = (items: Array<{ id: string; itemValue?: number | null }> | undefined) => {
      items?.forEach(item => {
        const qty = adminItemQty[item.id] || 0;
        if (qty > 0) {
          count += qty;
          value += qty * (item.itemValue || 0);
        }
      });
    };
    addSimple(adminFullWave.displays);
    addSimple(adminFullWave.kartonwareItems);
    addSimple(adminFullWave.einzelproduktItems);

    const addNested = (groups: Array<{ id: string; products: Array<{ id: string; valuePerVE: number }> }> | undefined) => {
      groups?.forEach(group => {
        group.products.forEach(prod => {
          const qty = adminItemQty[`${group.id}__${prod.id}`] || 0;
          if (qty > 0) {
            count += qty;
            value += qty * prod.valuePerVE;
          }
        });
      });
    };
    addNested(adminFullWave.paletteItems);
    addNested(adminFullWave.schutteItems);
    return { count, value };
  }, [adminItemQty, adminFullWave]);

  const canProceedStep3 = adminFullWave?.fotoOnly ? adminFotoPhotos.length > 0 : adminItemsTotal.count > 0;

  const handleAdminFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAdminFotoPhotos(prev => [...prev, {
          image: base64,
          tags: Array.from(adminFotoSelectedTags),
          comment: adminFotoComment || undefined,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAdminFoto = (idx: number) => {
    setAdminFotoPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAdminSubmit = async () => {
    if (!adminSelectedGL || !adminSelectedMarket || !adminFullWave) return;
    setAdminSubmitting(true);
    try {
      const ts = new Date(`${adminSubmitDate}T${adminSubmitTime}:00`).toISOString();

      if (adminFullWave.fotoOnly) {
        for (const foto of adminFotoPhotos) {
          await wellenService.uploadPhotos({
            welle_id: adminFullWave.id,
            gebietsleiter_id: adminSelectedGL.id,
            market_id: adminSelectedMarket.id,
            photos: [{ image: foto.image, tags: foto.tags, comment: foto.comment || '' }],
          });
        }
      } else {
        type ItemType = 'display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt';
        const items: Array<{ item_type: ItemType; item_id: string; current_number: number; value_per_unit?: number }> = [];

        const addSimple = (type: ItemType, list: Array<{ id: string; itemValue?: number | null }> | undefined) => {
          list?.forEach(item => {
            const qty = adminItemQty[item.id] || 0;
            if (qty > 0) {
              items.push({ item_type: type, item_id: item.id, current_number: qty, value_per_unit: item.itemValue || 0 });
            }
          });
        };
        addSimple('display', adminFullWave.displays);
        addSimple('kartonware', adminFullWave.kartonwareItems);
        addSimple('einzelprodukt', adminFullWave.einzelproduktItems);

        const addNested = (type: ItemType, groups: Array<{ id: string; products: Array<{ id: string; valuePerVE: number }> }> | undefined) => {
          groups?.forEach(group => {
            group.products.forEach(prod => {
              const qty = adminItemQty[`${group.id}__${prod.id}`] || 0;
              if (qty > 0) {
                items.push({ item_type: type, item_id: prod.id, current_number: qty, value_per_unit: prod.valuePerVE });
              }
            });
          });
        };
        addNested('palette', adminFullWave.paletteItems);
        addNested('schuette', adminFullWave.schutteItems);

        if (items.length > 0) {
          await wellenService.updateProgressBatch(adminFullWave.id, {
            gebietsleiter_id: adminSelectedGL.id,
            market_id: adminSelectedMarket.id,
            items,
            timestamp: ts,
            skipVisitUpdate: true,
          });
        }
      }

      setAdminSuccess(true);
      setTimeout(() => {
        resetAdminSubmit();
        // Refetch progress data
        (async () => {
          setIsLoading(true);
          try {
            const response = await fetch(`${API_BASE_URL}/wellen/${welle.id}/all-progress`);
            if (response.ok) {
              const data = await response.json();
              if (data.type === 'foto') {
                setFotoEntries(data.photos || []);
              } else if (Array.isArray(data)) {
                setProgressData(data);
              } else {
                setProgressData(data.entries || []);
              }
            }
          } catch (error) {
            console.error('Error refetching:', error);
          } finally {
            setIsLoading(false);
          }
        })();
      }, 1500);
    } catch (err) {
      console.error('Admin submit error:', err);
      alert('Fehler beim Absenden. Bitte erneut versuchen.');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const adminStepTitle = () => {
    switch (adminStep) {
      case 1: return 'Gebietsleiter wählen';
      case 2: return 'Markt wählen';
      case 3: return adminFullWave?.fotoOnly ? 'Fotos hinzufügen' : 'Produkte auswählen';
      case 4: return 'Zusammenfassung';
      default: return '';
    }
  };

  // Render a single progress entry (used in both views)
  const renderProgressEntry = (progress: GLProgress, idx: number, showGLName: boolean = false) => {
    const isEditing = editingId === progress.id;
    const isPaletteOrSchuette = progress.itemType === 'palette' || progress.itemType === 'schuette';
    
    return (
      <div key={idx} className={styles.progressEntryWrapper}>
        <div 
          className={`${styles.progressEntry} ${isPaletteOrSchuette ? styles.progressEntryExpandable : ''} ${isEditing ? styles.progressEntryEditing : ''}`}
          onClick={() => {
            if (!isEditing && progress.products && progress.products.length > 0) {
              toggleItem(progress.id);
            }
          }}
        >
          <div className={styles.entryLeft}>
            <div className={styles.entryIcon}>
              {progress.itemType === 'display' ? (
                <Package size={18} weight="duotone" />
              ) : progress.itemType === 'kartonware' ? (
                <Package size={18} weight="fill" />
              ) : (
                <Package size={18} weight="bold" />
              )}
            </div>
            <div className={styles.entryDetails}>
              <div className={styles.entryItem}>
                <span className={styles.itemName}>{progress.itemName}</span>
                <span className={`${styles.itemType} ${progress.itemType === 'palette' ? styles.itemTypePalette : progress.itemType === 'schuette' ? styles.itemTypeSchuette : progress.itemType === 'einzelprodukt' ? styles.itemTypeEinzelprodukt : ''}`}>
                  {getItemTypeLabel(progress.itemType)}
                </span>
                {progress.products && progress.products.length > 0 && (
                  <span className={styles.expandIndicator}>
                    {expandedItems.has(progress.id) ? '▼' : '▶'} {progress.products.length} Produkte
                  </span>
                )}
              </div>
              <div className={styles.entryMarket}>
                {showGLName && (
                  <>
                    <span className={styles.glNameInline}>{progress.glName}</span>
                    <span className={styles.marketSeparator}>•</span>
                  </>
                )}
                <span className={styles.marketChain}>{progress.marketChain}</span>
                <span className={styles.marketSeparator}>-</span>
                <span className={styles.marketAddress}>{progress.marketAddress}, {progress.marketPostalCode} {progress.marketCity}</span>
              </div>
            </div>
          </div>

          <div className={styles.entryRight}>
            {isEditing ? (
              <div className={styles.editControlsWrapper} onClick={(e) => e.stopPropagation()}>
                <div className={styles.editControls}>
                  <button 
                    className={styles.quantityBtn}
                    onClick={() => adjustQuantity(-1)}
                    disabled={editQuantity <= 0}
                  >
                    <Minus size={14} weight="bold" />
                  </button>
                  <input
                    type="number"
                    className={styles.quantityInput}
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                  />
                  <button 
                    className={styles.quantityBtn}
                    onClick={() => adjustQuantity(1)}
                  >
                    <Plus size={14} weight="bold" />
                  </button>
                </div>
                <div className={styles.editActions}>
                  <button 
                    className={styles.saveBtn}
                    onClick={() => saveQuantity(progress.id)}
                    disabled={isSaving}
                    title="Speichern"
                  >
                    <Check size={14} weight="bold" />
                  </button>
                  <button 
                    className={styles.cancelBtn}
                    onClick={cancelEditing}
                    title="Abbrechen"
                  >
                    <X size={14} weight="bold" />
                  </button>
                  <button 
                    className={styles.deleteBtn}
                    onClick={(e) => deleteSubmission(progress.id, e)}
                    title="Löschen"
                  >
                    <Trash size={14} weight="regular" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.entryQuantity} onClick={(e) => startEditing(progress, e)}>
                  <span className={styles.quantityValue}>{progress.quantity}x</span>
                </div>
                {progress.value > 0 && (
                  <div className={styles.entryValue}>
                    €{progress.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
                <div className={styles.entryTimestamp}>
                  <Clock size={14} weight="regular" />
                  <span>{viewMode === 'days' ? formatTimeOnly(progress.timestamp) : formatTimestamp(progress.timestamp)}</span>
                </div>
              </>
            )}
          </div>

          {progress.photoUrl && (
            <div className={styles.entryPhoto}>
              <img src={progress.photoUrl} alt="Beweis" />
            </div>
          )}
        </div>

        {/* Expandable Products Section for Palette/Schuette */}
        {progress.products && progress.products.length > 0 && expandedItems.has(progress.id) && (
          <div className={styles.productsSection}>
            {progress.products.map((product, pIdx) => {
              const productEditKey = `${progress.id}-${product.id}`;
              const isProductEditing = editingId === productEditKey;
              
              return (
                <div key={pIdx} className={`${styles.productRow} ${isProductEditing ? styles.productRowEditing : ''}`}>
                  <span className={styles.productName}>"{product.name}"</span>
                  
                  <div className={styles.productRight}>
                    {isProductEditing ? (
                      <div className={styles.editControlsWrapper} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.editControls}>
                          <button 
                            className={styles.quantityBtn}
                            onClick={() => adjustQuantity(-1)}
                            disabled={editQuantity <= 0}
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <input
                            type="number"
                            className={styles.quantityInput}
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                            min="0"
                          />
                          <button 
                            className={styles.quantityBtn}
                            onClick={() => adjustQuantity(1)}
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                        <div className={styles.editActions}>
                          <button 
                            className={styles.saveBtn}
                            onClick={() => {
                              // For products, we need to find the actual submission ID
                              const ids = progress.id.split(',');
                              const targetId = ids[pIdx] || ids[0];
                              saveProductQuantity(progress.id, product.id, targetId, pIdx);
                            }}
                            disabled={isSaving}
                            title="Speichern"
                          >
                            <Check size={14} weight="bold" />
                          </button>
                          <button 
                            className={styles.cancelBtn}
                            onClick={cancelEditing}
                            title="Abbrechen"
                          >
                            <X size={14} weight="bold" />
                          </button>
                          <button 
                            className={styles.deleteBtn}
                            onClick={(e) => {
                              const ids = progress.id.split(',');
                              const targetId = ids[pIdx] || ids[0];
                              deleteSubmission(targetId, e);
                            }}
                            title="Löschen"
                          >
                            <Trash size={14} weight="regular" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span 
                          className={styles.productQuantity}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(productEditKey);
                            setEditQuantity(product.quantity);
                          }}
                        >
                          {product.quantity}x
                        </span>
                        <span className={styles.productValue}>
                          €{product.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {adminStep ? (
              <>
                <button className={styles.adminBackBtn} onClick={adminGoBack}>
                  <CaretLeft size={22} weight="bold" />
                </button>
                <div className={styles.headerInfo}>
                  <h2 className={styles.title}>{adminStepTitle()}</h2>
                  <p className={styles.subtitle}>Schritt {adminStep} von 4</p>
                </div>
              </>
            ) : (
              <>
                {welle.fotoOnly ? <Camera size={28} weight="duotone" /> : <CalendarBlank size={28} weight="duotone" />}
                <div className={styles.headerInfo}>
                  <h2 className={styles.title}>{welle.name}</h2>
                  <p className={styles.subtitle}>{welle.startDate} - {welle.endDate}</p>
                </div>
              </>
            )}
          </div>
          <div className={styles.headerRight}>
            {!adminStep && (
              <>
                <button className={styles.adminAddBtn} onClick={openAdminSubmit} title="Vorbesteller für GL einreichen">
                  <Plus size={18} weight="bold" />
                </button>
                {!welle.fotoOnly && (
                  <div className={styles.viewToggle}>
                    <button 
                      className={`${styles.viewToggleBtn} ${viewMode === 'gl' ? styles.viewToggleBtnActive : ''}`}
                      onClick={() => setViewMode('gl')}
                      title="Nach Gebietsleiter"
                    >
                      <Users size={18} weight={viewMode === 'gl' ? 'fill' : 'regular'} />
                    </button>
                    <button 
                      className={`${styles.viewToggleBtn} ${viewMode === 'days' ? styles.viewToggleBtnActive : ''}`}
                      onClick={() => setViewMode('days')}
                      title="Nach Tagen"
                    >
                      <CalendarDots size={18} weight={viewMode === 'days' ? 'fill' : 'regular'} />
                    </button>
                  </div>
                )}
              </>
            )}
            <button className={styles.closeButton} onClick={adminStep ? resetAdminSubmit : onClose}>
              <X size={24} weight="bold" />
            </button>
          </div>
        </div>

        {/* Goal / Type Display - only shown when not in admin submit */}
        {!adminStep && (
          <div className={`${styles.goalBanner} ${welle.fotoOnly ? styles.goalBannerFoto : ''}`}>
            {welle.fotoOnly ? (
              <>
                <Camera size={20} weight="bold" />
                <span>Fotowelle</span>
              </>
            ) : (
              <>
                <TrendUp size={20} weight="bold" />
                <span>
                  Ziel: {welle.goalType === 'percentage' 
                    ? `${welle.goalPercentage}%` 
                    : `€${(welle.goalValue || 0).toLocaleString('de-DE')}`}
                </span>
              </>
            )}
          </div>
        )}

        {/* Admin Submission Steps Indicator */}
        {adminStep && (
          <div className={styles.adminStepsBar}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`${styles.adminStepDot} ${s === adminStep ? styles.adminStepDotActive : ''} ${s < (adminStep || 0) ? styles.adminStepDotDone : ''}`}>
                {s < (adminStep || 0) ? <Check size={12} weight="bold" /> : s}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {adminStep ? (
            /* ===== Admin Submission Flow ===== */
            adminLoadingData ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Lade Daten...</p>
              </div>
            ) : adminSuccess ? (
              <div className={styles.adminSuccessState}>
                <CheckCircle size={56} weight="duotone" />
                <p>Erfolgreich eingereicht!</p>
              </div>
            ) : adminStep === 1 ? (
              /* Step 1: Select GL */
              <div className={styles.adminStepContent}>
                <div className={styles.adminSearchWrapper}>
                  <MagnifyingGlass size={18} weight="regular" />
                  <input
                    type="text"
                    className={styles.adminSearchInput}
                    placeholder="Gebietsleiter suchen..."
                    value={adminGLSearch}
                    onChange={e => setAdminGLSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className={styles.adminList}>
                  {filteredAdminGLs.length === 0 ? (
                    <p className={styles.adminNoResults}>Keine Ergebnisse</p>
                  ) : filteredAdminGLs.map(gl => (
                    <div
                      key={gl.id}
                      className={styles.adminListItem}
                      onClick={() => {
                        setAdminSelectedGL({ id: gl.id, name: gl.name });
                        setAdminStep(2);
                      }}
                    >
                      <User size={20} weight="duotone" />
                      <div className={styles.adminListItemInfo}>
                        <span className={styles.adminListItemName}>{gl.name}</span>
                        <span className={styles.adminListItemSub}>{gl.email}</span>
                      </div>
                      <CaretRight size={16} weight="bold" className={styles.adminListItemArrow} />
                    </div>
                  ))}
                </div>
              </div>
            ) : adminStep === 2 ? (
              /* Step 2: Select Market */
              <div className={styles.adminStepContent}>
                <div className={styles.adminSearchWrapper}>
                  <MagnifyingGlass size={18} weight="regular" />
                  <input
                    type="text"
                    className={styles.adminSearchInput}
                    placeholder="Markt suchen (Name, PLZ, Kette...)"
                    value={adminMarketSearch}
                    onChange={e => setAdminMarketSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className={styles.adminList}>
                  {filteredAdminMarkets.myMarkets.length > 0 && (
                    <>
                      <div className={styles.adminListSectionHeader}>
                        <Storefront size={16} weight="duotone" />
                        Märkte von {adminSelectedGL?.name}
                      </div>
                      {filteredAdminMarkets.myMarkets.map(m => (
                        <div
                          key={m.id}
                          className={`${styles.adminListItem} ${styles.adminListItemHighlight}`}
                          onClick={() => { setAdminSelectedMarket(m); setAdminStep(3); }}
                        >
                          <Storefront size={20} weight="duotone" />
                          <div className={styles.adminListItemInfo}>
                            <span className={styles.adminListItemName}>{m.chain} – {m.name}</span>
                            <span className={styles.adminListItemSub}>{m.address}, {m.postalCode} {m.city}</span>
                          </div>
                          <CaretRight size={16} weight="bold" className={styles.adminListItemArrow} />
                        </div>
                      ))}
                    </>
                  )}
                  {filteredAdminMarkets.otherMarkets.length > 0 && (
                    <>
                      <div className={styles.adminListSectionHeader}>
                        Andere Märkte
                      </div>
                      {filteredAdminMarkets.otherMarkets.map(m => (
                        <div
                          key={m.id}
                          className={styles.adminListItem}
                          onClick={() => { setAdminSelectedMarket(m); setAdminStep(3); }}
                        >
                          <Storefront size={20} weight="regular" />
                          <div className={styles.adminListItemInfo}>
                            <span className={styles.adminListItemName}>{m.chain} – {m.name}</span>
                            <span className={styles.adminListItemSub}>{m.address}, {m.postalCode} {m.city}</span>
                          </div>
                          <CaretRight size={16} weight="bold" className={styles.adminListItemArrow} />
                        </div>
                      ))}
                    </>
                  )}
                  {filteredAdminMarkets.myMarkets.length === 0 && filteredAdminMarkets.otherMarkets.length === 0 && (
                    <p className={styles.adminNoResults}>Keine Märkte gefunden</p>
                  )}
                </div>
              </div>
            ) : adminStep === 3 ? (
              /* Step 3: Items / Foto */
              <div className={styles.adminStepContent}>
                {adminFullWave?.fotoOnly ? (
                  /* Foto Upload */
                  <div className={styles.adminFotoArea}>
                    {adminFullWave.fotoTags && adminFullWave.fotoTags.length > 0 && (
                      <div className={styles.adminFotoTagSection}>
                        <p className={styles.adminFotoTagLabel}>Tags für nächstes Foto auswählen:</p>
                        <div className={styles.adminFotoTagGrid}>
                          {adminFullWave.fotoTags.map(tag => (
                            <button
                              key={tag.id || tag.name}
                              className={`${styles.adminFotoTagBtn} ${adminFotoSelectedTags.has(tag.name) ? styles.adminFotoTagBtnActive : ''} ${tag.type === 'fixed' ? styles.adminFotoTagBtnFixed : ''}`}
                              onClick={() => {
                                setAdminFotoSelectedTags(prev => {
                                  const next = new Set(prev);
                                  if (next.has(tag.name)) next.delete(tag.name);
                                  else next.add(tag.name);
                                  return next;
                                });
                              }}
                            >
                              {tag.name}
                              {tag.type === 'fixed' && <span className={styles.adminFotoTagFixed}>Pflicht</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={styles.adminFotoCommentRow}>
                      <input
                        type="text"
                        className={styles.adminFotoCommentInput}
                        placeholder="Kommentar (optional)"
                        value={adminFotoComment}
                        onChange={e => setAdminFotoComment(e.target.value)}
                      />
                    </div>
                    <input ref={adminFotoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAdminFotoUpload} />
                    <button className={styles.adminFotoUploadBtn} onClick={() => adminFotoInputRef.current?.click()}>
                      <Camera size={20} weight="bold" />
                      Foto hinzufügen
                    </button>
                    {adminFotoPhotos.length > 0 && (
                      <div className={styles.adminFotoPreviewGrid}>
                        {adminFotoPhotos.map((foto, idx) => (
                          <div key={idx} className={styles.adminFotoPreviewCard}>
                            <img src={foto.image} alt="" />
                            <button className={styles.adminFotoRemoveBtn} onClick={() => removeAdminFoto(idx)}>
                              <X size={12} weight="bold" />
                            </button>
                            {foto.tags.length > 0 && (
                              <div className={styles.adminFotoPreviewTags}>
                                {foto.tags.map(t => <span key={t}>{t}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Product Selection */
                  <div className={styles.adminItemsList}>
                    {adminFullWave?.displays && adminFullWave.displays.length > 0 && (
                      <div className={styles.adminItemGroup}>
                        <h4 className={styles.adminItemGroupTitle}>Displays</h4>
                        {adminFullWave.displays.map(item => (
                          <div key={item.id} className={styles.adminItemRow}>
                            <div className={styles.adminItemRowInfo}>
                              <span className={styles.adminItemRowName}>{item.name}</span>
                              {(item.itemValue || 0) > 0 && <span className={styles.adminItemRowValue}>€{(item.itemValue || 0).toFixed(2)}/Stk</span>}
                            </div>
                            <div className={styles.adminItemRowControls}>
                              <button onClick={() => setAdminItemQty(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))} disabled={(adminItemQty[item.id] || 0) <= 0}><Minus size={14} weight="bold" /></button>
                              <input type="number" value={adminItemQty[item.id] || 0} onChange={e => setAdminItemQty(p => ({ ...p, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))} min={0} />
                              <button onClick={() => setAdminItemQty(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}><Plus size={14} weight="bold" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {adminFullWave?.kartonwareItems && adminFullWave.kartonwareItems.length > 0 && (
                      <div className={styles.adminItemGroup}>
                        <h4 className={styles.adminItemGroupTitle}>Kartonware</h4>
                        {adminFullWave.kartonwareItems.map(item => (
                          <div key={item.id} className={styles.adminItemRow}>
                            <div className={styles.adminItemRowInfo}>
                              <span className={styles.adminItemRowName}>{item.name}</span>
                              {(item.itemValue || 0) > 0 && <span className={styles.adminItemRowValue}>€{(item.itemValue || 0).toFixed(2)}/Stk</span>}
                            </div>
                            <div className={styles.adminItemRowControls}>
                              <button onClick={() => setAdminItemQty(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))} disabled={(adminItemQty[item.id] || 0) <= 0}><Minus size={14} weight="bold" /></button>
                              <input type="number" value={adminItemQty[item.id] || 0} onChange={e => setAdminItemQty(p => ({ ...p, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))} min={0} />
                              <button onClick={() => setAdminItemQty(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}><Plus size={14} weight="bold" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {adminFullWave?.einzelproduktItems && adminFullWave.einzelproduktItems.length > 0 && (
                      <div className={styles.adminItemGroup}>
                        <h4 className={styles.adminItemGroupTitle}>Einzelprodukte</h4>
                        {adminFullWave.einzelproduktItems.map(item => (
                          <div key={item.id} className={styles.adminItemRow}>
                            <div className={styles.adminItemRowInfo}>
                              <span className={styles.adminItemRowName}>{item.name}</span>
                              {(item.itemValue || 0) > 0 && <span className={styles.adminItemRowValue}>€{(item.itemValue || 0).toFixed(2)}/Stk</span>}
                            </div>
                            <div className={styles.adminItemRowControls}>
                              <button onClick={() => setAdminItemQty(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))} disabled={(adminItemQty[item.id] || 0) <= 0}><Minus size={14} weight="bold" /></button>
                              <input type="number" value={adminItemQty[item.id] || 0} onChange={e => setAdminItemQty(p => ({ ...p, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))} min={0} />
                              <button onClick={() => setAdminItemQty(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}><Plus size={14} weight="bold" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {adminFullWave?.paletteItems && adminFullWave.paletteItems.length > 0 && (
                      <div className={styles.adminItemGroup}>
                        <h4 className={styles.adminItemGroupTitle}>Palette</h4>
                        {adminFullWave.paletteItems.map(pal => (
                          <div key={pal.id} className={styles.adminNestedGroup}>
                            <p className={styles.adminNestedGroupName}>{pal.name}</p>
                            {pal.products.map(prod => {
                              const qKey = `${pal.id}__${prod.id}`;
                              return (
                                <div key={prod.id} className={styles.adminItemRow}>
                                  <div className={styles.adminItemRowInfo}>
                                    <span className={styles.adminItemRowName}>{prod.name}</span>
                                    <span className={styles.adminItemRowValue}>€{prod.valuePerVE.toFixed(2)}/VE</span>
                                  </div>
                                  <div className={styles.adminItemRowControls}>
                                    <button onClick={() => setAdminItemQty(p => ({ ...p, [qKey]: Math.max(0, (p[qKey] || 0) - 1) }))} disabled={(adminItemQty[qKey] || 0) <= 0}><Minus size={14} weight="bold" /></button>
                                    <input type="number" value={adminItemQty[qKey] || 0} onChange={e => setAdminItemQty(p => ({ ...p, [qKey]: Math.max(0, parseInt(e.target.value) || 0) }))} min={0} />
                                    <button onClick={() => setAdminItemQty(p => ({ ...p, [qKey]: (p[qKey] || 0) + 1 }))}><Plus size={14} weight="bold" /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                    {adminFullWave?.schutteItems && adminFullWave.schutteItems.length > 0 && (
                      <div className={styles.adminItemGroup}>
                        <h4 className={styles.adminItemGroupTitle}>Schütten</h4>
                        {adminFullWave.schutteItems.map(sch => (
                          <div key={sch.id} className={styles.adminNestedGroup}>
                            <p className={styles.adminNestedGroupName}>{sch.name}</p>
                            {sch.products.map(prod => {
                              const qKey = `${sch.id}__${prod.id}`;
                              return (
                                <div key={prod.id} className={styles.adminItemRow}>
                                  <div className={styles.adminItemRowInfo}>
                                    <span className={styles.adminItemRowName}>{prod.name}</span>
                                    <span className={styles.adminItemRowValue}>€{prod.valuePerVE.toFixed(2)}/VE</span>
                                  </div>
                                  <div className={styles.adminItemRowControls}>
                                    <button onClick={() => setAdminItemQty(p => ({ ...p, [qKey]: Math.max(0, (p[qKey] || 0) - 1) }))} disabled={(adminItemQty[qKey] || 0) <= 0}><Minus size={14} weight="bold" /></button>
                                    <input type="number" value={adminItemQty[qKey] || 0} onChange={e => setAdminItemQty(p => ({ ...p, [qKey]: Math.max(0, parseInt(e.target.value) || 0) }))} min={0} />
                                    <button onClick={() => setAdminItemQty(p => ({ ...p, [qKey]: (p[qKey] || 0) + 1 }))}><Plus size={14} weight="bold" /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Bottom bar: summary + continue */}
                <div className={styles.adminStep3Footer}>
                  <div className={styles.adminStep3Summary}>
                    {adminFullWave?.fotoOnly
                      ? <span>{adminFotoPhotos.length} Foto{adminFotoPhotos.length !== 1 ? 's' : ''}</span>
                      : <span>{adminItemsTotal.count} Artikel – €{adminItemsTotal.value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>}
                  </div>
                  <button className={styles.adminContinueBtn} disabled={!canProceedStep3} onClick={() => setAdminStep(4)}>
                    Weiter
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            ) : adminStep === 4 ? (
              /* Step 4: Date/Time + Confirm */
              <div className={styles.adminStepContent}>
                <div className={styles.adminSummaryCard}>
                  <div className={styles.adminSummaryRow}>
                    <span className={styles.adminSummaryLabel}>Gebietsleiter</span>
                    <span className={styles.adminSummaryValue}>{adminSelectedGL?.name}</span>
                  </div>
                  <div className={styles.adminSummaryRow}>
                    <span className={styles.adminSummaryLabel}>Markt</span>
                    <span className={styles.adminSummaryValue}>{adminSelectedMarket?.chain} – {adminSelectedMarket?.name}</span>
                  </div>
                  <div className={styles.adminSummaryRow}>
                    <span className={styles.adminSummaryLabel}>{adminFullWave?.fotoOnly ? 'Fotos' : 'Artikel'}</span>
                    <span className={styles.adminSummaryValue}>
                      {adminFullWave?.fotoOnly
                        ? `${adminFotoPhotos.length} Foto${adminFotoPhotos.length !== 1 ? 's' : ''}`
                        : `${adminItemsTotal.count} Stk – €${adminItemsTotal.value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>

                <div className={styles.adminDateTimeRow}>
                  <div className={styles.adminDateField}>
                    <label className={styles.adminFieldLabel}>Datum</label>
                    <CustomDatePicker value={adminSubmitDate} onChange={setAdminSubmitDate} />
                  </div>
                  <div className={styles.adminTimeField}>
                    <label className={styles.adminFieldLabel}>Uhrzeit</label>
                    <AdminTimePicker value={adminSubmitTime} onChange={setAdminSubmitTime} />
                  </div>
                </div>

                <button
                  className={styles.adminSubmitBtn}
                  onClick={handleAdminSubmit}
                  disabled={adminSubmitting}
                >
                  {adminSubmitting ? (
                    <><div className={styles.adminSubmitSpinner} /> Wird eingereicht...</>
                  ) : (
                    <><PaperPlaneTilt size={20} weight="bold" /> Absenden</>
                  )}
                </button>
              </div>
            ) : null
          ) : isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>{welle.fotoOnly ? 'Lade Fotos...' : 'Lade Fortschritt...'}</p>
            </div>
          ) : welle.fotoOnly ? (
            /* Foto-Only Content */
            fotoEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <Camera size={48} weight="thin" />
                <p>Noch keine Fotos hochgeladen</p>
              </div>
            ) : (
              <div className={styles.fotoGrid}>
                {fotoEntries.map((foto, idx) => (
                  <div key={foto.id} className={styles.fotoCard} onClick={() => setFotoLightboxIndex(idx)}>
                    <div className={styles.fotoThumb}>
                      <img src={foto.photoUrl} alt="" loading="lazy" decoding="async" />
                    </div>
                    <div className={styles.fotoInfo}>
                      <p className={styles.fotoGl}>{foto.glName}</p>
                      <p className={styles.fotoMarket}>{foto.marketName} {foto.marketChain && `(${foto.marketChain})`}</p>
                      <span className={styles.fotoDate}>{fotoFormatDate(foto.createdAt)}</span>
                      {foto.tags.length > 0 && (
                        <div className={styles.fotoTags}>
                          {foto.tags.slice(0, 3).map(t => <span key={t} className={styles.fotoTag}>{t}</span>)}
                          {foto.tags.length > 3 && <span className={styles.fotoTagMore}>+{foto.tags.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : progressData.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={48} weight="thin" />
              <p>Noch kein Fortschritt erfasst</p>
            </div>
          ) : viewMode === 'gl' ? (
            /* GL View */
            <div className={styles.progressList}>
              {Object.entries(progressByGL).map(([glName, progresses]) => (
                <div key={glName} className={styles.glSection}>
                  <div 
                    className={styles.glHeader}
                    onClick={() => toggleGL(glName)}
                  >
                    <div className={styles.glInfo}>
                      <User size={20} weight="bold" />
                      <h3 className={styles.glName}>{glName}</h3>
                      <span className={styles.glEmail}>{progresses[0].glEmail}</span>
                    </div>
                    <div className={styles.glTotal}>
                      <span className={styles.glTotalLabel}>Gesamt:</span>
                      <span className={styles.glTotalValue}>
                        {hasValueEntries(progresses) 
                          ? `€${calculateGLTotal(progresses).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `${calculateGLCount(progresses)}x`
                        }
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.progressEntries} ${collapsedGLs.has(glName) ? styles.entriesCollapsed : ''}`}>
                    {progresses.map((progress, idx) => renderProgressEntry(progress, idx, false))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Days View */
            <div className={styles.daysView}>
              {Object.entries(progressByDate).map(([dateKey, progresses]) => (
                <div key={dateKey} className={styles.daySection}>
                  <div 
                    className={`${styles.dayHeader} ${expandedDays.has(dateKey) ? styles.dayHeaderExpanded : ''}`}
                    onClick={() => toggleDay(dateKey)}
                  >
                    <div className={styles.dayInfo}>
                      {expandedDays.has(dateKey) ? (
                        <CaretDown size={20} weight="bold" />
                      ) : (
                        <CaretRight size={20} weight="bold" />
                      )}
                      <CalendarDots size={20} weight="duotone" />
                      <h3 className={styles.dayTitle}>{formatDateHeader(dateKey)}</h3>
                    </div>
                    <div className={styles.daySummary}>
                      <span className={styles.dayEntryCount}>{progresses.length} Einträge</span>
                      <span className={styles.dayTotalValue}>
                        {hasValueEntries(progresses) 
                          ? `€${calculateGLTotal(progresses).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `${calculateGLCount(progresses)}x`
                        }
                      </span>
                    </div>
                  </div>
                  {expandedDays.has(dateKey) && (
                    <div className={styles.dayEntries}>
                      {progresses.map((progress, idx) => renderProgressEntry(progress, idx, true))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {!adminStep && !isLoading && (welle.fotoOnly ? fotoEntries.length > 0 : progressData.length > 0) && (
          <div className={styles.footer}>
            <div className={styles.footerStat}>
              <User size={20} weight="bold" />
              <div className={styles.footerStatInfo}>
                <span className={styles.footerStatLabel}>Teilnehmende GLs</span>
                <span className={styles.footerStatValue}>
                  {welle.fotoOnly ? Object.keys(fotoByGL).length : Object.keys(progressByGL).length}
                </span>
              </div>
            </div>
            <div className={styles.footerStat}>
              {welle.fotoOnly ? <Camera size={20} weight="bold" /> : <CheckCircle size={20} weight="bold" />}
              <div className={styles.footerStatInfo}>
                <span className={styles.footerStatLabel}>{welle.fotoOnly ? 'Fotos' : 'Einträge'}</span>
                <span className={styles.footerStatValue}>
                  {welle.fotoOnly ? fotoEntries.length : progressData.length}
                </span>
              </div>
            </div>
            {!welle.fotoOnly && (
              <div className={styles.footerStat}>
                <Package size={20} weight="bold" />
                <div className={styles.footerStatInfo}>
                  <span className={styles.footerStatLabel}>Gesamtwert</span>
                  <span className={styles.footerStatValue}>
                    €{progressData.reduce((sum, p) => sum + p.value, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Foto Lightbox */}
      {fotoLightboxPhoto && fotoLightboxIndex !== null && (
        <div className={styles.fotoLightboxOverlay} onClick={() => setFotoLightboxIndex(null)}>
          <div className={styles.fotoLightboxContent} onClick={e => e.stopPropagation()}>
            <div className={styles.fotoLightboxImage}>
              <img src={fotoLightboxPhoto.photoUrl} alt="" />
              {fotoLightboxIndex > 0 && (
                <button className={`${styles.fotoLightboxNav} ${styles.fotoLightboxPrev}`} onClick={() => setFotoLightboxIndex(fotoLightboxIndex - 1)}>
                  <CaretLeft size={18} weight="bold" />
                </button>
              )}
              {fotoLightboxIndex < fotoEntries.length - 1 && (
                <button className={`${styles.fotoLightboxNav} ${styles.fotoLightboxNext}`} onClick={() => setFotoLightboxIndex(fotoLightboxIndex + 1)}>
                  <CaretRight size={18} weight="bold" />
                </button>
              )}
            </div>
            <div className={styles.fotoLightboxSidebar}>
              <button className={styles.fotoLightboxClose} onClick={() => setFotoLightboxIndex(null)}>
                <X size={16} weight="bold" />
              </button>
              <div className={styles.fotoLightboxMeta}>
                <div>
                  <p className={styles.fotoLightboxLabel}>Gebietsleiter</p>
                  <p className={styles.fotoLightboxValue}>{fotoLightboxPhoto.glName}</p>
                </div>
                <div>
                  <p className={styles.fotoLightboxLabel}>Markt</p>
                  <p className={styles.fotoLightboxValue}>{fotoLightboxPhoto.marketName} {fotoLightboxPhoto.marketChain && `(${fotoLightboxPhoto.marketChain})`}</p>
                  {fotoLightboxPhoto.marketAddress && <p className={styles.fotoLightboxSubvalue}>{fotoLightboxPhoto.marketAddress}</p>}
                </div>
                <div>
                  <p className={styles.fotoLightboxLabel}>Datum</p>
                  <p className={styles.fotoLightboxValue}>{fotoFormatDate(fotoLightboxPhoto.createdAt)}</p>
                </div>
                {fotoLightboxPhoto.tags.length > 0 && (
                  <div>
                    <p className={styles.fotoLightboxLabel}>Tags</p>
                    <div className={styles.fotoLightboxTags}>
                      {fotoLightboxPhoto.tags.map(t => <span key={t} className={styles.fotoLightboxTag}>{t}</span>)}
                    </div>
                  </div>
                )}
                {fotoLightboxPhoto.comment && (
                  <div>
                    <p className={styles.fotoLightboxLabel}>Kommentar</p>
                    <p className={styles.fotoLightboxSubvalue}>{fotoLightboxPhoto.comment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
