import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, ArrowsClockwise, CheckCircle, PencilSimple, Trash, CaretDown, CaretUp, Upload } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketImportPreviewModal.module.css';

interface MarketImportPreviewModalProps {
  importedMarkets: AdminMarket[];
  existingMarkets: AdminMarket[];
  onConfirm: (markets: AdminMarket[]) => void;
  onCancel: () => void;
}

interface CategoryCounts {
  newCount: number;
  changedCount: number;
  unchangedCount: number;
}

interface ChangedMarketInfo {
  market: AdminMarket;
  existingMarket: AdminMarket;
  changedFields: string[];
}

// Fields to compare (ignoring GL-related fields that won't match on import)
const FIELDS_TO_COMPARE: (keyof AdminMarket)[] = [
  'name', 'address', 'city', 'postalCode', 'chain', 
  'frequency', 'banner', 'isActive', 'marketTel', 'marketEmail', 'channel'
];

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  address: 'Straße',
  city: 'Stadt',
  postalCode: 'PLZ',
  chain: 'Kette',
  frequency: 'Frequenz',
  banner: 'Banner',
  isActive: 'Status',
  marketTel: 'Tel.',
  marketEmail: 'Email',
  channel: 'Kanal'
};

// Limit visible items per section for performance
const INITIAL_VISIBLE_ITEMS = 20;
const LOAD_MORE_COUNT = 50;

// Normalize value for comparison - defined outside component to avoid recreation
const normalizeValue = (val: any): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).trim().toLowerCase();
};

const compareMarkets = (imported: AdminMarket, existing: AdminMarket): string[] => {
  const changedFields: string[] = [];
  
  for (let i = 0; i < FIELDS_TO_COMPARE.length; i++) {
    const field = FIELDS_TO_COMPARE[i];
    if (normalizeValue(imported[field]) !== normalizeValue(existing[field])) {
      changedFields.push(field);
    }
  }
  
  return changedFields;
};

export const MarketImportPreviewModal: React.FC<MarketImportPreviewModalProps> = ({
  importedMarkets,
  existingMarkets,
  onConfirm,
  onCancel
}) => {
  const [isReady, setIsReady] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [editingMarket, setEditingMarket] = useState<AdminMarket | null>(null);
  const [editedMarkets, setEditedMarkets] = useState<Map<string, AdminMarket>>(new Map());
  const [showUnchanged, setShowUnchanged] = useState(false);
  
  // Visible counts for pagination
  const [visibleNewCount, setVisibleNewCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [visibleChangedCount, setVisibleChangedCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [visibleUnchangedCount, setVisibleUnchangedCount] = useState(INITIAL_VISIBLE_ITEMS);
  
  // Defer initial render to allow modal to show first
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);
  
  // Create a map of existing markets by internalId for O(1) lookup
  // Normalize IDs to strings for consistent comparison
  const existingMarketsMap = useMemo(() => {
    const map = new Map<string, AdminMarket>();
    for (let i = 0; i < existingMarkets.length; i++) {
      const market = existingMarkets[i];
      if (market.internalId) {
        // Normalize to string and trim for consistent comparison
        map.set(String(market.internalId).trim(), market);
      }
    }
    return map;
  }, [existingMarkets]);
  
  // Categorize markets in a single pass - only compute counts and categorized arrays
  const { newMarkets, changedMarkets, unchangedMarkets, counts } = useMemo(() => {
    const newArr: AdminMarket[] = [];
    const changedArr: ChangedMarketInfo[] = [];
    const unchangedArr: AdminMarket[] = [];
    
    for (let i = 0; i < importedMarkets.length; i++) {
      const market = importedMarkets[i];
      
      // Skip removed markets
      if (removedIds.has(market.id)) continue;
      
      // Use edited version if available
      const actualMarket = editedMarkets.get(market.id) || market;
      // Normalize internalId for consistent lookup
      const normalizedId = String(actualMarket.internalId || '').trim();
      const existing = normalizedId ? existingMarketsMap.get(normalizedId) : undefined;
      
      if (!existing) {
        newArr.push(actualMarket);
      } else {
        const changedFields = compareMarkets(actualMarket, existing);
        if (changedFields.length === 0) {
          unchangedArr.push(actualMarket);
        } else {
          changedArr.push({ market: actualMarket, existingMarket: existing, changedFields });
        }
      }
    }
    
    return {
      newMarkets: newArr,
      changedMarkets: changedArr,
      unchangedMarkets: unchangedArr,
      counts: {
        newCount: newArr.length,
        changedCount: changedArr.length,
        unchangedCount: unchangedArr.length
      } as CategoryCounts
    };
  }, [importedMarkets, existingMarketsMap, removedIds, editedMarkets]);
  
  // Markets to actually import (new + changed)
  const marketsToActuallyImport = useMemo(() => {
    return [...newMarkets, ...changedMarkets.map(c => c.market)];
  }, [newMarkets, changedMarkets]);
  
  const handleRemoveMarket = useCallback((marketId: string) => {
    setRemovedIds(prev => new Set(prev).add(marketId));
  }, []);
  
  const handleEditMarket = useCallback((market: AdminMarket) => {
    setEditingMarket({ ...market });
  }, []);
  
  const handleSaveEdit = useCallback(() => {
    if (!editingMarket) return;
    setEditedMarkets(prev => new Map(prev).set(editingMarket.id, editingMarket));
    setEditingMarket(null);
  }, [editingMarket]);
  
  const handleConfirm = useCallback(() => {
    onConfirm(marketsToActuallyImport);
  }, [onConfirm, marketsToActuallyImport]);
  
  const formatValue = (value: any): string => {
    if (value === undefined || value === null || value === '') return '–';
    if (typeof value === 'boolean') return value ? 'Aktiv' : 'Inaktiv';
    return String(value);
  };
  
  // Render a simple market row (more efficient than full card)
  const renderNewMarketRow = useCallback((market: AdminMarket) => (
    <div key={market.id} className={`${styles.marketCard} ${styles.marketCardNew}`}>
      <div className={styles.marketInfo}>
        <div className={styles.marketHeader}>
          <span className={styles.marketId}>{market.internalId}</span>
          <span className={styles.marketName}>{market.name}</span>
        </div>
        <div className={styles.marketDetails}>
          <span>{market.address}, {market.postalCode} {market.city}</span>
          <span> • {market.chain}</span>
        </div>
      </div>
      <div className={styles.marketActions}>
        <button
          className={styles.actionButton}
          onClick={() => handleEditMarket(market)}
          title="Bearbeiten"
        >
          <PencilSimple size={16} weight="bold" />
        </button>
        <button
          className={`${styles.actionButton} ${styles.actionButtonDelete}`}
          onClick={() => handleRemoveMarket(market.id)}
          title="Entfernen"
        >
          <Trash size={16} weight="bold" />
        </button>
      </div>
    </div>
  ), [handleEditMarket, handleRemoveMarket]);
  
  const renderChangedMarketRow = useCallback((info: ChangedMarketInfo) => (
    <div key={info.market.id} className={`${styles.marketCard} ${styles.marketCardChanged}`}>
      <div className={styles.marketInfo}>
        <div className={styles.marketHeader}>
          <span className={styles.marketId}>{info.market.internalId}</span>
          <span className={styles.marketName}>{info.market.name}</span>
        </div>
        <div className={styles.marketDetails}>
          {info.changedFields.slice(0, 3).map(field => (
            <span key={field} className={styles.changedField}>
              {FIELD_LABELS[field]}: {formatValue(info.existingMarket[field as keyof AdminMarket])} → {formatValue(info.market[field as keyof AdminMarket])}
            </span>
          ))}
          {info.changedFields.length > 3 && (
            <span className={styles.moreChanges}>+{info.changedFields.length - 3} weitere</span>
          )}
        </div>
      </div>
      <div className={styles.marketActions}>
        <button
          className={styles.actionButton}
          onClick={() => handleEditMarket(info.market)}
          title="Bearbeiten"
        >
          <PencilSimple size={16} weight="bold" />
        </button>
        <button
          className={`${styles.actionButton} ${styles.actionButtonDelete}`}
          onClick={() => handleRemoveMarket(info.market.id)}
          title="Entfernen"
        >
          <Trash size={16} weight="bold" />
        </button>
      </div>
    </div>
  ), [handleEditMarket, handleRemoveMarket]);
  
  const renderUnchangedMarketRow = useCallback((market: AdminMarket) => (
    <div key={market.id} className={`${styles.marketCard} ${styles.marketCardUnchanged}`}>
      <div className={styles.marketInfo}>
        <div className={styles.marketHeader}>
          <span className={styles.marketId}>{market.internalId}</span>
          <span className={styles.marketName}>{market.name}</span>
        </div>
        <div className={styles.marketDetails}>
          <span>{market.chain}</span>
        </div>
      </div>
      <div className={styles.marketActions}>
        <button
          className={`${styles.actionButton} ${styles.actionButtonDelete}`}
          onClick={() => handleRemoveMarket(market.id)}
          title="Entfernen"
        >
          <Trash size={16} weight="bold" />
        </button>
      </div>
    </div>
  ), [handleRemoveMarket]);
  
  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Import Vorschau</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            <X size={20} weight="bold" />
          </button>
        </div>
        
        {/* Stats Bar */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <div className={`${styles.statDot} ${styles.statDotNew}`} />
            <span className={styles.statCount}>{counts.newCount}</span>
            <span className={styles.statLabel}>Neue Märkte</span>
          </div>
          <div className={styles.stat}>
            <div className={`${styles.statDot} ${styles.statDotChanged}`} />
            <span className={styles.statCount}>{counts.changedCount}</span>
            <span className={styles.statLabel}>Geänderte Märkte</span>
          </div>
          <div className={styles.stat}>
            <div className={`${styles.statDot} ${styles.statDotUnchanged}`} />
            <span className={styles.statCount}>{counts.unchangedCount}</span>
            <span className={styles.statLabel}>Unverändert</span>
          </div>
        </div>
        
        {/* Content */}
        <div className={styles.content}>
          {!isReady ? (
            <div className={styles.loadingSection}>
              <div className={styles.spinner} />
              <span>Vergleiche {importedMarkets.length} Märkte...</span>
            </div>
          ) : (
            <>
              {/* New Markets Section (Red) */}
              {counts.newCount > 0 && (
                <div className={styles.section}>
                  <div className={`${styles.sectionHeader} ${styles.sectionHeaderNew}`}>
                    <Plus size={18} weight="bold" className={styles.sectionIconNew} />
                    <h3 className={styles.sectionTitle}>Neue Märkte</h3>
                    <span className={styles.sectionCount}>{counts.newCount} werden neu angelegt</span>
                  </div>
                  <div className={styles.marketsList}>
                    {newMarkets.slice(0, visibleNewCount).map(renderNewMarketRow)}
                  </div>
                  {counts.newCount > visibleNewCount && (
                    <button 
                      className={styles.loadMoreButton}
                      onClick={() => setVisibleNewCount(v => v + LOAD_MORE_COUNT)}
                    >
                      {counts.newCount - visibleNewCount} weitere anzeigen
                    </button>
                  )}
                </div>
              )}
              
              {/* Changed Markets Section (Purple) */}
              {counts.changedCount > 0 && (
                <div className={styles.section}>
                  <div className={`${styles.sectionHeader} ${styles.sectionHeaderChanged}`}>
                    <ArrowsClockwise size={18} weight="bold" className={styles.sectionIconChanged} />
                    <h3 className={styles.sectionTitle}>Geänderte Märkte</h3>
                    <span className={styles.sectionCount}>{counts.changedCount} werden aktualisiert</span>
                  </div>
                  <div className={styles.marketsList}>
                    {changedMarkets.slice(0, visibleChangedCount).map(renderChangedMarketRow)}
                  </div>
                  {counts.changedCount > visibleChangedCount && (
                    <button 
                      className={styles.loadMoreButton}
                      onClick={() => setVisibleChangedCount(v => v + LOAD_MORE_COUNT)}
                    >
                      {counts.changedCount - visibleChangedCount} weitere anzeigen
                    </button>
                  )}
                </div>
              )}
              
              {/* Unchanged Markets Section (Green) */}
              {counts.unchangedCount > 0 && (
                <div className={styles.section}>
                  <div className={`${styles.sectionHeader} ${styles.sectionHeaderUnchanged}`}>
                    <CheckCircle size={18} weight="bold" className={styles.sectionIconUnchanged} />
                    <h3 className={styles.sectionTitle}>Unveränderte Märkte</h3>
                    <span className={styles.sectionCount}>{counts.unchangedCount} bleiben unverändert</span>
                    <button 
                      className={styles.collapseToggle}
                      onClick={() => setShowUnchanged(!showUnchanged)}
                    >
                      {showUnchanged ? 'Ausblenden' : 'Anzeigen'}
                      {showUnchanged ? <CaretUp size={14} /> : <CaretDown size={14} />}
                    </button>
                  </div>
                  {showUnchanged && (
                    <>
                      <div className={styles.marketsList}>
                        {unchangedMarkets.slice(0, visibleUnchangedCount).map(renderUnchangedMarketRow)}
                      </div>
                      {counts.unchangedCount > visibleUnchangedCount && (
                        <button 
                          className={styles.loadMoreButton}
                          onClick={() => setVisibleUnchangedCount(v => v + LOAD_MORE_COUNT)}
                        >
                          {counts.unchangedCount - visibleUnchangedCount} weitere anzeigen
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Empty state if all removed */}
              {counts.newCount === 0 && counts.changedCount === 0 && counts.unchangedCount === 0 && (
                <div className={styles.emptySection}>
                  Keine Märkte zum Importieren vorhanden.
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            {marketsToActuallyImport.length} von {importedMarkets.length} Märkten werden importiert
          </div>
          <div className={styles.footerActions}>
            <button className={styles.cancelButton} onClick={onCancel}>
              Abbrechen
            </button>
            <button 
              className={styles.importButton}
              onClick={handleConfirm}
              disabled={marketsToActuallyImport.length === 0 || !isReady}
            >
              <Upload size={18} weight="bold" />
              {marketsToActuallyImport.length} Märkte importieren
            </button>
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      {editingMarket && (
        <div className={styles.editOverlay} onClick={() => setEditingMarket(null)}>
          <div className={styles.editModal} onClick={e => e.stopPropagation()}>
            <div className={styles.editHeader}>
              <h3 className={styles.editTitle}>Markt bearbeiten</h3>
              <button className={styles.closeButton} onClick={() => setEditingMarket(null)}>
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className={styles.editContent}>
              <div className={styles.editField}>
                <label className={styles.editLabel}>ID</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.internalId}
                  disabled
                />
              </div>
              <div className={styles.editField}>
                <label className={styles.editLabel}>Name</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.name}
                  onChange={e => setEditingMarket({ ...editingMarket, name: e.target.value })}
                />
              </div>
              <div className={styles.editField}>
                <label className={styles.editLabel}>Straße</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.address}
                  onChange={e => setEditingMarket({ ...editingMarket, address: e.target.value })}
                />
              </div>
              <div className={styles.editField}>
                <label className={styles.editLabel}>PLZ</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.postalCode}
                  onChange={e => setEditingMarket({ ...editingMarket, postalCode: e.target.value })}
                />
              </div>
              <div className={styles.editField}>
                <label className={styles.editLabel}>Stadt</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.city}
                  onChange={e => setEditingMarket({ ...editingMarket, city: e.target.value })}
                />
              </div>
              <div className={styles.editField}>
                <label className={styles.editLabel}>Kette</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.chain}
                  onChange={e => setEditingMarket({ ...editingMarket, chain: e.target.value })}
                />
              </div>
              <div className={styles.editField}>
                <label className={styles.editLabel}>Frequenz</label>
                <input 
                  type="number" 
                  className={styles.editInput} 
                  value={editingMarket.frequency}
                  onChange={e => setEditingMarket({ ...editingMarket, frequency: parseInt(e.target.value) || 12 })}
                />
              </div>
            </div>
            <div className={styles.editFooter}>
              <button className={styles.cancelButton} onClick={() => setEditingMarket(null)}>
                Abbrechen
              </button>
              <button className={styles.importButton} onClick={handleSaveEdit}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
