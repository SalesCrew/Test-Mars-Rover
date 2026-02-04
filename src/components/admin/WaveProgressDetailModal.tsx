import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, CalendarBlank, TrendUp, User, Package, CheckCircle, Clock, CalendarDots, Users, Plus, Minus, Trash, CaretDown, CaretRight, Check } from '@phosphor-icons/react';
import { API_BASE_URL } from '../../config/database';
import { wellenService } from '../../services/wellenService';
import styles from './WaveProgressDetailModal.module.css';

interface WaveProgressDetailModalProps {
  welle: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    goalType: 'percentage' | 'value';
    goalPercentage?: number | null;
    goalValue?: number | null;
  };
  onClose: () => void;
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
        setProgressData(data);
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
            <CalendarBlank size={28} weight="duotone" />
            <div className={styles.headerInfo}>
              <h2 className={styles.title}>{welle.name}</h2>
              <p className={styles.subtitle}>{welle.startDate} - {welle.endDate}</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {/* View Toggle */}
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
            <button className={styles.closeButton} onClick={onClose}>
              <X size={24} weight="bold" />
            </button>
          </div>
        </div>

        {/* Goal Display */}
        <div className={styles.goalBanner}>
          <TrendUp size={20} weight="bold" />
          <span>
            Ziel: {welle.goalType === 'percentage' 
              ? `${welle.goalPercentage}%` 
              : `€${(welle.goalValue || 0).toLocaleString('de-DE')}`}
          </span>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Lade Fortschritt...</p>
            </div>
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
                  {/* GL Header - Clickable to collapse */}
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

                  {/* Progress Entries - Collapsible */}
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
                  {/* Day Header - Clickable to expand/collapse */}
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

                  {/* Day Entries - Expandable */}
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
        {!isLoading && progressData.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.footerStat}>
              <User size={20} weight="bold" />
              <div className={styles.footerStatInfo}>
                <span className={styles.footerStatLabel}>Teilnehmende GLs</span>
                <span className={styles.footerStatValue}>{Object.keys(progressByGL).length}</span>
              </div>
            </div>
            <div className={styles.footerStat}>
              <CheckCircle size={20} weight="bold" />
              <div className={styles.footerStatInfo}>
                <span className={styles.footerStatLabel}>Einträge</span>
                <span className={styles.footerStatValue}>{progressData.length}</span>
              </div>
            </div>
            <div className={styles.footerStat}>
              <Package size={20} weight="bold" />
              <div className={styles.footerStatInfo}>
                <span className={styles.footerStatLabel}>Gesamtwert</span>
                <span className={styles.footerStatValue}>
                  €{progressData.reduce((sum, p) => sum + p.value, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
