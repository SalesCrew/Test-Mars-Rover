import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, FunnelSimple, X, CaretDown, CaretUp } from '@phosphor-icons/react';
import AnimatedList from '../gl/AnimatedList';
import { MarketListItem } from './MarketListItem';
import { MarketDetailsModal } from './MarketDetailsModal';
import { GLFilterCard } from './GLFilterCard';
import { adminMarkets } from '../../data/adminMarketsData';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketsPage.module.css';

type FilterType = 'chain' | 'id' | 'adresse' | 'gebietsleiter' | 'subgroup' | 'status';

export const MarketsPage: React.FC = () => {
  const [, setMarkets] = useState<AdminMarket[]>(adminMarkets);
  const [selectedMarket, setSelectedMarket] = useState<AdminMarket | null>(null);
  const [hoveredMarket, setHoveredMarket] = useState<AdminMarket | null>(null);
  const [selectedGL, setSelectedGL] = useState<string | null>(null);
  const [isGLSectionCollapsed, setIsGLSectionCollapsed] = useState(false);
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null);
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

  // marketIds not needed anymore - using otherMarkets.map directly

  // Get unique values for each filter
  const uniqueChains = [...new Set(adminMarkets.map(m => m.chain))].sort();
  const uniqueIDs = [...new Set(adminMarkets.map(m => m.internalId))].sort();
  const uniqueAddresses = [...new Set(adminMarkets.map(m => `${m.address}, ${m.postalCode} ${m.city}`))].sort();
  const uniqueGLs = [...new Set(adminMarkets.map(m => m.gebietsleiter).filter(Boolean))].sort() as string[];
  const uniqueSubgroups = [...new Set(adminMarkets.map(m => m.subgroup).filter(Boolean))].sort();
  const statusOptions = ['Aktiv', 'Inaktiv'];

  // Filter options based on search term
  const getFilteredOptions = (type: FilterType, options: string[]) => {
    const search = searchTerms[type].toLowerCase();
    return options.filter(option => option.toLowerCase().includes(search));
  };

  // Apply filters to markets - Memoized for performance
  // When GL is selected, we show ALL markets but separate them
  const filteredMarkets = useMemo(() => {
    return adminMarkets.filter(market => {
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
  }, [selectedFilters, selectedGL]);

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

  // Update markets state when filters change
  useEffect(() => {
    setMarkets(combinedMarkets);
  }, [combinedMarkets]);

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

  const handleMarketClick = (market: AdminMarket) => {
    setSelectedMarket(market);
  };

  const handleCloseModal = () => {
    setSelectedMarket(null);
  };

  const handleSaveMarket = (updatedMarket: AdminMarket) => {
    setMarkets(prevMarkets => 
      prevMarkets.map(m => m.id === updatedMarket.id ? updatedMarket : m)
    );
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

  const handleSearchChange = (type: FilterType, value: string) => {
    setSearchTerms(prev => ({ ...prev, [type]: value }));
  };

  const handleGLSelect = (gl: string) => {
    // Toggle GL selection
    setSelectedGL(selectedGL === gl ? null : gl);
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
        {combinedMarkets.length === 0 && !selectedGL ? (
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
            <AnimatedList
              items={allDisplayMarkets.map(m => m.id)}
              showGradients={true}
              enableArrowNavigation={false}
              displayScrollbar={false}
              className={styles.marketsList}
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
            </AnimatedList>
          </div>
        )}
      </div>

      {/* Market Details Modal */}
      {selectedMarket && (
        <MarketDetailsModal
          market={selectedMarket}
          onClose={handleCloseModal}
          onSave={handleSaveMarket}
        />
      )}
    </div>
  );
};

