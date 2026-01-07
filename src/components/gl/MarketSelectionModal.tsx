import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, CaretDown, Check, MapPin, Path, MagnifyingGlass, ArrowDown, Car, Train } from '@phosphor-icons/react';
import type { Market, TourRoute } from '../../types/market-types';
import { AnimatedListWrapper } from './AnimatedListWrapper';
import { RingLoader } from 'react-spinners';
import { useAuth } from '../../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './MarketSelectionModal.module.css';

type TransportMode = 'car' | 'train' | null;

interface SortableMarketItemProps {
  marketId: string;
  index: number;
  market: Market;
  transportMode: TransportMode;
  isLast: boolean;
  formatTime: (minutes: number) => string;
}

const SortableMarketItem: React.FC<SortableMarketItemProps> = ({
  marketId,
  index,
  market,
  transportMode,
  isLast,
  formatTime,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: marketId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const workTime = 45;
  const drivingTime = index > 0 ? 15 : 0;
  const totalStopTime = workTime + drivingTime;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={styles.selectedMarket}
      >
        <span className={styles.selectedMarketOrder}>{index + 1}</span>
        <span className={styles.selectedMarketName}>{market.chain}</span>
        <span className={styles.selectedMarketTime}>
          {formatTime(totalStopTime)}
        </span>
      </div>
      {!isLast && (
        <div className={styles.routeArrow}>
          <ArrowDown size={20} weight="bold" color="var(--color-teal-mid)" />
          <div className={styles.driveTime}>
            {transportMode === 'car' ? (
              <Car size={16} weight="fill" />
            ) : (
              <Train size={16} weight="fill" />
            )}
            <span>15min</span>
          </div>
        </div>
      )}
    </>
  );
};

interface MarketSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  markets: Market[];
  onStartVisit: (marketId: string) => void;
  onStartTour: (route: TourRoute) => void;
}

type Mode = 'single' | 'tour';
type TourStep = 'selection' | 'summary' | 'optimizing' | 'completed' | 'result';

export const MarketSelectionModal: React.FC<MarketSelectionModalProps> = ({
  isOpen,
  onClose,
  markets,
  onStartVisit,
  onStartTour,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('single');
  const [tourStep, setTourStep] = useState<TourStep>('selection');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [optimizedRoute, setOptimizedRoute] = useState<TourRoute | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>(null);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [sortedMarketIds, setSortedMarketIds] = useState<string[]>([]);
  const [routeModified, setRouteModified] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Focus search input when dropdown opens
  // useEffect(() => {
  //   if (isDropdownOpen && searchInputRef.current) {
  //     searchInputRef.current.focus();
  //   }
  // }, [isDropdownOpen]);

  // Filter and sort markets based on search query
  const filteredMarkets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return markets;
    
    return markets.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.postalCode.includes(query)
    );
  }, [markets, searchQuery]);

  // Sort markets: uncompleted first, then completed
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return a.name.localeCompare(b.name);
  });

  // Split into "Meine Märkte" and "Andere Märkte"
  // Use gebietsleiter_id (GL table ID) NOT user.id (Supabase Auth ID)
  const glId = user?.gebietsleiter_id;
  
  const myMarkets = useMemo(() => 
    sortedMarkets.filter(m => m.gebietsleiter === glId),
    [sortedMarkets, glId]
  );
  
  const otherMarkets = useMemo(() => 
    sortedMarkets.filter(m => m.gebietsleiter !== glId),
    [sortedMarkets, glId]
  );

  // Further split by completed status
  const myUncompletedMarkets = myMarkets.filter(m => !m.isCompleted);
  const myCompletedMarkets = myMarkets.filter(m => m.isCompleted);
  const otherUncompletedMarkets = otherMarkets.filter(m => !m.isCompleted);
  const otherCompletedMarkets = otherMarkets.filter(m => m.isCompleted);

  // Keep for backwards compatibility
  const uncompletedMarkets = sortedMarkets.filter(m => !m.isCompleted);
  const completedMarkets = sortedMarkets.filter(m => m.isCompleted);

  // Update sorted market IDs when optimized route changes
  useEffect(() => {
    if (optimizedRoute) {
      setSortedMarketIds(optimizedRoute.optimizedOrder);
      setRouteModified(false);
    }
  }, [optimizedRoute]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortedMarketIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newArray = arrayMove(items, oldIndex, newIndex);
        setRouteModified(true);
        return newArray;
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Calculate tour route (simplified - in real app would use Google Maps API)
  const calculateTourRoute = (): TourRoute | null => {
    if (selectedMarkets.length === 0) return null;

    const tourMarkets = markets.filter(m => selectedMarkets.includes(m.id));
    
    // Simplified calculation - in reality would use Google Maps Distance Matrix API
    const avgDrivingTimeBetweenStops = 15; // minutes
    const totalDrivingTime = selectedMarkets.length > 1 
      ? (selectedMarkets.length - 1) * avgDrivingTimeBetweenStops 
      : 0;
    
    const totalWorkTime = selectedMarkets.length * 45; // 45 min per market
    const totalTime = totalDrivingTime + totalWorkTime;

    return {
      markets: tourMarkets,
      totalDrivingTime,
      totalWorkTime,
      totalTime,
      optimizedOrder: selectedMarkets, // Would be optimized by routing algorithm
    };
  };

  const handleMarketSelect = (marketId: string) => {
    if (mode === 'single') {
      setSelectedMarket(marketId);
      setIsDropdownOpen(false);
    } else {
      // Toggle selection in tour mode
      setSelectedMarkets(prev => 
        prev.includes(marketId)
          ? prev.filter(id => id !== marketId)
          : [...prev, marketId]
      );
    }
  };

  const handleStartClick = () => {
    if (mode === 'single' && selectedMarket) {
      onStartVisit(selectedMarket);
      onClose();
    } else if (mode === 'tour') {
      if (tourStep === 'selection' && selectedMarkets.length > 0) {
        if (!transportMode) {
          // Show transport selection modal
          setShowTransportModal(true);
        } else {
          // Start optimization with selected transport mode
          setTourStep('optimizing');
          
          // Simulate API call delay with transport mode
          setTimeout(() => {
            const route = calculateTourRoute();
            setTourStep('completed');
            
            // Show completed state for 1 second, then go to result
            setTimeout(() => {
              setOptimizedRoute(route);
              setTourStep('result');
            }, 1000);
          }, 2000);
        }
      } else if (tourStep === 'result' && optimizedRoute) {
        if (routeModified) {
          // Recalculate route
          setTourStep('optimizing');
          
          // Simulate API call delay with new order
          setTimeout(() => {
            const route = calculateTourRoute();
            if (route) {
              route.optimizedOrder = [...sortedMarketIds];
            }
            setTourStep('completed');
            
            // Show completed state for 1 second, then go to result
            setTimeout(() => {
              setOptimizedRoute(route);
              setTourStep('result');
              setRouteModified(false);
            }, 1000);
          }, 2000);
        } else {
          // Start tour with current route
          onStartTour(optimizedRoute);
          onClose();
        }
      }
    }
  };

  const handleTransportSelect = (mode: 'car' | 'train') => {
    setTransportMode(mode);
    setShowTransportModal(false);
    
    // Automatically start route calculation
    setTourStep('optimizing');
    
    // Simulate API call delay with transport mode
    setTimeout(() => {
      const route = calculateTourRoute();
      setTourStep('completed');
      
      // Show completed state for 1 second, then go to result
      setTimeout(() => {
        setOptimizedRoute(route);
        setTourStep('result');
      }, 1000);
    }, 2000);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const canStart = mode === 'single' ? selectedMarket !== null : selectedMarkets.length > 0;

  const getButtonText = () => {
    if (mode === 'single') return 'Besuch starten';
    if (tourStep === 'selection') return transportMode ? 'Route berechnen' : 'Transportmittel wählen';
    if (tourStep === 'summary') return 'Schnellste Tour erstellen';
    if (tourStep === 'result') return routeModified ? 'Route neu berechnen' : 'Tour starten';
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Markt Besuch starten</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Schließen">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Mode Toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${mode === 'single' ? styles.active : ''}`}
              onClick={() => {
                setMode('single');
                setSelectedMarkets([]);
                setTourStep('selection');
                setOptimizedRoute(null);
              }}
            >
              Einzelner Besuch
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'tour' ? styles.active : ''}`}
              onClick={() => {
                setMode('tour');
                setSelectedMarket(null);
                setTourStep('selection');
                setOptimizedRoute(null);
              }}
            >
              Tour planen
            </button>
          </div>

          {/* Single Mode */}
          {mode === 'single' && (
            <>
              {/* Market Selection Dropdown */}
              <div className={styles.dropdownContainer} ref={dropdownRef}>
                <label className={styles.dropdownLabel}>
                  {mode === 'single' ? 'Markt auswählen' : 'Märkte für Tour auswählen'}
                </label>
            
                <button
                  className={`${styles.dropdownButton} ${isDropdownOpen ? styles.open : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className={mode === 'single' && !selectedMarket ? styles.dropdownPlaceholder : styles.dropdownText}>
                    {mode === 'single' 
                      ? (selectedMarket 
                          ? (() => {
                              const market = markets.find(m => m.id === selectedMarket);
                              return market ? (
                                <>
                                  <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{market.chain}</span>
                                  <span style={{ opacity: 0.5, marginLeft: '8px' }}>
                                    {market.address}, {market.postalCode} {market.city}
                                  </span>
                                </>
                              ) : 'Markt wählen...';
                            })()
                          : 'Markt wählen...')
                      : `${selectedMarkets.length} ${selectedMarkets.length === 1 ? 'Markt' : 'Märkte'} ausgewählt`
                    }
                  </span>
                  <CaretDown size={16} className={styles.dropdownChevron} />
                </button>

                {isDropdownOpen && (
              <div className={styles.dropdownMenu}>
                {/* Search Input */}
                <div className={styles.searchContainer}>
                  <MagnifyingGlass size={16} className={styles.searchIcon} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className={styles.searchInput}
                    placeholder="Markt suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Meine Märkte */}
                {myMarkets.length > 0 && (
                  <>
                    <div className={styles.dropdownSection}>
                      <div className={styles.sectionLabel}>Meine Märkte</div>
                      {myUncompletedMarkets.map((market) => (
                        <button
                          key={market.id}
                          className={styles.dropdownItem}
                          onClick={() => handleMarketSelect(market.id)}
                        >
                          <div className={styles.itemInfo}>
                            <div className={styles.itemName}>{market.chain}</div>
                            <div className={styles.itemAddress}>
                              {market.address}, {market.postalCode} {market.city}
                            </div>
                          </div>
                        </button>
                      ))}
                      {myCompletedMarkets.map((market) => (
                        <button
                          key={market.id}
                          className={`${styles.dropdownItem} ${styles.completed}`}
                          onClick={() => handleMarketSelect(market.id)}
                        >
                          <div className={styles.completedCheck}>
                            <Check size={14} weight="bold" color="white" />
                          </div>
                          <div className={styles.itemInfo}>
                            <div className={styles.itemName}>{market.chain}</div>
                            <div className={styles.itemAddress}>
                              {market.address}, {market.postalCode} {market.city}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Andere Märkte */}
                {otherMarkets.length > 0 && (
                  <div className={`${styles.dropdownSection} ${styles.otherMarketsSection}`}>
                    <div className={styles.sectionLabel}>Andere Märkte</div>
                    {otherUncompletedMarkets.map((market) => (
                      <button
                        key={market.id}
                        className={`${styles.dropdownItem} ${styles.otherMarket}`}
                        onClick={() => handleMarketSelect(market.id)}
                      >
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{market.chain}</div>
                          <div className={styles.itemAddress}>
                            {market.address}, {market.postalCode} {market.city}
                          </div>
                        </div>
                      </button>
                    ))}
                    {otherCompletedMarkets.map((market) => (
                      <button
                        key={market.id}
                        className={`${styles.dropdownItem} ${styles.completed} ${styles.otherMarket}`}
                        onClick={() => handleMarketSelect(market.id)}
                      >
                        <div className={styles.completedCheck}>
                          <Check size={14} weight="bold" color="white" />
                        </div>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{market.chain}</div>
                          <div className={styles.itemAddress}>
                            {market.address}, {market.postalCode} {market.city}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {uncompletedMarkets.length === 0 && completedMarkets.length === 0 && searchQuery && (
                  <div className={styles.noResults}>
                    Keine Märkte gefunden für "{searchQuery}"
                  </div>
                )}
              </div>
            )}
              </div>
            </>
          )}

          {/* Tour Selection with Live Summary */}
          {mode === 'tour' && tourStep === 'selection' && (
            <>
              {/* Market Selection Dropdown */}
              <div className={styles.dropdownContainer} ref={dropdownRef}>
                <label className={styles.dropdownLabel}>
                  Märkte für Tour auswählen
                </label>
            
                <button
                  className={`${styles.dropdownButton} ${isDropdownOpen ? styles.open : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className={selectedMarkets.length === 0 ? styles.dropdownPlaceholder : styles.dropdownText}>
                    {selectedMarkets.length === 0 
                      ? 'Märkte wählen...'
                      : `${selectedMarkets.length} ${selectedMarkets.length === 1 ? 'Markt' : 'Märkte'} ausgewählt`
                    }
                  </span>
                  <CaretDown size={16} className={styles.dropdownChevron} />
                </button>

                {isDropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    {/* Search Input */}
                    <div className={styles.searchContainer}>
                      <MagnifyingGlass size={16} className={styles.searchIcon} />
                      <input
                        ref={searchInputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder="Markt suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Meine Märkte */}
                    {myMarkets.length > 0 && (
                      <div className={styles.dropdownSection}>
                        <div className={styles.sectionLabel}>Meine Märkte</div>
                        {myUncompletedMarkets.map((market) => (
                          <button
                            key={market.id}
                            className={`${styles.dropdownItem} ${
                              selectedMarkets.includes(market.id) ? styles.selected : ''
                            }`}
                            onClick={() => handleMarketSelect(market.id)}
                          >
                            <div className={styles.itemCheck}>
                              {selectedMarkets.includes(market.id) && (
                                <Check size={14} weight="bold" color="white" />
                              )}
                            </div>
                            <div className={styles.itemInfo}>
                              <div className={styles.itemName}>{market.chain}</div>
                              <div className={styles.itemAddress}>
                                {market.address}, {market.postalCode} {market.city}
                              </div>
                            </div>
                          </button>
                        ))}
                        {myCompletedMarkets.map((market) => (
                          <button
                            key={market.id}
                            className={`${styles.dropdownItem} ${styles.completed} ${
                              selectedMarkets.includes(market.id) ? styles.selected : ''
                            }`}
                            onClick={() => handleMarketSelect(market.id)}
                          >
                            <div className={styles.completedCheck}>
                              <Check size={14} weight="bold" color="white" />
                            </div>
                            <div className={styles.itemInfo}>
                              <div className={styles.itemName}>{market.chain}</div>
                              <div className={styles.itemAddress}>
                                {market.address}, {market.postalCode} {market.city}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Andere Märkte */}
                    {otherMarkets.length > 0 && (
                      <div className={`${styles.dropdownSection} ${styles.otherMarketsSection}`}>
                        <div className={styles.sectionLabel}>Andere Märkte</div>
                        {otherUncompletedMarkets.map((market) => (
                          <button
                            key={market.id}
                            className={`${styles.dropdownItem} ${styles.otherMarket} ${
                              selectedMarkets.includes(market.id) ? styles.selected : ''
                            }`}
                            onClick={() => handleMarketSelect(market.id)}
                          >
                            <div className={styles.itemCheck}>
                              {selectedMarkets.includes(market.id) && (
                                <Check size={14} weight="bold" color="white" />
                              )}
                            </div>
                            <div className={styles.itemInfo}>
                              <div className={styles.itemName}>{market.chain}</div>
                              <div className={styles.itemAddress}>
                                {market.address}, {market.postalCode} {market.city}
                              </div>
                            </div>
                          </button>
                        ))}
                        {otherCompletedMarkets.map((market) => (
                          <button
                            key={market.id}
                            className={`${styles.dropdownItem} ${styles.completed} ${styles.otherMarket} ${
                              selectedMarkets.includes(market.id) ? styles.selected : ''
                            }`}
                            onClick={() => handleMarketSelect(market.id)}
                          >
                            <div className={styles.completedCheck}>
                              <Check size={14} weight="bold" color="white" />
                            </div>
                            <div className={styles.itemInfo}>
                              <div className={styles.itemName}>{market.chain}</div>
                              <div className={styles.itemAddress}>
                                {market.address}, {market.postalCode} {market.city}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {uncompletedMarkets.length === 0 && completedMarkets.length === 0 && searchQuery && (
                      <div className={styles.noResults}>
                        Keine Märkte gefunden für "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Summary */}
              {selectedMarkets.length > 0 && (
                <div className={styles.tourSummaryStep}>
                  <div className={styles.summaryHeader}>
                    <div>
                      <h3 className={styles.summaryTitle}>Ausgewählte Märkte</h3>
                      <p className={styles.summarySubtitle}>
                        {selectedMarkets.length} {selectedMarkets.length === 1 ? 'Markt' : 'Märkte'} für Ihre Tour
                      </p>
                    </div>
                    {transportMode && (
                      <div className={styles.selectedTransportIcon}>
                        {transportMode === 'car' ? (
                          <Car size={24} weight="fill" color="#1a1a1a" />
                        ) : (
                          <Train size={24} weight="fill" color="#1a1a1a" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.summaryMarkets}>
                    <AnimatedListWrapper delay={50}>
                      {selectedMarkets.map((marketId, index) => {
                        const market = markets.find(m => m.id === marketId);
                        if (!market) return null;
                        
                        return (
                          <div key={marketId} className={styles.summaryMarketItem}>
                            <div className={styles.summaryMarketNumber}>{index + 1}</div>
                            <div className={styles.summaryMarketInfo}>
                              <div className={styles.summaryMarketName}>{market.chain}</div>
                              <div className={styles.summaryMarketAddress}>
                                {market.address}, {market.postalCode} {market.city}
                              </div>
                            </div>
                          </div>
                        );
                      }).filter((item): item is React.ReactElement => item !== null)}
                    </AnimatedListWrapper>
                  </div>

                </div>
              )}
            </>
          )}

          {/* Tour Summary Step - REMOVED */}
          {mode === 'tour' && tourStep === 'summary' && (
            <div className={styles.tourSummaryStep}>
              <div className={styles.summaryHeader}>
                <h3 className={styles.summaryTitle}>Ausgewählte Märkte</h3>
                <p className={styles.summarySubtitle}>
                  {selectedMarkets.length} {selectedMarkets.length === 1 ? 'Markt' : 'Märkte'} für Ihre Tour
                </p>
              </div>
              
              <div className={styles.summaryMarkets}>
                {selectedMarkets.map((marketId, index) => {
                  const market = markets.find(m => m.id === marketId);
                  if (!market) return null;
                  
                  return (
                    <div key={marketId} className={styles.summaryMarketItem}>
                      <div className={styles.summaryMarketNumber}>{index + 1}</div>
                      <div className={styles.summaryMarketInfo}>
                        <div className={styles.summaryMarketName}>{market.chain}</div>
                        <div className={styles.summaryMarketAddress}>
                          {market.address}, {market.postalCode} {market.city}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.summaryEstimate}>
                <div className={styles.estimateIcon}>⏱️</div>
                <div className={styles.estimateText}>
                  Die optimale Route wird berechnet...
                </div>
              </div>
            </div>
          )}

          {/* Tour Optimizing Step */}
          {mode === 'tour' && tourStep === 'optimizing' && (
            <div className={styles.optimizingContainer}>
              <RingLoader color="#3B82F6" size={80} />
              <h3 className={styles.optimizingTitle}>Perfekte Route wird berechnet</h3>
              <p className={styles.optimizingText}>
                Berechnung der perfekten Route...
              </p>
            </div>
          )}

          {/* Tour Completed Step */}
          {mode === 'tour' && tourStep === 'completed' && (
            <div className={styles.optimizingContainer}>
              <div className={styles.completedAnimation}>
                <div className={styles.completedPulse}></div>
                <div className={styles.completedCircle}>
                  <Check size={40} weight="bold" />
                </div>
              </div>
              <h3 className={styles.optimizingTitle}>Route berechnet!</h3>
              <p className={styles.optimizingText}>
                Ihre optimale Route ist bereit
              </p>
            </div>
          )}

          {/* Tour Result Step */}
          {mode === 'tour' && tourStep === 'result' && optimizedRoute && (
            <div className={styles.tourSummary}>
              <div className={styles.tourHeader}>
                <Path size={20} weight="bold" />
                Perfekte Route
              </div>
              
              <div className={styles.tourStats}>
                <div className={styles.tourStat}>
                  <span className={styles.tourStatLabel}>Märkte</span>
                  <span className={styles.tourStatValue}>{optimizedRoute.markets.length}</span>
                </div>
                <div className={styles.tourStat}>
                  <span className={styles.tourStatLabel}>Fahrzeit</span>
                  <span className={styles.tourStatValue}>{formatTime(optimizedRoute.totalDrivingTime)}</span>
                </div>
                <div className={styles.tourStat}>
                  <span className={styles.tourStatLabel}>Gesamtzeit</span>
                  <span className={styles.tourStatValue}>{formatTime(optimizedRoute.totalTime)}</span>
                </div>
              </div>

              <div className={styles.selectedMarkets}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                >
                  <SortableContext
                    items={sortedMarketIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedMarketIds.map((marketId, index) => {
                      const market = markets.find(m => m.id === marketId);
                      if (!market) return null;

                      return (
                        <SortableMarketItem
                          key={marketId}
                          marketId={marketId}
                          index={index}
                          market={market}
                          transportMode={transportMode}
                          isLast={index === sortedMarketIds.length - 1}
                          formatTime={formatTime}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {mode === 'tour' && tourStep === 'result' && (
            <button 
              className={`${styles.button} ${styles.buttonSecondary}`} 
              onClick={() => {
                setTourStep('selection');
                setOptimizedRoute(null);
              }}
            >
              Zurück
            </button>
          )}
          {!(mode === 'tour' && (tourStep === 'optimizing' || tourStep === 'completed')) && (
            <>
              {!(mode === 'tour' && tourStep === 'result') && (
                <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={onClose}>
                  Abbrechen
                </button>
              )}
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleStartClick}
                disabled={!canStart}
              >
                {mode === 'single' ? (
                  <>
                    <MapPin size={18} weight="bold" />
                    {getButtonText()}
                  </>
                ) : (
                  <>
                    <Path size={18} weight="bold" />
                    {getButtonText()}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transport Mode Selection Modal */}
      {showTransportModal && (
        <div className={styles.transportModalOverlay} onClick={(e) => e.stopPropagation()}>
          <div className={styles.transportModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.transportTitle}>Transportmittel wählen</h3>
            <p className={styles.transportSubtitle}>Wie möchten Sie reisen?</p>
            
            <div className={styles.transportOptions}>
              <button
                className={styles.transportOption}
                onClick={() => handleTransportSelect('car')}
              >
                <div className={styles.transportIconCircle}>
                  <Car size={32} weight="fill" />
                </div>
              </button>
              
              <button
                className={styles.transportOption}
                onClick={() => handleTransportSelect('train')}
              >
                <div className={styles.transportIconCircle}>
                  <Train size={32} weight="fill" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

