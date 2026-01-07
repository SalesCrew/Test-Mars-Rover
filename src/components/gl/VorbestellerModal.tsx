import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, CalendarBlank, Package, Info, MagnifyingGlass, Check, Plus, Minus, Image as ImageIcon, CheckCircle, TrendUp } from '@phosphor-icons/react';
import { RingLoader } from 'react-spinners';
import styles from './VorbestellerModal.module.css';
import type { Market } from '../../types/market-types';
import { wellenService, type Welle } from '../../services/wellenService';
import { useAuth } from '../../contexts/AuthContext';
import { marketService } from '../../services/marketService';

interface VorbestellerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock data removed - using real data from database

// Reserved for future use
// interface MarketWithQuantity {
//   market: Market;
//   quantity: number;
// }

// Format date from "2026-01-05" to "5.1"
const formatCompactDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  return `${day}.${month}`;
};

export const VorbestellerModal: React.FC<VorbestellerModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [wellen, setWellen] = useState<Welle[]>([]);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [isLoadingWellen, setIsLoadingWellen] = useState(true);
  const [_isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  void _isLoadingMarkets; // Reserved for loading state display
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showMarketSelection, setShowMarketSelection] = useState(false);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitCompleted, setIsSubmitCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSuccessAnimating, setIsSuccessAnimating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch wellen on mount
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/35f7e71b-d3fc-4c62-8097-9c7adee771ff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VorbestellerModal.tsx:useEffect:trigger',message:'useEffect triggered',data:{isOpen,timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const loadWellen = async () => {
      try {
        setIsLoadingWellen(true);
        const fetchedWellen = await wellenService.getAllWellen();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/35f7e71b-d3fc-4c62-8097-9c7adee771ff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VorbestellerModal.tsx:loadWellen:success',message:'GL Wellen loaded',data:{count:fetchedWellen?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
        setWellen(fetchedWellen);
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/35f7e71b-d3fc-4c62-8097-9c7adee771ff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VorbestellerModal.tsx:loadWellen:error',message:'GL Error loading wellen',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
        // #endregion
        console.error('Error loading wellen:', error);
      } finally {
        setIsLoadingWellen(false);
      }
    };
    if (isOpen) {
      loadWellen();
    }
  }, [isOpen]);

  // Fetch markets on mount
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setIsLoadingMarkets(true);
        const dbMarkets = await marketService.getAllMarkets();
        // Transform AdminMarket to Market type (include gebietsleiter for clustering)
        const markets: Market[] = dbMarkets.map(m => ({
          id: m.id,
          name: m.name,
          address: m.address,
          city: m.city,
          postalCode: m.postalCode,
          chain: m.chain || '',
          frequency: m.frequency || 12,
          currentVisits: 0,
          lastVisitDate: '',
          isCompleted: false,
          gebietsleiter: m.gebietsleiter, // Include GL assignment
        }));
        setAllMarkets(markets);
      } catch (error) {
        console.error('Error loading markets:', error);
      } finally {
        setIsLoadingMarkets(false);
      }
    };
    if (isOpen) {
      loadMarkets();
    }
  }, [isOpen]);

  const selectedVorbesteller = wellen.find(v => v.id === selectedCardId);
  const totalQuantity = Object.values(itemQuantities).reduce((sum, qty) => sum + qty, 0);

  useEffect(() => {
    if (showSuccess) {
      setIsSuccessAnimating(true);
    }
  }, [showSuccess]);

  // Filter markets based on search and assigned markets for the selected welle
  const filteredMarkets = useMemo(() => {
    // First, filter to only show markets assigned to this welle
    const assignedMarkets = selectedVorbesteller?.assignedMarketIds 
      ? allMarkets.filter(m => selectedVorbesteller.assignedMarketIds?.includes(m.id))
      : allMarkets;
    
    // Then apply search filter
    const query = searchQuery.toLowerCase().trim();
    if (!query) return assignedMarkets;
    
    return assignedMarkets.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.postalCode.includes(query)
    );
  }, [searchQuery, selectedVorbesteller, allMarkets]);

  // Split markets into "Meine Märkte" and "Andere Märkte"
  const myMarkets = useMemo(() => 
    filteredMarkets
      .filter(m => m.gebietsleiter === user?.id)
      .sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return a.name.localeCompare(b.name);
      }), 
    [filteredMarkets, user?.id]
  );
  
  const otherMarkets = useMemo(() => 
    filteredMarkets
      .filter(m => m.gebietsleiter !== user?.id)
      .sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return a.name.localeCompare(b.name);
      }), 
    [filteredMarkets, user?.id]
  );

  // Keep for compatibility
  const uncompletedMarkets = myMarkets.filter(m => !m.isCompleted);
  const completedMarkets = myMarkets.filter(m => m.isCompleted);
  const otherUncompletedMarkets = otherMarkets.filter(m => !m.isCompleted);
  const otherCompletedMarkets = otherMarkets.filter(m => m.isCompleted);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
  };

  const handleUpdateItemQuantity = (itemId: string, delta: number) => {
    setItemQuantities(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      return { ...prev, [itemId]: newQty };
    });
  };

  const handleManualItemQuantityChange = (itemId: string, value: string) => {
    if (value === '') {
      setItemQuantities(prev => ({ ...prev, [itemId]: 0 }));
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setItemQuantities(prev => ({ ...prev, [itemId]: numValue }));
      }
    }
  };

  const handleWeiterClick = () => {
    if (selectedCardId) {
      setShowMarketSelection(true);
    }
  };

  const handleMarketWeiterClick = () => {
    if (selectedMarket) {
      setShowItemSelection(true);
    }
  };

  const handleFertigClick = () => {
    if (totalQuantity > 0) {
      setShowPhotoCapture(true);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmitPhoto = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare items array with only items that have quantities > 0
      const items: Array<{
        item_type: 'display' | 'kartonware';
        item_id: string;
        current_number: number;
      }> = [];

      // Add displays with quantities
      selectedVorbesteller?.displays?.forEach(display => {
        const qty = itemQuantities[display.id] || 0;
        if (qty > 0) {
          items.push({
            item_type: 'display',
            item_id: display.id,
            current_number: qty
          });
        }
      });

      // Add kartonware with quantities
      selectedVorbesteller?.kartonwareItems?.forEach(item => {
        const qty = itemQuantities[item.id] || 0;
        if (qty > 0) {
          items.push({
            item_type: 'kartonware',
            item_id: item.id,
            current_number: qty
          });
        }
      });

      // Save to database
      if (selectedVorbesteller && selectedMarket && user?.id) {
        await wellenService.updateProgressBatch(selectedVorbesteller.id, {
          gebietsleiter_id: user.id,
          market_id: selectedMarket.id,
          items,
          photo_url: capturedPhoto || undefined
        });
        
        // Record visit to update market frequency
        try {
          await marketService.recordVisit(selectedMarket.id, user.id);
        } catch (visitError) {
          console.warn('Could not record market visit:', visitError);
          // Don't fail the whole submission if visit recording fails
        }
      }

      setIsSubmitting(false);
      setIsSubmitCompleted(true);
      
      // Show success modal after completion animation
      setTimeout(() => {
        setIsSubmitCompleted(false);
        setShowPhotoCapture(false);
        setShowSuccess(true);
      }, 1500);
    } catch (error) {
      console.error('Error submitting progress:', error);
      setIsSubmitting(false);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    }
  };

  const handleClose = () => {
    // Reset all states
    setFlippedCardId(null);
    setSelectedCardId(null);
    setShowMarketSelection(false);
    setShowItemSelection(false);
    setShowPhotoCapture(false);
    setSelectedMarket(null);
    setItemQuantities({});
    setSearchQuery('');
    setCapturedPhoto(null);
    setIsSubmitting(false);
    setIsSubmitCompleted(false);
    setShowSuccess(false);
    setIsSuccessAnimating(false);
    
    // Call parent onClose
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => {
      if (e.target === e.currentTarget && !showSuccess) {
        handleClose();
      }
    }}>
      <div className={`${styles.modal} ${showPhotoCapture && !showSuccess ? styles.photoModal : ''} ${showSuccess ? styles.successModal : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        {!showSuccess && (
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.iconWrapper}>
                <CalendarBlank size={24} weight="duotone" />
              </div>
              <div>
                <h2 className={styles.title}>
                  {showMarketSelection && selectedVorbesteller 
                    ? selectedVorbesteller.name
                    : 'Vorbesteller'}
                </h2>
                <p className={styles.subtitle}>
                  {showMarketSelection && selectedVorbesteller
                    ? `${selectedVorbesteller.kwDays?.[0]?.days.join(' & ')} ${selectedVorbesteller.kwDays?.[0]?.kw}`
                    : 'Wähle einen Vorbesteller aus'}
                </p>
              </div>
            </div>
            <button className={styles.closeButton} onClick={handleClose} aria-label="Schließen">
              <X size={20} weight="bold" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {showSuccess ? (
            /* Success Confirmation */
            <div className={`${styles.successContent} ${isSuccessAnimating ? styles.successContentAnimated : ''}`}>
              {/* Success Icon */}
              <div className={styles.successIconWrapper}>
                <CheckCircle size={72} weight="fill" className={styles.successCheckIcon} />
              </div>

              {/* Title */}
              <div className={styles.successHeader}>
                <h2 className={styles.successTitle}>
                  Hervorragende Leistung!
                </h2>
                <p className={styles.successSubtext}>
                  Vorverkauf erfolgreich dokumentiert
                </p>
              </div>

              {/* Stats Grid - 2 columns only */}
              <div className={styles.successStats}>
                <div className={styles.successStat}>
                  <div className={styles.successStatIcon}>
                    <Package size={20} weight="fill" />
                  </div>
                  <div className={styles.successStatInfo}>
                    <div className={styles.successStatValue}>{totalQuantity}</div>
                    <div className={styles.successStatLabel}>Einheiten</div>
                  </div>
                </div>

                <div className={styles.successStat}>
                  <div className={styles.successStatIcon}>
                    <TrendUp size={20} weight="fill" />
                  </div>
                  <div className={styles.successStatInfo}>
                    <div className={styles.successStatValue}>
                      €{(() => {
                        let totalValue = 0;
                        if (selectedVorbesteller) {
                          selectedVorbesteller.displays?.forEach(d => {
                            const qty = itemQuantities[d.id] || 0;
                            totalValue += qty * (d.itemValue || 0);
                          });
                          selectedVorbesteller.kartonwareItems?.forEach(k => {
                            const qty = itemQuantities[k.id] || 0;
                            totalValue += qty * (k.itemValue || 0);
                          });
                        }
                        return totalValue.toFixed(2);
                      })()}
                    </div>
                    <div className={styles.successStatLabel}>Gesamtwert</div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className={styles.successDetailsSection}>
                <h3 className={styles.successSectionTitle}>Details</h3>
                <div className={styles.successDetailsList}>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>{selectedMarket?.name}</div>
                  </div>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>{selectedVorbesteller?.name} · {selectedVorbesteller?.kwDays?.[0]?.kw}</div>
                  </div>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>Lieferung {selectedVorbesteller?.startDate} - {selectedVorbesteller?.endDate}</div>
                  </div>
                  
                  {/* List sold products */}
                  {selectedVorbesteller?.displays?.map(display => {
                    const qty = itemQuantities[display.id] || 0;
                    if (qty > 0) {
                      return (
                        <div key={display.id} className={styles.successDetailRow}>
                          <div className={styles.successDetailCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                          <div className={styles.successDetailText}>
                            {display.name}: {qty} Stück
                            {display.itemValue && ` (€${(qty * display.itemValue).toFixed(2)})`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                  
                  {selectedVorbesteller?.kartonwareItems?.map(item => {
                    const qty = itemQuantities[item.id] || 0;
                    if (qty > 0) {
                      return (
                        <div key={item.id} className={styles.successDetailRow}>
                          <div className={styles.successDetailCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                          <div className={styles.successDetailText}>
                            {item.name}: {qty} Stück
                            {item.itemValue && ` (€${(qty * item.itemValue).toFixed(2)})`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}

                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>Foto dokumentiert</div>
                  </div>
                </div>
              </div>
            </div>
          ) : !showMarketSelection && !showItemSelection && !showPhotoCapture ? (
            /* Card Selection View */
            <div className={styles.cardsSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Anstehende Vorbestellungen</h3>
                <div className={styles.badge}>{wellen.length}</div>
              </div>
              
              <div className={styles.scrollContainer} ref={scrollContainerRef}>
                {isLoadingWellen ? (
                  <div className={styles.loadingState}>
                    <RingLoader color="#3B82F6" size={60} />
                  </div>
                ) : (
                  <div className={styles.cardsWrapper}>
                    {wellen.map((welle) => (
                      <div 
                        key={welle.id} 
                        className={`${styles.cardContainer} ${flippedCardId === welle.id ? styles.flipped : ''} ${selectedCardId === welle.id ? styles.selected : ''}`}
                        onClick={() => setSelectedCardId(welle.id)}
                      >
                        {/* Card Front */}
                        <div className={styles.cardFront}>
                          <div key={welle.id} className={styles.card}>
                            <div className={styles.cardImageContainer}>
                              {welle.image ? (
                                <img src={welle.image} alt="Vorbesteller" className={styles.cardImage} />
                              ) : (
                                <div className={styles.cardImagePlaceholder}>
                                  <CalendarBlank size={48} weight="duotone" />
                                </div>
                              )}
                              <button 
                                className={styles.infoIcon}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFlippedCardId(welle.id);
                                }}
                                aria-label="Info"
                              >
                                <Info size={20} weight="regular" />
                              </button>
                              <div className={styles.cardOverlay}>
                                <div className={styles.itemsBadge}>
                                  <Package size={16} weight="fill" />
                                  <span>{(welle.displays?.length || 0) + (welle.kartonwareItems?.length || 0)}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.cardContent}>
                              <div className={styles.marktName}>{welle.name}</div>
                              <div className={styles.cardSubheader}>
                                <div className={styles.timeSlot}>
                                  {welle.kwDays && welle.kwDays.length > 0 
                                    ? `${welle.kwDays[0].days.join('&')} ${welle.kwDays[0].kw}`
                                    : 'Keine Verkaufstage'}
                                </div>
                                <div className={styles.dateRange}>
                                  {formatCompactDate(welle.startDate)}-{formatCompactDate(welle.endDate)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card Back */}
                        <div className={styles.cardBack}>
                          <div className={styles.card}>
                            <div className={styles.cardBackTop}>
                              <button 
                                className={styles.closeBackButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFlippedCardId(null);
                                }}
                                aria-label="Zurück"
                              >
                                <X size={14} weight="bold" />
                              </button>
                              
                              <div className={styles.backTopInfo}>
                                {/* Order Times */}
                                <div className={styles.backTopItem}>
                                  <div className={styles.backTopLabel}>Bestellzeiten</div>
                                  <div className={styles.backTopValue}>
                                    {welle.kwDays?.map(kw => `${kw.days.join('&')} ${kw.kw}`).join(', ') || 'N/A'}
                                  </div>
                                </div>

                                {/* Delivery Period */}
                                <div className={styles.backTopItem}>
                                  <div className={styles.backTopLabel}>Lieferung</div>
                                  <div className={styles.backTopValue}>
                                    {welle.startDate} - {welle.endDate}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className={styles.cardContent}>
                              {/* Coverage Progress */}
                              <div className={styles.backInfoItem}>
                                <div className={styles.coverageHeader}>
                                  <div className={styles.backInfoLabel}>
                                    {welle.goalType === 'percentage' ? 'Abdeckung' : 'Verkaufswert'}
                                  </div>
                                  <div className={styles.marketsCount}>
                                    {welle.goalType === 'percentage' ? (
                                      `${welle.participatingGLs || 0}/${welle.totalGLs || 0}`
                                    ) : (
                                      `€${((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                        (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0)).toLocaleString('de-DE')}`
                                    )}
                                  </div>
                                </div>
                                <div className={styles.coverageContainer}>
                                  <div className={styles.coverageBar}>
                                    <div 
                                      className={`${styles.coverageProgress} ${
                                        welle.goalType === 'percentage' 
                                          ? ((welle.participatingGLs || 0) / (welle.totalGLs || 1) * 100) >= (welle.goalPercentage || 100)
                                          : ((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                            (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0)) >= (welle.goalValue || Infinity)
                                          ? styles.coverageComplete 
                                          : ''
                                      }`}
                                      style={{ 
                                        width: welle.goalType === 'percentage'
                                          ? `${Math.min(100, (welle.participatingGLs || 0) / (welle.totalGLs || 1) * 100)}%`
                                          : `${Math.min(100, ((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                              (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0)) / (welle.goalValue || 1) * 100)}%`
                                      }}
                                    />
                                  </div>
                                  <div className={styles.coverageStats}>
                                    <span className={styles.coverageCurrent}>
                                      {welle.goalType === 'percentage' 
                                        ? `${Math.round((welle.participatingGLs || 0) / (welle.totalGLs || 1) * 100)}%`
                                        : `€${((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                            (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0)).toLocaleString('de-DE')}`
                                      }
                                    </span>
                                    <span className={styles.coverageGoal}>
                                      Ziel: {welle.goalType === 'percentage' 
                                        ? `${welle.goalPercentage}%`
                                        : `€${(welle.goalValue || 0).toLocaleString('de-DE')}`
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !showItemSelection && !showPhotoCapture ? (
            /* Market Selection View */
            <div className={styles.marketSelectionSection}>
              {/* Search Bar */}
              <div className={styles.searchBar}>
                <MagnifyingGlass size={20} weight="regular" className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Markt suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {/* Markets List */}
              <div className={styles.marketsList}>
                {/* Meine Märkte Section */}
                {myMarkets.length > 0 && (
                  <div className={styles.marketsSection}>
                    <div className={styles.marketsSectionLabel}>Meine Märkte</div>
                    
                    {/* Uncompleted */}
                    {uncompletedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Verfügbar</div>
                        {uncompletedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Completed */}
                    {completedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Abgeschlossen</div>
                        {completedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${styles.completed} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.completedCheck}>
                                <Check size={12} weight="bold" />
                              </div>
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Andere Märkte Section */}
                {otherMarkets.length > 0 && (
                  <div className={`${styles.marketsSection} ${styles.otherMarketsSection}`}>
                    <div className={styles.marketsSectionLabel}>Andere Märkte</div>
                    
                    {/* Uncompleted */}
                    {otherUncompletedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Verfügbar</div>
                        {otherUncompletedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${styles.otherMarket} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Completed */}
                    {otherCompletedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Abgeschlossen</div>
                        {otherCompletedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${styles.completed} ${styles.otherMarket} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.completedCheck}>
                                <Check size={12} weight="bold" />
                              </div>
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : !showPhotoCapture ? (
            /* Item Selection View */
            <div className={styles.itemSelectionSection}>
              <div className={styles.itemsList}>
                {/* Displays Section */}
                {selectedVorbesteller?.displays && selectedVorbesteller.displays.length > 0 && (
                  <div className={styles.itemsGroup}>
                    <div className={styles.itemsGroupLabel}>Displays</div>
                    {selectedVorbesteller.displays.map((display) => (
                      <div key={display.id} className={styles.itemCard}>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{display.name}</div>
                          <div className={styles.itemMeta}>
                            Ziel: {display.targetNumber} Stück
                            {display.itemValue && ` · €${display.itemValue.toFixed(2)}`}
                          </div>
                        </div>
                        <div className={styles.quantityControls}>
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(display.id, -1)}
                            aria-label="Weniger"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <input
                            type="text"
                            className={styles.quantity}
                            value={itemQuantities[display.id] === 0 || !itemQuantities[display.id] ? '' : itemQuantities[display.id]}
                            onChange={(e) => handleManualItemQuantityChange(display.id, e.target.value)}
                            placeholder="0"
                            aria-label="Menge"
                          />
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(display.id, 1)}
                            aria-label="Mehr"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Kartonware Section */}
                {selectedVorbesteller?.kartonwareItems && selectedVorbesteller.kartonwareItems.length > 0 && (
                  <div className={styles.itemsGroup}>
                    <div className={styles.itemsGroupLabel}>Kartonware</div>
                    {selectedVorbesteller.kartonwareItems.map((item) => (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemMeta}>
                            Ziel: {item.targetNumber} Stück
                            {item.itemValue && ` · €${item.itemValue.toFixed(2)}`}
                          </div>
                        </div>
                        <div className={styles.quantityControls}>
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(item.id, -1)}
                            aria-label="Weniger"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <input
                            type="text"
                            className={styles.quantity}
                            value={itemQuantities[item.id] === 0 || !itemQuantities[item.id] ? '' : itemQuantities[item.id]}
                            onChange={(e) => handleManualItemQuantityChange(item.id, e.target.value)}
                            placeholder="0"
                            aria-label="Menge"
                          />
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(item.id, 1)}
                            aria-label="Mehr"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Photo Capture View */
            <div className={styles.photoCaptureSection}>
              {isSubmitting ? (
                <div className={styles.loadingState}>
                  <RingLoader color="#3B82F6" size={80} />
                  <h3 className={styles.loadingTitle}>Daten werden geprüft...</h3>
                </div>
              ) : isSubmitCompleted ? (
                <div className={styles.loadingState}>
                  <div className={styles.completedAnimation}>
                    <div className={styles.completedPulse}></div>
                    <div className={styles.completedCircle}>
                      <Check size={40} weight="bold" />
                    </div>
                  </div>
                  <h3 className={styles.loadingTitle}>Erfolgreich übermittelt!</h3>
                </div>
              ) : (
                <>
                  <div className={styles.photoInstructions}>
                    <h3 className={styles.photoTitle}>Mengenerhebung mit Unterschrift</h3>
                    <p className={styles.photoDescription}>
                      Bitte lade ein Foto der Mengenerhebung mit der Unterschrift des Marktkontakts hoch.
                    </p>
                  </div>

                  {capturedPhoto ? (
                    <div className={styles.photoPreview}>
                      <img src={capturedPhoto} alt="Mengenerhebung" className={styles.previewImage} />
                      <button
                        className={styles.removePhotoButton}
                        onClick={() => setCapturedPhoto(null)}
                        aria-label="Foto entfernen"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className={styles.dropZone}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={handleBrowseClick}
                    >
                      <div className={styles.dropZoneIcon}>
                        <ImageIcon size={28} weight="regular" />
                      </div>
                      <div className={styles.dropZoneText}>
                        <span className={styles.dropZonePrimary}>Datei hierher ziehen oder klicken</span>
                        <span className={styles.dropZoneSecondary}>PNG, JPG oder GIF bis zu 10MB</span>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className={`${styles.footer} ${showSuccess ? styles.successFooter : ''}`}>
          {showSuccess ? (
            <button className={styles.primaryButton} onClick={handleClose}>
              Zurück zum Dashboard
            </button>
          ) : showPhotoCapture ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowPhotoCapture(false)}>
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleSubmitPhoto}
                disabled={!capturedPhoto}
              >
                Absenden
              </button>
            </>
          ) : showItemSelection ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowItemSelection(false)}>
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleFertigClick}
                disabled={totalQuantity === 0}
              >
                Fertig
              </button>
            </>
          ) : showMarketSelection ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowMarketSelection(false)}>
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleMarketWeiterClick}
                disabled={!selectedMarket}
              >
                Weiter
              </button>
            </>
          ) : (
            <>
              <button className={styles.secondaryButton} onClick={handleClose}>
                Schließen
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleWeiterClick}
                disabled={!selectedCardId}
              >
                Weiter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

