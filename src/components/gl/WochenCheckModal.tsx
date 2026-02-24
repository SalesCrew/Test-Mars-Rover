import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Clock,
  Car,
  Storefront,
  FirstAidKit,
  House,
  GraduationCap,
  Warehouse,
  Path,
  Bed,
  PencilSimple,
  Check,
  MapPin,
  Package,
  ShoppingCart,
  ArrowsLeftRight,
  Pause,
  CircleNotch,
  Star,
  Trash,
  WarningCircle,
  ShieldCheck,
  CaretDown,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import fragebogenService from '../../services/fragebogenService';
import { dayTrackingService } from '../../services/dayTrackingService';
import { wochenCheckService } from '../../services/wochenCheckService';
import styles from './WochenCheckModal.module.css';

// Time Picker Component
interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, onClose }) => {
  const [hours, setHours] = useState(() => {
    if (value && value.includes(':')) {
      const parsed = parseInt(value.split(':')[0]) || 7;
      return Math.min(21, Math.max(7, parsed));
    }
    return Math.min(21, Math.max(7, new Date().getHours()));
  });
  const [minutes, setMinutes] = useState(() => {
    if (value && value.includes(':')) {
      return parseInt(value.split(':')[1]) || 0;
    }
    return new Date().getMinutes();
  });
  const [activeSlider, setActiveSlider] = useState<'hours' | 'minutes'>('hours');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const updateTime = (h: number, m: number) => {
    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onChange(formatted);
  };

  return (
    <div ref={pickerRef} className={styles.timePicker}>
      <div className={styles.timePickerDisplay}>
        <span
          className={`${styles.timePickerDigit} ${activeSlider === 'hours' ? styles.timePickerDigitActive : ''}`}
          onClick={() => setActiveSlider('hours')}
        >
          {hours.toString().padStart(2, '0')}
        </span>
        <span className={styles.timePickerColon}>:</span>
        <span
          className={`${styles.timePickerDigit} ${activeSlider === 'minutes' ? styles.timePickerDigitActive : ''}`}
          onClick={() => setActiveSlider('minutes')}
        >
          {minutes.toString().padStart(2, '0')}
        </span>
      </div>
      <div className={styles.timePickerSlider}>
        <span className={styles.timePickerSliderLabel}>
          {activeSlider === 'hours' ? 'Stunden' : 'Minuten'}
        </span>
        <input
          type="range"
          className={styles.timePickerRange}
          min={activeSlider === 'hours' ? 5 : 0}
          max={activeSlider === 'hours' ? 23 : 59}
          value={activeSlider === 'hours' ? hours : minutes}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (activeSlider === 'hours') {
              setHours(val);
              updateTime(val, minutes);
            } else {
              setMinutes(val);
              updateTime(hours, val);
            }
          }}
        />
        <div className={styles.timePickerRangeLabels}>
          <span>{activeSlider === 'hours' ? '05' : '00'}</span>
          <span>{activeSlider === 'hours' ? '23' : '59'}</span>
        </div>
      </div>
      <div className={styles.timePickerActions}>
        <button
          className={styles.timePickerNow}
          onClick={() => {
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();
            setHours(h);
            setMinutes(m);
            updateTime(h, m);
          }}
        >
          Jetzt
        </button>
        <button className={styles.timePickerConfirm} onClick={onClose}>
          <Check size={12} weight="bold" />
          OK
        </button>
      </div>
    </div>
  );
};

// Format time input: auto-insert colon, only allow numbers
const formatTimeInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 4);
  if (limited.length <= 2) {
    return limited;
  }
  return `${limited.slice(0, 2)}:${limited.slice(2)}`;
};

const calculateDuration = (von: string, bis: string): string => {
  if (!von || !bis || !von.includes(':') || !bis.includes(':')) return '0:00';
  const [vonH, vonM] = von.split(':').map(Number);
  const [bisH, bisM] = bis.split(':').map(Number);
  if (isNaN(vonH) || isNaN(vonM) || isNaN(bisH) || isNaN(bisM)) return '0:00';
  let totalMinutes = (bisH * 60 + bisM) - (vonH * 60 + vonM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Types
interface MarketVisitEntry {
  type: 'market';
  id: string;
  date: string;
  market: {
    id: string;
    name: string;
    chain: string;
    address: string;
    postalCode: string;
    city: string;
  };
  fahrzeit: { von: string; bis: string; duration: string };
  besuchszeit: { von: string; bis: string; duration: string };
  distanzKm: number;
  foodProzent: number;
  submissions: { vorbesteller: number; vorverkauf: number; produkttausch: number };
  kommentar?: string;
}

interface ZusatzEntry {
  type: 'zusatz';
  id: string;
  date: string;
  reason: string;
  reasonLabel: string;
  von: string;
  bis: string;
  duration: string;
  kommentar?: string;
  isWorkTimeDeduction?: boolean;
  marketName?: string;
  marketChain?: string;
}

type TimeEntry = MarketVisitEntry | ZusatzEntry;

interface DayTracking {
  day_start_time: string | null;
  day_end_time: string | null;
  skipped_first_fahrzeit: boolean;
}

interface DayGroup {
  date: string;
  dateLabel: string;
  entries: TimeEntry[];
  dayTracking?: DayTracking;
  arbeitstag?: string;
  reineArbeitszeit?: string;
}

interface WochenCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const reasonIcons: Record<string, React.ElementType> = {
  marktbesuch: Storefront,
  arztbesuch: FirstAidKit,
  werkstatt: Car,
  homeoffice: House,
  schulung: GraduationCap,
  lager: Warehouse,
  heimfahrt: Path,
  hotel: Bed,
  unterbrechung: Pause,
  sonderaufgabe: Star,
};

const chainColors: Record<string, { bg: string; border: string; text: string }> = {
  'BILLA+': { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#DC2626' },
  'BILLA': { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#DC2626' },
  'SPAR': { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)', text: '#16A34A' },
  'EUROSPAR': { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)', text: '#16A34A' },
  'INTERSPAR': { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)', text: '#16A34A' },
  'PENNY': { bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.3)', text: '#EA580C' },
  'HOFER': { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', text: '#2563EB' },
  'LIDL': { bg: 'rgba(234, 179, 8, 0.08)', border: 'rgba(234, 179, 8, 0.3)', text: '#CA8A04' },
  'default': { bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.3)', text: '#475569' },
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`;
};

const parseDuration = (duration: string): number => {
  if (!duration || duration === '--:--') return 0;
  const parts = duration.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

const parseIntervalToMinutes = (interval: string | null | undefined): number => {
  if (!interval) return 0;
  const match = interval.match(/(\d+):(\d+)/);
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
  return 0;
};

const parseTimeToMinutes = (t: string | null | undefined): number => {
  if (!t || t === '--:--') return 0;
  const parts = t.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

const formatTimeShort = (t: string | null | undefined): string => {
  if (!t) return '--:--';
  const parts = t.split(':');
  return `${parts[0]}:${parts[1]}`;
};

const getToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

const UNREALISTIC_THRESHOLD_MINUTES = 180;

const isEntryUnrealistic = (entry: TimeEntry): boolean => {
  const dur = entry.type === 'market'
    ? parseDuration(entry.besuchszeit.duration)
    : parseDuration(entry.duration);
  return dur > UNREALISTIC_THRESHOLD_MINUTES;
};

function getLastWeekRange(): { start: Date; end: Date; kwNumber: number; label: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + mondayOffset);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const tmp = new Date(Date.UTC(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const kwNumber = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
  const label = `KW ${kwNumber} \u2014 ${fmt(lastMonday)} - ${fmt(lastSunday)}${lastSunday.getFullYear()}`;

  return { start: lastMonday, end: lastSunday, kwNumber, label };
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export const WochenCheckModal: React.FC<WochenCheckModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [dayTrackingMap, setDayTrackingMap] = useState<Record<string, DayTracking>>({});

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingDayTime, setEditingDayTime] = useState<{ date: string; field: 'start' | 'end' } | null>(null);
  const [editDayTimeValue, setEditDayTimeValue] = useState('');
  const [editDayTimePicker, setEditDayTimePicker] = useState(false);
  const [savingDayTime, setSavingDayTime] = useState(false);

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const weekRange = useMemo(() => getLastWeekRange(), []);

  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) {
      setHasScrolledToBottom(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setHasScrolledToBottom(false);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [zeitData, zusatzData] = await Promise.all([
          fragebogenService.zeiterfassung.getByGL(user.id),
          fetch(`${fragebogenService.API_URL}/zusatz-zeiterfassung/${user.id}`).then(r => r.ok ? r.json() : [])
        ]);

        const startISO = dateToISO(weekRange.start);
        const endISO = dateToISO(weekRange.end);

        const marketEntries: TimeEntry[] = (zeitData || [])
          .map((entry: any) => ({
            type: 'market' as const,
            id: entry.id,
            date: entry.created_at?.split('T')[0] || getToday(),
            market: {
              id: entry.market_id || entry.market?.id || '',
              name: entry.market?.name || 'Unbekannter Markt',
              chain: entry.market?.chain || '',
              address: entry.market?.address || '',
              postalCode: entry.market?.postal_code || '',
              city: entry.market?.city || '',
            },
            fahrzeit: {
              von: entry.fahrzeit_von || '--:--',
              bis: entry.fahrzeit_bis || '--:--',
              duration: entry.fahrzeit_diff ? formatMinutes(parseIntervalToMinutes(entry.fahrzeit_diff)) : '0:00',
            },
            besuchszeit: {
              von: entry.besuchszeit_von || '--:--',
              bis: entry.besuchszeit_bis || '--:--',
              duration: entry.besuchszeit_diff ? formatMinutes(parseIntervalToMinutes(entry.besuchszeit_diff)) : '0:00',
            },
            distanzKm: entry.distanz_km || 0,
            foodProzent: entry.food_prozent || 0,
            submissions: {
              vorbesteller: entry.submissions?.vorbesteller?.count || 0,
              vorverkauf: entry.submissions?.vorverkauf?.count || 0,
              produkttausch: entry.submissions?.produkttausch?.count || 0,
            },
            kommentar: entry.kommentar,
          }))
          .filter((e: TimeEntry) => e.date >= startISO && e.date <= endISO);

        const zusatzEntries: TimeEntry[] = (zusatzData || [])
          .map((entry: any) => ({
            type: 'zusatz' as const,
            id: entry.id,
            date: entry.entry_date,
            reason: entry.reason || 'sonstiges',
            reasonLabel: entry.reason_label || 'Sonstiges',
            von: entry.zeit_von || '--:--',
            bis: entry.zeit_bis || '--:--',
            duration: entry.zeit_diff ? formatMinutes(parseIntervalToMinutes(entry.zeit_diff)) : '0:00',
            kommentar: entry.kommentar,
            marketName: entry.market?.name,
            marketChain: entry.market?.chain,
            isWorkTimeDeduction: entry.is_work_time_deduction,
          }))
          .filter((e: TimeEntry) => e.date >= startISO && e.date <= endISO);

        const allEntries = [...marketEntries, ...zusatzEntries];
        setEntries(allEntries);

        const uniqueDates = [...new Set(allEntries.map(e => e.date))];
        const trackingPromises = uniqueDates.map(async (date) => {
          try {
            const response = await fetch(`${fragebogenService.API_URL}/day-tracking/${user.id}/${date}/summary`);
            if (response.ok) {
              const data = await response.json();
              if (data?.dayTracking) {
                return {
                  date,
                  tracking: {
                    day_start_time: data.dayTracking.day_start_time,
                    day_end_time: data.dayTracking.day_end_time,
                    skipped_first_fahrzeit: data.dayTracking.skipped_first_fahrzeit,
                  },
                };
              }
            }
            return null;
          } catch {
            return null;
          }
        });

        const trackingResults = await Promise.all(trackingPromises);
        const newTrackingMap: Record<string, DayTracking> = {};
        trackingResults.forEach(result => {
          if (result) newTrackingMap[result.date] = result.tracking;
        });
        setDayTrackingMap(newTrackingMap);
      } catch (error) {
        console.error('Error fetching wochen-check data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, user?.id, weekRange]);

  // After loading, check if content is short enough that no scroll is needed
  useEffect(() => {
    if (!loading && isOpen) {
      setTimeout(() => {
        const el = contentRef.current;
        if (el && el.scrollHeight <= el.clientHeight + 30) {
          setHasScrolledToBottom(true);
        }
      }, 100);
    }
  }, [loading, isOpen]);

  const dayGroups = useMemo((): DayGroup[] => {
    const grouped: Record<string, TimeEntry[]> = {};
    entries.forEach(entry => {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    return sortedDates.map(date => {
      const dayEntries = grouped[date].sort((a, b) => {
        const aTime = a.type === 'market' ? a.besuchszeit.von : a.von;
        const bTime = b.type === 'market' ? b.besuchszeit.von : b.von;
        return aTime.localeCompare(bTime);
      });

      const dayTracking = dayTrackingMap[date];
      let arbeitstag = '';
      let reineArbeitszeit = '';

      if (dayTracking?.day_start_time && dayTracking?.day_end_time) {
        const startMins = parseTimeToMinutes(dayTracking.day_start_time);
        const endMins = parseTimeToMinutes(dayTracking.day_end_time);
        const totalMins = endMins - startMins;
        const unterbrechungMins = dayEntries
          .filter((e): e is ZusatzEntry => e.type === 'zusatz' && e.isWorkTimeDeduction === true)
          .reduce((sum, e) => sum + parseDuration(e.duration), 0);
        const reineMins = Math.max(0, totalMins - unterbrechungMins);
        arbeitstag = `${formatTimeShort(dayTracking.day_start_time)} - ${formatTimeShort(dayTracking.day_end_time)}`;
        reineArbeitszeit = formatMinutes(reineMins);
      } else if (dayEntries.length > 0) {
        let earliest = dayEntries[0];
        let latest = dayEntries[0];
        dayEntries.forEach(e => {
          const eStart = e.type === 'market' ? e.besuchszeit.von : e.von;
          const eEnd = e.type === 'market' ? e.besuchszeit.bis : e.bis;
          const earliestStart = earliest.type === 'market' ? earliest.besuchszeit.von : earliest.von;
          const latestEnd = latest.type === 'market' ? latest.besuchszeit.bis : latest.bis;
          if (eStart < earliestStart) earliest = e;
          if (eEnd > latestEnd) latest = e;
        });
        const startTime = earliest.type === 'market' ? earliest.besuchszeit.von : earliest.von;
        const endTime = latest.type === 'market' ? latest.besuchszeit.bis : latest.bis;
        const startMins = parseTimeToMinutes(startTime);
        const endMins = parseTimeToMinutes(endTime);
        const totalMins = endMins - startMins;
        const unterbrechungMins = dayEntries
          .filter((e): e is ZusatzEntry => e.type === 'zusatz' && e.isWorkTimeDeduction === true)
          .reduce((sum, e) => sum + parseDuration(e.duration), 0);
        const reineMins = Math.max(0, totalMins - unterbrechungMins);
        arbeitstag = `${formatTimeShort(startTime)} - ${formatTimeShort(endTime)}`;
        reineArbeitszeit = formatMinutes(reineMins);
      }

      return { date, dateLabel: formatDate(date), entries: dayEntries, dayTracking, arbeitstag, reineArbeitszeit };
    });
  }, [entries, dayTrackingMap]);

  const unrealisticCount = useMemo(() => {
    return entries.filter(isEntryUnrealistic).length;
  }, [entries]);

  // Edit handlers
  const handleEditClick = (id: string, entry: TimeEntry) => {
    setEditingId(id);
    if (entry.type === 'market') {
      setEditData({
        besuchszeitVon: entry.besuchszeit.von,
        besuchszeitBis: entry.besuchszeit.bis,
      });
    } else {
      setEditData({
        von: entry.von,
        bis: entry.bis,
        kommentar: entry.kommentar || '',
      });
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setEntries(prevEntries => prevEntries.map(entry => {
      if (editingId === entry.id && entry.type === 'market') {
        return {
          ...entry,
          besuchszeit: {
            von: editData.besuchszeitVon || entry.besuchszeit.von,
            bis: editData.besuchszeitBis || entry.besuchszeit.bis,
            duration: calculateDuration(editData.besuchszeitVon || entry.besuchszeit.von, editData.besuchszeitBis || entry.besuchszeit.bis),
          },
        };
      }
      if (editingId === entry.id && entry.type === 'zusatz') {
        const newVon = editData.von || entry.von;
        const newBis = editData.bis || entry.bis;
        return { ...entry, von: newVon, bis: newBis, duration: calculateDuration(newVon, newBis), kommentar: editData.kommentar };
      }
      return entry;
    }));
    setEditingId(null);
    setEditData({});
    setActiveTimePicker(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setActiveTimePicker(null);
    setConfirmDeleteId(null);
  };

  const handleDeleteEntry = async (entryId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`${fragebogenService.API_URL}/zeiterfassung/${entryId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setEntries(prev => prev.filter(e => e.id !== entryId));
      setConfirmDeleteId(null);
      setEditingId(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveDayTime = async () => {
    if (!editingDayTime || !user?.id || !editDayTimeValue) return;
    setSavingDayTime(true);
    try {
      const updatePayload = editingDayTime.field === 'start'
        ? { day_start_time: editDayTimeValue }
        : { day_end_time: editDayTimeValue };
      await dayTrackingService.updateDayTimes(user.id, editingDayTime.date, updatePayload);
      setDayTrackingMap(prev => ({
        ...prev,
        [editingDayTime.date]: {
          ...prev[editingDayTime.date],
          ...(editingDayTime.field === 'start'
            ? { day_start_time: editDayTimeValue }
            : { day_end_time: editDayTimeValue })
        }
      }));
      setEditingDayTime(null);
      setEditDayTimeValue('');
      setEditDayTimePicker(false);
    } catch (error) {
      console.error('Error saving day time:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSavingDayTime(false);
    }
  };

  const handleCancelDayTimeEdit = () => {
    setEditingDayTime(null);
    setEditDayTimeValue('');
    setEditDayTimePicker(false);
  };

  const getChainColor = (chain: string) => chainColors[chain] || chainColors['default'];

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <ShieldCheck size={24} weight="bold" />
            </div>
            <div className={styles.headerText}>
              <h2 className={styles.title}>Wochen-Check</h2>
              <p className={styles.subtitle}>{weekRange.label}</p>
            </div>
          </div>
          {unrealisticCount > 0 && (
            <div className={styles.highlightBadge}>
              <WarningCircle size={14} weight="fill" />
              {unrealisticCount} auffällig
            </div>
          )}
        </div>

        {/* Warning Banner */}
        <div style={{ padding: '0 24px', paddingTop: '16px', flexShrink: 0 }}>
          <div className={styles.warningBanner}>
            <WarningCircle size={18} weight="fill" className={styles.warningIcon} />
            <span className={styles.warningText}>
              Bitte nimm die Kontrolle deiner Zeiteinträge ernst. Überprüfe jeden Eintrag sorgfältig und korrigiere fehlerhafte Zeiten.
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content} ref={contentRef} onScroll={handleScroll}>
          <div className={styles.entriesList}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <CircleNotch size={32} weight="bold" className={styles.spinner} />
                <span>Lade Zeiteinträge...</span>
              </div>
            ) : dayGroups.length === 0 ? (
              <div className={styles.emptyState}>
                <Clock size={48} weight="regular" />
                <span>Keine Zeiteinträge für letzte Woche</span>
              </div>
            ) : dayGroups.map((group) => (
              <div key={group.date} className={styles.dayGroup}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayLabel}>{group.dateLabel}</span>
                  <div className={styles.dayLine} />
                  {group.arbeitstag && (
                    <div className={styles.dayStats}>
                      <span className={styles.dayStatItem}>
                        <span className={styles.dayStatLabel}>Arbeitstag</span>
                        <span className={styles.dayStatValue}>{group.arbeitstag}</span>
                      </span>
                      <span className={styles.dayStatItem}>
                        <span className={styles.dayStatLabel}>Reine Arbeitszeit</span>
                        <span className={styles.dayStatValue}>{group.reineArbeitszeit}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.dayEntries}>
                  {(() => {
                    const dayTracking = group.dayTracking;

                    const calcGapMinutes = (endTime: string | null | undefined, startTime: string | null | undefined): number => {
                      if (!endTime || !startTime || endTime === '--:--' || startTime === '--:--') return 0;
                      const [endH, endM] = endTime.split(':').map(Number);
                      const [startH, startM] = startTime.split(':').map(Number);
                      if (isNaN(endH) || isNaN(endM) || isNaN(startH) || isNaN(startM)) return 0;
                      let endMins = endH * 60 + endM;
                      let startMins = startH * 60 + startM;
                      if (startMins < endMins) startMins += 24 * 60;
                      return Math.max(0, startMins - endMins);
                    };

                    const formatGapTime = (mins: number): string => {
                      if (mins <= 0) return '0:00';
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return `${h}:${m.toString().padStart(2, '0')}`;
                    };

                    type TimelineItem =
                      | { type: 'market'; entry: MarketVisitEntry; startTime: string; endTime: string }
                      | { type: 'zusatz'; entry: ZusatzEntry; startTime: string; endTime: string };

                    const timelineItems: TimelineItem[] = group.entries.map(entry => {
                      if (entry.type === 'market') {
                        return { type: 'market' as const, entry, startTime: entry.besuchszeit.von || '00:00', endTime: entry.besuchszeit.bis || '00:00' };
                      }
                      return { type: 'zusatz' as const, entry, startTime: entry.von || '00:00', endTime: entry.bis || '00:00' };
                    });

                    timelineItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

                    const renderedItems: React.ReactNode[] = [];

                    // Anfahrt
                    if (dayTracking?.day_start_time && !dayTracking.skipped_first_fahrzeit && timelineItems.length > 0) {
                      const firstItem = timelineItems[0];
                      const isEditingAnfahrt = editingDayTime?.date === group.date && editingDayTime?.field === 'start';
                      const anfahrtMinutes = calcGapMinutes(dayTracking.day_start_time, firstItem.startTime);
                      if (anfahrtMinutes > 0 || isEditingAnfahrt) {
                        renderedItems.push(
                          <div key="anfahrt" className={styles.fahrzeitCard}>
                            <div className={styles.fahrzeitIcon}><Car size={18} weight="regular" /></div>
                            <div className={styles.fahrzeitInfo}>
                              <span className={styles.fahrzeitLabel}>Anfahrt</span>
                              <span className={styles.fahrzeitTimes}>{formatTimeShort(dayTracking.day_start_time)} - {formatTimeShort(firstItem.startTime)}</span>
                            </div>
                            <span className={styles.fahrzeitDuration}>({formatGapTime(anfahrtMinutes)})</span>
                            {!isEditingAnfahrt && (
                              <button className={styles.editButton} onClick={() => { setEditingDayTime({ date: group.date, field: 'start' }); setEditDayTimeValue(formatTimeShort(dayTracking.day_start_time)); }}>
                                <PencilSimple size={16} weight="regular" />
                              </button>
                            )}
                          </div>
                        );
                        if (isEditingAnfahrt) {
                          renderedItems.push(
                            <div key="anfahrt-edit" className={styles.editForm}>
                              <div className={styles.editRow}>
                                <label>Startzeit:</label>
                                <div className={styles.timeInputWrapper}>
                                  <input type="text" className={styles.editTimeInput} value={editDayTimeValue} onChange={(e) => setEditDayTimeValue(formatTimeInput(e.target.value))} placeholder="00:00" maxLength={5} />
                                  <button className={styles.clockButton} onClick={() => setEditDayTimePicker(!editDayTimePicker)} type="button"><Clock size={14} weight="regular" /></button>
                                  {editDayTimePicker && <TimePicker value={editDayTimeValue} onChange={(time) => setEditDayTimeValue(time)} onClose={() => setEditDayTimePicker(false)} />}
                                </div>
                              </div>
                              <div className={styles.editActions}>
                                <button className={styles.cancelBtn} onClick={handleCancelDayTimeEdit}>Abbrechen</button>
                                <button className={styles.saveBtn} onClick={handleSaveDayTime} disabled={savingDayTime}><Check size={14} weight="bold" /> Speichern</button>
                              </div>
                            </div>
                          );
                        }
                      }
                    }

                    // Timeline items
                    timelineItems.forEach((item, idx) => {
                      const prevItem = idx > 0 ? timelineItems[idx - 1] : null;
                      const gapMinutes = prevItem ? calcGapMinutes(prevItem.endTime, item.startTime) : 0;

                      if (gapMinutes > 0) {
                        renderedItems.push(
                          <div key={`fahrzeit-${item.type === 'market' ? item.entry.id : item.entry.id}`} className={styles.fahrzeitCard}>
                            <div className={styles.fahrzeitIcon}><Car size={18} weight="regular" /></div>
                            <div className={styles.fahrzeitInfo}>
                              <span className={styles.fahrzeitLabel}>Fahrzeit</span>
                              <span className={styles.fahrzeitTimes}>{formatTimeShort(prevItem?.endTime)} - {formatTimeShort(item.startTime)}</span>
                            </div>
                            <span className={styles.fahrzeitDuration}>({formatGapTime(gapMinutes)})</span>
                          </div>
                        );
                      }

                      if (item.type === 'market') {
                        const entry = item.entry;
                        const colors = getChainColor(entry.market.chain);
                        const isEditing = editingId === entry.id;
                        const unrealistic = isEntryUnrealistic(entry);

                        renderedItems.push(
                          <div key={entry.id} className={styles.entryGroup}>
                            <div
                              className={`${styles.marketCard} ${unrealistic ? styles.highlighted : ''}`}
                              style={!unrealistic ? { borderLeftColor: colors.border } : undefined}
                            >
                              <div className={styles.marketHeader}>
                                <div className={styles.chainBadge} style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                                  {entry.market.chain}
                                </div>
                                <span className={styles.marketName}>{entry.market.name}</span>
                                {unrealistic && (
                                  <span className={styles.highlightBadge}>
                                    <WarningCircle size={12} weight="fill" />
                                    &gt;3h
                                  </span>
                                )}
                                {!isEditing && (
                                  <button className={styles.editButton} onClick={() => handleEditClick(entry.id, entry)}>
                                    <PencilSimple size={16} weight="regular" />
                                  </button>
                                )}
                              </div>

                              {isEditing ? (
                                <div className={styles.editForm}>
                                  <div className={styles.editRow}>
                                    <label>Besuchszeit:</label>
                                    <div className={styles.timeInputWrapper}>
                                      <input type="text" className={styles.editTimeInput} value={editData.besuchszeitVon || ''} onChange={(e) => setEditData({...editData, besuchszeitVon: formatTimeInput(e.target.value)})} placeholder="00:00" maxLength={5} />
                                      <button className={styles.clockButton} onClick={() => setActiveTimePicker(activeTimePicker === 'besuchszeitVon' ? null : 'besuchszeitVon')} type="button"><Clock size={14} weight="regular" /></button>
                                      {activeTimePicker === 'besuchszeitVon' && <TimePicker value={editData.besuchszeitVon || ''} onChange={(time) => setEditData({...editData, besuchszeitVon: time})} onClose={() => setActiveTimePicker(null)} />}
                                    </div>
                                    <span>-</span>
                                    <div className={styles.timeInputWrapper}>
                                      <input type="text" className={styles.editTimeInput} value={editData.besuchszeitBis || ''} onChange={(e) => setEditData({...editData, besuchszeitBis: formatTimeInput(e.target.value)})} placeholder="00:00" maxLength={5} />
                                      <button className={styles.clockButton} onClick={() => setActiveTimePicker(activeTimePicker === 'besuchszeitBis' ? null : 'besuchszeitBis')} type="button"><Clock size={14} weight="regular" /></button>
                                      {activeTimePicker === 'besuchszeitBis' && <TimePicker value={editData.besuchszeitBis || ''} onChange={(time) => setEditData({...editData, besuchszeitBis: time})} onClose={() => setActiveTimePicker(null)} />}
                                    </div>
                                  </div>
                                  <div className={styles.editActions}>
                                    <button className={styles.deleteEntryBtn} onClick={() => setConfirmDeleteId(entry.id)}><Trash size={14} weight="regular" /></button>
                                    <button className={styles.cancelBtn} onClick={handleCancelEdit}>Abbrechen</button>
                                    <button className={styles.saveBtn} onClick={handleSaveEdit}><Check size={14} weight="bold" /> Speichern</button>
                                  </div>
                                  {confirmDeleteId === entry.id && (
                                    <div className={styles.confirmDeleteRow}>
                                      <span className={styles.confirmDeleteText}>Eintrag löschen?</span>
                                      <button className={styles.confirmDeleteYes} onClick={() => handleDeleteEntry(entry.id)} disabled={deleting}>Ja</button>
                                      <button className={styles.confirmDeleteNo} onClick={() => setConfirmDeleteId(null)}>Nein</button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className={styles.marketTimes}>
                                    <span className={styles.visitLabel}>Besuch:</span>
                                    <span className={styles.visitTimes}>{entry.besuchszeit.von} - {entry.besuchszeit.bis}</span>
                                    <span className={styles.visitDuration}>({entry.besuchszeit.duration})</span>
                                  </div>
                                  <div className={styles.marketAddress}>
                                    <MapPin size={14} weight="regular" />
                                    <span>{entry.market.address}, {entry.market.postalCode} {entry.market.city}</span>
                                  </div>
                                  {(entry.submissions.vorbesteller > 0 || entry.submissions.vorverkauf > 0 || entry.submissions.produkttausch > 0) && (
                                    <div className={styles.submissionBadges}>
                                      {entry.submissions.vorbesteller > 0 && (
                                        <span className={styles.submissionBadge} data-type="vorbesteller"><Package size={14} /> {entry.submissions.vorbesteller} Vorbesteller</span>
                                      )}
                                      {entry.submissions.vorverkauf > 0 && (
                                        <span className={styles.submissionBadge} data-type="vorverkauf"><ShoppingCart size={14} /> {entry.submissions.vorverkauf} Vorverkauf</span>
                                      )}
                                      {entry.submissions.produkttausch > 0 && (
                                        <span className={styles.submissionBadge} data-type="produkttausch"><ArrowsLeftRight size={14} /> {entry.submissions.produkttausch} Produkttausch</span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        const entry = item.entry;
                        const IconComponent = reasonIcons[entry.reason] || Clock;
                        const isEditing = editingId === entry.id;
                        const unrealistic = isEntryUnrealistic(entry);

                        renderedItems.push(
                          <div key={entry.id} className={`${styles.zusatzCard} ${unrealistic ? styles.highlighted : ''}`}>
                            <div className={styles.zusatzIcon}>
                              <IconComponent size={20} weight="regular" />
                            </div>
                            <div className={styles.zusatzContent}>
                              <div className={styles.zusatzHeader}>
                                <span className={styles.zusatzLabel}>
                                  {entry.reasonLabel}
                                  {entry.marketName && <span className={styles.zusatzMarket}> - {entry.marketName}</span>}
                                </span>
                                {unrealistic && (
                                  <span className={styles.highlightBadge}>
                                    <WarningCircle size={12} weight="fill" />
                                    &gt;3h
                                  </span>
                                )}
                                {!isEditing && (
                                  <button className={styles.editButton} onClick={() => handleEditClick(entry.id, entry)}>
                                    <PencilSimple size={16} weight="regular" />
                                  </button>
                                )}
                              </div>

                              {isEditing ? (
                                <div className={styles.editForm}>
                                  <div className={styles.editRow}>
                                    <label>Zeit:</label>
                                    <div className={styles.timeInputWrapper}>
                                      <input type="text" className={styles.editTimeInput} value={editData.von || ''} onChange={(e) => setEditData({...editData, von: formatTimeInput(e.target.value)})} placeholder="00:00" maxLength={5} />
                                      <button className={styles.clockButton} onClick={() => setActiveTimePicker(activeTimePicker === 'zusatzVon' ? null : 'zusatzVon')} type="button"><Clock size={14} weight="regular" /></button>
                                      {activeTimePicker === 'zusatzVon' && <TimePicker value={editData.von || ''} onChange={(time) => setEditData({...editData, von: time})} onClose={() => setActiveTimePicker(null)} />}
                                    </div>
                                    <span>-</span>
                                    <div className={styles.timeInputWrapper}>
                                      <input type="text" className={styles.editTimeInput} value={editData.bis || ''} onChange={(e) => setEditData({...editData, bis: formatTimeInput(e.target.value)})} placeholder="00:00" maxLength={5} />
                                      <button className={styles.clockButton} onClick={() => setActiveTimePicker(activeTimePicker === 'zusatzBis' ? null : 'zusatzBis')} type="button"><Clock size={14} weight="regular" /></button>
                                      {activeTimePicker === 'zusatzBis' && <TimePicker value={editData.bis || ''} onChange={(time) => setEditData({...editData, bis: time})} onClose={() => setActiveTimePicker(null)} />}
                                    </div>
                                  </div>
                                  <div className={styles.editRow}>
                                    <label>Kommentar:</label>
                                    <input type="text" value={editData.kommentar || ''} onChange={(e) => setEditData({...editData, kommentar: e.target.value})} placeholder="Optional" className={styles.editFullWidth} />
                                  </div>
                                  <div className={styles.editActions}>
                                    <button className={styles.cancelBtn} onClick={handleCancelEdit}>Abbrechen</button>
                                    <button className={styles.saveBtn} onClick={handleSaveEdit}><Check size={14} weight="bold" /> Speichern</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className={styles.zusatzTimes}>
                                    {entry.von} - {entry.bis}
                                    <span className={styles.zusatzDuration}>({entry.duration})</span>
                                  </div>
                                  {entry.kommentar && <div className={styles.zusatzComment}>{entry.kommentar}</div>}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }
                    });

                    // Heimfahrt
                    if (dayTracking?.day_end_time && timelineItems.length > 0) {
                      const lastItem = timelineItems[timelineItems.length - 1];
                      const isEditingHeimfahrt = editingDayTime?.date === group.date && editingDayTime?.field === 'end';
                      const heimfahrtMinutes = calcGapMinutes(lastItem.endTime, dayTracking.day_end_time);
                      if (heimfahrtMinutes > 0 || isEditingHeimfahrt) {
                        renderedItems.push(
                          <div key="heimfahrt" className={styles.fahrzeitCard}>
                            <div className={styles.fahrzeitIcon}><Car size={18} weight="regular" /></div>
                            <div className={styles.fahrzeitInfo}>
                              <span className={styles.fahrzeitLabel}>Heimfahrt</span>
                              <span className={styles.fahrzeitTimes}>{formatTimeShort(lastItem.endTime)} - {formatTimeShort(dayTracking.day_end_time)}</span>
                            </div>
                            <span className={styles.fahrzeitDuration}>({formatGapTime(heimfahrtMinutes)})</span>
                            {!isEditingHeimfahrt && (
                              <button className={styles.editButton} onClick={() => { setEditingDayTime({ date: group.date, field: 'end' }); setEditDayTimeValue(formatTimeShort(dayTracking.day_end_time)); }}>
                                <PencilSimple size={16} weight="regular" />
                              </button>
                            )}
                          </div>
                        );
                        if (isEditingHeimfahrt) {
                          renderedItems.push(
                            <div key="heimfahrt-edit" className={styles.editForm}>
                              <div className={styles.editRow}>
                                <label>Endzeit:</label>
                                <div className={styles.timeInputWrapper}>
                                  <input type="text" className={styles.editTimeInput} value={editDayTimeValue} onChange={(e) => setEditDayTimeValue(formatTimeInput(e.target.value))} placeholder="00:00" maxLength={5} />
                                  <button className={styles.clockButton} onClick={() => setEditDayTimePicker(!editDayTimePicker)} type="button"><Clock size={14} weight="regular" /></button>
                                  {editDayTimePicker && <TimePicker value={editDayTimeValue} onChange={(time) => setEditDayTimeValue(time)} onClose={() => setEditDayTimePicker(false)} />}
                                </div>
                              </div>
                              <div className={styles.editActions}>
                                <button className={styles.cancelBtn} onClick={handleCancelDayTimeEdit}>Abbrechen</button>
                                <button className={styles.saveBtn} onClick={handleSaveDayTime} disabled={savingDayTime}><Check size={14} weight="bold" /> Speichern</button>
                              </div>
                            </div>
                          );
                        }
                      }
                    }

                    return renderedItems;
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Bar */}
        <div className={styles.confirmBar}>
          <button
            className={styles.confirmButton}
            disabled={!hasScrolledToBottom}
            onClick={() => setShowConfirmDialog(true)}
          >
            {hasScrolledToBottom ? (
              <>
                <ShieldCheck size={18} weight="bold" />
                Zeiteinträge bestätigen
              </>
            ) : (
              <>
                <CaretDown size={18} weight="bold" />
                Bitte scrolle nach unten und überprüfe alle Einträge
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className={styles.confirmOverlay} onClick={() => setShowConfirmDialog(false)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmDialogHeader}>
              <ShieldCheck size={32} weight="fill" className={styles.confirmDialogIcon} />
              <h2 className={styles.confirmDialogTitle}>Zeiteinträge bestätigen</h2>
            </div>
            <p className={styles.confirmDialogText}>
              Hast du alle Zeiteinträge der Woche sorgfältig überprüft und sind alle Angaben korrekt?
            </p>
            <div className={styles.confirmDialogInfo}>
              <Clock size={18} weight="fill" className={styles.confirmDialogInfoIcon} />
              <span>{weekRange.label}</span>
            </div>
            <div className={styles.confirmDialogActions}>
              <button className={styles.confirmDialogCancel} onClick={() => setShowConfirmDialog(false)}>
                <X size={18} weight="bold" />
                Zurück zur Überprüfung
              </button>
              <button className={styles.confirmDialogConfirm} onClick={async () => {
                if (user?.id) {
                  try {
                    await wochenCheckService.confirmWeek(user.id, dateToISO(weekRange.start));
                  } catch (e) { console.error('Failed to save wochen-check stamp:', e); }
                }
                setShowConfirmDialog(false);
                onClose();
              }}>
                <Check size={18} weight="bold" />
                Ja, bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WochenCheckModal;
