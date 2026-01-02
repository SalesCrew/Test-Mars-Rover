import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, FunnelSimple, MagnifyingGlass, CheckCircle, Storefront, CaretDown, CaretUp } from '@phosphor-icons/react';
import { marketService } from '../../services/marketService';
import type { AdminMarket } from '../../types/market-types';
import styles from './WelleMarketSelectorModal.module.css';

type FilterType = 'chain' | 'gebietsleiter' | 'subgroup' | 'status';

interface WelleMarketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMarketIds: string[];
  onConfirm: (marketIds: string[]) => void;
}

export const WelleMarketSelectorModal: React.FC<WelleMarketSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedMarketIds,
  onConfirm
}) => {
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedMarketIds);
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<FilterType, string>>({
    chain: '',
    gebietsleiter: '',
    subgroup: '',
    status: ''
  });
  const [selectedFilters, setSelectedFilters] = useState<{
    chain: string[];
    gebietsleiter: string[];
    subgroup: string[];
    status: string[];
  }>({
    chain: [],
    gebietsleiter: [],
    subgroup: [],
    status: []
  });

  const filterRefs = {
    chain: useRef<HTMLDivElement>(null),
    gebietsleiter: useRef<HTMLDivElement>(null),
    subgroup: useRef<HTMLDivElement>(null),
    status: useRef<HTMLDivElement>(null)
  };

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setIsLoading(true);
        const fetchedMarkets = await marketService.getAllMarkets();
        setMarkets(fetchedMarkets);
      } catch (error) {
        console.error('Failed to load markets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      loadMarkets();
    }
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilter) {
        const ref = filterRefs[openFilter];
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setOpenFilter(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter]);

  const handleFilterToggle = (type: FilterType, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  const handleSearchChange = (type: FilterType, value: string) => {
    setSearchTerms(prev => ({ ...prev, [type]: value }));
  };

  const getFilteredOptions = (type: FilterType, options: string[]) => {
    const term = searchTerms[type].toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(term));
  };

  const handleSelectAll = (type: FilterType, options: string[]) => {
    setSelectedFilters(prev => ({ ...prev, [type]: options }));
  };

  const isAllSelected = (type: FilterType, options: string[]) => {
    return options.length > 0 && options.every(opt => selectedFilters[type].includes(opt));
  };

  const filteredMarkets = markets.filter(market => {
    if (selectedFilters.chain.length > 0 && !selectedFilters.chain.includes(market.chain)) return false;
    if (selectedFilters.gebietsleiter.length > 0 && !selectedFilters.gebietsleiter.includes(market.gebietsleiterName || '')) return false;
    if (selectedFilters.subgroup.length > 0 && !selectedFilters.subgroup.includes(market.subgroup || '')) return false;
    if (selectedFilters.status.length > 0) {
      const statusValue = market.isActive ? 'Aktiv' : 'Inaktiv';
      if (!selectedFilters.status.includes(statusValue)) return false;
    }
    return true;
  });

  const uniqueChains = Array.from(new Set(markets.map(m => m.chain).filter(Boolean)));
  const uniqueGLs = Array.from(new Set(markets.map(m => m.gebietsleiterName).filter(Boolean)));
  const uniqueSubgroups = Array.from(new Set(markets.map(m => m.subgroup).filter(Boolean)));
  const statusOptions = ['Aktiv', 'Inaktiv'];

  const toggleMarketSelection = (marketId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(marketId)
        ? prev.filter(id => id !== marketId)
        : [...prev, marketId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredMarketIds = filteredMarkets.map(m => m.id);
    setTempSelectedIds(filteredMarketIds);
  };

  const handleConfirm = () => {
    onConfirm(tempSelectedIds);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <Storefront size={24} weight="bold" />
            <h3 className={styles.modalTitle}>Märkte auswählen</h3>
          </div>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            {/* Chain Filter */}
            <div className={styles.filterWrapper} ref={filterRefs.chain}>
              <button
                className={`${styles.filterButton} ${selectedFilters.chain.length > 0 ? styles.filterButtonActive : ''}`}
                onClick={() => setOpenFilter(openFilter === 'chain' ? null : 'chain')}
              >
                <FunnelSimple size={16} weight="bold" />
                <span>Kette {selectedFilters.chain.length > 0 && `(${selectedFilters.chain.length})`}</span>
                {openFilter === 'chain' ? <CaretUp size={14} /> : <CaretDown size={14} />}
              </button>
              {openFilter === 'chain' && (
                <div className={styles.filterDropdown}>
                  <div className={styles.searchInputWrapper}>
                    <MagnifyingGlass size={16} className={styles.searchIcon} />
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
                      checked={isAllSelected('chain', getFilteredOptions('chain', uniqueChains))}
                      onChange={() => {
                        if (isAllSelected('chain', getFilteredOptions('chain', uniqueChains))) {
                          setSelectedFilters(prev => ({ ...prev, chain: [] }));
                        } else {
                          handleSelectAll('chain', getFilteredOptions('chain', uniqueChains));
                        }
                      }}
                    />
                    <span className={styles.filterOptionLabel}><strong>Alle</strong></span>
                  </label>
                  {getFilteredOptions('chain', uniqueChains).map(chain => (
                    <label key={chain} className={styles.filterOption}>
                      <input
                        type="checkbox"
                        checked={selectedFilters.chain.includes(chain)}
                        onChange={() => handleFilterToggle('chain', chain)}
                      />
                      <span className={styles.filterOptionLabel}>{chain}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* GL Filter */}
            <div className={styles.filterWrapper} ref={filterRefs.gebietsleiter}>
              <button
                className={`${styles.filterButton} ${selectedFilters.gebietsleiter.length > 0 ? styles.filterButtonActive : ''}`}
                onClick={() => setOpenFilter(openFilter === 'gebietsleiter' ? null : 'gebietsleiter')}
              >
                <FunnelSimple size={16} weight="bold" />
                <span>GL {selectedFilters.gebietsleiter.length > 0 && `(${selectedFilters.gebietsleiter.length})`}</span>
                {openFilter === 'gebietsleiter' ? <CaretUp size={14} /> : <CaretDown size={14} />}
              </button>
              {openFilter === 'gebietsleiter' && (
                <div className={styles.filterDropdown}>
                  <div className={styles.searchInputWrapper}>
                    <MagnifyingGlass size={16} className={styles.searchIcon} />
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
                      checked={isAllSelected('gebietsleiter', getFilteredOptions('gebietsleiter', uniqueGLs))}
                      onChange={() => {
                        if (isAllSelected('gebietsleiter', getFilteredOptions('gebietsleiter', uniqueGLs))) {
                          setSelectedFilters(prev => ({ ...prev, gebietsleiter: [] }));
                        } else {
                          handleSelectAll('gebietsleiter', getFilteredOptions('gebietsleiter', uniqueGLs));
                        }
                      }}
                    />
                    <span className={styles.filterOptionLabel}><strong>Alle</strong></span>
                  </label>
                  {getFilteredOptions('gebietsleiter', uniqueGLs).map(gl => (
                    <label key={gl} className={styles.filterOption}>
                      <input
                        type="checkbox"
                        checked={selectedFilters.gebietsleiter.includes(gl)}
                        onChange={() => handleFilterToggle('gebietsleiter', gl)}
                      />
                      <span className={styles.filterOptionLabel}>{gl}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Subgroup Filter */}
            <div className={styles.filterWrapper} ref={filterRefs.subgroup}>
              <button
                className={`${styles.filterButton} ${selectedFilters.subgroup.length > 0 ? styles.filterButtonActive : ''}`}
                onClick={() => setOpenFilter(openFilter === 'subgroup' ? null : 'subgroup')}
              >
                <FunnelSimple size={16} weight="bold" />
                <span>Gruppe {selectedFilters.subgroup.length > 0 && `(${selectedFilters.subgroup.length})`}</span>
                {openFilter === 'subgroup' ? <CaretUp size={14} /> : <CaretDown size={14} />}
              </button>
              {openFilter === 'subgroup' && (
                <div className={styles.filterDropdown}>
                  <div className={styles.searchInputWrapper}>
                    <MagnifyingGlass size={16} className={styles.searchIcon} />
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
                      checked={isAllSelected('subgroup', getFilteredOptions('subgroup', uniqueSubgroups))}
                      onChange={() => {
                        if (isAllSelected('subgroup', getFilteredOptions('subgroup', uniqueSubgroups))) {
                          setSelectedFilters(prev => ({ ...prev, subgroup: [] }));
                        } else {
                          handleSelectAll('subgroup', getFilteredOptions('subgroup', uniqueSubgroups));
                        }
                      }}
                    />
                    <span className={styles.filterOptionLabel}><strong>Alle</strong></span>
                  </label>
                  {getFilteredOptions('subgroup', uniqueSubgroups).map(sg => (
                    <label key={sg} className={styles.filterOption}>
                      <input
                        type="checkbox"
                        checked={selectedFilters.subgroup.includes(sg)}
                        onChange={() => handleFilterToggle('subgroup', sg)}
                      />
                      <span className={styles.filterOptionLabel}>{sg}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className={styles.filterWrapper} ref={filterRefs.status}>
              <button
                className={`${styles.filterButton} ${selectedFilters.status.length > 0 ? styles.filterButtonActive : ''}`}
                onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
              >
                <FunnelSimple size={16} weight="bold" />
                <span>Status {selectedFilters.status.length > 0 && `(${selectedFilters.status.length})`}</span>
                {openFilter === 'status' ? <CaretUp size={14} /> : <CaretDown size={14} />}
              </button>
              {openFilter === 'status' && (
                <div className={styles.filterDropdown}>
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
                    <span className={styles.filterOptionLabel}><strong>Alle</strong></span>
                  </label>
                  {statusOptions.map(status => (
                    <label key={status} className={styles.filterOption}>
                      <input
                        type="checkbox"
                        checked={selectedFilters.status.includes(status)}
                        onChange={() => handleFilterToggle('status', status)}
                      />
                      <span className={styles.filterOptionLabel}>{status}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.filterRightSection}>
            <button 
              className={styles.selectAllButton}
              onClick={handleSelectAllFiltered}
              disabled={filteredMarkets.length === 0}
            >
              Alle auswählen
            </button>
            <div className={styles.selectedCount}>
              {tempSelectedIds.length} ausgewählt
            </div>
          </div>
        </div>

        <div className={styles.marketList}>
          {isLoading ? (
            <div className={styles.loadingState}>Lade Märkte...</div>
          ) : filteredMarkets.length === 0 ? (
            <div className={styles.emptyState}>Keine Märkte gefunden</div>
          ) : (
            filteredMarkets.map(market => (
              <button
                key={market.id}
                className={`${styles.marketItem} ${tempSelectedIds.includes(market.id) ? styles.marketItemSelected : ''}`}
                onClick={() => toggleMarketSelection(market.id)}
              >
                <div className={styles.marketCheckbox}>
                  <div className={styles.checkbox}>
                    {tempSelectedIds.includes(market.id) && <CheckCircle size={18} weight="fill" />}
                  </div>
                </div>
                <div className={styles.marketInfo}>
                  <span className={styles.marketChain}>{market.chain}</span>
                  <span className={styles.marketSeparator}>•</span>
                  <span className={styles.marketAddress}>{market.address}, {market.postalCode} {market.city}</span>
                  {market.gebietsleiterName && (
                    <>
                      <span className={styles.marketSeparator}>•</span>
                      <span className={styles.marketGL}>{market.gebietsleiterName}</span>
                    </>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Abbrechen
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            <CheckCircle size={18} weight="bold" />
            <span>{tempSelectedIds.length} {tempSelectedIds.length === 1 ? 'Markt' : 'Märkte'} bestätigen</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
