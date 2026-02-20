import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MagnifyingGlass, User, Storefront, CaretDown, CaretUp, X, Calendar, Package, Gift } from '@phosphor-icons/react';
import { naraIncentiveService, type NaraIncentiveSubmission, type NaraIncentiveItem } from '../../services/naraIncentiveService';
import { gebietsleiterService } from '../../services/gebietsleiterService';
import styles from './NaraIncentivePage.module.css';

interface GL {
  id: string;
  name: string;
}

interface GroupedEntry {
  key: string;
  glId: string;
  glName: string;
  marketId: string;
  marketName: string;
  marketChain: string;
  marketAddress: string;
  marketCity: string;
  date: string;
  totalValue: number;
  items: NaraIncentiveItem[];
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Vienna'
  }).format(date);
};

const formatPrice = (value: number) => `€${value.toFixed(2)}`;

const getDateKey = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(date);
};

export const NaraIncentivePage: React.FC = () => {
  const [submissions, setSubmissions] = useState<NaraIncentiveSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGLId, setSelectedGLId] = useState<string | null>(null);
  const [availableGLs, setAvailableGLs] = useState<GL[]>([]);
  const [isGLDropdownOpen, setIsGLDropdownOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const glDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const loadSubmissions = async () => {
      setIsLoading(true);
      try {
        const data = await naraIncentiveService.getAllSubmissions(
          selectedGLId || undefined
        );
        setSubmissions(data);
      } catch (error) {
        console.error('Failed to load NARA-Incentive submissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
  }, [selectedGLId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (glDropdownRef.current && !glDropdownRef.current.contains(e.target as Node)) {
        setIsGLDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, GroupedEntry>();

    for (const sub of submissions) {
      const dateKey = getDateKey(sub.createdAt);
      const groupKey = `${sub.marketId}_${dateKey}`;

      if (groups.has(groupKey)) {
        const existing = groups.get(groupKey)!;
        existing.items.push(...sub.items);
        existing.totalValue += sub.totalValue;
      } else {
        groups.set(groupKey, {
          key: groupKey,
          glId: sub.glId,
          glName: sub.glName,
          marketId: sub.marketId,
          marketName: sub.marketName,
          marketChain: sub.marketChain,
          marketAddress: sub.marketAddress,
          marketCity: sub.marketCity,
          date: sub.createdAt,
          totalValue: sub.totalValue,
          items: [...sub.items]
        });
      }
    }

    return Array.from(groups.values());
  }, [submissions]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return groupedEntries;
    return groupedEntries.filter(entry =>
      entry.glName.toLowerCase().includes(q) ||
      entry.marketName.toLowerCase().includes(q) ||
      entry.marketChain.toLowerCase().includes(q) ||
      entry.marketAddress.toLowerCase().includes(q) ||
      entry.marketCity.toLowerCase().includes(q)
    );
  }, [groupedEntries, searchQuery]);

  const totalValueAll = useMemo(() => filteredEntries.reduce((sum, e) => sum + e.totalValue, 0), [filteredEntries]);
  const uniqueGLs = useMemo(() => new Set(filteredEntries.map(e => e.glId)).size, [filteredEntries]);
  const uniqueMarkets = useMemo(() => new Set(filteredEntries.map(e => e.marketId)).size, [filteredEntries]);

  const selectedGL = availableGLs.find(gl => gl.id === selectedGLId);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.filters}>
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

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{filteredEntries.length}</span>
          <span className={styles.statLabel}>Einträge</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatPrice(totalValueAll)}</span>
          <span className={styles.statLabel}>Gesamtwert</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{uniqueGLs}</span>
          <span className={styles.statLabel}>GLs aktiv</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{uniqueMarkets}</span>
          <span className={styles.statLabel}>Märkte</span>
        </div>
      </div>

      <div className={styles.listContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Lade Einträge...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className={styles.empty}>
            <Gift size={48} weight="thin" />
            <span>Keine NaRa-Incentive Einträge gefunden</span>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredEntries.map(entry => (
              <div
                key={entry.key}
                className={`${styles.entryCard} ${expandedKey === entry.key ? styles.entryCardExpanded : ''}`}
                onClick={() => setExpandedKey(expandedKey === entry.key ? null : entry.key)}
              >
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
                      <span className={styles.marketAddress}>{entry.marketAddress}, {entry.marketCity}</span>
                    </div>
                  </div>

                  <div className={styles.entryMeta}>
                    <span className={styles.entryDate}>
                      <Calendar size={14} />
                      {formatDate(entry.date)}
                    </span>
                    <span className={styles.valueBadge}>
                      {formatPrice(entry.totalValue)}
                    </span>
                    <span className={styles.itemCount}>
                      <Package size={14} />
                      <span>{entry.items.length} {entry.items.length === 1 ? 'Produkt' : 'Produkte'}</span>
                    </span>
                    <span className={styles.expandIcon}>
                      {expandedKey === entry.key ? <CaretUp size={16} /> : <CaretDown size={16} />}
                    </span>
                  </div>
                </div>

                {expandedKey === entry.key && (
                  <div className={styles.entryItems}>
                    <div className={styles.itemsHeader}>
                      <span>Produkt</span>
                      <span>Gewicht</span>
                      <span>Menge</span>
                      <span style={{ textAlign: 'right' }}>Wert</span>
                    </div>
                    {entry.items.map(item => (
                      <div key={item.id} className={styles.itemRow}>
                        <div className={styles.itemInfo}>
                          <span className={styles.itemName}>{item.productName}</span>
                        </div>
                        <span className={styles.itemWeight}>{item.productWeight || '-'}</span>
                        <span className={styles.itemQuantity}>{item.quantity}x</span>
                        <span className={styles.itemValue}>{formatPrice(item.lineTotal)}</span>
                      </div>
                    ))}
                    <div className={styles.totalRow}>
                      <span className={styles.totalLabel}>Gesamt</span>
                      <span></span>
                      <span></span>
                      <span className={styles.totalValue}>{formatPrice(entry.totalValue)}</span>
                    </div>
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
