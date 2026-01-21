import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Calendar, CheckCircle, Package, TrendUp, Clock, CheckCircle as CheckCircleFilled, Users, Storefront, Target, CalendarBlank, Trash, Cube } from '@phosphor-icons/react';
import styles from './WelleDetailModal.module.css';
import { wellenService } from '../../services/wellenService';

interface DisplayItem {
  id: string;
  name: string;
  targetNumber?: number;
  currentNumber?: number;
  picture?: string | null;
  itemValue?: number | null;
}

interface KartonwareItem {
  id: string;
  name: string;
  targetNumber?: number;
  currentNumber?: number;
  picture?: string | null;
  itemValue?: number | null;
}

interface KWDay {
  kw: string;
  days: string[];
}

interface PaletteProduct {
  id: string;
  name: string;
  valuePerVE: number;
  ve: number;
  ean?: string | null;
}

interface PaletteItem {
  id: string;
  name: string;
  size?: string | null;
  picture?: string | null;
  products: PaletteProduct[];
}

interface SchutteItem {
  id: string;
  name: string;
  size?: string | null;
  picture?: string | null;
  products: PaletteProduct[];
}

interface EinzelproduktItem {
  id: string;
  name: string;
  targetNumber?: number;
  currentNumber?: number;
  picture?: string | null;
  itemValue?: number | null;
}

interface Welle {
  id: string;
  name: string;
  image: string | null;
  startDate: string;
  endDate: string;
  types: ('display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt')[];
  status: 'upcoming' | 'active' | 'past';
  displayCount: number;
  kartonwareCount: number;
  paletteCount?: number;
  schutteCount?: number;
  einzelproduktCount?: number;
  kwDays?: KWDay[];
  displays?: DisplayItem[];
  kartonwareItems?: KartonwareItem[];
  paletteItems?: PaletteItem[];
  schutteItems?: SchutteItem[];
  einzelproduktItems?: EinzelproduktItem[];
  totalGLs?: number;
  participatingGLs?: number;
  goalType?: 'percentage' | 'value';
  goalPercentage?: number | null;
  goalValue?: number | null;
  assignedMarketIds?: string[];
}

interface WelleDetailModalProps {
  welle: Welle;
  onClose: () => void;
  onDelete?: () => void;
}

export const WelleDetailModal: React.FC<WelleDetailModalProps> = ({ welle, onClose, onDelete }) => {
  const [deleteClickCount, setDeleteClickCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const handleDeleteClick = async () => {
    if (isDeleting) return;

    if (deleteClickCount === 0) {
      setDeleteClickCount(1);
      deleteTimerRef.current = setTimeout(() => {
        setDeleteClickCount(0);
      }, 2000);
    } else if (deleteClickCount === 1) {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      
      setIsDeleting(true);
      try {
        await wellenService.deleteWelle(welle.id);
        if (onDelete) {
          onDelete();
        }
        onClose();
      } catch (error) {
        console.error('Error deleting welle:', error);
        alert('Fehler beim Löschen der Welle');
        setIsDeleting(false);
        setDeleteClickCount(0);
      }
    }
  };

  // Calculate overall progress
  const totalDisplayTarget = welle.displays?.reduce((sum, d) => sum + (d.targetNumber || 0), 0) || 0;
  const totalDisplayCurrent = welle.displays?.reduce((sum, d) => sum + (d.currentNumber || 0), 0) || 0;
  const totalKartonwareTarget = welle.kartonwareItems?.reduce((sum, k) => sum + (k.targetNumber || 0), 0) || 0;
  const totalKartonwareCurrent = welle.kartonwareItems?.reduce((sum, k) => sum + (k.currentNumber || 0), 0) || 0;
  const totalEinzelproduktTarget = welle.einzelproduktItems?.reduce((sum, e) => sum + (e.targetNumber || 0), 0) || 0;
  const totalEinzelproduktCurrent = welle.einzelproduktItems?.reduce((sum, e) => sum + (e.currentNumber || 0), 0) || 0;
  
  const totalTarget = totalDisplayTarget + totalKartonwareTarget + totalEinzelproduktTarget;
  const totalCurrent = totalDisplayCurrent + totalKartonwareCurrent + totalEinzelproduktCurrent;
  const overallProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100 * 10) / 10 : 0;

  // Calculate value progress for value-based goals
  const totalValueTarget = (welle.displays?.reduce((sum, d) => sum + ((d.targetNumber || 0) * (d.itemValue || 0)), 0) || 0) +
    (welle.kartonwareItems?.reduce((sum, k) => sum + ((k.targetNumber || 0) * (k.itemValue || 0)), 0) || 0) +
    (welle.einzelproduktItems?.reduce((sum, e) => sum + ((e.targetNumber || 0) * (e.itemValue || 0)), 0) || 0);
  const totalValueCurrent = (welle.displays?.reduce((sum, d) => sum + ((d.currentNumber || 0) * (d.itemValue || 0)), 0) || 0) +
    (welle.kartonwareItems?.reduce((sum, k) => sum + ((k.currentNumber || 0) * (k.itemValue || 0)), 0) || 0) +
    (welle.einzelproduktItems?.reduce((sum, e) => sum + ((e.currentNumber || 0) * (e.itemValue || 0)), 0) || 0);

  // Days remaining
  const today = new Date();
  const endDate = new Date(welle.endDate);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${startDate.toLocaleDateString('de-DE', options)} – ${endDate.toLocaleDateString('de-DE', options)}`;
  };

  const getStatusConfig = (status: Welle['status']) => {
    switch (status) {
      case 'active':
        return {
          label: 'Aktiv',
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          icon: <TrendUp size={18} weight="bold" />
        };
      case 'upcoming':
        return {
          label: 'Bevorstehend',
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: <Clock size={18} weight="bold" />
        };
      case 'past':
        return {
          label: 'Abgeschlossen',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          icon: <CheckCircleFilled size={18} weight="fill" />
        };
    }
  };

  const statusConfig = getStatusConfig(welle.status);
  const goalMet = welle.goalType === 'percentage' 
    ? overallProgress >= (welle.goalPercentage || 100)
    : totalValueCurrent >= (welle.goalValue || 0);

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Hero Section */}
        <div className={styles.heroSection}>
          {welle.image && (
            <div className={styles.heroImage}>
              <img src={welle.image} alt={welle.name} />
              <div className={styles.heroOverlay} />
            </div>
          )}
          <div className={styles.heroContent}>
            <div className={styles.heroTop}>
              <div className={styles.statusBadge} style={{ 
                backgroundColor: statusConfig.bgColor,
                color: statusConfig.color 
              }}>
                {statusConfig.icon}
                <span>{statusConfig.label}</span>
              </div>
              <div className={styles.headerButtons}>
                <button 
                  className={`${styles.deleteButton} ${deleteClickCount === 1 ? styles.deleteButtonActive : ''}`}
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                >
                  <Trash size={18} weight="bold" />
                </button>
                <button className={styles.closeButton} onClick={onClose}>
                  <X size={20} weight="bold" />
                </button>
              </div>
            </div>
            <div className={styles.heroInfo}>
              <h1 className={styles.welleName}>{welle.name}</h1>
              <div className={styles.dateRange}>
                <Calendar size={16} weight="regular" />
                <span>{formatDateRange(welle.startDate, welle.endDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.modalContent}>
          {/* Quick Stats Row */}
          <div className={styles.quickStats}>
            <div className={styles.quickStat}>
              <div className={styles.quickStatIcon}>
                <Target size={20} weight="duotone" />
              </div>
              <div className={styles.quickStatInfo}>
                <span className={styles.quickStatValue}>
                  {welle.goalType === 'value' 
                    ? `€${(welle.goalValue || 0).toLocaleString('de-DE')}`
                    : `${welle.goalPercentage || 80}%`
                  }
                </span>
                <span className={styles.quickStatLabel}>Ziel</span>
              </div>
            </div>
            <div className={styles.quickStat}>
              <div className={styles.quickStatIcon}>
                <Storefront size={20} weight="duotone" />
              </div>
              <div className={styles.quickStatInfo}>
                <span className={styles.quickStatValue}>{welle.assignedMarketIds?.length || 0}</span>
                <span className={styles.quickStatLabel}>Märkte</span>
              </div>
            </div>
            <div className={styles.quickStat}>
              <div className={styles.quickStatIcon}>
                <Users size={20} weight="duotone" />
              </div>
              <div className={styles.quickStatInfo}>
                <span className={styles.quickStatValue}>{welle.participatingGLs || 0}/{welle.totalGLs || 8}</span>
                <span className={styles.quickStatLabel}>GLs aktiv</span>
              </div>
            </div>
            <div className={styles.quickStat}>
              <div className={styles.quickStatIcon}>
                <CalendarBlank size={20} weight="duotone" />
              </div>
              <div className={styles.quickStatInfo}>
                <span className={styles.quickStatValue}>{welle.status === 'past' ? '0' : daysRemaining}</span>
                <span className={styles.quickStatLabel}>Tage übrig</span>
              </div>
            </div>
          </div>

          {/* Overall Progress Card */}
          <div className={styles.progressCard}>
            <div className={styles.progressCardHeader}>
              <h3 className={styles.progressCardTitle}>Gesamtfortschritt</h3>
              {goalMet && (
                <div className={styles.goalMetBadge}>
                  <CheckCircle size={16} weight="fill" />
                  <span>Ziel erreicht</span>
                </div>
              )}
            </div>
            <div className={styles.progressMain}>
              <div className={`${styles.progressValue} ${goalMet ? styles.progressValueSuccess : ''}`}>
                {welle.goalType === 'value' 
                  ? `€${totalValueCurrent.toLocaleString('de-DE')}`
                  : `${overallProgress}%`
                }
              </div>
              <div className={styles.progressGoal}>
                von {welle.goalType === 'value' 
                  ? `€${(welle.goalValue || totalValueTarget).toLocaleString('de-DE')}`
                  : `${welle.goalPercentage || 80}%`
                }
              </div>
            </div>
            <div className={styles.progressBarLarge}>
              <div 
                className={`${styles.progressFillLarge} ${goalMet ? styles.progressFillSuccess : ''}`}
                style={{ width: `${Math.min(welle.goalType === 'value' 
                  ? ((totalValueCurrent / (welle.goalValue || totalValueTarget || 1)) * 100) 
                  : (overallProgress / (welle.goalPercentage || 80)) * 100, 100)}%` 
                }}
              />
            </div>
            <div className={styles.progressMeta}>
              <span>{totalCurrent} von {totalTarget} Artikeln verkauft</span>
            </div>
          </div>

          {/* Items Grid */}
          <div className={styles.itemsSection}>
            {/* Displays */}
            {welle.displays && welle.displays.length > 0 && (
              <div className={styles.itemsColumn}>
                <div className={styles.itemsHeader}>
                  <CheckCircle size={20} weight="bold" className={styles.itemsHeaderIcon} />
                  <h3>Displays</h3>
                  <span className={styles.itemsCount}>{welle.displayCount}</span>
                </div>
                <div className={styles.itemsList}>
                  {welle.displays.map(display => {
                    const progress = display.targetNumber ? ((display.currentNumber || 0) / display.targetNumber) * 100 : 0;
                    const isComplete = (display.currentNumber || 0) >= (display.targetNumber || 1);
                    
                    return (
                      <div key={display.id} className={`${styles.itemCard} ${isComplete ? styles.itemCardComplete : ''}`}>
                        {display.picture && (
                          <div className={styles.itemImage}>
                            <img src={display.picture} alt={display.name} />
                          </div>
                        )}
                        <div className={styles.itemContent}>
                          <div className={styles.itemName}>{display.name}</div>
                          <div className={styles.itemProgress}>
                            <div className={styles.itemProgressBar}>
                              <div 
                                className={`${styles.itemProgressFill} ${isComplete ? styles.itemProgressFillSuccess : ''}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className={styles.itemProgressText}>
                              {display.currentNumber || 0}/{display.targetNumber || 0}
                            </span>
                          </div>
                          {welle.goalType === 'value' && display.itemValue && (
                            <div className={styles.itemValue}>
                              €{((display.currentNumber || 0) * display.itemValue).toLocaleString('de-DE')} / €{((display.targetNumber || 0) * display.itemValue).toLocaleString('de-DE')}
                            </div>
                          )}
                        </div>
                        {isComplete && (
                          <div className={styles.itemCompleteBadge}>
                            <CheckCircle size={18} weight="fill" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kartonware */}
            {welle.kartonwareItems && welle.kartonwareItems.length > 0 && (
              <div className={styles.itemsColumn}>
                <div className={styles.itemsHeader}>
                  <Package size={20} weight="bold" className={styles.itemsHeaderIcon} />
                  <h3>Kartonware</h3>
                  <span className={styles.itemsCount}>{welle.kartonwareCount}</span>
                </div>
                <div className={styles.itemsList}>
                  {welle.kartonwareItems.map(item => {
                    const progress = item.targetNumber ? ((item.currentNumber || 0) / item.targetNumber) * 100 : 0;
                    const isComplete = (item.currentNumber || 0) >= (item.targetNumber || 1);
                    
                    return (
                      <div key={item.id} className={`${styles.itemCard} ${isComplete ? styles.itemCardComplete : ''}`}>
                        {item.picture && (
                          <div className={styles.itemImage}>
                            <img src={item.picture} alt={item.name} />
                          </div>
                        )}
                        <div className={styles.itemContent}>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemProgress}>
                            <div className={styles.itemProgressBar}>
                              <div 
                                className={`${styles.itemProgressFill} ${isComplete ? styles.itemProgressFillSuccess : ''}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className={styles.itemProgressText}>
                              {item.currentNumber || 0}/{item.targetNumber || 0}
                            </span>
                          </div>
                          {welle.goalType === 'value' && item.itemValue && (
                            <div className={styles.itemValue}>
                              €{((item.currentNumber || 0) * item.itemValue).toLocaleString('de-DE')} / €{((item.targetNumber || 0) * item.itemValue).toLocaleString('de-DE')}
                            </div>
                          )}
                        </div>
                        {isComplete && (
                          <div className={styles.itemCompleteBadge}>
                            <CheckCircle size={18} weight="fill" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paletten */}
            {welle.paletteItems && welle.paletteItems.length > 0 && (
              <div className={styles.itemsColumn}>
                <div className={styles.itemsHeader}>
                  <Package size={20} weight="bold" className={styles.itemsHeaderIcon} />
                  <h3>Paletten</h3>
                  <span className={styles.itemsCount}>{welle.paletteCount || welle.paletteItems.length}</span>
                </div>
                <div className={styles.itemsList}>
                  {welle.paletteItems.map(palette => {
                    const totalValue = palette.products.reduce((sum, p) => sum + (p.valuePerVE * p.ve), 0);
                    
                    return (
                      <div key={palette.id} className={styles.itemCard}>
                        {palette.picture && (
                          <div className={styles.itemImage}>
                            <img src={palette.picture} alt={palette.name} />
                          </div>
                        )}
                        <div className={styles.itemContent}>
                          <div className={styles.itemName}>{palette.name}</div>
                          {palette.size && <div className={styles.itemSize}>{palette.size}</div>}
                          <div className={styles.itemProducts}>
                            {palette.products.map(prod => (
                              <div key={prod.id} className={styles.productRow}>
                                <span className={styles.productName}>{prod.name}</span>
                                <span className={styles.productValue}>€{prod.valuePerVE.toFixed(2)} × {prod.ve} VE</span>
                              </div>
                            ))}
                          </div>
                          <div className={styles.itemValue}>
                            Gesamtwert: €{totalValue.toLocaleString('de-DE')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Schütten */}
            {welle.schutteItems && welle.schutteItems.length > 0 && (
              <div className={styles.itemsColumn}>
                <div className={styles.itemsHeader}>
                  <Package size={20} weight="bold" className={styles.itemsHeaderIcon} />
                  <h3>Schütten</h3>
                  <span className={styles.itemsCount}>{welle.schutteCount || welle.schutteItems.length}</span>
                </div>
                <div className={styles.itemsList}>
                  {welle.schutteItems.map(schutte => {
                    const totalValue = schutte.products.reduce((sum, p) => sum + (p.valuePerVE * p.ve), 0);
                    
                    return (
                      <div key={schutte.id} className={styles.itemCard}>
                        {schutte.picture && (
                          <div className={styles.itemImage}>
                            <img src={schutte.picture} alt={schutte.name} />
                          </div>
                        )}
                        <div className={styles.itemContent}>
                          <div className={styles.itemName}>{schutte.name}</div>
                          {schutte.size && <div className={styles.itemSize}>{schutte.size}</div>}
                          <div className={styles.itemProducts}>
                            {schutte.products.map(prod => (
                              <div key={prod.id} className={styles.productRow}>
                                <span className={styles.productName}>{prod.name}</span>
                                <span className={styles.productValue}>€{prod.valuePerVE.toFixed(2)} × {prod.ve} VE</span>
                              </div>
                            ))}
                          </div>
                          <div className={styles.itemValue}>
                            Gesamtwert: €{totalValue.toLocaleString('de-DE')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Einzelprodukte */}
            {welle.einzelproduktItems && welle.einzelproduktItems.length > 0 && (
              <div className={styles.itemsColumn}>
                <div className={styles.itemsHeader}>
                  <Cube size={20} weight="bold" className={styles.itemsHeaderIcon} />
                  <h3>Einzelprodukte</h3>
                  <span className={styles.itemsCount}>{welle.einzelproduktCount || welle.einzelproduktItems.length}</span>
                </div>
                <div className={styles.itemsList}>
                  {welle.einzelproduktItems.map(item => {
                    const progress = item.targetNumber ? ((item.currentNumber || 0) / item.targetNumber) * 100 : 0;
                    const isComplete = (item.currentNumber || 0) >= (item.targetNumber || 1);
                    
                    return (
                      <div key={item.id} className={`${styles.itemCard} ${isComplete ? styles.itemCardComplete : ''}`}>
                        {item.picture && (
                          <div className={styles.itemImage}>
                            <img src={item.picture} alt={item.name} />
                          </div>
                        )}
                        <div className={styles.itemContent}>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemProgress}>
                            <div className={styles.itemProgressBar}>
                              <div
                                className={`${styles.itemProgressFill} ${isComplete ? styles.itemProgressComplete : ''}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className={styles.itemProgressText}>
                              {item.currentNumber || 0} / {item.targetNumber || 0}
                            </span>
                          </div>
                          {welle.goalType === 'value' && item.itemValue && (
                            <div className={styles.itemValue}>
                              €{((item.currentNumber || 0) * item.itemValue).toLocaleString('de-DE')} / €{((item.targetNumber || 0) * item.itemValue).toLocaleString('de-DE')}
                            </div>
                          )}
                        </div>
                        {isComplete && (
                          <div className={styles.itemCompleteBadge}>
                            <CheckCircle size={18} weight="fill" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Schedule Section */}
          {welle.kwDays && welle.kwDays.length > 0 && (
            <div className={styles.scheduleSection}>
              <div className={styles.scheduleHeader}>
                <Calendar size={20} weight="bold" className={styles.scheduleHeaderIcon} />
                <h3>Verkaufstage</h3>
              </div>
              <div className={styles.scheduleGrid}>
                {welle.kwDays.map((kw, idx) => (
                  <div key={idx} className={styles.scheduleCard}>
                    <div className={styles.scheduleKW}>{kw.kw}</div>
                    <div className={styles.scheduleDays}>
                      {kw.days.map(day => (
                        <span key={day} className={styles.scheduleDay}>{day}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
