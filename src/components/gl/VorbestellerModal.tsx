import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, CalendarBlank, Package, Info, MagnifyingGlass, Check, Plus, Minus, Image as ImageIcon, CheckCircle, TrendUp } from '@phosphor-icons/react';
import { RingLoader } from 'react-spinners';
import styles from './VorbestellerModal.module.css';
import whatsappImage1 from '../../assets/WhatsApp Bild 2025-12-02 um 10.09.48_d79a87f9.jpg';
import whatsappImage2 from '../../assets/WhatsApp Bild 2025-12-02 um 13.38.24_a1836ccf.jpg';
import { allMarkets } from '../../data/marketsData';
import type { Market } from '../../types/market-types';

interface VorbestellerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Vorbesteller {
  id: string;
  image: string;
  timeSlot: string;
  items: number;
  marktName: string;
  deliveryWeeks: string;
  coverageGoal: number;
  currentCoverage: number;
  totalMarkets: number;
}

const mockVorbesteller: Vorbesteller[] = [
  {
    id: '1',
    image: whatsappImage1,
    timeSlot: 'Mo&Di KW45',
    items: 12,
    marktName: 'Billa+',
    deliveryWeeks: 'KW47 - KW48',
    coverageGoal: 80,
    currentCoverage: 65,
    totalMarkets: 120,
  },
  {
    id: '2',
    image: whatsappImage2,
    timeSlot: 'DO&Fr KW46',
    items: 8,
    marktName: 'Spar',
    deliveryWeeks: 'KW48 - KW49',
    coverageGoal: 60,
    currentCoverage: 58,
    totalMarkets: 95,
  },
  {
    id: '3',
    image: whatsappImage1,
    timeSlot: 'Mo&Di KW47',
    items: 15,
    marktName: 'Spar',
    deliveryWeeks: 'KW49 - KW50',
    coverageGoal: 60,
    currentCoverage: 42,
    totalMarkets: 80,
  },
  {
    id: '4',
    image: whatsappImage2,
    timeSlot: 'Mi&Fr KW48',
    items: 6,
    marktName: 'Billa+',
    deliveryWeeks: 'KW50 - KW51',
    coverageGoal: 80,
    currentCoverage: 72,
    totalMarkets: 120,
  },
];

interface MarketWithQuantity {
  market: Market;
  quantity: number;
}

export const VorbestellerModal: React.FC<VorbestellerModalProps> = ({ isOpen, onClose }) => {
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showMarketSelection, setShowMarketSelection] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState<MarketWithQuantity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitCompleted, setIsSubmitCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSuccessAnimating, setIsSuccessAnimating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedVorbesteller = mockVorbesteller.find(v => v.id === selectedCardId);
  const selectedMarket = selectedMarkets[0];
  const totalQuantity = selectedMarket?.quantity || 0;

  useEffect(() => {
    if (showSuccess) {
      setIsSuccessAnimating(true);
    }
  }, [showSuccess]);

  // Filter markets based on search
  const filteredMarkets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return allMarkets;
    
    return allMarkets.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.postalCode.includes(query)
    );
  }, [searchQuery]);

  // Sort: completed at bottom
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return a.name.localeCompare(b.name);
  });

  const uncompletedMarkets = sortedMarkets.filter(m => !m.isCompleted);
  const completedMarkets = sortedMarkets.filter(m => m.isCompleted);

  const handleSelectMarket = (market: Market) => {
    const existing = selectedMarkets.find(m => m.market.id === market.id);
    if (existing) {
      setSelectedMarkets([]);
    } else {
      setSelectedMarkets([{ market, quantity: 0 }]);
    }
  };

  const handleUpdateQuantity = (marketId: string, delta: number) => {
    setSelectedMarkets(selectedMarkets.map(m => {
      if (m.market.id === marketId) {
        const currentQuantity = m.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity + delta);
        return { ...m, quantity: newQuantity };
      }
      return m;
    }));
  };

  const handleManualQuantityChange = (marketId: string, value: string) => {
    if (value === '') {
      setSelectedMarkets(selectedMarkets.map(m => 
        m.market.id === marketId ? { ...m, quantity: 0 } : m
      ));
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setSelectedMarkets(selectedMarkets.map(m => 
          m.market.id === marketId ? { ...m, quantity: numValue } : m
        ));
      }
    }
  };

  const handleWeiterClick = () => {
    if (selectedCardId) {
      setShowMarketSelection(true);
    }
  };

  const handleFertigClick = () => {
    if (selectedMarkets.length > 0) {
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

  const handleSubmitPhoto = () => {
    setIsSubmitting(true);
    // Simulate submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitCompleted(true);
      // Show success modal after completion animation
      setTimeout(() => {
        setIsSubmitCompleted(false);
        setShowPhotoCapture(false);
        setShowSuccess(true);
      }, 1500);
    }, 2000);
  };

  const handleClose = () => {
    // Reset all states
    setFlippedCardId(null);
    setSelectedCardId(null);
    setShowMarketSelection(false);
    setShowPhotoCapture(false);
    setSelectedMarkets([]);
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
                    ? selectedVorbesteller.timeSlot 
                    : 'Vorbesteller'}
                </h2>
                <p className={styles.subtitle}>
                  {showMarketSelection && selectedVorbesteller
                    ? `${selectedVorbesteller.marktName} · Lieferung ${selectedVorbesteller.deliveryWeeks}`
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
                    <div className={styles.successStatValue}>+{totalQuantity * 2}€</div>
                    <div className={styles.successStatLabel}>Bonus</div>
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
                    <div className={styles.successDetailText}>{selectedMarket?.market.name}</div>
                  </div>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>{selectedVorbesteller?.marktName} · {selectedVorbesteller?.timeSlot}</div>
                  </div>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>Lieferung {selectedVorbesteller?.deliveryWeeks}</div>
                  </div>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>Foto dokumentiert</div>
                  </div>
                </div>
              </div>
            </div>
          ) : !showMarketSelection && !showPhotoCapture ? (
            /* Card Selection View */
            <div className={styles.cardsSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Anstehende Vorbestellungen</h3>
                <div className={styles.badge}>{mockVorbesteller.length}</div>
              </div>
              
              <div className={styles.scrollContainer} ref={scrollContainerRef}>
                <div className={styles.cardsWrapper}>
                  {mockVorbesteller.map((vorbesteller) => (
                    <div 
                      key={vorbesteller.id} 
                      className={`${styles.cardContainer} ${flippedCardId === vorbesteller.id ? styles.flipped : ''} ${selectedCardId === vorbesteller.id ? styles.selected : ''}`}
                      onClick={() => setSelectedCardId(vorbesteller.id)}
                    >
                      {/* Card Front */}
                      <div className={styles.cardFront}>
                        <div key={vorbesteller.id} className={styles.card}>
                          <div className={styles.cardImageContainer}>
                            <img src={vorbesteller.image} alt="Vorbesteller" className={styles.cardImage} />
                            <button 
                              className={styles.infoIcon}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFlippedCardId(vorbesteller.id);
                              }}
                              aria-label="Info"
                            >
                              <Info size={20} weight="regular" />
                            </button>
                            <div className={styles.cardOverlay}>
                              <div className={styles.itemsBadge}>
                                <Package size={16} weight="fill" />
                                <span>{vorbesteller.items}</span>
                              </div>
                            </div>
                          </div>
                          <div className={styles.cardContent}>
                            <div className={styles.timeSlot}>{vorbesteller.timeSlot}</div>
                            <div className={styles.marktName}>{vorbesteller.marktName}</div>
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
                                <div className={styles.backTopValue}>{vorbesteller.timeSlot}</div>
                              </div>

                              {/* Delivery Period */}
                              <div className={styles.backTopItem}>
                                <div className={styles.backTopLabel}>Lieferung</div>
                                <div className={styles.backTopValue}>{vorbesteller.deliveryWeeks}</div>
                              </div>
                            </div>
                          </div>
                          <div className={styles.cardContent}>
                            {/* Coverage Progress */}
                            <div className={styles.backInfoItem}>
                              <div className={styles.coverageHeader}>
                                <div className={styles.backInfoLabel}>Abdeckung</div>
                                <div className={styles.marketsCount}>
                                  {Math.round(vorbesteller.totalMarkets * vorbesteller.currentCoverage / 100)}/{vorbesteller.totalMarkets}
                                </div>
                              </div>
                              <div className={styles.coverageContainer}>
                                <div className={styles.coverageBar}>
                                  <div 
                                    className={`${styles.coverageProgress} ${vorbesteller.currentCoverage >= vorbesteller.coverageGoal ? styles.coverageComplete : ''}`}
                                    style={{ width: `${vorbesteller.currentCoverage}%` }}
                                  />
                                </div>
                                <div className={styles.coverageStats}>
                                  <span className={styles.coverageCurrent}>{vorbesteller.currentCoverage}%</span>
                                  <span className={styles.coverageGoal}>Ziel: {vorbesteller.coverageGoal}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : !showPhotoCapture ? (
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
                {/* Uncompleted Markets */}
                {uncompletedMarkets.length > 0 && (
                  <div className={styles.marketsGroup}>
                    <div className={styles.marketsGroupLabel}>Verfügbar</div>
                    {uncompletedMarkets.map((market) => {
                      const isSelected = selectedMarkets.some(m => m.market.id === market.id);
                      const selectedMarket = selectedMarkets.find(m => m.market.id === market.id);
                      return (
                        <div
                          key={market.id}
                          className={`${styles.marketItem} ${isSelected ? styles.selected : ''}`}
                        >
                          <div className={styles.marketInfo} onClick={() => handleSelectMarket(market)}>
                            <div className={styles.marketName}>{market.name}</div>
                            <div className={styles.marketMeta}>
                              {market.address}, {market.postalCode} {market.city}
                            </div>
                          </div>
                          {isSelected && (
                            <div className={styles.quantityControls}>
                              <button
                                className={styles.quantityButton}
                                onClick={() => handleUpdateQuantity(market.id, -1)}
                                aria-label="Weniger"
                              >
                                <Minus size={14} weight="bold" />
                              </button>
                              <input
                                type="text"
                                className={styles.quantity}
                                value={selectedMarket?.quantity === 0 ? '' : selectedMarket?.quantity}
                                onChange={(e) => handleManualQuantityChange(market.id, e.target.value)}
                                aria-label="Menge"
                              />
                              <button
                                className={styles.quantityButton}
                                onClick={() => handleUpdateQuantity(market.id, 1)}
                                aria-label="Mehr"
                              >
                                <Plus size={14} weight="bold" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Completed Markets */}
                {completedMarkets.length > 0 && (
                  <div className={styles.marketsGroup}>
                    <div className={styles.marketsGroupLabel}>Abgeschlossen</div>
                    {completedMarkets.map((market) => {
                      const isSelected = selectedMarkets.some(m => m.market.id === market.id);
                      const selectedMarket = selectedMarkets.find(m => m.market.id === market.id);
                      return (
                        <div
                          key={market.id}
                          className={`${styles.marketItem} ${styles.completed} ${isSelected ? styles.selected : ''}`}
                        >
                          <div className={styles.completedCheck}>
                            <Check size={12} weight="bold" />
                          </div>
                          <div className={styles.marketInfo} onClick={() => handleSelectMarket(market)}>
                            <div className={styles.marketName}>{market.name}</div>
                            <div className={styles.marketMeta}>
                              {market.address}, {market.postalCode} {market.city}
                            </div>
                          </div>
                          {isSelected && (
                            <div className={styles.quantityControls}>
                              <button
                                className={styles.quantityButton}
                                onClick={() => handleUpdateQuantity(market.id, -1)}
                                aria-label="Weniger"
                              >
                                <Minus size={14} weight="bold" />
                              </button>
                              <input
                                type="text"
                                className={styles.quantity}
                                value={selectedMarket?.quantity === 0 ? '' : selectedMarket?.quantity}
                                onChange={(e) => handleManualQuantityChange(market.id, e.target.value)}
                                aria-label="Menge"
                              />
                              <button
                                className={styles.quantityButton}
                                onClick={() => handleUpdateQuantity(market.id, 1)}
                                aria-label="Mehr"
                              >
                                <Plus size={14} weight="bold" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
          ) : showMarketSelection ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowMarketSelection(false)}>
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleFertigClick}
                disabled={selectedMarkets.length === 0}
              >
                Fertig
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

