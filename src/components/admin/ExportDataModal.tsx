import React, { useState, useEffect } from 'react';
import { X, DownloadSimple, CaretRight, CaretDown, DotsSixVertical, CheckCircle } from '@phosphor-icons/react';
import { ClipLoader } from 'react-spinners';
import { exportService, type ExportConfig } from '../../services/exportService';
import { CustomDatePicker } from './CustomDatePicker';
import styles from './ExportDataModal.module.css';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGLs: Array<{ id: string; name: string }>;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  availableGLs
}) => {
  // Dataset selection
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [datasetStats, setDatasetStats] = useState<Record<string, number>>({});

  // Column configuration (per dataset)
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({});
  const [expandedDataset, setExpandedDataset] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<{ datasetId: string; columnId: string } | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Export options
  const [fileName, setFileName] = useState('');
  const [expandPaletteProducts, setExpandPaletteProducts] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedGLs, setSelectedGLs] = useState<string[]>([]);
  const [glSearchTerm, setGlSearchTerm] = useState('');

  // UI states
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datasets = exportService.getDatasets();

  // Load dataset stats
  useEffect(() => {
    if (isOpen) {
      loadStats();
      // Set default filename
      const today = new Date().toISOString().split('T')[0];
      setFileName(`export_${today}.xlsx`);
    }
  }, [isOpen]);

  const loadStats = async () => {
    const stats = await exportService.getDatasetStats();
    setDatasetStats(stats);
  };

  // Toggle dataset selection
  const toggleDataset = (datasetId: string) => {
    if (selectedDatasets.includes(datasetId)) {
      setSelectedDatasets(prev => prev.filter(id => id !== datasetId));
      // Remove column config for this dataset
      setSelectedColumns(prev => {
        const newCols = { ...prev };
        delete newCols[datasetId];
        return newCols;
      });
    } else {
      setSelectedDatasets(prev => [...prev, datasetId]);
      // Initialize with default columns
      const defaultCols = exportService.getDefaultColumns(datasetId);
      setSelectedColumns(prev => ({ ...prev, [datasetId]: defaultCols }));
    }
  };

  // Toggle all datasets
  const toggleAllDatasets = () => {
    const allIds = datasets.map(d => d.id);
    if (selectedDatasets.length === allIds.length) {
      setSelectedDatasets([]);
      setSelectedColumns({});
    } else {
      setSelectedDatasets(allIds);
      const allCols: Record<string, string[]> = {};
      allIds.forEach(id => {
        allCols[id] = exportService.getDefaultColumns(id);
      });
      setSelectedColumns(allCols);
    }
  };

  // Toggle column for a dataset
  const toggleColumn = (datasetId: string, columnId: string) => {
    setSelectedColumns(prev => {
      const current = prev[datasetId] || [];
      const updated = current.includes(columnId)
        ? current.filter(id => id !== columnId)
        : [...current, columnId];
      return { ...prev, [datasetId]: updated };
    });
  };

  // Select all/default columns for a dataset
  const setColumnsPreset = (datasetId: string, preset: 'all' | 'default') => {
    const columns = preset === 'all' 
      ? exportService.getDatasetColumns(datasetId).map(c => c.id)
      : exportService.getDefaultColumns(datasetId);
    setSelectedColumns(prev => ({ ...prev, [datasetId]: columns }));
  };

  // Drag and drop handlers
  const handleDragStart = (datasetId: string, columnId: string) => {
    setDraggedColumn({ datasetId, columnId });
  };

  const handleDragOver = (e: React.DragEvent, datasetId: string, index: number) => {
    e.preventDefault();
    if (draggedColumn?.datasetId === datasetId) {
      setDropIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, datasetId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn.datasetId !== datasetId) return;

    const currentColumns = selectedColumns[datasetId] || [];
    const dragIndex = currentColumns.indexOf(draggedColumn.columnId);
    if (dragIndex === -1) return;

    const newColumns = [...currentColumns];
    newColumns.splice(dragIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn.columnId);

    setSelectedColumns(prev => ({ ...prev, [datasetId]: newColumns }));
    setDraggedColumn(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDropIndex(null);
  };

  // Handle export
  const handleExport = async () => {
    // Validate
    if (selectedDatasets.length === 0) {
      setError('Bitte wähle mindestens einen Datensatz aus');
      return;
    }

    const hasNoColumns = selectedDatasets.some(dsId => {
      return !selectedColumns[dsId] || selectedColumns[dsId].length === 0;
    });

    if (hasNoColumns) {
      setError('Bitte wähle mindestens eine Spalte für jeden Datensatz aus');
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      const config: ExportConfig = {
        datasets: selectedDatasets,
        columns: selectedColumns,
        filters: {
          dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
          glIds: selectedGLs.length > 0 ? selectedGLs : undefined
        },
        options: {
          expandPaletteProducts,
          fileName
        }
      };

      await exportService.exportToExcel(config);
      
      setExportSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state
        setTimeout(() => {
          setExportSuccess(false);
          setSelectedDatasets([]);
          setSelectedColumns({});
          setExpandedDataset(null);
          setDateRange({ start: '', end: '' });
          setSelectedGLs([]);
          setExpandPaletteProducts(false);
        }, 300);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Export fehlgeschlagen');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.iconWrapper}>
              <DownloadSimple size={24} weight="bold" />
            </div>
            <div>
              <h2 className={styles.title}>Daten Exportieren</h2>
              <p className={styles.subtitle}>Wähle Datensätze und Spalten für den Excel-Export</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Step 1: Dataset Selection */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Datensätze auswählen</h3>
            <div className={styles.datasetList}>
              <label className={styles.datasetOption}>
                <input
                  type="checkbox"
                  checked={selectedDatasets.length === datasets.length}
                  onChange={toggleAllDatasets}
                />
                <span className={styles.datasetLabel}>
                  <strong>Alle Datensätze</strong>
                </span>
              </label>
              {datasets.map(dataset => (
                <label key={dataset.id} className={styles.datasetOption}>
                  <input
                    type="checkbox"
                    checked={selectedDatasets.includes(dataset.id)}
                    onChange={() => toggleDataset(dataset.id)}
                  />
                  <span className={styles.datasetLabel}>{dataset.label}</span>
                  {datasetStats[dataset.id] !== undefined && (
                    <span className={styles.datasetCount}>{datasetStats[dataset.id].toLocaleString()} Einträge</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Step 2: Column Configuration */}
          {selectedDatasets.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Spalten konfigurieren</h3>
              <div className={styles.datasetConfigs}>
                {selectedDatasets.map(datasetId => {
                  const dataset = datasets.find(d => d.id === datasetId);
                  if (!dataset) return null;

                  const isExpanded = expandedDataset === datasetId;
                  const selectedCols = selectedColumns[datasetId] || [];

                  return (
                    <div key={datasetId} className={styles.datasetConfig}>
                      <button
                        className={styles.datasetConfigHeader}
                        onClick={() => setExpandedDataset(isExpanded ? null : datasetId)}
                      >
                        {isExpanded ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
                        <span>{dataset.label}</span>
                        <span className={styles.columnCount}>{selectedCols.length} Spalten</span>
                      </button>

                      {isExpanded && (
                        <div className={styles.datasetConfigContent}>
                          {/* Presets */}
                          <div className={styles.columnPresets}>
                            <button
                              className={styles.presetButton}
                              onClick={() => setColumnsPreset(datasetId, 'default')}
                            >
                              Nur wichtige Spalten
                            </button>
                            <button
                              className={styles.presetButton}
                              onClick={() => setColumnsPreset(datasetId, 'all')}
                            >
                              Alle Spalten
                            </button>
                          </div>

                          {/* Column checkboxes */}
                          <div className={styles.columnCheckboxes}>
                            {dataset.columns.map(col => (
                              <label key={col.id} className={styles.columnOption}>
                                <input
                                  type="checkbox"
                                  checked={selectedCols.includes(col.id)}
                                  onChange={() => toggleColumn(datasetId, col.id)}
                                />
                                <span>{col.label}</span>
                              </label>
                            ))}
                          </div>

                          {/* Column order (drag and drop) */}
                          {selectedCols.length > 0 && (
                            <div className={styles.columnOrder}>
                              <h4 className={styles.columnOrderTitle}>Spaltenreihenfolge</h4>
                              <div className={styles.columnChips}>
                                {selectedCols.map((colId, index) => {
                                  const col = dataset.columns.find(c => c.id === colId);
                                  if (!col) return null;

                                  const isDragging = draggedColumn?.datasetId === datasetId && draggedColumn.columnId === colId;
                                  const showDropIndicator = dropIndex === index && draggedColumn?.datasetId === datasetId;

                                  return (
                                    <React.Fragment key={colId}>
                                      {showDropIndicator && <div className={styles.dropIndicator} />}
                                      <div
                                        className={`${styles.columnChip} ${isDragging ? styles.columnChipDragging : ''}`}
                                        draggable
                                        onDragStart={() => handleDragStart(datasetId, colId)}
                                        onDragOver={(e) => handleDragOver(e, datasetId, index)}
                                        onDrop={(e) => handleDrop(e, datasetId, index)}
                                        onDragEnd={handleDragEnd}
                                      >
                                        <DotsSixVertical size={14} weight="bold" className={styles.dragHandle} />
                                        <span className={styles.chipNumber}>{index + 1}</span>
                                        <span className={styles.chipLabel}>{col.label}</span>
                                      </div>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Export Options */}
          {selectedDatasets.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Export Optionen</h3>
              
              {/* Date range filter */}
              {(selectedDatasets.includes('wellen_submissions') || 
                selectedDatasets.includes('vorverkauf_entries') || 
                selectedDatasets.includes('action_history')) && (
                <div className={styles.optionGroup}>
                  <label className={styles.optionLabel}>Zeitraum (optional)</label>
                  <div className={styles.dateRangeInputs}>
                    <CustomDatePicker
                      value={dateRange.start}
                      onChange={(value) => setDateRange(prev => ({ ...prev, start: value }))}
                      placeholder="Startdatum"
                    />
                    <span className={styles.dateRangeDivider}>bis</span>
                    <CustomDatePicker
                      value={dateRange.end}
                      onChange={(value) => setDateRange(prev => ({ ...prev, end: value }))}
                      placeholder="Enddatum"
                    />
                  </div>
                </div>
              )}

              {/* GL filter */}
              {(selectedDatasets.includes('wellen_submissions') || selectedDatasets.includes('markets')) && (
                <div className={styles.optionGroup}>
                  <label className={styles.optionLabel}>Gebietsleiter Filter (optional)</label>
                  <div className={styles.glFilterContainer}>
                    <input
                      type="text"
                      placeholder="Suchen..."
                      value={glSearchTerm}
                      onChange={(e) => setGlSearchTerm(e.target.value)}
                      className={styles.glSearchInput}
                    />
                    <div className={styles.glCheckboxList}>
                      <label className={styles.glCheckboxOption}>
                        <input
                          type="checkbox"
                          checked={selectedGLs.length === availableGLs.length}
                          onChange={() => {
                            if (selectedGLs.length === availableGLs.length) {
                              setSelectedGLs([]);
                            } else {
                              setSelectedGLs(availableGLs.map(gl => gl.id));
                            }
                          }}
                        />
                        <span><strong>Alle GLs</strong></span>
                      </label>
                      {availableGLs
                        .filter(gl => gl.name.toLowerCase().includes(glSearchTerm.toLowerCase()))
                        .map(gl => (
                          <label key={gl.id} className={styles.glCheckboxOption}>
                            <input
                              type="checkbox"
                              checked={selectedGLs.includes(gl.id)}
                              onChange={() => {
                                if (selectedGLs.includes(gl.id)) {
                                  setSelectedGLs(prev => prev.filter(id => id !== gl.id));
                                } else {
                                  setSelectedGLs(prev => [...prev, gl.id]);
                                }
                              }}
                            />
                            <span>{gl.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Palette/Schuette expand option */}
              {selectedDatasets.includes('wellen_submissions') && (
                <div className={styles.optionGroup}>
                  <label className={styles.checkboxOption}>
                    <input
                      type="checkbox"
                      checked={expandPaletteProducts}
                      onChange={(e) => setExpandPaletteProducts(e.target.checked)}
                    />
                    <span>Palette/Schütte Produkte mit Hierarchie anzeigen (eingezogen)</span>
                  </label>
                  <span className={styles.optionHint}>
                    Aus: Produkte in einer Zeile zusammengefasst | An: Palette als Elternzeile + eingezogene Produktzeilen
                  </span>
                </div>
              )}

              {/* File name */}
              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>Dateiname</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className={styles.fileNameInput}
                  placeholder="export.xlsx"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose} disabled={isExporting}>
            Abbrechen
          </button>
          <button
            className={`${styles.exportButton} ${exportSuccess ? styles.exportButtonSuccess : ''}`}
            onClick={handleExport}
            disabled={selectedDatasets.length === 0 || isExporting || exportSuccess}
          >
            {isExporting ? (
              <>
                <ClipLoader size={16} color="#fff" />
                <span>Exportiere...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle size={18} weight="fill" />
                <span>Erfolgreich!</span>
              </>
            ) : (
              <>
                <DownloadSimple size={18} weight="bold" />
                <span>Export starten</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
