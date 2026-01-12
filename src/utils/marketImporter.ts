import * as XLSX from 'xlsx';
import type { AdminMarket } from '../types/market-types';

export const parseMarketFile = async (file: File): Promise<AdminMarket[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays (rows with columns)
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        });

        // Process the data
        const markets = processImportData(rawData);
        resolve(markets);
      } catch (error) {
        reject(new Error(`Fehler beim Verarbeiten der Datei: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Fehler beim Lesen der Datei'));
    };

    reader.readAsBinaryString(file);
  });
};

const processImportData = (rawData: any[][]): AdminMarket[] => {
  if (rawData.length < 2) {
    throw new Error('Die Datei enthält keine Daten');
  }

  const markets: AdminMarket[] = [];

  // Skip header row, start from row 1
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    // Skip empty rows
    if (!row || row.length === 0 || !row[0]) {
      continue;
    }

    try {
      const market = parseMarketRow(row, i);
      if (market) {
        markets.push(market);
      }
    } catch (error) {
      console.warn(`Fehler in Zeile ${i + 1}:`, error);
      // Continue processing other rows
    }
  }

  return markets;
};

const parseMarketRow = (row: any[], rowIndex: number): AdminMarket | null => {
  // CORRECTED Excel Column Mapping (0-indexed) - January 2026:
  // A=0: ID
  // B=1: IGNORE
  // C=2: IGNORE
  // D=3: Channel (no UI)
  // E=4: Banner
  // F=5: Handelskette (Chain)
  // G=6: IGNORE
  // H=7: Name (Market Name)
  // I=8: PLZ (Postal Code)
  // J=9: Stadt (City)
  // K=10: Straße (Street)
  // L=11: IGNORE
  // M=12: GL Name
  // N=13: GL Email (for GL ID matching)
  // O=14: Status (Aktiv/Inaktiv)
  // P=15: IGNORE
  // Q=16: Frequenz
  // R=17: IGNORE
  // S=18: IGNORE
  // T=19: IGNORE
  // U=20: Market Tel
  // V=21: Market Email
  // W=22: IGNORE (Maingroup)
  // X=23: IGNORE (Subgroup)

  const id = row[0] ? String(row[0]).trim() : '';                    // A=0: ID
  const channel = row[3] ? String(row[3]).trim() : '';               // D=3: Channel
  const banner = row[4] ? String(row[4]).trim() : '';                // E=4: Banner
  const handelskette = row[5] ? String(row[5]).trim() : '';          // F=5: Handelskette
  const name = row[7] ? String(row[7]).trim() : '';                  // H=7: Name
  const plz = row[8] ? String(row[8]).trim() : '';                   // I=8: PLZ
  const stadt = row[9] ? String(row[9]).trim() : '';                 // J=9: Stadt (City)
  const strasse = row[10] ? String(row[10]).trim() : '';             // K=10: Straße (Street)
  const gebietsleiterName = row[12] ? String(row[12]).trim() : '';   // M=12: GL Name
  const gebietsleiterEmail = row[13] ? String(row[13]).trim() : '';  // N=13: GL Email
  const status = row[14] ? String(row[14]).trim() : '';              // O=14: Status
  const frequenz = row[16] ? parseFloat(String(row[16])) : 12;       // Q=16: Frequenz
  const marketTel = row[20] ? String(row[20]).trim() : '';           // U=20: Market Tel
  const marketEmail = row[21] ? String(row[21]).trim() : '';         // V=21: Market Email

  // Validate required fields
  if (!id || !name) {
    console.warn(`Zeile ${rowIndex + 1}: ID oder Name fehlt`);
    return null;
  }

  // Determine if market is active
  const isActive = status.toLowerCase() === 'aktiv';

  // Create the market object
  const market: AdminMarket = {
    id: generateMarketId(id, rowIndex),
    internalId: id,
    name: name,
    address: strasse || '',
    city: stadt || '',
    postalCode: plz || '',
    chain: normalizeChainName(handelskette),
    frequency: isNaN(frequenz) ? 12 : Math.max(1, Math.round(frequenz)),
    currentVisits: 0,
    isActive: isActive,
    channel: channel || undefined,
    banner: banner || undefined,
    gebietsleiterName: gebietsleiterName || undefined,   // M=12: GL Name
    gebietsleiterEmail: gebietsleiterEmail || undefined, // N=13: GL Email (for ID matching)
    marketTel: marketTel || undefined,                   // U=20: Market Tel (NEW)
    marketEmail: marketEmail || undefined,               // V=21: Market Email (NEW)
  };

  return market;
};

const generateMarketId = (internalId: string, rowIndex: number): string => {
  // Use internal ID if available, otherwise generate one
  return internalId || `IMPORT-${String(rowIndex).padStart(4, '0')}`;
};

const normalizeChainName = (chain: string): string => {
  if (!chain) return 'Sonstige';
  
  const chainLower = chain.toLowerCase().trim();
  
  // Map common variations to standard names
  const chainMap: Record<string, string> = {
    'adeg': 'Adeg',
    'billa+': 'Billa+',
    'billa plus': 'Billa+',
    'billa+ privat': 'BILLA+ Privat',
    'billa privat': 'BILLA Privat',
    'eurospar': 'Eurospar',
    'futterhaus': 'Futterhaus',
    'hagebau': 'Hagebau',
    'interspar': 'Interspar',
    'spar': 'Spar',
    'spar gourmet': 'Spar Gourmet',
    'zoofachhandel': 'Zoofachhandel',
    'hofer': 'Hofer',
    'merkur': 'Merkur',
  };

  return chainMap[chainLower] || chain;
};

export const validateImportFile = (file: File): { valid: boolean; error?: string } => {
  const validExtensions = ['.csv', '.xlsx', '.xls'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Ungültiges Dateiformat. Bitte eine CSV- oder Excel-Datei (.csv, .xlsx, .xls) hochladen.',
    };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Die Datei ist zu groß. Maximum: 10MB',
    };
  }

  return { valid: true };
};

