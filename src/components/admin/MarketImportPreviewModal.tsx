import React, { useState, useMemo } from 'react';
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

interface CategorizedMarket {
  market: AdminMarket;
  existingMarket?: AdminMarket;
  changedFields: string[];
  category: 'new' | 'changed' | 'unchanged';
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

const compareMarkets = (imported: AdminMarket, existing: AdminMarket): string[] => {
  const changedFields: string[] = [];
  
  for (const field of FIELDS_TO_COMPARE) {
    const importedValue = imported[field];
    const existingValue = existing[field];
    
    // Normalize comparison (handle undefined vs empty string, numbers vs strings)
    const normalizeValue = (val: any): string => {
      if (val === undefined || val === null || val === '') return '';
      return String(val).trim().toLowerCase();
    };
    
    if (normalizeValue(importedValue) !== normalizeValue(existingValue)) {
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
  const [marketsToImport, setMarketsToImport] = useState<AdminMarket[]>(importedMarkets);
  const [editingMarket, setEditingMarket] = useState<AdminMarket | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  
  // Create a map of existing markets by internalId for quick lookup
  const existingMarketsMap = useMemo(() => {
    const map = new Map<string, AdminMarket>();
    for (const market of existingMarkets) {
      if (market.internalId) {
        map.set(market.internalId, market);
      }
    }
    return map;
  }, [existingMarkets]);
  
  // Categorize markets
  const categorizedMarkets = useMemo((): CategorizedMarket[] => {
    return marketsToImport.map(market => {
      const existing = existingMarketsMap.get(market.internalId);
      
      if (!existing) {
        return { market, category: 'new' as const, changedFields: [] };
      }
      
      const changedFields = compareMarkets(market, existing);
      
      if (changedFields.length === 0) {
        return { market, existingMarket: existing, category: 'unchanged' as const, changedFields: [] };
      }
      
      return { market, existingMarket: existing, category: 'changed' as const, changedFields };
    });
  }, [marketsToImport, existingMarketsMap]);
  
  const newMarkets = categorizedMarkets.filter(m => m.category === 'new');
  const changedMarkets = categorizedMarkets.filter(m => m.category === 'changed');
  const unchangedMarkets = categorizedMarkets.filter(m => m.category === 'unchanged');
  
  // Only import new and changed markets
  const marketsToActuallyImport = [...newMarkets, ...changedMarkets].map(m => m.market);
  
  const handleRemoveMarket = (marketId: string) => {
    setMarketsToImport(prev => prev.filter(m => m.id !== marketId));
  };
  
  const handleEditMarket = (market: AdminMarket) => {
    setEditingMarket({ ...market });
  };
  
  const handleSaveEdit = () => {
    if (!editingMarket) return;
    setMarketsToImport(prev => 
      prev.map(m => m.id === editingMarket.id ? editingMarket : m)
    );
    setEditingMarket(null);
  };
  
  const handleConfirm = () => {
    onConfirm(marketsToActuallyImport);
  };
  
  const formatValue = (value: any): string => {
    if (value === undefined || value === null || value === '') return '–';
    if (typeof value === 'boolean') return value ? 'Aktiv' : 'Inaktiv';
    return String(value);
  };
  
  const renderMarketCard = (item: CategorizedMarket, cardClass: string) => {
    const { market, existingMarket, changedFields, category } = item;
    
    return (
      <div key={market.id} className={`${styles.marketCard} ${cardClass}`}>
        <div className={styles.marketInfo}>
          <div className={styles.marketHeader}>
            <span className={styles.marketId}>{market.internalId}</span>
            <span className={styles.marketName}>{market.name}</span>
          </div>
          
          <div className={styles.marketDetails}>
            {category === 'changed' && changedFields.length > 0 ? (
              // Show changed fields with diff
              changedFields.map(field => (
                <div key={field} className={`${styles.marketDetail} ${styles.changedField}`}>
                  <span className={styles.detailLabel}>{FIELD_LABELS[field] || field}:</span>
                  <span className={styles.changedFieldOld}>
                    {formatValue(existingMarket?.[field as keyof AdminMarket])}
                  </span>
                  <span className={styles.changedFieldArrow}>→</span>
                  <span className={styles.changedFieldNew}>
                    {formatValue(market[field as keyof AdminMarket])}
                  </span>
                </div>
              ))
            ) : (
              // Show regular details
              <>
                <div className={styles.marketDetail}>
                  <span className={styles.detailLabel}>Adresse:</span>
                  {market.address}, {market.postalCode} {market.city}
                </div>
                <div className={styles.marketDetail}>
                  <span className={styles.detailLabel}>Kette:</span>
                  {market.chain}
                </div>
                <div className={styles.marketDetail}>
                  <span className={styles.detailLabel}>Frequenz:</span>
                  {market.frequency}
                </div>
                {market.banner && (
                  <div className={styles.marketDetail}>
                    <span className={styles.detailLabel}>Banner:</span>
                    {market.banner}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className={styles.marketActions}>
          {category !== 'unchanged' && (
            <button
              className={styles.actionButton}
              onClick={() => handleEditMarket(market)}
              title="Bearbeiten"
            >
              <PencilSimple size={16} weight="bold" />
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.actionButtonDelete}`}
            onClick={() => handleRemoveMarket(market.id)}
            title="Entfernen"
          >
            <Trash size={16} weight="bold" />
          </button>
        </div>
      </div>
    );
  };
  
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
            <span className={styles.statCount}>{newMarkets.length}</span>
            <span className={styles.statLabel}>Neue Märkte</span>
          </div>
          <div className={styles.stat}>
            <div className={`${styles.statDot} ${styles.statDotChanged}`} />
            <span className={styles.statCount}>{changedMarkets.length}</span>
            <span className={styles.statLabel}>Geänderte Märkte</span>
          </div>
          <div className={styles.stat}>
            <div className={`${styles.statDot} ${styles.statDotUnchanged}`} />
            <span className={styles.statCount}>{unchangedMarkets.length}</span>
            <span className={styles.statLabel}>Unverändert</span>
          </div>
        </div>
        
        {/* Content */}
        <div className={styles.content}>
          {/* New Markets Section (Red) */}
          {newMarkets.length > 0 && (
            <div className={styles.section}>
              <div className={`${styles.sectionHeader} ${styles.sectionHeaderNew}`}>
                <Plus size={18} weight="bold" className={styles.sectionIconNew} />
                <h3 className={styles.sectionTitle}>Neue Märkte</h3>
                <span className={styles.sectionCount}>{newMarkets.length} Märkte werden neu angelegt</span>
              </div>
              <div className={styles.marketsList}>
                {newMarkets.map(item => renderMarketCard(item, styles.marketCardNew))}
              </div>
            </div>
          )}
          
          {/* Changed Markets Section (Purple) */}
          {changedMarkets.length > 0 && (
            <div className={styles.section}>
              <div className={`${styles.sectionHeader} ${styles.sectionHeaderChanged}`}>
                <ArrowsClockwise size={18} weight="bold" className={styles.sectionIconChanged} />
                <h3 className={styles.sectionTitle}>Geänderte Märkte</h3>
                <span className={styles.sectionCount}>{changedMarkets.length} Märkte werden aktualisiert</span>
              </div>
              <div className={styles.marketsList}>
                {changedMarkets.map(item => renderMarketCard(item, styles.marketCardChanged))}
              </div>
            </div>
          )}
          
          {/* Unchanged Markets Section (Green) */}
          {unchangedMarkets.length > 0 && (
            <div className={styles.section}>
              <div className={`${styles.sectionHeader} ${styles.sectionHeaderUnchanged}`}>
                <CheckCircle size={18} weight="bold" className={styles.sectionIconUnchanged} />
                <h3 className={styles.sectionTitle}>Unveränderte Märkte</h3>
                <span className={styles.sectionCount}>{unchangedMarkets.length} Märkte bleiben unverändert</span>
                <button 
                  className={styles.collapseToggle}
                  onClick={() => setShowUnchanged(!showUnchanged)}
                >
                  {showUnchanged ? 'Ausblenden' : 'Anzeigen'}
                  {showUnchanged ? <CaretUp size={14} /> : <CaretDown size={14} />}
                </button>
              </div>
              {showUnchanged && (
                <div className={styles.marketsList}>
                  {unchangedMarkets.map(item => renderMarketCard(item, styles.marketCardUnchanged))}
                </div>
              )}
            </div>
          )}
          
          {/* Empty state if all removed */}
          {marketsToImport.length === 0 && (
            <div className={styles.emptySection}>
              Keine Märkte zum Importieren vorhanden.
            </div>
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
              disabled={marketsToActuallyImport.length === 0}
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
                <label className={styles.editLabel}>Banner</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.banner || ''}
                  onChange={e => setEditingMarket({ ...editingMarket, banner: e.target.value })}
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
              <div className={styles.editField}>
                <label className={styles.editLabel}>Telefon</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.marketTel || ''}
                  onChange={e => setEditingMarket({ ...editingMarket, marketTel: e.target.value })}
                />
              </div>
              <div className={styles.editField}>
                <label className={styles.editLabel}>Email</label>
                <input 
                  type="text" 
                  className={styles.editInput} 
                  value={editingMarket.marketEmail || ''}
                  onChange={e => setEditingMarket({ ...editingMarket, marketEmail: e.target.value })}
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
