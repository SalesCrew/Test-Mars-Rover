import * as XLSX from 'xlsx';
import type { AdminMarket } from '../types/market-types';

export interface FragebogenMarketImportMapping {
  interneIdColumn: string;
  foodPsStoreFormatColumn: string;
  foodPsStoreFormatValue: string;
  skipHeaderRow: boolean;
}

export interface FragebogenMarketImportResult {
  matchedMarketIds: string[];
  matchedInternalIds: string[];
  unmatchedInternalIds: string[];
  excludedByFormat: number;
  totalDataRows: number;
  matchedRows: MatchedMarketRow[];
  unmatchedRows: UnmatchedMarketRow[];
  reasonSummary: Record<FragebogenImportUnmatchedReason, number>;
}

export type FragebogenImportUnmatchedReason =
  | 'empty_internal_id'
  | 'excluded_by_store_format'
  | 'internal_id_not_found'
  | 'duplicate_internal_id_in_file'
  | 'already_matched_market_duplicate';

export interface MatchedMarketRow {
  rowIndex: number;
  rawInternalId: string;
  normalizedInternalId: string;
  marketId: string;
  marketName: string;
}

export interface UnmatchedMarketRow {
  rowIndex: number;
  rawInternalId: string;
  normalizedInternalId: string;
  reason: FragebogenImportUnmatchedReason;
  details?: string;
}

const columnLetterToIndex = (letter: string): number => {
  const upper = letter.toUpperCase().trim();
  if (!upper) return -1;
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
};

export const readFragebogenMarketExcelPreview = async (
  file: File,
  maxRows = 6,
): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const preview = raw.slice(0, maxRows).map(row =>
          row.map((cell: any) => (cell == null ? '' : String(cell)))
        );
        resolve(preview);
      } catch (err) {
        reject(new Error(`Fehler beim Lesen der Vorschau: ${err}`));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsBinaryString(file);
  });
};

export const parseFragebogenMarketMatches = async (
  file: File,
  mapping: FragebogenMarketImportMapping,
  availableMarkets: AdminMarket[],
): Promise<FragebogenMarketImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        const idIdx = columnLetterToIndex(mapping.interneIdColumn);
        const formatIdx = columnLetterToIndex(mapping.foodPsStoreFormatColumn);
        const matchValue = mapping.foodPsStoreFormatValue.trim().toLowerCase();

        // ── Pre-parse validation ────────────────────────────────────────────
        if (idIdx < 0) {
          throw new Error(
            `Ungültige Spalte für "Interne ID": "${mapping.interneIdColumn}". ` +
            'Bitte einen gültigen Spaltenbuchstaben eingeben (z.B. A, B, C…).'
          );
        }
        if (formatIdx < 0) {
          throw new Error(
            `Ungültige Spalte für "Food PS Store Format": "${mapping.foodPsStoreFormatColumn}". ` +
            'Bitte einen gültigen Spaltenbuchstaben eingeben.'
          );
        }
        if (!matchValue) {
          throw new Error('Bitte einen Wert für "Food PS Store Format" eingeben.');
        }
        // ───────────────────────────────────────────────────────────────────

        const startRow = mapping.skipHeaderRow ? 1 : 0;

        // Build lookup: normalised internalId → market UUID
        const marketByInternalId = new Map<string, string>();
        for (const market of availableMarkets) {
          if (market.internalId) {
            marketByInternalId.set(String(market.internalId).trim().toLowerCase(), market.id);
          }
        }

        let totalDataRows = 0;
        let excludedByFormat = 0;
        const matchedMarketIds: string[] = [];
        const matchedInternalIds: string[] = [];
        const unmatchedInternalIds: string[] = [];
        const matchedRows: MatchedMarketRow[] = [];
        const unmatchedRows: UnmatchedMarketRow[] = [];
        const seenMarketIds = new Set<string>();
        const seenFileInternalIds = new Set<string>();
        const unmatchedById = new Set<string>();
        const reasonSummary: Record<FragebogenImportUnmatchedReason, number> = {
          empty_internal_id: 0,
          excluded_by_store_format: 0,
          internal_id_not_found: 0,
          duplicate_internal_id_in_file: 0,
          already_matched_market_duplicate: 0,
        };

        for (let i = startRow; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          totalDataRows++;

          const rawId = idIdx >= 0 && row[idIdx] != null ? String(row[idIdx]).trim() : '';
          const rawFormat = formatIdx >= 0 && row[formatIdx] != null
            ? String(row[formatIdx]).trim().toLowerCase()
            : '';

          if (!rawId) {
            reasonSummary.empty_internal_id++;
            unmatchedRows.push({
              rowIndex: i + 1,
              rawInternalId: '',
              normalizedInternalId: '',
              reason: 'empty_internal_id',
              details: 'Interne ID ist leer'
            });
            continue;
          }

          if (rawFormat !== matchValue) {
            excludedByFormat++;
            reasonSummary.excluded_by_store_format++;
            unmatchedRows.push({
              rowIndex: i + 1,
              rawInternalId: rawId,
              normalizedInternalId: rawId.toLowerCase(),
              reason: 'excluded_by_store_format',
              details: `Food PS Store Format "${rawFormat || '(leer)'}" passt nicht zu "${mapping.foodPsStoreFormatValue}"`
            });
            continue;
          }

          const normalizedId = rawId.toLowerCase();
          if (seenFileInternalIds.has(normalizedId)) {
            reasonSummary.duplicate_internal_id_in_file++;
            unmatchedRows.push({
              rowIndex: i + 1,
              rawInternalId: rawId,
              normalizedInternalId: normalizedId,
              reason: 'duplicate_internal_id_in_file',
              details: 'Interne ID kommt mehrfach in der Datei vor'
            });
            if (!unmatchedById.has(normalizedId)) {
              unmatchedById.add(normalizedId);
              unmatchedInternalIds.push(rawId);
            }
            continue;
          }
          seenFileInternalIds.add(normalizedId);

          const marketId = marketByInternalId.get(normalizedId);

          if (!marketId) {
            reasonSummary.internal_id_not_found++;
            unmatchedRows.push({
              rowIndex: i + 1,
              rawInternalId: rawId,
              normalizedInternalId: normalizedId,
              reason: 'internal_id_not_found',
              details: 'Interne ID wurde in der Marktdatenbank nicht gefunden'
            });
            if (!unmatchedById.has(normalizedId)) {
              unmatchedById.add(normalizedId);
              unmatchedInternalIds.push(rawId);
            }
            continue;
          }

          if (seenMarketIds.has(marketId)) {
            reasonSummary.already_matched_market_duplicate++;
            unmatchedRows.push({
              rowIndex: i + 1,
              rawInternalId: rawId,
              normalizedInternalId: normalizedId,
              reason: 'already_matched_market_duplicate',
              details: 'Markt ist bereits durch eine andere Datei-Zeile zugeordnet'
            });
            if (!unmatchedById.has(normalizedId)) {
              unmatchedById.add(normalizedId);
              unmatchedInternalIds.push(rawId);
            }
            continue;
          }

          const matchedMarket = availableMarkets.find(m => m.id === marketId);
          if (marketId) {
            matchedMarketIds.push(marketId);
            matchedInternalIds.push(rawId);
            seenMarketIds.add(marketId);
            matchedRows.push({
              rowIndex: i + 1,
              rawInternalId: rawId,
              normalizedInternalId: normalizedId,
              marketId,
              marketName: matchedMarket?.name || 'Unbekannter Markt'
            });
          }
        }

        resolve({
          matchedMarketIds,
          matchedInternalIds,
          unmatchedInternalIds,
          excludedByFormat,
          totalDataRows,
          matchedRows,
          unmatchedRows,
          reasonSummary,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(`Fehler beim Verarbeiten der Datei: ${err}`));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsBinaryString(file);
  });
};
