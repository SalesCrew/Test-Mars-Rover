import React, { useState, useEffect } from 'react';
import { CaretDown, CaretRight, CaretLeft, Storefront, Car, CalendarCheck, TrendUp, Receipt, User, MagnifyingGlass, Pause } from '@phosphor-icons/react';
import XLSX from 'xlsx-js-style';
import fragebogenService from '../../services/fragebogenService';
import styles from './ZeiterfassungPage.module.css';
import MagicBento from './MagicBento';

interface ZeiterfassungEntry {
  id: string;
  gebietsleiter_id: string;
  market_id: string;
  fahrzeit_von: string | null;
  fahrzeit_bis: string | null;
  fahrzeit_diff: string | null;
  calculated_fahrzeit: string | null; // Auto-calculated from day tracking
  besuchszeit_von: string | null;
  besuchszeit_bis: string | null;
  besuchszeit_diff: string | null;
  distanz_km: number | null;
  kommentar: string | null;
  food_prozent: number | null;
  created_at: string;
  gebietsleiter: {
    id: string;
    first_name: string;
    last_name: string;
  };
  market: {
    id: string;
    name: string;
    chain: string;
    address?: string;
    postal_code?: string;
    city?: string;
  };
  submissions?: {
    vorbesteller: {
      count: number;
      totalValue: number;
      items: any[];
    };
    vorverkauf: {
      count: number;
      items: any[];
    };
    produkttausch: {
      count: number;
      items: any[];
    };
  };
}

interface GLDayData {
  glId: string;
  glName: string;
  entries: ZeiterfassungEntry[];
  ersteAktion: string;
  letzteAktion: string;
  reineArbeitszeit: string;
  maerkteBesucht: number;
}

interface DayGroup {
  date: string;
  gls: GLDayData[];
}

interface GLProfileData {
  glId: string;
  glName: string;
  totalDays: number;
  totalMarketsVisited: number;
  totalReineArbeitszeit: number; // in minutes
  totalErsteLetzteSpan: number; // in minutes
  avgDailyWorkTime: number;
  days: {
    date: string;
    ersteAktion: string;
    letzteAktion: string;
    ersteLetzteSpan: string;
    reineArbeitszeit: string;
    reineArbeitszeitMinutes: number;
    maerkteBesucht: number;
    entries: ZeiterfassungEntry[];
  }[];
}

interface ZusatzZeiterfassungEntry {
  id: string;
  gebietsleiter_id: string;
  entry_date: string;
  reason: string;
  reason_label: string;
  zeit_von: string;
  zeit_bis: string;
  zeit_diff: string | null;
  kommentar: string | null;
  is_work_time_deduction: boolean;
  created_at: string;
  gebietsleiter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface ZeiterfassungPageProps {
  viewMode: 'date' | 'profile';
}

// Export helper function for Excel
const exportToExcel = (data: string[][], filename: string) => {
  // Create worksheet with styled cells
  const worksheet: XLSX.WorkSheet = {};
  
  // Set column widths
  const colWidths = data[0].map((_, colIdx) => {
    const maxLength = Math.max(...data.map(row => String(row[colIdx] || '').length));
    return { wch: Math.min(Math.max(maxLength + 2, 12), 45) };
  });
  worksheet['!cols'] = colWidths;
  
  // Add cells with styling
  data.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      
      if (rowIdx === 0) {
        // Header row styling
        worksheet[cellAddress] = {
          v: cell,
          t: 's',
          s: {
            fill: { fgColor: { rgb: '3B82F6' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              bottom: { style: 'thin', color: { rgb: '2563EB' } }
            }
          }
        };
      } else {
        // Data rows
        worksheet[cellAddress] = {
          v: cell,
          t: 's',
          s: {
            font: { sz: 10 },
            alignment: { vertical: 'center' },
            border: {
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          }
        };
      }
    });
  });
  
  // Set worksheet range
  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: data.length - 1, c: data[0].length - 1 }
  });
  
  // Set row heights (header slightly taller)
  worksheet['!rows'] = data.map((_, idx) => ({ hpt: idx === 0 ? 24 : 18 }));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Zeiterfassung');
  
  XLSX.writeFile(workbook, filename);
};

export const ZeiterfassungPage: React.FC<ZeiterfassungPageProps> = ({ viewMode }) => {
  const [entries, setEntries] = useState<ZeiterfassungEntry[]>([]);
  const [zusatzEntries, setZusatzEntries] = useState<ZusatzZeiterfassungEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGLs, setExpandedGLs] = useState<Set<string>>(new Set());
  const [detailedEntries, setDetailedEntries] = useState<Record<string, ZeiterfassungEntry[]>>({});
  const [dayTrackingData, setDayTrackingData] = useState<Record<string, { day_start_time: string | null; day_end_time: string | null; skipped_first_fahrzeit: boolean }>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  
  // Profile view state
  const [selectedGLId, setSelectedGLId] = useState<string | null>(null);
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'mtd' | 'kw'>('all');
  const [glSearchQuery, setGlSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zeitData, zusatzData] = await Promise.all([
        fragebogenService.zeiterfassung.getForAdmin(),
        fetch(`${fragebogenService.API_URL}/zusatz-zeiterfassung-all`).then(r => r.ok ? r.json() : [])
      ]);
      setEntries(zeitData);
      setZusatzEntries(zusatzData);
    } catch (error) {
      console.error('Error loading zeiterfassung:', error);
    } finally {
      setLoading(false);
    }
  };

  // DEV: Test data generation
  const generateTestEntries = (): ZeiterfassungEntry[] => {
    const today = new Date().toISOString();
    const testGLId = 'test-gl-001';
    
    const markets = [
      { id: 'test-m1', name: 'Mariahilfer Straße', chain: 'BILLA+', address: 'Mariahilfer Straße 120', postal_code: '1070', city: 'Wien' },
      { id: 'test-m2', name: 'Westbahnhof', chain: 'SPAR', address: 'Europaplatz 1', postal_code: '1150', city: 'Wien' },
      { id: 'test-m3', name: 'Acanski', chain: 'ADEG', address: 'Hauptstraße 45', postal_code: '6800', city: 'Hagen' },
      { id: 'test-m4', name: 'Favoriten', chain: 'Eurospar', address: 'Favoritenstraße 80', postal_code: '1100', city: 'Wien' },
      { id: 'test-m5', name: 'Shopping City Süd', chain: 'Interspar', address: 'SCS-Straße 1', postal_code: '2334', city: 'Vösendorf' },
    ];

    const times = [
      { fahrVon: '08:00', fahrBis: '08:25', fahrDiff: '00:25:00', besuchVon: '08:30', besuchBis: '09:15', besuchDiff: '00:45:00' },
      { fahrVon: '09:20', fahrBis: '09:40', fahrDiff: '00:20:00', besuchVon: '09:45', besuchBis: '10:20', besuchDiff: '00:35:00' },
      { fahrVon: '10:25', fahrBis: '10:55', fahrDiff: '00:30:00', besuchVon: '11:00', besuchBis: '11:50', besuchDiff: '00:50:00' },
      { fahrVon: '11:55', fahrBis: '12:10', fahrDiff: '00:15:00', besuchVon: '12:15', besuchBis: '12:40', besuchDiff: '00:25:00' },
      { fahrVon: '12:45', fahrBis: '13:15', fahrDiff: '00:30:00', besuchVon: '13:20', besuchBis: '14:30', besuchDiff: '01:10:00' },
    ];

    return markets.map((market, i) => ({
      id: `test-entry-${i + 1}`,
      gebietsleiter_id: testGLId,
      market_id: market.id,
      fahrzeit_von: times[i].fahrVon,
      fahrzeit_bis: times[i].fahrBis,
      fahrzeit_diff: times[i].fahrDiff,
      besuchszeit_von: times[i].besuchVon,
      besuchszeit_bis: times[i].besuchBis,
      besuchszeit_diff: times[i].besuchDiff,
      distanz_km: Math.floor(Math.random() * 20) + 5,
      kommentar: null,
      food_prozent: Math.floor(Math.random() * 30) + 10,
      created_at: today,
      gebietsleiter: {
        id: testGLId,
        first_name: 'Test',
        last_name: 'Gebietsleiter',
      },
      market: market,
      submissions: undefined,
    }));
  };

  // DEV: Listen for test data events
  useEffect(() => {
    const testGLId = 'test-gl-001';
    const todayKey = `${new Date().toISOString().split('T')[0]}-${testGLId}`;

    const handleAddTestData = () => {
      const testEntries = generateTestEntries();
      setEntries(prev => [...testEntries, ...prev]);
      setDetailedEntries(prev => ({
        ...prev,
        [todayKey]: testEntries,
      }));
      // Auto-expand the test GL
      setExpandedGLs(prev => new Set(prev).add(todayKey));
      console.log('DEV: Added 5 test market entries');
    };

    const handleAddVorbesteller = () => {
      setDetailedEntries(prev => {
        const updated = { ...prev };
        if (updated[todayKey]) {
          updated[todayKey] = updated[todayKey].map((entry, i) => ({
            ...entry,
            submissions: {
              ...entry.submissions,
              vorbesteller: {
                count: Math.floor(Math.random() * 3) + 1,
                totalValue: Math.floor(Math.random() * 500) + 100,
                items: [
                  { type: 'Display', name: 'Whiskas Display 24er', quantity: 2 },
                  { type: 'Palette', name: 'Pedigree Palette Groß', quantity: 1 },
                  { type: 'Schütte', name: 'Sheba Schütte', quantity: 3 },
                  { type: 'Kartonware', name: 'Perfect Fit Karton 12x85g', quantity: 5 },
                ],
              },
              vorverkauf: entry.submissions?.vorverkauf || { count: 0, items: [] },
              produkttausch: entry.submissions?.produkttausch || { count: 0, items: [] },
            },
          }));
        }
        return updated;
      });
      console.log('DEV: Added Vorbesteller submissions (Display, Palette, Schütte, Kartonware)');
    };

    const handleAddVorverkauf = () => {
      setDetailedEntries(prev => {
        const updated = { ...prev };
        if (updated[todayKey]) {
          updated[todayKey] = updated[todayKey].map((entry) => ({
            ...entry,
            submissions: {
              ...entry.submissions,
              vorbesteller: entry.submissions?.vorbesteller || { count: 0, totalValue: 0, items: [] },
              vorverkauf: {
                count: Math.floor(Math.random() * 2) + 1,
                items: [
                  { product: 'Whiskas 1+ Huhn', displays: 2, kartonware: 15 },
                  { product: 'Pedigree Adult Rind', displays: 1, kartonware: 8 },
                ],
              },
              produkttausch: entry.submissions?.produkttausch || { count: 0, items: [] },
            },
          }));
        }
        return updated;
      });
      console.log('DEV: Added Vorverkauf submissions');
    };

    const handleAddProdukttausch = () => {
      setDetailedEntries(prev => {
        const updated = { ...prev };
        if (updated[todayKey]) {
          updated[todayKey] = updated[todayKey].map((entry) => ({
            ...entry,
            submissions: {
              ...entry.submissions,
              vorbesteller: entry.submissions?.vorbesteller || { count: 0, totalValue: 0, items: [] },
              vorverkauf: entry.submissions?.vorverkauf || { count: 0, items: [] },
              produkttausch: {
                count: Math.floor(Math.random() * 2) + 1,
                items: [
                  { oldProduct: 'Whiskas 7+ (abgelaufen)', newProduct: 'Whiskas 7+ (neu)', quantity: 3 },
                  { oldProduct: 'Sheba Fresh Choice (beschädigt)', newProduct: 'Sheba Fresh Choice (neu)', quantity: 2 },
                ],
              },
            },
          }));
        }
        return updated;
      });
      console.log('DEV: Added Produkttausch submissions');
    };

    const handleClearTestData = () => {
      setEntries(prev => prev.filter(e => !e.id.startsWith('test-')));
      setDetailedEntries(prev => {
        const updated = { ...prev };
        delete updated[todayKey];
        return updated;
      });
      setExpandedGLs(prev => {
        const newSet = new Set(prev);
        newSet.delete(todayKey);
        return newSet;
      });
      console.log('DEV: Cleared all test data');
    };

    window.addEventListener('dev:addTestZeiterfassung', handleAddTestData);
    window.addEventListener('dev:addVorbestellerSubmissions', handleAddVorbesteller);
    window.addEventListener('dev:addVorverkaufSubmissions', handleAddVorverkauf);
    window.addEventListener('dev:addProdukttauschSubmissions', handleAddProdukttausch);
    window.addEventListener('dev:clearTestData', handleClearTestData);

    return () => {
      window.removeEventListener('dev:addTestZeiterfassung', handleAddTestData);
      window.removeEventListener('dev:addVorbestellerSubmissions', handleAddVorbesteller);
      window.removeEventListener('dev:addVorverkaufSubmissions', handleAddVorverkauf);
      window.removeEventListener('dev:addProdukttauschSubmissions', handleAddProdukttausch);
      window.removeEventListener('dev:clearTestData', handleClearTestData);
    };
  }, []);

  // Export handler
  useEffect(() => {
    const handleExport = () => {
      if (viewMode === 'date') {
        // Export all entries grouped by date
        const exportData: string[][] = [
          ['Datum', 'Gebietsleiter', 'Markt', 'Handelskette', 'Adresse', 'PLZ', 'Ort', 'Fahrzeit Von', 'Fahrzeit Bis', 'Fahrzeit Dauer', 'Besuchszeit Von', 'Besuchszeit Bis', 'Besuchszeit Dauer', 'Distanz (km)']
        ];

        // Sort entries by date descending, then by GL name
        const sortedEntries = [...entries].sort((a, b) => {
          const dateCompare = b.created_at.localeCompare(a.created_at);
          if (dateCompare !== 0) return dateCompare;
          const nameA = `${a.gebietsleiter.first_name} ${a.gebietsleiter.last_name}`;
          const nameB = `${b.gebietsleiter.first_name} ${b.gebietsleiter.last_name}`;
          return nameA.localeCompare(nameB);
        });

        sortedEntries.forEach(entry => {
          const date = new Date(entry.created_at).toLocaleDateString('de-DE');
          const glName = `${entry.gebietsleiter.first_name} ${entry.gebietsleiter.last_name}`;
          
          exportData.push([
            date,
            glName,
            entry.market.name,
            entry.market.chain,
            entry.market.address || '',
            entry.market.postal_code || '',
            entry.market.city || '',
            entry.fahrzeit_von || '',
            entry.fahrzeit_bis || '',
            entry.fahrzeit_diff || '',
            entry.besuchszeit_von || '',
            entry.besuchszeit_bis || '',
            entry.besuchszeit_diff || '',
            entry.distanz_km?.toString() || ''
          ]);
        });

        const today = new Date().toISOString().split('T')[0];
        exportToExcel(exportData, `Zeiterfassung_${today}.xlsx`);
      } else if (viewMode === 'profile' && selectedGLId) {
        // Export selected GL's entries
        const glEntries = entries.filter(e => e.gebietsleiter_id === selectedGLId);
        const glName = glEntries[0]?.gebietsleiter 
          ? `${glEntries[0].gebietsleiter.first_name}_${glEntries[0].gebietsleiter.last_name}`
          : 'GL';

        const exportData: string[][] = [
          ['Datum', 'Markt', 'Handelskette', 'Adresse', 'PLZ', 'Ort', 'Fahrzeit Von', 'Fahrzeit Bis', 'Fahrzeit Dauer', 'Besuchszeit Von', 'Besuchszeit Bis', 'Besuchszeit Dauer', 'Distanz (km)']
        ];

        // Sort by date descending
        const sortedEntries = [...glEntries].sort((a, b) => b.created_at.localeCompare(a.created_at));

        sortedEntries.forEach(entry => {
          const date = new Date(entry.created_at).toLocaleDateString('de-DE');
          
          exportData.push([
            date,
            entry.market.name,
            entry.market.chain,
            entry.market.address || '',
            entry.market.postal_code || '',
            entry.market.city || '',
            entry.fahrzeit_von || '',
            entry.fahrzeit_bis || '',
            entry.fahrzeit_diff || '',
            entry.besuchszeit_von || '',
            entry.besuchszeit_bis || '',
            entry.besuchszeit_diff || '',
            entry.distanz_km?.toString() || ''
          ]);
        });

        const today = new Date().toISOString().split('T')[0];
        exportToExcel(exportData, `Zeiterfassung_${glName}_${today}.xlsx`);
      }
    };

    window.addEventListener('zeiterfassung:export', handleExport);
    return () => window.removeEventListener('zeiterfassung:export', handleExport);
  }, [viewMode, entries, selectedGLId]);

  const loadGLDayDetails = async (glId: string, date: string, key: string) => {
    if (detailedEntries[key]) return; // Already loaded
    
    try {
      setLoadingDetails(prev => new Set(prev).add(key));
      
      // Fetch both details and day tracking in parallel
      const [details, dayTrackingResponse] = await Promise.all([
        fragebogenService.zeiterfassung.getGLDayDetails(glId, date),
        fetch(`${fragebogenService.API_URL}/day-tracking/${glId}/${date}/summary`).then(r => r.ok ? r.json() : null)
      ]);
      
      setDetailedEntries(prev => ({ ...prev, [key]: details }));
      
      if (dayTrackingResponse?.dayTracking) {
        setDayTrackingData(prev => ({ 
          ...prev, 
          [key]: {
            day_start_time: dayTrackingResponse.dayTracking.day_start_time,
            day_end_time: dayTrackingResponse.dayTracking.day_end_time,
            skipped_first_fahrzeit: dayTrackingResponse.dayTracking.skipped_first_fahrzeit
          }
        }));
      }
    } catch (error) {
      console.error('Error loading GL day details:', error);
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const toggleGL = async (key: string, glId: string, date: string) => {
    const isExpanding = !expandedGLs.has(key);
    
    setExpandedGLs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
    
    // Load details when expanding
    if (isExpanding) {
      await loadGLDayDetails(glId, date, key);
    }
  };

  const parseTime = (timeStr: string | null): Date | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const parseInterval = (intervalStr: string | null): number => {
    if (!intervalStr) return 0;
    // Format: "HH:MM:SS" or PostgreSQL interval format
    const match = intervalStr.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return hours * 60 + minutes;
    }
    return 0;
  };

  const formatMinutes = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const groupByDate = (): DayGroup[] => {
    const groups: { [date: string]: { [glId: string]: ZeiterfassungEntry[] } } = {};

    entries.forEach(entry => {
      const date = entry.created_at.split('T')[0]; // Get YYYY-MM-DD
      if (!groups[date]) groups[date] = {};
      if (!groups[date][entry.gebietsleiter_id]) {
        groups[date][entry.gebietsleiter_id] = [];
      }
      groups[date][entry.gebietsleiter_id].push(entry);
    });

    const dayGroups: DayGroup[] = [];

    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const glsData: GLDayData[] = [];

      Object.keys(groups[date]).forEach(glId => {
        const glEntries = groups[date][glId];
        const gl = glEntries[0].gebietsleiter;

        // Find erste and letzte aktion
        let earliestTime: Date | null = null;
        let latestTime: Date | null = null;
        let totalMinutes = 0;

        glEntries.forEach(entry => {
          // Check fahrzeit_von
          if (entry.fahrzeit_von) {
            const time = parseTime(entry.fahrzeit_von);
            if (time && (!earliestTime || time < earliestTime)) {
              earliestTime = time;
            }
          }

          // Check fahrzeit_bis
          if (entry.fahrzeit_bis) {
            const time = parseTime(entry.fahrzeit_bis);
            if (time && (!latestTime || time > latestTime)) {
              latestTime = time;
            }
          }

          // Check besuchszeit_von
          if (entry.besuchszeit_von) {
            const time = parseTime(entry.besuchszeit_von);
            if (time && (!earliestTime || time < earliestTime)) {
              earliestTime = time;
            }
          }

          // Check besuchszeit_bis
          if (entry.besuchszeit_bis) {
            const time = parseTime(entry.besuchszeit_bis);
            if (time && (!latestTime || time > latestTime)) {
              latestTime = time;
            }
          }

          // Add durations (use calculated_fahrzeit if available, fallback to manual fahrzeit_diff)
          totalMinutes += parseInterval(entry.calculated_fahrzeit || entry.fahrzeit_diff);
          totalMinutes += parseInterval(entry.besuchszeit_diff);
        });

        // Subtract Unterbrechung time (work time deductions)
        const glZusatzForDay = zusatzEntries.filter(z => 
          z.gebietsleiter_id === glId && 
          z.entry_date === date && 
          z.is_work_time_deduction
        );
        const unterbrechungMinutes = glZusatzForDay.reduce((sum, z) => sum + parseInterval(z.zeit_diff), 0);
        const netMinutes = Math.max(0, totalMinutes - unterbrechungMinutes);

        const ersteAktion = earliestTime
          ? `${earliestTime.getHours().toString().padStart(2, '0')}:${earliestTime.getMinutes().toString().padStart(2, '0')}`
          : '--:--';
        const letzteAktion = latestTime
          ? `${latestTime.getHours().toString().padStart(2, '0')}:${latestTime.getMinutes().toString().padStart(2, '0')}`
          : '--:--';

        glsData.push({
          glId,
          glName: `${gl.first_name} ${gl.last_name}`,
          entries: glEntries,
          ersteAktion,
          letzteAktion,
          reineArbeitszeit: formatMinutes(netMinutes),
          maerkteBesucht: glEntries.length
        });
      });

      // Sort GLs by name
      glsData.sort((a, b) => a.glName.localeCompare(b.glName));

      dayGroups.push({ date, gls: glsData });
    });

    return dayGroups;
  };

  // Group entries by GL for profile view
  const groupByGL = (): GLProfileData[] => {
    const glGroups: { [glId: string]: { gl: { id: string; first_name: string; last_name: string }, entries: ZeiterfassungEntry[] } } = {};

    // Filter entries based on timeframe
    const filteredEntries = entries.filter(entry => {
      if (timeframeFilter === 'all') return true;
      
      const entryDate = new Date(entry.created_at);
      const now = new Date();
      
      if (timeframeFilter === 'mtd') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return entryDate >= startOfMonth;
      }
      
      if (timeframeFilter === 'kw') {
        // Get start of current week (Monday)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return entryDate >= startOfWeek;
      }
      
      return true;
    });

    // Group by GL
    filteredEntries.forEach(entry => {
      if (!glGroups[entry.gebietsleiter_id]) {
        glGroups[entry.gebietsleiter_id] = {
          gl: entry.gebietsleiter,
          entries: []
        };
      }
      glGroups[entry.gebietsleiter_id].entries.push(entry);
    });

    // Process each GL
    const glProfiles: GLProfileData[] = Object.keys(glGroups).map(glId => {
      const { gl, entries: glEntries } = glGroups[glId];
      
      // Group entries by date
      const dateGroups: { [date: string]: ZeiterfassungEntry[] } = {};
      glEntries.forEach(entry => {
        const date = entry.created_at.split('T')[0];
        if (!dateGroups[date]) dateGroups[date] = [];
        dateGroups[date].push(entry);
      });

      let totalReineArbeitszeit = 0;
      let totalErsteLetzteSpan = 0;
      let totalMarketsVisited = 0;

      const days = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a)).map(date => {
        const dayEntries = dateGroups[date];
        
        let earliestTime: Date | null = null;
        let latestTime: Date | null = null;
        let dayTotalMinutes = 0;

        dayEntries.forEach(entry => {
          if (entry.fahrzeit_von) {
            const time = parseTime(entry.fahrzeit_von);
            if (time && (!earliestTime || time < earliestTime)) earliestTime = time;
          }
          if (entry.fahrzeit_bis) {
            const time = parseTime(entry.fahrzeit_bis);
            if (time && (!latestTime || time > latestTime)) latestTime = time;
          }
          if (entry.besuchszeit_von) {
            const time = parseTime(entry.besuchszeit_von);
            if (time && (!earliestTime || time < earliestTime)) earliestTime = time;
          }
          if (entry.besuchszeit_bis) {
            const time = parseTime(entry.besuchszeit_bis);
            if (time && (!latestTime || time > latestTime)) latestTime = time;
          }
          dayTotalMinutes += parseInterval(entry.calculated_fahrzeit || entry.fahrzeit_diff);
          dayTotalMinutes += parseInterval(entry.besuchszeit_diff);
        });

        // Subtract Unterbrechung time (work time deductions)
        const glZusatzForDay = zusatzEntries.filter(z => 
          z.gebietsleiter_id === glId && 
          z.entry_date === date && 
          z.is_work_time_deduction
        );
        const unterbrechungMinutes = glZusatzForDay.reduce((sum, z) => sum + parseInterval(z.zeit_diff), 0);
        const netDayMinutes = Math.max(0, dayTotalMinutes - unterbrechungMinutes);

        const ersteAktion = earliestTime
          ? `${earliestTime.getHours().toString().padStart(2, '0')}:${earliestTime.getMinutes().toString().padStart(2, '0')}`
          : '--:--';
        const letzteAktion = latestTime
          ? `${latestTime.getHours().toString().padStart(2, '0')}:${latestTime.getMinutes().toString().padStart(2, '0')}`
          : '--:--';

        // Calculate erste-letzte span in minutes
        let ersteLetzteSpanMinutes = 0;
        if (earliestTime && latestTime) {
          ersteLetzteSpanMinutes = Math.round((latestTime.getTime() - earliestTime.getTime()) / 60000);
        }

        totalReineArbeitszeit += netDayMinutes;
        totalErsteLetzteSpan += ersteLetzteSpanMinutes;
        totalMarketsVisited += dayEntries.length;

        return {
          date,
          ersteAktion,
          letzteAktion,
          ersteLetzteSpan: formatMinutes(ersteLetzteSpanMinutes),
          reineArbeitszeit: formatMinutes(netDayMinutes),
          reineArbeitszeitMinutes: netDayMinutes,
          maerkteBesucht: dayEntries.length,
          entries: dayEntries
        };
      });

      const totalDays = days.length;
      const avgDailyWorkTime = totalDays > 0 ? Math.round(totalReineArbeitszeit / totalDays) : 0;

      return {
        glId,
        glName: `${gl.first_name} ${gl.last_name}`,
        totalDays,
        totalMarketsVisited,
        totalReineArbeitszeit,
        totalErsteLetzteSpan,
        avgDailyWorkTime,
        days
      };
    });

    // Sort by name and filter by search query
    return glProfiles
      .filter(gl => gl.glName.toLowerCase().includes(glSearchQuery.toLowerCase()))
      .sort((a, b) => a.glName.localeCompare(b.glName));
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = dateStr.split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateOnly === todayStr) return 'Heute';
    if (dateOnly === yesterdayStr) return 'Gestern';

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('de-DE', options);
  };

  const getChainColor = (chain: string): string => {
    const chainColors: Record<string, string> = {
      'BILLA+': '#F59E0B',
      'BILLA': '#F59E0B',
      'SPAR': '#DC2626',
      'PENNY': '#3B82F6',
      'HOFER': '#0EA5E9',
      'MERKUR': '#10B981',
      'ADEG': '#8B5CF6',
      'NETTO': '#F97316'
    };
    return chainColors[chain] || '#64748B';
  };

  // Get chain badge gradient styling (matching MarketListItem)
  const getChainBadgeStyle = (chain: string): React.CSSProperties => {
    const upperChain = chain.toUpperCase();
    
    // Define gradient colors for each chain
    const gradients: Record<string, [string, string]> = {
      // BILLA Family
      'BILLA+': ['#FED304', '#EAB308'],
      'BILLA PLUS': ['#FED304', '#EAB308'],
      'BILLA+ PRIVAT': ['#FBBF24', '#F59E0B'],
      'BILLA PLUS PRIVAT': ['#FBBF24', '#F59E0B'],
      'BILLA PRIVAT': ['#F59E0B', '#D97706'],
      'BILLA': ['#F59E0B', '#D97706'],
      // SPAR Family
      'SPAR': ['#EF4444', '#DC2626'],
      'EUROSPAR': ['#DC2626', '#B91C1C'],
      'INTERSPAR': ['#B91C1C', '#991B1B'],
      'SPAR GOURMET': ['#059669', '#047857'],
      // Other Chains
      'HOFER': ['#3B82F6', '#2563EB'],
      'MERKUR': ['#10B981', '#059669'],
      'ADEG': ['#8B5CF6', '#7C3AED'],
      'FUTTERHAUS': ['#F97316', '#EA580C'],
      'HAGEBAU': ['#0EA5E9', '#0284C7'],
      'ZOOFACHHANDEL': ['#EC4899', '#DB2777'],
      'PENNY': ['#3B82F6', '#2563EB'],
      'NETTO': ['#F97316', '#EA580C'],
    };

    const colors = gradients[upperChain] || ['#6B7280', '#4B5563'];
    
    return {
      background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
      color: 'white',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 700,
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      whiteSpace: 'nowrap' as const,
    };
  };

  const formatInterval = (interval: string | null): string => {
    if (!interval) return '0:00';
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    return interval;
  };

  // Calculate average market visit duration in minutes
  const calculateAverageVisitDuration = (): number => {
    const allVisitDurations = entries
      .map(e => parseInterval(e.besuchszeit_diff))
      .filter(d => d > 0);
    
    if (allVisitDurations.length === 0) return 0;
    
    const totalMinutes = allVisitDurations.reduce((sum, d) => sum + d, 0);
    return totalMinutes / allVisitDurations.length;
  };

  const averageVisitDuration = calculateAverageVisitDuration();

  // Get color based on deviation from average
  // Green: within ±20%, Red: ±80% or more, interpolated in between
  // Optional alpha parameter for transparency
  const getVisitDurationColor = (interval: string | null, alpha?: number): string => {
    let r = 16, g = 185, b = 129; // Default green
    
    if (interval && averageVisitDuration > 0) {
      const durationMinutes = parseInterval(interval);
      
      if (durationMinutes > 0) {
        // Calculate percentage deviation from average
        const deviation = Math.abs(durationMinutes - averageVisitDuration) / averageVisitDuration;
        
        if (deviation <= 0.20) {
          // Within 20% = green
          r = 16; g = 185; b = 129;
        } else if (deviation >= 0.80) {
          // 80% or more = red
          r = 239; g = 68; b = 68;
        } else {
          // Between 20% and 80% - interpolate from green to red
          const t = (deviation - 0.20) / 0.60;
          
          // Green: rgb(16, 185, 129)
          // Orange midpoint: rgb(249, 115, 22) - more orange than amber
          // Red: rgb(239, 68, 68)
          
          if (t < 0.5) {
            // Green to Orange (0 to 0.5)
            const t2 = t * 2;
            r = Math.round(16 + (249 - 16) * t2);
            g = Math.round(185 + (115 - 185) * t2);
            b = Math.round(129 + (22 - 129) * t2);
          } else {
            // Orange to Red (0.5 to 1)
            const t2 = (t - 0.5) * 2;
            r = Math.round(249 + (239 - 249) * t2);
            g = Math.round(115 + (68 - 115) * t2);
            b = Math.round(22 + (68 - 22) * t2);
          }
        }
      }
    }
    
    if (alpha !== undefined) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  };

  const dayGroups = groupByDate();
  const glProfiles = groupByGL();
  const selectedGL = selectedGLId ? glProfiles.find(gl => gl.glId === selectedGLId) : null;

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Zeiterfassung wird geladen...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p>Keine Zeiterfassungen gefunden.</p>
      </div>
    );
  }

  // Profile View Mode
  if (viewMode === 'profile') {
    // GL Detail View
    if (selectedGL) {
      // Calculate MTD and KW stats for the selected GL
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const mtdDays = selectedGL.days.filter(d => new Date(d.date) >= startOfMonth);
      const kwDays = selectedGL.days.filter(d => new Date(d.date) >= startOfWeek);

      const mtdReineArbeitszeit = mtdDays.reduce((sum, d) => sum + d.reineArbeitszeitMinutes, 0);
      const mtdMarkets = mtdDays.reduce((sum, d) => sum + d.maerkteBesucht, 0);
      const mtdErsteLetzteSpan = mtdDays.reduce((sum, d) => {
        const [erste, letzte] = [d.ersteAktion, d.letzteAktion];
        if (erste !== '--:--' && letzte !== '--:--') {
          const ersteMin = parseInt(erste.split(':')[0]) * 60 + parseInt(erste.split(':')[1]);
          const letzteMin = parseInt(letzte.split(':')[0]) * 60 + parseInt(letzte.split(':')[1]);
          return sum + (letzteMin - ersteMin);
        }
        return sum;
      }, 0);

      const kwReineArbeitszeit = kwDays.reduce((sum, d) => sum + d.reineArbeitszeitMinutes, 0);
      const kwMarkets = kwDays.reduce((sum, d) => sum + d.maerkteBesucht, 0);
      const kwErsteLetzteSpan = kwDays.reduce((sum, d) => {
        const [erste, letzte] = [d.ersteAktion, d.letzteAktion];
        if (erste !== '--:--' && letzte !== '--:--') {
          const ersteMin = parseInt(erste.split(':')[0]) * 60 + parseInt(erste.split(':')[1]);
          const letzteMin = parseInt(letzte.split(':')[0]) * 60 + parseInt(letzte.split(':')[1]);
          return sum + (letzteMin - ersteMin);
        }
        return sum;
      }, 0);

      // Get current week number for display
      const getWeekNumber = (date: Date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      };
      const currentKW = getWeekNumber(now);

      return (
        <div className={styles.profileContainer}>
          {/* Header with back button */}
          <div className={styles.glDetailHeader}>
            <button 
              className={styles.backButton}
              onClick={() => setSelectedGLId(null)}
            >
              <CaretLeft size={20} weight="bold" />
              <span>Zurück</span>
            </button>
            <h2 className={styles.glDetailName}>{selectedGL.glName}</h2>
          </div>

          {/* Stats Bento Grid */}
          <MagicBento
            cards={[
              {
                label: `KW ${currentKW}`,
                title: formatMinutes(kwReineArbeitszeit),
                description: 'Reine Arbeitszeit'
              },
              {
                label: `KW ${currentKW}`,
                title: formatMinutes(kwErsteLetzteSpan),
                description: `Erste/Letzte Differenz · ${kwMarkets} Märkte`
              },
              {
                label: 'Gesamt',
                title: formatMinutes(selectedGL.totalReineArbeitszeit),
                description: `Reine Arbeitszeit · ${selectedGL.totalDays} Tage · ${selectedGL.totalMarketsVisited} Märkte · Ø ${formatMinutes(selectedGL.avgDailyWorkTime)}/Tag`
              },
              {
                label: 'MTD',
                title: formatMinutes(mtdReineArbeitszeit),
                description: `Reine Arbeitszeit · ${mtdDays.length} Tage · ${mtdMarkets} Märkte · Ø ${formatMinutes(mtdDays.length > 0 ? Math.round(mtdReineArbeitszeit / mtdDays.length) : 0)}/Tag`
              },
              {
                label: 'MTD',
                title: formatMinutes(mtdErsteLetzteSpan),
                description: `Erste/Letzte Differenz · ${mtdDays.length} Tage`
              },
              {
                label: 'MTD',
                title: `${mtdMarkets}`,
                description: `Märkte besucht · Ø ${mtdDays.length > 0 ? (mtdMarkets / mtdDays.length).toFixed(1) : '0'}/Tag`
              }
            ]}
            textAutoHide={true}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={false}
            enableMagnetism={false}
            clickEffect={true}
            spotlightRadius={400}
            particleCount={12}
            glowColor="59, 130, 246"
            disableAnimations={false}
          />

          {/* Working Days List */}
          <div className={styles.daysList}>
            <h3 className={styles.daysListTitle}>Arbeitstage</h3>
            {selectedGL.days.map(day => {
              const dayKey = `${selectedGL.glId}-${day.date}`;
              const isExpanded = expandedGLs.has(dayKey);
              const isLoadingDay = loadingDetails.has(dayKey);
              const dayDetailedEntries = detailedEntries[dayKey] || day.entries;

              return (
                <div key={day.date} className={styles.dayRowContainer}>
                  <button
                    className={`${styles.dayRow} ${isExpanded ? styles.dayRowExpanded : ''}`}
                    onClick={() => toggleGL(dayKey, selectedGL.glId, day.date)}
                  >
                    <div className={styles.dayRowLeft}>
                      <div className={styles.dayRowExpandIcon}>
                        {isExpanded ? (
                          <CaretDown size={16} weight="bold" />
                        ) : (
                          <CaretRight size={16} weight="bold" />
                        )}
                      </div>
                      <span className={styles.dayRowDate}>{formatDate(day.date)}</span>
                    </div>
                    <div className={styles.dayRowStats}>
                      {(() => {
                        // Helper functions
                        const parseTimeToMinutes = (t: string | null | undefined) => {
                          if (!t || t === '--:--') return 0;
                          const [h, m] = t.split(':').map(Number);
                          return h * 60 + m;
                        };
                        const parseIntervalToMinutes = (interval: string | null | undefined) => {
                          if (!interval) return 0;
                          const match = interval.match(/(\d+):(\d+)/);
                          if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
                          return 0;
                        };
                        const formatMins = (mins: number) => {
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          return `${h}:${m.toString().padStart(2, '0')}`;
                        };
                        const formatTime = (t: string | null | undefined) => {
                          if (!t) return '--:--';
                          const parts = t.split(':');
                          return `${parts[0]}:${parts[1]}`;
                        };
                        
                        // Use day tracking times if available
                        const dayKey = `${selectedGL.glId}-${day.date}`;
                        const dayTracking = dayTrackingData[dayKey];
                        const startTime = dayTracking?.day_start_time || day.ersteAktion;
                        const endTime = dayTracking?.day_end_time || day.letzteAktion;
                        
                        // Arbeitstag = end time - start time
                        const arbeitstag = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
                        
                        // Calculate Unterbrechung
                        const unterbrechungMinutes = zusatzEntries
                          .filter(z => z.gebietsleiter_id === selectedGL.glId && z.entry_date === day.date && z.is_work_time_deduction)
                          .reduce((sum, z) => sum + parseIntervalToMinutes(z.zeit_diff), 0);
                        
                        // Reine Arbeitszeit = Arbeitstag - Unterbrechung
                        const reineArbeitszeitMinutes = Math.max(0, arbeitstag - unterbrechungMinutes);
                        
                        return (
                          <>
                            <div className={styles.dayRowStatPill} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
                              <span className={styles.dayRowStatLabel} style={{ color: '#3B82F6' }}>Arbeitstag</span>
                              <span className={styles.dayRowStatValue}>{formatTime(startTime)} - {formatTime(endTime)}</span>
                            </div>
                            <div className={styles.dayRowStatPill} style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                              <span className={styles.dayRowStatLabel} style={{ color: '#10B981' }}>Reine Arbeitszeit</span>
                              <span className={styles.dayRowStatValue}>{formatMins(reineArbeitszeitMinutes)}</span>
                            </div>
                            {unterbrechungMinutes > 0 && (
                              <div className={styles.dayRowStatPill} style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)', border: '1px solid rgba(220, 38, 38, 0.15)' }}>
                                <span className={styles.dayRowStatLabel} style={{ color: '#DC2626' }}>Unterbrechung</span>
                                <span className={styles.dayRowStatValue} style={{ color: '#DC2626' }}>{formatMins(unterbrechungMinutes)}</span>
                              </div>
                            )}
                            <div className={styles.dayRowStatPill} style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
                              <span className={styles.dayRowStatLabel} style={{ color: '#8B5CF6' }}>Märkte</span>
                              <span className={styles.dayRowStatValue} style={{ color: '#8B5CF6' }}>{day.maerkteBesucht}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </button>

                  {/* Expanded content with market visits - matching date view layout */}
                  {isExpanded && (
                    <div className={styles.glDetails}>
                      {isLoadingDay ? (
                        <div className={styles.detailsLoading}>
                          <div className={styles.spinner} />
                          <span>Laden...</span>
                        </div>
                      ) : (
                        <>
                          <div className={styles.timelineColumn}>
                            {(() => {
                              // Combine market entries and zusatz entries into a unified timeline
                              const glZusatzEntries = zusatzEntries.filter(z => 
                                z.entry_date === day.date && z.gebietsleiter_id === selectedGL.glId
                              );
                              
                              // Helper to calculate time difference between two time strings
                              const calcGapMinutes = (endTime: string | null, startTime: string | null): number => {
                                if (!endTime || !startTime) return 0;
                                const [endH, endM] = endTime.split(':').map(Number);
                                const [startH, startM] = startTime.split(':').map(Number);
                                let endMins = endH * 60 + endM;
                                let startMins = startH * 60 + startM;
                                if (startMins < endMins) startMins += 24 * 60; // overnight
                                return Math.max(0, startMins - endMins);
                              };
                              
                              const formatGap = (minutes: number): string => {
                                if (minutes <= 0) return '0:00';
                                const h = Math.floor(minutes / 60);
                                const m = minutes % 60;
                                return `${h}:${m.toString().padStart(2, '0')}`;
                              };
                              
                              // Create timeline items with start/end times
                              type TimelineItem = 
                                | { type: 'market'; entry: ZeiterfassungEntry; startTime: string; endTime: string }
                                | { type: 'zusatz'; entry: ZusatzZeiterfassungEntry; startTime: string; endTime: string };
                              
                              const timelineItems: TimelineItem[] = [
                                ...dayDetailedEntries.map(entry => ({
                                  type: 'market' as const,
                                  entry,
                                  startTime: entry.besuchszeit_von || '00:00',
                                  endTime: entry.besuchszeit_bis || '00:00'
                                })),
                                ...glZusatzEntries.map(entry => ({
                                  type: 'zusatz' as const,
                                  entry,
                                  startTime: entry.zeit_von || '00:00',
                                  endTime: entry.zeit_bis || '00:00'
                                }))
                              ];
                              
                              // Sort by start time
                              timelineItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
                              
                              // Get day tracking data for Anfahrt
                              const dayKey = `${selectedGL.glId}-${day.date}`;
                              const dayTracking = dayTrackingData[dayKey];
                              
                              const renderedItems: React.ReactNode[] = [];
                              
                              // Add Anfahrt if day has started and not skipped
                              if (dayTracking?.day_start_time && !dayTracking.skipped_first_fahrzeit && timelineItems.length > 0) {
                                const firstItem = timelineItems[0];
                                const anfahrtMinutes = calcGapMinutes(dayTracking.day_start_time, firstItem.startTime);
                                if (anfahrtMinutes > 0) {
                                  renderedItems.push(
                                    <div key="anfahrt" className={styles.fahrzeitLine}>
                                      <div className={styles.fahrzeitInfo}>
                                        <Car size={16} weight="fill" />
                                        <span className={styles.fahrzeitLabel}>Anfahrt</span>
                                        <div className={styles.fahrzeitTimeRight}>
                                          <span className={styles.fahrzeitTime}>
                                            {dayTracking.day_start_time} - {firstItem.startTime}
                                          </span>
                                          <span className={styles.duration}>
                                            {formatGap(anfahrtMinutes)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              timelineItems.forEach((item, idx) => {
                                // Calculate Fahrzeit as gap from previous item's end to this item's start
                                const prevItem = idx > 0 ? timelineItems[idx - 1] : null;
                                const gapMinutes = prevItem ? calcGapMinutes(prevItem.endTime, item.startTime) : 0;
                                const showFahrzeit = gapMinutes > 0 && item.type === 'market';
                                
                                if (item.type === 'market') {
                                  const entry = item.entry;
                                  renderedItems.push(
                                    <React.Fragment key={entry.id}>
                                      {/* Fahrzeit Line - calculated from gap between previous action and this one */}
                                      {showFahrzeit ? (
                                        <div className={styles.fahrzeitLine}>
                                          <div className={styles.fahrzeitInfo}>
                                            <Car size={16} weight="fill" />
                                            <span className={styles.fahrzeitLabel}>Fahrzeit</span>
                                            <div className={styles.fahrzeitTimeRight}>
                                              <span className={styles.fahrzeitTime}>
                                                {prevItem?.endTime} - {item.startTime}
                                              </span>
                                              <span className={styles.duration}>
                                                {formatGap(gapMinutes)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : null}

                                      {/* Market Card */}
                                      <div 
                                        className={styles.marketCard}
                                        style={{ 
                                          background: `linear-gradient(135deg, ${getVisitDurationColor(entry.besuchszeit_diff, 0.07)}, ${getVisitDurationColor(entry.besuchszeit_diff, 0.03)})`,
                                          borderColor: getVisitDurationColor(entry.besuchszeit_diff, 0.2)
                                        }}
                                      >
                                        <div className={styles.marketInfo}>
                                          <Storefront size={16} weight="fill" style={{ color: '#64748B', flexShrink: 0 }} />
                                          <span style={getChainBadgeStyle(entry.market.chain)}>{entry.market.chain}</span>
                                          <span className={styles.marketName}>{entry.market.name}</span>
                                          <span className={styles.marketAddress}>
                                            {entry.market.address || ''}{entry.market.postal_code ? `, ${entry.market.postal_code}` : ''}{entry.market.city ? ` ${entry.market.city}` : ''}
                                          </span>
                                          <div className={styles.marketTimeRight}>
                                            <span className={styles.besuchszeit}>
                                              {entry.besuchszeit_von || '--:--'} - {entry.besuchszeit_bis || '--:--'}
                                            </span>
                                            <span 
                                              className={styles.duration}
                                              style={{ 
                                                backgroundColor: getVisitDurationColor(entry.besuchszeit_diff, 0.12),
                                                color: getVisitDurationColor(entry.besuchszeit_diff)
                                              }}
                                            >
                                              {formatInterval(entry.besuchszeit_diff)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </React.Fragment>
                                  );
                                } else {
                                  const zusatz = item.entry;
                                  renderedItems.push(
                                    <div 
                                      key={zusatz.id} 
                                      className={styles.fahrzeitLine}
                                    >
                                      <div className={styles.fahrzeitInfo}>
                                        <Pause size={16} weight="fill" />
                                        <span className={styles.fahrzeitLabel}>
                                          {zusatz.reason_label}
                                          {zusatz.is_work_time_deduction && ' (Abzug)'}
                                          {zusatz.kommentar && <span style={{ color: '#64748B', fontWeight: 400, marginLeft: '8px' }}>{zusatz.kommentar}</span>}
                                        </span>
                                        <div className={styles.fahrzeitTimeRight}>
                                          <span className={styles.fahrzeitTime}>
                                            {zusatz.zeit_von} - {zusatz.zeit_bis}
                                          </span>
                                          <span className={styles.duration}>
                                            {formatInterval(zusatz.zeit_diff)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              });
                              
                              // Add Heimfahrt if day has ended
                              if (dayTracking?.day_end_time && timelineItems.length > 0) {
                                const lastItem = timelineItems[timelineItems.length - 1];
                                const heimfahrtMinutes = calcGapMinutes(lastItem.endTime, dayTracking.day_end_time);
                                if (heimfahrtMinutes > 0) {
                                  renderedItems.push(
                                    <div key="heimfahrt" className={styles.fahrzeitLine}>
                                      <div className={styles.fahrzeitInfo}>
                                        <Car size={16} weight="fill" />
                                        <span className={styles.fahrzeitLabel}>Heimfahrt</span>
                                        <div className={styles.fahrzeitTimeRight}>
                                          <span className={styles.fahrzeitTime}>
                                            {lastItem.endTime} - {dayTracking.day_end_time}
                                          </span>
                                          <span className={styles.duration}>
                                            {formatGap(heimfahrtMinutes)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              return renderedItems;
                            })()}
                          </div>

                          <div className={styles.statsColumn}>
                            {(() => {
                              const totalVorbesteller = dayDetailedEntries.reduce((sum, e) => sum + (e.submissions?.vorbesteller.count || 0), 0);
                              const totalVorbestellerValue = dayDetailedEntries.reduce((sum, e) => sum + (e.submissions?.vorbesteller.totalValue || 0), 0);
                              const totalVorverkauf = dayDetailedEntries.reduce((sum, e) => sum + (e.submissions?.vorverkauf.count || 0), 0);
                              const totalProduktausch = dayDetailedEntries.reduce((sum, e) => sum + (e.submissions?.produkttausch.count || 0), 0);

                              return (
                                <>
                                  {totalVorbesteller > 0 && (
                                    <div className={styles.statCard}>
                                      <div className={styles.statCardIcon} style={{ color: '#3B82F6' }}>
                                        <CalendarCheck size={20} weight="fill" />
                                      </div>
                                      <div className={styles.statCardInfo}>
                                        <span className={styles.statCardTitle}>Vorbesteller</span>
                                        <div className={styles.statCardDetails}>
                                          <span className={styles.statCardCount}>{totalVorbesteller} Bestellungen</span>
                                        </div>
                                      </div>
                                      <span className={styles.statCardValue} style={{ color: '#10B981' }}>
                                        €{totalVorbestellerValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}

                                  {totalVorverkauf > 0 && (
                                    <div className={styles.statCard}>
                                      <div className={styles.statCardIcon} style={{ color: '#8B5CF6' }}>
                                        <TrendUp size={20} weight="fill" />
                                      </div>
                                      <div className={styles.statCardInfo}>
                                        <span className={styles.statCardTitle}>Vorverkauf</span>
                                        <div className={styles.statCardDetails}>
                                          <span className={styles.statCardCount}>{totalVorverkauf} Einträge</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {totalProduktausch > 0 && (
                                    <div className={styles.statCard}>
                                      <div className={styles.statCardIcon} style={{ color: '#F97316' }}>
                                        <Receipt size={20} weight="fill" />
                                      </div>
                                      <div className={styles.statCardInfo}>
                                        <span className={styles.statCardTitle}>Produkttausch</span>
                                        <div className={styles.statCardDetails}>
                                          <span className={styles.statCardCount}>{totalProduktausch} Einträge</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {totalVorbesteller === 0 && totalVorverkauf === 0 && totalProduktausch === 0 && (
                                    <div className={styles.noSubmissions}>
                                      Keine Aktionen an diesem Tag
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // GL List View (no GL selected)
    return (
      <div className={styles.profileContainer}>
        {/* Header with search and filters */}
        <div className={styles.glListHeader}>
          <div className={styles.glSearchContainer}>
            <MagnifyingGlass size={18} weight="regular" className={styles.glSearchIcon} />
            <input
              type="text"
              placeholder="Gebietsleiter suchen..."
              value={glSearchQuery}
              onChange={(e) => setGlSearchQuery(e.target.value)}
              className={styles.glSearchInput}
            />
          </div>
        </div>

        {/* GL Cards */}
        <div className={styles.glProfileList}>
          {glProfiles.length === 0 ? (
            <div className={styles.emptyContainer}>
              <p>Keine Gebietsleiter gefunden.</p>
            </div>
          ) : (
            glProfiles.map(gl => (
              <button
                key={gl.glId}
                className={styles.glProfileCard}
                onClick={() => setSelectedGLId(gl.glId)}
              >
                <div className={styles.glProfileHeader}>
                  <div className={styles.glProfileAvatar}>
                    <User size={18} weight="fill" />
                  </div>
                  <span className={styles.glProfileName}>{gl.glName}</span>
                  <CaretRight size={16} weight="bold" className={styles.glProfileChevron} />
                </div>
                <div className={styles.glProfileStats}>
                  <div className={styles.glProfileStat}>
                    <span className={styles.glProfileStatValue}>{gl.totalDays}</span>
                    <span className={styles.glProfileStatLabel}>Tage</span>
                  </div>
                  <div className={styles.glProfileStat}>
                    <span className={styles.glProfileStatValue} style={{ color: '#10B981' }}>{formatMinutes(gl.totalReineArbeitszeit)}</span>
                    <span className={styles.glProfileStatLabel}>Arbeitszeit</span>
                  </div>
                  <div className={styles.glProfileStat}>
                    <span className={styles.glProfileStatValue}>{gl.totalMarketsVisited}</span>
                    <span className={styles.glProfileStatLabel}>Märkte</span>
                  </div>
                  <div className={styles.glProfileStat}>
                    <span className={styles.glProfileStatValue}>{formatMinutes(gl.avgDailyWorkTime)}</span>
                    <span className={styles.glProfileStatLabel}>Ø/Tag</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Date View Mode (default)
  return (
    <div className={styles.container}>
      {dayGroups.map(dayGroup => (
        <div key={dayGroup.date} className={styles.dayGroup}>
          <div className={styles.dateHeader}>
            {formatDate(dayGroup.date)}
          </div>

          {dayGroup.gls.map(gl => {
            const glKey = `${dayGroup.date}-${gl.glId}`;
            const isExpanded = expandedGLs.has(glKey);

            return (
              <div key={glKey} className={styles.glCard}>
                <button
                  className={styles.glHeader}
                  onClick={() => toggleGL(glKey, gl.glId, dayGroup.date)}
                >
                  <div className={styles.glHeaderLeft}>
                    <div className={styles.expandIcon}>
                      {isExpanded ? (
                        <CaretDown size={18} weight="bold" />
                      ) : (
                        <CaretRight size={18} weight="bold" />
                      )}
                    </div>
                    <span className={styles.glName}>{gl.glName}</span>
                  </div>

                  <div className={styles.glStats}>
                    {(() => {
                      // Helper functions
                      const parseTimeToMinutes = (t: string | null | undefined) => {
                        if (!t || t === '--:--') return 0;
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + m;
                      };
                      const parseIntervalToMinutes = (interval: string | null | undefined) => {
                        if (!interval) return 0;
                        const match = interval.match(/(\d+):(\d+)/);
                        if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
                        return 0;
                      };
                      const formatMins = (mins: number) => {
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return `${h}:${m.toString().padStart(2, '0')}`;
                      };
                      const formatTime = (t: string | null | undefined) => {
                        if (!t) return '--:--';
                        const parts = t.split(':');
                        return `${parts[0]}:${parts[1]}`;
                      };
                      
                      // Use day tracking times if available, fallback to erste/letzte
                      const dayTracking = dayTrackingData[glKey];
                      const startTime = dayTracking?.day_start_time || gl.ersteAktion;
                      const endTime = dayTracking?.day_end_time || gl.letzteAktion;
                      
                      // Arbeitstag = end time - start time
                      const arbeitstag = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
                      
                      // Calculate Unterbrechung
                      const unterbrechungMinutes = zusatzEntries
                        .filter(z => z.gebietsleiter_id === gl.glId && z.entry_date === dayGroup.date && z.is_work_time_deduction)
                        .reduce((sum, z) => sum + parseIntervalToMinutes(z.zeit_diff), 0);
                      
                      // Reine Arbeitszeit = Arbeitstag - Unterbrechung
                      const reineArbeitszeitMinutes = Math.max(0, arbeitstag - unterbrechungMinutes);
                      
                      return (
                        <>
                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Arbeitstag</span>
                            <span className={styles.statValue}>
                              {formatTime(startTime)} - {formatTime(endTime)}
                            </span>
                          </div>

                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Reine Arbeitszeit</span>
                            <span className={styles.statValue}>{formatMins(reineArbeitszeitMinutes)}</span>
                          </div>

                          {unterbrechungMinutes > 0 && (
                            <div className={styles.stat} style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)', border: '1px solid rgba(220, 38, 38, 0.15)' }}>
                              <span className={styles.statLabel} style={{ color: '#DC2626' }}>Unterbrechung</span>
                              <span className={styles.statValue} style={{ color: '#DC2626' }}>{formatMins(unterbrechungMinutes)}</span>
                            </div>
                          )}

                          <div className={styles.stat} style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
                            <span className={styles.statLabel} style={{ color: '#8B5CF6' }}>Märkte besucht</span>
                            <span className={styles.statValue} style={{ color: '#8B5CF6' }}>{gl.maerkteBesucht}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </button>

                {isExpanded && (
                  <div className={styles.glDetails}>
                    {loadingDetails.has(glKey) ? (
                      <div className={styles.detailsLoading}>
                        <div className={styles.spinner} />
                        <span>Laden...</span>
                      </div>
                    ) : (
                      <>
                        <div className={styles.timelineColumn}>
                          {(() => {
                            // Combine market entries and zusatz entries into a unified timeline
                            const marketEntries = detailedEntries[glKey] || [];
                            const glZusatzEntries = zusatzEntries.filter(z => 
                              z.entry_date === dayGroup.date && z.gebietsleiter_id === gl.glId
                            );
                            
                            // Helper to calculate time difference between two time strings
                            const calcGapMinutes = (endTime: string | null, startTime: string | null): number => {
                              if (!endTime || !startTime) return 0;
                              const [endH, endM] = endTime.split(':').map(Number);
                              const [startH, startM] = startTime.split(':').map(Number);
                              let endMins = endH * 60 + endM;
                              let startMins = startH * 60 + startM;
                              if (startMins < endMins) startMins += 24 * 60; // overnight
                              return Math.max(0, startMins - endMins);
                            };
                            
                            const formatGap = (minutes: number): string => {
                              if (minutes <= 0) return '0:00';
                              const h = Math.floor(minutes / 60);
                              const m = minutes % 60;
                              return `${h}:${m.toString().padStart(2, '0')}`;
                            };
                            
                            // Create timeline items with start/end times
                            type TimelineItem = 
                              | { type: 'market'; entry: ZeiterfassungEntry; startTime: string; endTime: string }
                              | { type: 'zusatz'; entry: ZusatzZeiterfassungEntry; startTime: string; endTime: string };
                            
                            const timelineItems: TimelineItem[] = [
                              ...marketEntries.map(entry => ({
                                type: 'market' as const,
                                entry,
                                startTime: entry.besuchszeit_von || '00:00',
                                endTime: entry.besuchszeit_bis || '00:00'
                              })),
                              ...glZusatzEntries.map(entry => ({
                                type: 'zusatz' as const,
                                entry,
                                startTime: entry.zeit_von || '00:00',
                                endTime: entry.zeit_bis || '00:00'
                              }))
                            ];
                            
                            // Sort by start time
                            timelineItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
                            
                            // Get day tracking data for Anfahrt/Heimfahrt
                            const dayTracking = dayTrackingData[glKey];
                            
                            const renderedItems: React.ReactNode[] = [];
                            
                            // Add Anfahrt if day has started and not skipped
                            if (dayTracking?.day_start_time && !dayTracking.skipped_first_fahrzeit && timelineItems.length > 0) {
                              const firstItem = timelineItems[0];
                              const anfahrtMinutes = calcGapMinutes(dayTracking.day_start_time, firstItem.startTime);
                              if (anfahrtMinutes > 0) {
                                renderedItems.push(
                                  <div key="anfahrt" className={styles.fahrzeitLine}>
                                    <div className={styles.fahrzeitInfo}>
                                      <Car size={16} weight="fill" />
                                      <span className={styles.fahrzeitLabel}>Anfahrt</span>
                                      <div className={styles.fahrzeitTimeRight}>
                                        <span className={styles.fahrzeitTime}>
                                          {dayTracking.day_start_time} - {firstItem.startTime}
                                        </span>
                                        <span className={styles.duration}>
                                          {formatGap(anfahrtMinutes)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            }
                            
                            timelineItems.forEach((item, idx) => {
                              // Calculate Fahrzeit as gap from previous item's end to this item's start
                              const prevItem = idx > 0 ? timelineItems[idx - 1] : null;
                              const gapMinutes = prevItem ? calcGapMinutes(prevItem.endTime, item.startTime) : 0;
                              const showFahrzeit = gapMinutes > 0 && item.type === 'market';
                              
                              if (item.type === 'market') {
                                const entry = item.entry;
                                renderedItems.push(
                                  <React.Fragment key={entry.id}>
                                    {/* Fahrzeit Line - calculated from gap between previous action and this one */}
                                    {showFahrzeit ? (
                                      <div className={styles.fahrzeitLine}>
                                        <div className={styles.fahrzeitInfo}>
                                          <Car size={16} weight="fill" />
                                          <span className={styles.fahrzeitLabel}>Fahrzeit</span>
                                          <div className={styles.fahrzeitTimeRight}>
                                            <span className={styles.fahrzeitTime}>
                                              {prevItem?.endTime} - {item.startTime}
                                            </span>
                                            <span className={styles.duration}>
                                              {formatGap(gapMinutes)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}

                                    {/* Market Card */}
                                    <div 
                                      className={styles.marketCard}
                                      style={{ 
                                        background: `linear-gradient(135deg, ${getVisitDurationColor(entry.besuchszeit_diff, 0.07)}, ${getVisitDurationColor(entry.besuchszeit_diff, 0.03)})`,
                                        borderColor: getVisitDurationColor(entry.besuchszeit_diff, 0.2)
                                      }}
                                    >
                                      <div className={styles.marketInfo}>
                                        <Storefront size={16} weight="fill" style={{ color: '#64748B', flexShrink: 0 }} />
                                        <span style={getChainBadgeStyle(entry.market.chain)}>{entry.market.chain}</span>
                                        <span className={styles.marketName}>{entry.market.name}</span>
                                        <span className={styles.marketAddress}>
                                          {entry.market.address || ''}{entry.market.postal_code ? `, ${entry.market.postal_code}` : ''}{entry.market.city ? ` ${entry.market.city}` : ''}
                                        </span>
                                        <div className={styles.marketTimeRight}>
                                          <span className={styles.besuchszeit}>
                                            {entry.besuchszeit_von || '--:--'} - {entry.besuchszeit_bis || '--:--'}
                                          </span>
                                          <span 
                                            className={styles.duration}
                                            style={{ 
                                              backgroundColor: getVisitDurationColor(entry.besuchszeit_diff, 0.12),
                                              color: getVisitDurationColor(entry.besuchszeit_diff)
                                            }}
                                          >
                                            {formatInterval(entry.besuchszeit_diff)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              } else {
                                const zusatz = item.entry;
                                renderedItems.push(
                                  <div 
                                    key={zusatz.id} 
                                    className={styles.fahrzeitLine}
                                  >
                                    <div className={styles.fahrzeitInfo}>
                                      <Pause size={16} weight="fill" />
                                      <span className={styles.fahrzeitLabel}>
                                        {zusatz.reason_label}
                                        {zusatz.is_work_time_deduction && ' (Abzug)'}
                                        {zusatz.kommentar && <span style={{ color: '#64748B', fontWeight: 400, marginLeft: '8px' }}>{zusatz.kommentar}</span>}
                                      </span>
                                      <div className={styles.fahrzeitTimeRight}>
                                        <span className={styles.fahrzeitTime}>
                                          {zusatz.zeit_von} - {zusatz.zeit_bis}
                                        </span>
                                        <span className={styles.duration}>
                                          {formatInterval(zusatz.zeit_diff)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            });
                            
                            // Add Heimfahrt if day has ended
                            if (dayTracking?.day_end_time && timelineItems.length > 0) {
                              const lastItem = timelineItems[timelineItems.length - 1];
                              const heimfahrtMinutes = calcGapMinutes(lastItem.endTime, dayTracking.day_end_time);
                              if (heimfahrtMinutes > 0) {
                                renderedItems.push(
                                  <div key="heimfahrt" className={styles.fahrzeitLine}>
                                    <div className={styles.fahrzeitInfo}>
                                      <Car size={16} weight="fill" />
                                      <span className={styles.fahrzeitLabel}>Heimfahrt</span>
                                      <div className={styles.fahrzeitTimeRight}>
                                        <span className={styles.fahrzeitTime}>
                                          {lastItem.endTime} - {dayTracking.day_end_time}
                                        </span>
                                        <span className={styles.duration}>
                                          {formatGap(heimfahrtMinutes)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            }
                            
                            return renderedItems;
                          })()}
                        </div>

                        <div className={styles.statsColumn}>
                          {(() => {
                            // Aggregate all submissions across all markets for this GL on this day
                            const allSubs = detailedEntries[glKey] || [];
                            const totalVorbesteller = allSubs.reduce((sum, e) => sum + (e.submissions?.vorbesteller.count || 0), 0);
                            const totalVorbestellerValue = allSubs.reduce((sum, e) => sum + (e.submissions?.vorbesteller.totalValue || 0), 0);
                            const totalVorverkauf = allSubs.reduce((sum, e) => sum + (e.submissions?.vorverkauf.count || 0), 0);
                            const totalProduktausch = allSubs.reduce((sum, e) => sum + (e.submissions?.produkttausch.count || 0), 0);

                            return (
                              <>
                                {totalVorbesteller > 0 && (
                                  <div className={styles.statCard}>
                                    <div className={styles.statCardIcon} style={{ color: '#3B82F6' }}>
                                      <CalendarCheck size={20} weight="fill" />
                                    </div>
                                    <div className={styles.statCardInfo}>
                                      <span className={styles.statCardTitle}>Vorbesteller</span>
                                      <div className={styles.statCardDetails}>
                                        <span className={styles.statCardCount}>{totalVorbesteller} Submissions</span>
                                        <span className={styles.statCardValue} style={{ color: '#10B981' }}>
                                          €{totalVorbestellerValue.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {totalVorverkauf > 0 && (
                                  <div className={styles.statCard}>
                                    <div className={styles.statCardIcon} style={{ color: '#8B5CF6' }}>
                                      <TrendUp size={20} weight="fill" />
                                    </div>
                                    <div className={styles.statCardInfo}>
                                      <span className={styles.statCardTitle}>Vorverkauf</span>
                                      <div className={styles.statCardDetails}>
                                        <span className={styles.statCardCount}>{totalVorverkauf} Submissions</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {totalProduktausch > 0 && (
                                  <div className={styles.statCard}>
                                    <div className={styles.statCardIcon} style={{ color: '#F97316' }}>
                                      <Receipt size={20} weight="fill" />
                                    </div>
                                    <div className={styles.statCardInfo}>
                                      <span className={styles.statCardTitle}>Produkttausch</span>
                                      <div className={styles.statCardDetails}>
                                        <span className={styles.statCardCount}>{totalProduktausch} Submissions</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {totalVorbesteller === 0 && totalVorverkauf === 0 && totalProduktausch === 0 && (
                                  <div className={styles.noSubmissions}>
                                    Keine Submissions an diesem Tag
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
