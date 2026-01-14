import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CalendarBlank, TrendUp, User, Package, CheckCircle, Clock } from '@phosphor-icons/react';
import { API_BASE_URL } from '../../config/database';
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
  itemType: 'display' | 'kartonware' | 'palette' | 'schuette';
  itemName: string;
  quantity: number;
  value: number;
  timestamp: string;
  photoUrl?: string;
  parentId?: string;
  products?: ProductDetail[];
}

export const WaveProgressDetailModal: React.FC<WaveProgressDetailModalProps> = ({ welle, onClose }) => {
  const [progressData, setProgressData] = useState<GLProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedGLs, setCollapsedGLs] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case 'display': return 'Display';
      case 'kartonware': return 'Kartonware';
      case 'palette': return 'Palette';
      case 'schuette': return 'Schütte';
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

  // Format timestamp to Vienna time
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('de-AT', {
      timeZone: 'Europe/Vienna',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
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
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} weight="bold" />
          </button>
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
          ) : (
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
                    {progresses.map((progress, idx) => (
                      <div key={idx} className={styles.progressEntryWrapper}>
                        <div 
                          className={`${styles.progressEntry} ${(progress.itemType === 'palette' || progress.itemType === 'schuette') ? styles.progressEntryExpandable : ''}`}
                          onClick={() => {
                            if (progress.products && progress.products.length > 0) {
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
                                <span className={`${styles.itemType} ${progress.itemType === 'palette' ? styles.itemTypePalette : progress.itemType === 'schuette' ? styles.itemTypeSchuette : ''}`}>
                                  {getItemTypeLabel(progress.itemType)}
                                </span>
                                {progress.products && progress.products.length > 0 && (
                                  <span className={styles.expandIndicator}>
                                    {expandedItems.has(progress.id) ? '▼' : '▶'} {progress.products.length} Produkte
                                  </span>
                                )}
                              </div>
                              <div className={styles.entryMarket}>
                                <span className={styles.marketChain}>{progress.marketChain}</span>
                                <span className={styles.marketName}>{progress.marketName}</span>
                              </div>
                            </div>
                          </div>

                          <div className={styles.entryRight}>
                            <div className={styles.entryQuantity}>
                              <span className={styles.quantityValue}>{progress.quantity}x</span>
                            </div>
                            {progress.value > 0 && (
                              <div className={styles.entryValue}>
                                €{progress.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                            <div className={styles.entryTimestamp}>
                              <Clock size={14} weight="regular" />
                              <span>{formatTimestamp(progress.timestamp)}</span>
                            </div>
                          </div>

                          {progress.photoUrl && (
                            <div className={styles.entryPhoto}>
                              <img src={progress.photoUrl} alt="Beweis" />
                            </div>
                          )}
                        </div>

                        {/* Expandable Products Section */}
                        {progress.products && progress.products.length > 0 && expandedItems.has(progress.id) && (
                          <div className={styles.productsSection}>
                            {progress.products.map((product, pIdx) => (
                              <div key={pIdx} className={styles.productRow}>
                                <span className={styles.productName}>{product.name}</span>
                                <div className={styles.productDetails}>
                                  <span className={styles.productQuantity}>{product.quantity}x</span>
                                  <span className={styles.productValue}>
                                    €{product.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
