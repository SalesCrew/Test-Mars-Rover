import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, FunnelSimple, X, CaretDown, CaretUp, WarningCircle } from '@phosphor-icons/react';
import VirtualizedAnimatedList from '../gl/VirtualizedAnimatedList';
import { MarketListItem } from './MarketListItem';
import { MarketListSkeleton } from './MarketListSkeleton';
import { MarketDetailsModal } from './MarketDetailsModal';
import { GLFilterCard } from './GLFilterCard';
import type { ActionLogEntry } from './GLFilterCard';
import { adminMarkets } from '../../data/adminMarketsData';
import { marketService } from '../../services/marketService';
import { actionHistoryService } from '../../services/actionHistoryService';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketsPage.module.css';

type FilterType = 'chain' | 'id' | 'adresse' | 'gebietsleiter' | 'subgroup' | 'status';

interface MarketsPageProps {
  importedMarkets?: AdminMarket[];
}

export const MarketsPage: React.FC<MarketsPageProps> = ({ importedMarkets = [] }) => {
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<AdminMarket | null>(null);
  const [hoveredMarket, setHoveredMarket] = useState<AdminMarket | null>(null);
  const [selectedGL, setSelectedGL] = useState<string | null>(null);
  const [isGLSectionCollapsed, setIsGLSectionCollapsed] = useState(false);
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);
  const [activeMode, setActiveMode] = useState<'add' | 'remove' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [processingType, setProcessingType] = useState<'assign' | 'swap' | 'remove' | undefined>(undefined);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [searchTerms, setSearchTerms] = useState<Record<FilterType, string>>({
    chain: '',
    id: '',
    adresse: '',
    gebietsleiter: '',
    subgroup: '',
    status: ''
  });
  const [selectedFilters, setSelectedFilters] = useState<{
    chain: string[];
    id: string[];
    adresse: string[];
    gebietsleiter: string[];
    subgroup: string[];
    status: string[];
  }>({
    chain: [],
    id: [],
    adresse: [],
    gebietsleiter: [],
    subgroup: [],
    status: []
  });

  const filterRefs = {
    chain: useRef<HTMLDivElement>(null),
    id: useRef<HTMLDivElement>(null),
    adresse: useRef<HTMLDivElement>(null),
    gebietsleiter: useRef<HTMLDivElement>(null),
    subgroup: useRef<HTMLDivElement>(null),
    status: useRef<HTMLDivElement>(null)
  };

  // Load markets from database on mount
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        console.log('🔄 MarketsPage: Starting to load markets...');
        setIsLoadingMarkets(true);
        setLoadError(null);
        const fetchedMarkets = await marketService.getAllMarkets();
        console.log('✅ MarketsPage: Loaded markets:', fetchedMarkets.length);
        console.log('📊 First market:', fetchedMarkets[0]);
        setMarkets(fetchedMarkets);
      } catch (error) {
        console.error('Failed to load markets:', error);
        setLoadError('Fehler beim Laden der Märkte. Verwende lokale Daten.');
        // Fallback to local data if API fails
        setMarkets(adminMarkets);
      } finally {
        setIsLoadingMarkets(false);
      }
    };

    loadMarkets();
  }, []);

  // Handle imported markets
  useEffect(() => {
    if (importedMarkets.length > 0) {
      const importNewMarkets = async () => {
        try {
          // Import to database
          await marketService.importMarkets(importedMarkets);
          
          // Reload markets from database to get the latest data
          const updatedMarkets = await marketService.getAllMarkets();
          setMarkets(updatedMarkets);
        } catch (error) {
          console.error('Failed to import markets to database:', error);
          
          // Fallback: Add to local state
          setMarkets(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMarkets = importedMarkets.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMarkets];
          });
        }
      };

      importNewMarkets();
    }
  }, [importedMarkets]);

  // marketIds not needed anymore - using otherMarkets.map directly

  // Get unique values for each filter
  const uniqueChains = [...new Set(markets.map(m => m.chain))].sort();
  const uniqueIDs = [...new Set(markets.map(m => m.internalId))].sort();
  const uniqueAddresses = [...new Set(markets.map(m => `${m.address}, ${m.postalCode} ${m.city}`))].sort();
  const uniqueGLs = [...new Set([...markets.map(m => m.gebietsleiter).filter(Boolean), 'Daniel D.', 'Markus M.', 'Stefan S.', 'Lisa L.', 'Thomas T.', 'Anna A.', 'Michael M.', 'Julia J.'])].sort() as string[];
  const uniqueSubgroups = [...new Set(markets.map(m => m.subgroup).filter(Boolean))].sort();
  const statusOptions = ['Aktiv', 'Inaktiv'];

  // Filter options based on search term
  const getFilteredOptions = (type: FilterType, options: string[]) => {
    const search = searchTerms[type].toLowerCase();
    
    // Special handling for address filter - split search into multiple terms
    if (type === 'adresse' && search.trim()) {
      const searchWords = search.trim().split(/\s+/); // Split by whitespace
      
      return options.filter(option => {
        const optionLower = option.toLowerCase();
        // Check if ALL search words are found somewhere in the address
        return searchWords.every(word => optionLower.includes(word));
      });
    }
    
    // Default behavior for other filters
    return options.filter(option => option.toLowerCase().includes(search));
  };

  // Apply filters to markets - Memoized for performance
  // When GL is selected, we show ALL markets but separate them
  const filteredMarkets = useMemo(() => {
    return markets.filter(market => {
      // DON'T filter by GL here anymore - we'll separate them in the render

      // Check chain filter
      if (selectedFilters.chain.length > 0 && !selectedFilters.chain.includes(market.chain)) {
        return false;
      }

      // Check ID filter
      if (selectedFilters.id.length > 0 && !selectedFilters.id.includes(market.internalId)) {
        return false;
      }

      // Check address filter
      const marketAddress = `${market.address}, ${market.postalCode} ${market.city}`;
      if (selectedFilters.adresse.length > 0 && !selectedFilters.adresse.includes(marketAddress)) {
        return false;
      }

      // Check Gebietsleiter filter (only apply when not using GLFilterCard)
      if (!selectedGL && selectedFilters.gebietsleiter.length > 0 && 
          (!market.gebietsleiter || !selectedFilters.gebietsleiter.includes(market.gebietsleiter))) {
        return false;
      }

      // Check Subgroup filter
      if (selectedFilters.subgroup.length > 0 && 
          (!market.subgroup || !selectedFilters.subgroup.includes(market.subgroup))) {
        return false;
      }

      // Check Status filter
      if (selectedFilters.status.length > 0) {
        const marketStatus = market.isActive ? 'Aktiv' : 'Inaktiv';
        if (!selectedFilters.status.includes(marketStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [markets, selectedFilters, selectedGL]);

  // Separate markets into GL's markets and other markets
  const glMarkets = useMemo(() => {
    if (!selectedGL) return [];
    return filteredMarkets.filter(m => m.gebietsleiter === selectedGL);
  }, [filteredMarkets, selectedGL]);

  const otherMarkets = useMemo(() => {
    if (!selectedGL) return filteredMarkets;
    return filteredMarkets.filter(m => m.gebietsleiter !== selectedGL);
  }, [filteredMarkets, selectedGL]);

  // Calculate stats based on GL's markets when selected, otherwise all filtered
  const displayMarkets = selectedGL ? glMarkets : filteredMarkets;
  const totalMarkets = displayMarkets.length;
  const activeMarkets = displayMarkets.filter(m => m.isActive).length;
  const inactiveMarkets = totalMarkets - activeMarkets;

  // Combine markets for display: GL markets first (if expanded), then others
  const combinedMarkets = useMemo(() => {
    if (!selectedGL || isGLSectionCollapsed) {
      return otherMarkets;
    }
    return [...glMarkets, ...otherMarkets];
  }, [selectedGL, isGLSectionCollapsed, glMarkets, otherMarkets]);

  // All markets to display in the single scrollable list
  const allDisplayMarkets = useMemo(() => {
    if (!selectedGL) return filteredMarkets;
    if (isGLSectionCollapsed) return otherMarkets;
    return [...glMarkets, ...otherMarkets];
  }, [selectedGL, isGLSectionCollapsed, filteredMarkets, glMarkets, otherMarkets]);

  // Click outside handler
  useEffect(() => {
    if (!openFilter) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is inside any filter dropdown
      const clickedInsideDropdown = Object.values(filterRefs).some(
        ref => ref.current && ref.current.contains(target)
      );
      
      if (!clickedInsideDropdown) {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFilter]);

  const handleMarketClick = async (market: AdminMarket) => {
    // If in add mode and a GL is selected
    if (activeMode === 'add' && selectedGL) {
      // Check if market already has a GL (swap) or not (assign)
      const willSwap = market.gebietsleiter && market.gebietsleiter !== selectedGL;
      
      setProcessingType(willSwap ? 'swap' : 'assign');
      setIsProcessing(true);
      setShowCheckmark(false);
      
      // Simulate API delay
      setTimeout(async () => {
        const logEntry: ActionLogEntry = {
          id: `log-${Date.now()}`,
          chain: market.chain,
          address: `${market.address}, ${market.postalCode}`,
          type: 'assign',
          previousGl: undefined
        };

        // Check if market already has a GL
        if (market.gebietsleiter && market.gebietsleiter !== selectedGL) {
          // Swap action
          logEntry.type = 'swap';
          logEntry.previousGl = market.gebietsleiter;
        } else if (market.gebietsleiter === selectedGL) {
          // Already assigned to this GL - do nothing
          setIsProcessing(false);
          setProcessingType(undefined);
          return;
        }

        const updatedMarket = { ...market, gebietsleiter: selectedGL };

        try {
          // Update in database
          await marketService.updateMarket(market.id, updatedMarket);
        } catch (error) {
          console.error('Failed to update market GL:', error);
        }

        // Update the market's GL in local state
        setMarkets(prevMarkets => 
          prevMarkets.map(m => 
            m.id === market.id ? updatedMarket : m
          )
        );

        // For assign type, show checkmark before fading
        if (logEntry.type === 'assign') {
          setShowCheckmark(true);
          setTimeout(() => {
            // Fade out preview
            setIsFadingOut(true);
            setTimeout(async () => {
              setActionLogs(prev => [logEntry, ...prev]);
              
              // Save to database
              try {
                await actionHistoryService.createHistoryEntry({
                  action_type: logEntry.type,
                  market_id: market.id,
                  market_chain: market.chain,
                  market_address: market.address,
                  market_postal_code: market.postalCode,
                  market_city: market.city,
                  target_gl: selectedGL,
                  previous_gl: logEntry.previousGl,
                });
              } catch (error) {
                console.error('Failed to save action history:', error);
              }
              
              setIsProcessing(false);
              setIsFadingOut(false);
              setProcessingType(undefined);
              setShowCheckmark(false);
            }, 300); // Fade out duration
          }, 400); // Show checkmark for 400ms
        } else {
          // For swap, fade out immediately
          setIsFadingOut(true);
          setTimeout(async () => {
            setActionLogs(prev => [logEntry, ...prev]);
            
            // Save to database
            try {
              await actionHistoryService.createHistoryEntry({
                action_type: logEntry.type,
                market_id: market.id,
                market_chain: market.chain,
                market_address: market.address,
                market_postal_code: market.postalCode,
                market_city: market.city,
                target_gl: selectedGL,
                previous_gl: logEntry.previousGl,
              });
            } catch (error) {
              console.error('Failed to save action history:', error);
            }
            
            setIsProcessing(false);
            setIsFadingOut(false);
            setProcessingType(undefined);
          }, 300); // Fade out duration
        }
      }, 800);
      return;
    }

    // If in remove mode and a GL is selected
    if (activeMode === 'remove' && selectedGL) {
      // Can only remove markets assigned to the selected GL
      if (market.gebietsleiter !== selectedGL) {
        return; // Can't remove other GL's markets
      }

      setProcessingType('remove');
      setIsProcessing(true);
      
      // Simulate API delay
      setTimeout(async () => {
        const logEntry: ActionLogEntry = {
          id: `log-${Date.now()}`,
          chain: market.chain,
          address: `${market.address}, ${market.postalCode}`,
          type: 'remove'
        };

        const updatedMarket = { ...market, gebietsleiter: undefined };

        try {
          // Update in database
          await marketService.updateMarket(market.id, updatedMarket);
        } catch (error) {
          console.error('Failed to remove market GL:', error);
        }

        // Update the market to remove GL in local state
        setMarkets(prevMarkets => 
          prevMarkets.map(m => 
            m.id === market.id ? updatedMarket : m
          )
        );

        // Fade out preview
        setIsFadingOut(true);
        setTimeout(async () => {
          setActionLogs(prev => [logEntry, ...prev]);
          
          // Save to database
          try {
            await actionHistoryService.createHistoryEntry({
              action_type: 'remove',
              market_id: market.id,
              market_chain: market.chain,
              market_address: market.address,
              market_postal_code: market.postalCode,
              market_city: market.city,
              target_gl: selectedGL,
            });
          } catch (error) {
            console.error('Failed to save action history:', error);
          }
          
          setIsProcessing(false);
          setIsFadingOut(false);
          setProcessingType(undefined);
        }, 300); // Fade out duration
      }, 800);
      return;
    }

    // Default behavior - open modal
    setSelectedMarket(market);
  };

  const handleModeChange = (mode: 'add' | 'remove' | null) => {
    setActiveMode(mode);
    // Don't clear action logs when switching modes - only clear when GL is deselected
  };

  const handleCloseModal = () => {
    setSelectedMarket(null);
  };

  const handleSaveMarket = async (updatedMarket: AdminMarket) => {
    try {
      // Save to database
      await marketService.updateMarket(updatedMarket.id, updatedMarket);
      
      // Update local state
      setMarkets(prevMarkets => 
        prevMarkets.map(m => m.id === updatedMarket.id ? updatedMarket : m)
      );
    } catch (error) {
      console.error('Failed to save market:', error);
      // Still update local state as fallback
      setMarkets(prevMarkets => 
        prevMarkets.map(m => m.id === updatedMarket.id ? updatedMarket : m)
      );
    }
  };

  const toggleFilter = (type: FilterType) => {
    setOpenFilter(openFilter === type ? null : type);
  };

  const handleFilterChange = (type: FilterType, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const handleSelectAll = (filterType: FilterType, allOptions: string[]) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: allOptions
    }));
  };

  const isAllSelected = (filterType: FilterType, allOptions: string[]) => {
    return selectedFilters[filterType].length === allOptions.length && allOptions.length > 0;
  };

  const handleSearchChange = (type: FilterType, value: string) => {
    setSearchTerms(prev => ({ ...prev, [type]: value }));
  };

  const handleGLSelect = (gl: string) => {
    // Toggle GL selection
    const newGL = selectedGL === gl ? null : gl;
    setSelectedGL(newGL);
    // Clear action logs and mode when GL changes
    if (newGL !== selectedGL) {
      setActionLogs([]);
      setActiveMode(null);
    }
  };

  const handleClearAllFilters = () => {
    setSelectedGL(null);
    setSelectedFilters({
      chain: [],
      id: [],
      adresse: [],
      gebietsleiter: [],
      subgroup: [],
      status: []
    });
    setSearchTerms({
      chain: '',
      id: '',
      adresse: '',
      gebietsleiter: '',
      subgroup: '',
      status: ''
    });
  };

  const hasActiveFilters = selectedGL !== null || 
    Object.values(selectedFilters).some(arr => arr.length > 0);

  return (
    <div className={styles.pageContainer}>
      {/* GL Filter Card */}
      <GLFilterCard
        totalMarkets={totalMarkets}
        activeMarkets={activeMarkets}
        inactiveMarkets={inactiveMarkets}
        gebietsleiter={uniqueGLs}
        selectedGL={selectedGL}
        onGLSelect={handleGLSelect}
        hoveredMarket={hoveredMarket}
        actionLogs={actionLogs}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        isProcessing={isProcessing}
        isFadingOut={isFadingOut}
        processingType={processingType}
        showCheckmark={showCheckmark}
      />

      {/* Markets List Container */}
      <div className={styles.listContainer}>
        {/* List Header */}
        <div className={styles.listHeader}>
          <div ref={filterRefs.chain} className={`${styles.headerCell} ${selectedFilters.chain.length > 0 ? styles.headerCellActive : ''}`}>
            <span>Handelskette</span>
            <button 
              className={`${styles.filterButton} ${selectedFilters.chain.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => toggleFilter('chain')}
            >
              <FunnelSimple size={14} weight="bold" />
            </button>
            {openFilter === 'chain' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.chain}
                    onChange={(e) => handleSearchChange('chain', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('chain', uniqueChains)}
                    onChange={() => {
                      if (isAllSelected('chain', uniqueChains)) {
                        setSelectedFilters(prev => ({ ...prev, chain: [] }));
                      } else {
                        handleSelectAll('chain', uniqueChains);
                      }
                    }}
                  />
                  <span><strong>Alle</strong></span>
                </label>
                {getFilteredOptions('chain', uniqueChains).map(chain => (
                  <label key={chain} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.chain.includes(chain)}
                      onChange={() => handleFilterChange('chain', chain)}
                    />
                    <span>{chain}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <div ref={filterRefs.id} className={`${styles.headerCell} ${selectedFilters.id.length > 0 ? styles.headerCellActive : ''}`}>
            <span>ID</span>
            <button 
              className={`${styles.filterButton} ${selectedFilters.id.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => toggleFilter('id')}
            >
              <FunnelSimple size={14} weight="bold" />
            </button>
            {openFilter === 'id' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.id}
                    onChange={(e) => handleSearchChange('id', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('id', uniqueIDs)}
                    onChange={() => {
                      if (isAllSelected('id', uniqueIDs)) {
                        setSelectedFilters(prev => ({ ...prev, id: [] }));
                      } else {
                        handleSelectAll('id', uniqueIDs);
                      }
                    }}
                  />
                  <span><strong>Alle</strong></span>
                </label>
                {getFilteredOptions('id', uniqueIDs).map(id => (
                  <label key={id} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.id.includes(id)}
                      onChange={() => handleFilterChange('id', id)}
                    />
                    <span>{id}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <div ref={filterRefs.adresse} className={`${styles.headerCell} ${selectedFilters.adresse.length > 0 ? styles.headerCellActive : ''}`}>
            <span>Adresse</span>
            <button 
              className={`${styles.filterButton} ${selectedFilters.adresse.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => toggleFilter('adresse')}
            >
              <FunnelSimple size={14} weight="bold" />
            </button>
            {openFilter === 'adresse' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.adresse}
                    onChange={(e) => handleSearchChange('adresse', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('adresse', uniqueAddresses)}
                    onChange={() => {
                      if (isAllSelected('adresse', uniqueAddresses)) {
                        setSelectedFilters(prev => ({ ...prev, adresse: [] }));
                      } else {
                        handleSelectAll('adresse', uniqueAddresses);
                      }
                    }}
                  />
                  <span><strong>Alle</strong></span>
                </label>
                {getFilteredOptions('adresse', uniqueAddresses).map(address => (
                  <label key={address} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.adresse.includes(address)}
                      onChange={() => handleFilterChange('adresse', address)}
                    />
                    <span>{address}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <div ref={filterRefs.gebietsleiter} className={`${styles.headerCell} ${selectedFilters.gebietsleiter.length > 0 ? styles.headerCellActive : ''}`}>
            <span>Gebietsleiter</span>
            <button 
              className={`${styles.filterButton} ${selectedFilters.gebietsleiter.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => toggleFilter('gebietsleiter')}
            >
              <FunnelSimple size={14} weight="bold" />
            </button>
            {openFilter === 'gebietsleiter' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.gebietsleiter}
                    onChange={(e) => handleSearchChange('gebietsleiter', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('gebietsleiter', uniqueGLs as string[])}
                    onChange={() => {
                      if (isAllSelected('gebietsleiter', uniqueGLs as string[])) {
                        setSelectedFilters(prev => ({ ...prev, gebietsleiter: [] }));
                      } else {
                        handleSelectAll('gebietsleiter', uniqueGLs as string[]);
                      }
                    }}
                  />
                  <span><strong>Alle</strong></span>
                </label>
                {getFilteredOptions('gebietsleiter', uniqueGLs as string[]).map(gl => (
                  <label key={gl} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.gebietsleiter.includes(gl)}
                      onChange={() => handleFilterChange('gebietsleiter', gl)}
                    />
                    <span>{gl}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <div ref={filterRefs.subgroup} className={`${styles.headerCell} ${selectedFilters.subgroup.length > 0 ? styles.headerCellActive : ''}`}>
            <span>Subgroup</span>
            <button 
              className={`${styles.filterButton} ${selectedFilters.subgroup.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => toggleFilter('subgroup')}
            >
              <FunnelSimple size={14} weight="bold" />
            </button>
            {openFilter === 'subgroup' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.subgroup}
                    onChange={(e) => handleSearchChange('subgroup', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('subgroup', uniqueSubgroups as string[])}
                    onChange={() => {
                      if (isAllSelected('subgroup', uniqueSubgroups as string[])) {
                        setSelectedFilters(prev => ({ ...prev, subgroup: [] }));
                      } else {
                        handleSelectAll('subgroup', uniqueSubgroups as string[]);
                      }
                    }}
                  />
                  <span><strong>Alle</strong></span>
                </label>
                {getFilteredOptions('subgroup', uniqueSubgroups as string[]).map(subgroup => (
                  <label key={subgroup} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.subgroup.includes(subgroup)}
                      onChange={() => handleFilterChange('subgroup', subgroup)}
                    />
                    <span>{subgroup}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.headerCell}></div>
          <div className={styles.headerCell}>Frequenz</div>
          
          <div ref={filterRefs.status} className={`${styles.headerCell} ${selectedFilters.status.length > 0 ? styles.headerCellActive : ''}`}>
            <span>Status</span>
            <button 
              className={`${styles.filterButton} ${selectedFilters.status.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => toggleFilter('status')}
            >
              <FunnelSimple size={14} weight="bold" />
            </button>
            {openFilter === 'status' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.status}
                    onChange={(e) => handleSearchChange('status', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('status', statusOptions)}
                    onChange={() => {
                      if (isAllSelected('status', statusOptions)) {
                        setSelectedFilters(prev => ({ ...prev, status: [] }));
                      } else {
                        handleSelectAll('status', statusOptions);
                      }
                    }}
                  />
                  <span><strong>Alle</strong></span>
                </label>
                {getFilteredOptions('status', statusOptions).map(status => (
                  <label 
                    key={status} 
                    className={`${styles.filterOption} ${status === 'Aktiv' ? styles.filterOptionActive : styles.filterOptionInactive}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFilters.status.includes(status)}
                      onChange={() => handleFilterChange('status', status)}
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {/* Clear All Filters Button */}
          {hasActiveFilters && (
            <button 
              className={styles.clearFiltersButton}
              onClick={handleClearAllFilters}
              title="Alle Filter löschen"
            >
              <X size={10} weight="bold" />
            </button>
          )}
        </div>

        {/* Markets List */}
        {isLoadingMarkets ? (
          <div className={styles.marketsListWrapper}>
            <MarketListSkeleton />
          </div>
        ) : loadError ? (
          <div className={styles.errorState}>
            <WarningCircle size={48} weight="regular" />
            <span>{loadError}</span>
          </div>
        ) : combinedMarkets.length === 0 && !selectedGL ? (
          <div className={styles.emptyState}>
            <MapPin size={48} weight="regular" />
            <span>Keine Märkte vorhanden</span>
          </div>
        ) : (
          <div className={styles.marketsListWrapper}>
            {/* GL Section Header - Collapsible toggle */}
            {selectedGL && (
              <div 
                className={styles.glSectionToggle}
                onClick={() => setIsGLSectionCollapsed(!isGLSectionCollapsed)}
              >
                <span className={styles.glSectionText}>
                  {selectedGL}s Märkte: {glMarkets.length}
                </span>
                {isGLSectionCollapsed ? (
                  <CaretDown size={16} weight="bold" className={styles.glSectionChevron} />
                ) : (
                  <CaretUp size={16} weight="bold" className={styles.glSectionChevron} />
                )}
              </div>
            )}
            
            {/* All Markets in one list */}
            <VirtualizedAnimatedList
              key={selectedGL || 'all-markets'}
              items={allDisplayMarkets.map(m => m.id)}
              showGradients={true}
              enableArrowNavigation={false}
              displayScrollbar={false}
              className={styles.marketsList}
              estimateSize={56}
            >
              {(_item, index) => {
                const market = allDisplayMarkets[index];
                const isGLMarket = selectedGL && market.gebietsleiter === selectedGL && !isGLSectionCollapsed;
                return (
                  <div
                    onMouseEnter={() => setHoveredMarket(market)}
                    onMouseLeave={() => setHoveredMarket(null)}
                    className={isGLMarket ? styles.glMarketItem : undefined}
                  >
                    <MarketListItem market={market} onClick={handleMarketClick} />
                  </div>
                );
              }}
            </VirtualizedAnimatedList>
          </div>
        )}
      </div>

      {/* Market Details Modal */}
      {selectedMarket && (
        <MarketDetailsModal
          market={selectedMarket}
          allMarkets={markets}
          onClose={handleCloseModal}
          onSave={handleSaveMarket}
        />
      )}
    </div>
  );
};

