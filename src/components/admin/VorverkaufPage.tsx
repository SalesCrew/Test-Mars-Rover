import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass, Package, User, Storefront, CaretDown, X, Calendar, Tag } from '@phosphor-icons/react';
import { vorverkaufService, type VorverkaufEntry } from '../../services/vorverkaufService';
import { gebietsleiterService } from '../../services/gebietsleiterService';
import styles from './VorverkaufPage.module.css';

interface GL {
  id: string;
  name: string;
}

const reasonLabels: Record<string, string> = {
  'OOS': 'OOS (Out of Stock)',
  'Listungslücke': 'Listungslücke',
  'Platzierung': 'Platzierung'
};

const reasonColors: Record<string, { bg: string; text: string }> = {
  'OOS': { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626' },
  'Listungslücke': { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706' },
  'Platzierung': { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563EB' }
};

export const VorverkaufPage: React.FC = () => {
  const [entries, setEntries] = useState<VorverkaufEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGLId, setSelectedGLId] = useState<string | null>(null);
  const [availableGLs, setAvailableGLs] = useState<GL[]>([]);
  const [isGLDropdownOpen, setIsGLDropdownOpen] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  
  const glDropdownRef = useRef<HTMLDivElement>(null);

  // Load GLs on mount
  useEffect(() => {
    const loadGLs = async () => {
      try {
        const gls = await gebietsleiterService.getAllGebietsleiter();
        setAvailableGLs(gls.map(gl => ({ id: gl.id, name: gl.name })));
      } catch (error) {
        console.error('Failed to load GLs:', error);
      }
    };
    loadGLs();
  }, []);

  // Load entries when filters change
  useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true);
      try {
        const data = await vorverkaufService.getAllEntries(
          selectedGLId || undefined,
          searchQuery || undefined
        );
        setEntries(data);
      } catch (error) {
        console.error('Failed to load vorverkauf entries:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce search
    const timeoutId = setTimeout(loadEntries, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedGLId, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (glDropdownRef.current && !glDropdownRef.current.contains(e.target as Node)) {
        setIsGLDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Vienna'
    }).format(date);
  };

  const selectedGL = availableGLs.find(gl => gl.id === selectedGLId);

  return (
    <div className={styles.page}>
      {/* Header with filters */}
      <div className={styles.header}>
        <h1 className={styles.title}>Vorverkauf Erfassungen</h1>
        
        <div className={styles.filters}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <MagnifyingGlass size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Suchen..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.clearSearch} onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* GL Filter */}
          <div className={styles.filterDropdown} ref={glDropdownRef}>
            <button
              className={`${styles.filterButton} ${selectedGLId ? styles.filterActive : ''}`}
              onClick={() => setIsGLDropdownOpen(!isGLDropdownOpen)}
            >
              <User size={16} />
              <span>{selectedGL?.name || 'Alle GLs'}</span>
              <CaretDown size={14} className={isGLDropdownOpen ? styles.caretOpen : ''} />
            </button>
            
            {isGLDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${!selectedGLId ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setSelectedGLId(null); setIsGLDropdownOpen(false); }}
                >
                  Alle GLs
                </button>
                {availableGLs.map(gl => (
                  <button
                    key={gl.id}
                    className={`${styles.dropdownItem} ${selectedGLId === gl.id ? styles.dropdownItemActive : ''}`}
                    onClick={() => { setSelectedGLId(gl.id); setIsGLDropdownOpen(false); }}
                  >
                    {gl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{entries.length}</span>
          <span className={styles.statLabel}>Einträge</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{entries.reduce((sum, e) => sum + e.totalItems, 0)}</span>
          <span className={styles.statLabel}>Artikel gesamt</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{entries.filter(e => e.reason === 'OOS').length}</span>
          <span className={styles.statLabel}>OOS</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{entries.filter(e => e.reason === 'Listungslücke').length}</span>
          <span className={styles.statLabel}>Listungslücke</span>
        </div>
      </div>

      {/* Entries list */}
      <div className={styles.listContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Lade Einträge...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <Package size={48} weight="thin" />
            <span>Keine Vorverkauf-Einträge gefunden</span>
          </div>
        ) : (
          <div className={styles.list}>
            {entries.map(entry => (
              <div 
                key={entry.id} 
                className={`${styles.entryCard} ${expandedEntryId === entry.id ? styles.entryCardExpanded : ''}`}
                onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
              >
                {/* Entry header */}
                <div className={styles.entryHeader}>
                  <div className={styles.entryMain}>
                    <div className={styles.entryGL}>
                      <User size={16} weight="bold" />
                      <span>{entry.glName}</span>
                    </div>
                    <div className={styles.entryMarket}>
                      <Storefront size={16} />
                      <span className={styles.marketChain}>{entry.marketChain}</span>
                      <span className={styles.marketName}>{entry.marketName}</span>
                    </div>
                  </div>
                  
                  <div className={styles.entryMeta}>
                    <span 
                      className={styles.reasonBadge}
                      style={{ 
                        backgroundColor: reasonColors[entry.reason]?.bg,
                        color: reasonColors[entry.reason]?.text
                      }}
                    >
                      <Tag size={12} weight="bold" />
                      {reasonLabels[entry.reason] || entry.reason}
                    </span>
                    <span className={styles.itemCount}>
                      {entry.totalItems} {entry.totalItems === 1 ? 'Artikel' : 'Artikel'}
                    </span>
                    <span className={styles.entryDate}>
                      <Calendar size={14} />
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Expanded items list */}
                {expandedEntryId === entry.id && (
                  <div className={styles.entryItems}>
                    <div className={styles.itemsHeader}>
                      <span>Produkt</span>
                      <span>Menge</span>
                    </div>
                    {entry.items.map(item => (
                      <div key={item.id} className={styles.itemRow}>
                        <div className={styles.itemInfo}>
                          <span className={styles.itemName}>{item.productName}</span>
                          <span className={styles.itemDetails}>
                            {item.productBrand} {item.productSize && `· ${item.productSize}`}
                          </span>
                        </div>
                        <span className={styles.itemQuantity}>{item.quantity}x</span>
                      </div>
                    ))}
                    {entry.notes && (
                      <div className={styles.entryNotes}>
                        <strong>Notiz:</strong> {entry.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
