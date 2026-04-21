import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Check, WarningCircle, Upload, FileText } from '@phosphor-icons/react';
import {
  readFragebogenMarketExcelPreview,
  parseFragebogenMarketMatches,
  type FragebogenImportUnmatchedReason,
  type UnmatchedMarketRow,
  type FragebogenMarketImportMapping,
  type FragebogenMarketImportResult,
} from '../../utils/fragebogenMarketImport';
import type { AdminMarket } from '../../types/market-types';
import styles from './FragebogenMarketImportMapperModal.module.css';

interface FragebogenMarketImportMapperModalProps {
  availableMarkets: AdminMarket[];
  onConfirm: (result: FragebogenMarketImportResult) => void;
  onCancel: () => void;
}

const colLetterLabel = (idx: number): string => {
  let label = '';
  let n = idx + 1;
  while (n > 0) {
    n--;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
};

export const FragebogenMarketImportMapperModal: React.FC<FragebogenMarketImportMapperModalProps> = ({
  availableMarkets,
  onConfirm,
  onCancel,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mapping, setMapping] = useState<FragebogenMarketImportMapping>({
    interneIdColumn: '',
    foodPsStoreFormatColumn: '',
    foodPsStoreFormatValue: '',
    skipHeaderRow: true,
  });
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<FragebogenMarketImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [manualMatchTarget, setManualMatchTarget] = useState<UnmatchedMarketRow | null>(null);
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxCols = preview.reduce((max, row) => Math.max(max, row.length), 0);

  useEffect(() => {
    if (!file) return;
    setPreview([]);
    setResult(null);
    setParseError(null);
    readFragebogenMarketExcelPreview(file, 6).then(setPreview).catch(() => setPreview([]));
  }, [file]);

  const isValid =
    mapping.interneIdColumn.trim() !== '' &&
    mapping.foodPsStoreFormatColumn.trim() !== '' &&
    mapping.foodPsStoreFormatValue.trim() !== '';

  const reasonLabels: Record<FragebogenImportUnmatchedReason, string> = {
    empty_internal_id: 'Interne ID fehlt',
    excluded_by_store_format: 'Store-Format gefiltert',
    internal_id_not_found: 'Interne ID nicht gefunden',
    duplicate_internal_id_in_file: 'Interne ID doppelt in Datei',
    already_matched_market_duplicate: 'Markt bereits zugeordnet'
  };

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setParseError(null);
    setManualMatchTarget(null);
    setManualSearchTerm('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleApply = async () => {
    if (!file || !isValid) return;
    setIsParsing(true);
    setParseError(null);
    setResult(null);
    try {
      const res = await parseFragebogenMarketMatches(file, mapping, availableMarkets);
      setResult(res);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Fehler beim Verarbeiten');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    onConfirm({
      ...result,
      matchedMarketIds: Array.from(new Set(result.matchedMarketIds)),
    });
  };

  const setColLetter = (key: 'interneIdColumn' | 'foodPsStoreFormatColumn', raw: string) => {
    const val = raw.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
    setMapping(prev => ({ ...prev, [key]: val }));
    setResult(null);
  };

  const resetFile = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setParseError(null);
    setManualMatchTarget(null);
    setManualSearchTerm('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const unmatchedCandidateMarkets = React.useMemo(() => {
    if (!result) return [];
    const matchedIds = new Set(result.matchedMarketIds);
    return availableMarkets.filter(market => !matchedIds.has(market.id));
  }, [availableMarkets, result]);

  const searchableCandidates = React.useMemo(() => {
    return unmatchedCandidateMarkets.map((market) => {
      const searchableText = [
        market.id,
        market.internalId,
        market.name,
        market.address,
        market.city,
        market.postalCode,
        market.chain,
        market.gebietsleiterName,
        market.gebietsleiterEmail,
        market.banner,
        market.channel,
        market.subgroup,
        market.branch,
        market.marketEmail,
        market.marketTel,
        market.marsFil,
        market.email,
        market.phone,
      ]
        .filter(Boolean)
        .map(value => String(value).toLowerCase())
        .join(' ');

      return { market, searchableText };
    });
  }, [unmatchedCandidateMarkets]);

  const filteredManualCandidates = React.useMemo(() => {
    const tokens = manualSearchTerm
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return searchableCandidates.map(item => item.market);
    }

    return searchableCandidates
      .filter(item => tokens.every(token => item.searchableText.includes(token)))
      .map(item => item.market);
  }, [manualSearchTerm, searchableCandidates]);

  const applyManualMatch = (target: UnmatchedMarketRow, market: AdminMarket) => {
    setResult(prev => {
      if (!prev) return prev;

      const removeIndex = prev.unmatchedRows.findIndex(row =>
        row.rowIndex === target.rowIndex &&
        row.normalizedInternalId === target.normalizedInternalId &&
        row.reason === target.reason
      );
      if (removeIndex === -1) return prev;

      const nextUnmatchedRows = [...prev.unmatchedRows];
      nextUnmatchedRows.splice(removeIndex, 1);

      const nextMatchedRows = [
        ...prev.matchedRows,
        {
          rowIndex: target.rowIndex,
          rawInternalId: target.rawInternalId,
          normalizedInternalId: target.normalizedInternalId,
          marketId: market.id,
          marketName: market.name
        }
      ];

      const nextMatchedMarketIds = Array.from(new Set([...prev.matchedMarketIds, market.id]));
      const nextMatchedInternalIds = target.rawInternalId
        ? Array.from(new Set([...prev.matchedInternalIds, target.rawInternalId]))
        : prev.matchedInternalIds;

      const nextReasonSummary = {
        ...prev.reasonSummary,
        [target.reason]: Math.max(0, (prev.reasonSummary[target.reason] || 0) - 1)
      };

      const nextExcludedByFormat = target.reason === 'excluded_by_store_format'
        ? Math.max(0, prev.excludedByFormat - 1)
        : prev.excludedByFormat;

      const nextUnmatchedInternalIds = Array.from(
        new Map(
          nextUnmatchedRows
            .filter(row => row.rawInternalId.trim() !== '')
            .map(row => [row.normalizedInternalId, row.rawInternalId])
        ).values()
      );

      return {
        ...prev,
        matchedRows: nextMatchedRows,
        matchedMarketIds: nextMatchedMarketIds,
        matchedInternalIds: nextMatchedInternalIds,
        unmatchedRows: nextUnmatchedRows,
        unmatchedInternalIds: nextUnmatchedInternalIds,
        reasonSummary: nextReasonSummary,
        excludedByFormat: nextExcludedByFormat
      };
    });

    setManualSearchTerm('');
    setManualMatchTarget(null);
  };

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.badge}>Märkte</div>
            <h2 className={styles.title}>Märkte aus Excel importieren</h2>
          </div>
          <button className={styles.closeBtn} onClick={onCancel}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* ── No file: dropzone ── */}
          {!file && (
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={40} weight="regular" className={styles.dropzoneIcon} />
              <p className={styles.dropzoneText}>Datei hierher ziehen</p>
              <p className={styles.dropzoneHint}>oder klicken zum Auswählen</p>
              <p className={styles.dropzoneFormats}>.xlsx · .xls · .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {/* ── File loaded ── */}
          {file && (
            <>
              {/* File pill */}
              <div className={styles.fileRow}>
                <FileText size={20} weight="fill" className={styles.fileIcon} />
                <span className={styles.fileName}>{file.name}</span>
                <button className={styles.fileRemove} onClick={resetFile} title="Datei entfernen">
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Excel Vorschau</div>
                  <div className={styles.previewWrapper}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          {Array.from({ length: maxCols }, (_, i) => (
                            <th key={i}>{colLetterLabel(i)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, ri) => (
                          <tr key={ri}>
                            <td className={styles.rowNum}>{ri + 1}</td>
                            {Array.from({ length: maxCols }, (_, ci) => (
                              <td key={ci}>{row[ci] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={styles.previewHint}>
                    Trage den Spaltenbuchstaben ein (z.B. A, B, C…). Alle Felder sind Pflichtfelder.
                  </p>
                </div>
              )}

              {/* Column + value mapping */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Spaltenzuordnung &amp; Filter</div>
                <div className={styles.mappingGrid}>
                  {/* Interne ID column */}
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>
                      Interne ID Spalte <span className={styles.required}>*</span>
                    </span>
                    <input
                      className={styles.fieldInput}
                      value={mapping.interneIdColumn}
                      onChange={e => setColLetter('interneIdColumn', e.target.value)}
                      placeholder="A"
                      maxLength={2}
                    />
                  </div>

                  {/* Food PS Store Format column */}
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>
                      Food PS Store Format Spalte <span className={styles.required}>*</span>
                    </span>
                    <input
                      className={styles.fieldInput}
                      value={mapping.foodPsStoreFormatColumn}
                      onChange={e => setColLetter('foodPsStoreFormatColumn', e.target.value)}
                      placeholder="B"
                      maxLength={2}
                    />
                  </div>

                  {/* Food PS Store Format value — full-width row */}
                  <div className={styles.fieldRowFull}>
                    <span className={styles.fieldLabel}>
                      Food PS Store Format Wert <span className={styles.required}>*</span>
                    </span>
                    <input
                      className={`${styles.fieldInput} ${styles.fieldInputWide}`}
                      value={mapping.foodPsStoreFormatValue}
                      onChange={e => {
                        setMapping(prev => ({ ...prev, foodPsStoreFormatValue: e.target.value }));
                        setResult(null);
                      }}
                      placeholder="z.B. Supermarket"
                    />
                  </div>
                </div>

                {/* Skip header row */}
                <label className={styles.skipRow}>
                  <input
                    type="checkbox"
                    checked={mapping.skipHeaderRow}
                    onChange={e => {
                      setMapping(prev => ({ ...prev, skipHeaderRow: e.target.checked }));
                      setResult(null);
                    }}
                  />
                  <span>Erste Zeile ist Header (überspringen)</span>
                </label>
              </div>

              {/* Error */}
              {parseError && (
                <div className={styles.errorBanner}>
                  <WarningCircle size={18} weight="fill" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Result summary */}
              {result && (
                <div className={styles.resultSection}>
                  <div className={styles.resultRow}>
                    <span className={styles.resultMatchedCount}>{result.matchedMarketIds.length}</span>
                    <span className={styles.resultLabel}>
                      {result.matchedMarketIds.length === 1 ? 'Markt gefunden' : 'Märkte gefunden'}
                    </span>
                  </div>

                  <div className={styles.reasonPills}>
                    {(Object.keys(result.reasonSummary) as FragebogenImportUnmatchedReason[]).map((reason) => {
                      const count = result.reasonSummary[reason] || 0;
                      if (!count) return null;
                      return (
                        <div key={reason} className={styles.reasonPill}>
                          <span className={styles.reasonPillCount}>{count}</span>
                          <span className={styles.reasonPillLabel}>{reasonLabels[reason]}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.resultListBlock}>
                    <h4 className={styles.resultListTitle}>Gematchte Märkte ({result.matchedRows.length})</h4>
                    {result.matchedRows.length === 0 ? (
                      <div className={styles.resultListEmpty}>Keine gematchten Märkte.</div>
                    ) : (
                      <div className={styles.resultList}>
                        {result.matchedRows.map((row) => (
                          <div key={`${row.rowIndex}-${row.marketId}`} className={styles.resultListItemMatched}>
                            <span className={styles.resultListId}>{row.rawInternalId || '(leer)'}</span>
                            <span className={styles.resultListArrow}>→</span>
                            <span className={styles.resultListMarket}>{row.marketName}</span>
                            <span className={styles.resultListMeta}>Zeile {row.rowIndex}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.resultListBlock}>
                    <h4 className={styles.resultListTitle}>Nicht gematcht / übersprungen ({result.unmatchedRows.length})</h4>
                    {result.unmatchedRows.length === 0 ? (
                      <div className={styles.resultListEmpty}>Alle Zeilen wurden erfolgreich gematcht.</div>
                    ) : (
                      <div className={styles.resultList}>
                        {result.unmatchedRows.map((row) => (
                          <div
                            key={`${row.rowIndex}-${row.reason}-${row.normalizedInternalId || 'empty'}`}
                            className={styles.resultListItemUnmatched}
                          >
                            <div className={styles.resultListUnmatchedInfo}>
                              <span className={styles.resultListId}>{row.rawInternalId || '(leer)'}</span>
                              <span className={styles.resultListReason}>{reasonLabels[row.reason]}</span>
                              <span className={styles.resultListMeta}>Zeile {row.rowIndex}</span>
                              {row.details && <span className={styles.resultListDetails}>{row.details}</span>}
                            </div>
                            <button
                              type="button"
                              className={styles.manualMatchButton}
                              onClick={() => {
                                setManualMatchTarget(row);
                                setManualSearchTerm('');
                              }}
                            >
                              Manuell zuordnen
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Abbrechen
          </button>
          {!result ? (
            <button
              className={styles.applyBtn}
              disabled={!file || !isValid || isParsing}
              onClick={handleApply}
            >
              {isParsing ? (
                <span>Verarbeite…</span>
              ) : (
                <>
                  <Check size={18} weight="bold" />
                  <span>Auswertung starten</span>
                </>
              )}
            </button>
          ) : (
            <div className={styles.confirmGroup}>
              <span className={styles.overwriteNote}>
                Ersetzt die aktuelle Marktauswahl vollständig.
              </span>
              <button
                className={styles.confirmBtn}
                disabled={result.matchedMarketIds.length === 0}
                onClick={handleConfirm}
              >
                <Check size={18} weight="bold" />
                <span>{result.matchedMarketIds.length} {result.matchedMarketIds.length === 1 ? 'Markt' : 'Märkte'} übernehmen</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {manualMatchTarget && result && (
        <div className={styles.manualOverlay} onClick={() => setManualMatchTarget(null)}>
          <div className={styles.manualModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.manualHeader}>
              <h3 className={styles.manualTitle}>Markt manuell zuordnen</h3>
              <button className={styles.closeBtn} onClick={() => setManualMatchTarget(null)}>
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className={styles.manualTargetInfo}>
              <div><strong>ID:</strong> {manualMatchTarget.rawInternalId || '(leer)'}</div>
              <div><strong>Grund:</strong> {reasonLabels[manualMatchTarget.reason]}</div>
              {manualMatchTarget.details && <div>{manualMatchTarget.details}</div>}
            </div>

            <input
              className={styles.manualSearchInput}
              placeholder="Suche über alle Marktdaten..."
              value={manualSearchTerm}
              onChange={(e) => setManualSearchTerm(e.target.value)}
            />

            <div className={styles.manualHint}>
              Es werden nur noch nicht gematchte Märkte angezeigt ({unmatchedCandidateMarkets.length} verfügbar).
            </div>

            <div className={styles.manualList}>
              {filteredManualCandidates.length === 0 ? (
                <div className={styles.resultListEmpty}>Keine Märkte für diese Suche gefunden.</div>
              ) : (
                filteredManualCandidates.map((market) => (
                  <button
                    key={market.id}
                    type="button"
                    className={styles.manualListItem}
                    onClick={() => applyManualMatch(manualMatchTarget, market)}
                  >
                    <span className={styles.manualMarketName}>{market.name}</span>
                    <span className={styles.manualMarketMeta}>
                      {market.internalId} · {market.chain} · {market.postalCode} {market.city} · {market.address}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};
