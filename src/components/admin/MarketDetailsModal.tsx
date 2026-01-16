import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, CaretDown, ClockCounterClockwise, Info, Package, ShoppingCart, Storefront, ArrowsLeftRight, Spinner, Trash } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import { API_BASE_URL } from '../../config/database';
import styles from './MarketDetailsModal.module.css';

interface MarketDetailsModalProps {
  market: AdminMarket;
  allMarkets: AdminMarket[];
  availableGLs: Array<{ id: string; name: string; email: string }>;
  onClose: () => void;
  onSave: (updatedMarket: AdminMarket) => Promise<boolean>;
  onDelete?: (marketId: string) => Promise<boolean>;
}

interface HistoryEntry {
  id: string;
  type: 'vorbesteller' | 'vorverkauf' | 'marktbesuch' | 'produkttausch';
  date: string;
  glName: string;
  glId: string | null;
  details: any;
}

type DropdownType = 'banner' | 'chain' | 'branch' | 'gl' | 'status' | 'frequency';
type TabType = 'details' | 'verlauf';

export const MarketDetailsModal: React.FC<MarketDetailsModalProps> = ({ 
  market,
  allMarkets, 
  availableGLs,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<AdminMarket>(market);
  const [openDropdown, setOpenDropdown] = useState<DropdownType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteClickCount, setDeleteClickCount] = useState(0);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState<Set<string>>(new Set());

  // Handle delete with double-click safety (must click twice within 2 seconds)
  const handleDeleteClick = async () => {
    if (!onDelete) return;
    
    if (deleteClickCount === 0) {
      // First click - start countdown
      setDeleteClickCount(1);
      deleteTimeoutRef.current = setTimeout(() => {
        setDeleteClickCount(0);
      }, 2000);
    } else {
      // Second click within 2 seconds - actually delete
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      setDeleteClickCount(0);
      setIsDeleting(true);
      try {
        const success = await onDelete(market.id);
        if (success) {
          onClose();
        }
      } catch (error) {
        console.error('Error deleting market:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const toggleHistoryItem = (id: string) => {
    setExpandedHistoryItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Group history entries by exact timestamp for same submission
  interface GroupedHistoryEntry {
    groupId: string;
    date: string;
    glName: string;
    type: 'vorbesteller' | 'vorverkauf' | 'marktbesuch' | 'produkttausch';
    entries: HistoryEntry[];
    totalValue: number;
    summary: { displays: number; kartonware: number; paletten: number; schuetten: number };
  }

  const groupedHistory = useMemo((): GroupedHistoryEntry[] => {
    const groups: Map<string, GroupedHistoryEntry> = new Map();
    
    history.forEach(entry => {
      // Create a unique key based on timestamp + type + glName
      const groupKey = `${entry.date}_${entry.type}_${entry.glName}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupId: groupKey,
          date: entry.date,
          glName: entry.glName,
          type: entry.type,
          entries: [],
          totalValue: 0,
          summary: { displays: 0, kartonware: 0, paletten: 0, schuetten: 0 }
        });
      }
      
      const group = groups.get(groupKey)!;
      group.entries.push(entry);
      
      // Update summary counts for vorbesteller
      if (entry.type === 'vorbesteller' && entry.details) {
        const itemType = entry.details.itemType;
        if (itemType === 'display') group.summary.displays++;
        else if (itemType === 'kartonware') group.summary.kartonware++;
        else if (itemType === 'palette') group.summary.paletten++;
        else if (itemType === 'schuette') group.summary.schuetten++;
        
        // Add to total value
        if (entry.details.totalValue) {
          group.totalValue += entry.details.totalValue;
        }
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [history]);

  const renderGroupSummary = (group: GroupedHistoryEntry) => {
    const { summary } = group;
    const parts: string[] = [];
    
    if (summary.displays > 0) parts.push(`${summary.displays} Display${summary.displays > 1 ? 's' : ''}`);
    if (summary.kartonware > 0) parts.push(`${summary.kartonware} Kartonware`);
    if (summary.paletten > 0) parts.push(`${summary.paletten} Palette${summary.paletten > 1 ? 'n' : ''}`);
    if (summary.schuetten > 0) parts.push(`${summary.schuetten} Schütte${summary.schuetten > 1 ? 'n' : ''}`);
    
    return parts.join(', ') || '1 Eintrag';
  };
  
  const dropdownRefs = useRef<Record<DropdownType, HTMLDivElement | null>>({
    banner: null,
    chain: null,
    branch: null,
    gl: null,
    status: null,
    frequency: null
  });

  // Get unique values
  const uniqueBanners = Array.from(new Set(allMarkets.map(m => m.banner).filter((b): b is string => Boolean(b)))).sort();
  const uniqueChains = Array.from(new Set(allMarkets.map(m => m.chain).filter((c): c is string => Boolean(c)))).sort();
  const uniqueBranches = Array.from(new Set(allMarkets.map(m => m.branch).filter((b): b is string => Boolean(b)))).sort();
  const statusOptions = ['Aktiv', 'Inaktiv'];
  const frequencyOptions = ['Täglich', 'Wöchentlich', '2x Woche', 'Monatlich'];

  // Fetch history when tab changes
  useEffect(() => {
    if (activeTab === 'verlauf' && history.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/markets/${market.id}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleDropdownToggle = (dropdown: DropdownType) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const handleSelect = (field: string, value: any) => {
    if (field === 'gl') {
      const selectedGL = availableGLs.find(gl => gl.name === value);
      setFormData(prev => ({
        ...prev,
        gebietsleiterName: value,
        gebietsleiterEmail: selectedGL?.email || '',
        gebietsleiter: selectedGL?.id || ''
      }));
    } else if (field === 'status') {
      setFormData(prev => ({ ...prev, isActive: value === 'Aktiv' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setOpenDropdown(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving market:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vorbesteller': return <Package size={18} weight="fill" />;
      case 'vorverkauf': return <ShoppingCart size={18} weight="fill" />;
      case 'marktbesuch': return <Storefront size={18} weight="fill" />;
      case 'produkttausch': return <ArrowsLeftRight size={18} weight="fill" />;
      default: return <Info size={18} weight="fill" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'vorbesteller': return styles.activityBlue;
      case 'vorverkauf': return styles.activityPurple;
      case 'marktbesuch': return styles.activityGreen;
      case 'produkttausch': return styles.activityOrange;
      default: return styles.activityGray;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'vorbesteller': return 'Vorbesteller';
      case 'vorverkauf': return 'Vorverkauf';
      case 'marktbesuch': return 'Marktbesuch';
      case 'produkttausch': return 'Produkttausch';
      default: return type;
    }
  };

  const renderActivityDetails = (entry: HistoryEntry) => {
    const { type, details, id } = entry;
    const isExpanded = expandedHistoryItems.has(id);
    const hasProducts = (details.itemType === 'palette' || details.itemType === 'schuette') && details.products?.length > 0;
    
    switch (type) {
      case 'vorbesteller':
        return (
          <div className={styles.activityDetails}>
            <span className={styles.detailWelle}>{details.welleName}</span>
            <div 
              className={`${styles.detailItem} ${hasProducts ? styles.detailItemExpandable : ''}`}
              onClick={(e) => {
                if (hasProducts) {
                  e.stopPropagation();
                  toggleHistoryItem(id);
                }
              }}
            >
              <span>
                {details.quantity}× {details.itemName}
                {hasProducts && (
                  <span className={styles.expandIndicator}>
                    {isExpanded ? ' ▼' : ' ▶'} {details.products.length} Produkte
                  </span>
                )}
              </span>
              {details.totalValue > 0 && (
                <span className={styles.detailValue}>€{details.totalValue.toFixed(2)}</span>
              )}
            </div>
            {hasProducts && isExpanded && (
              <div className={styles.productsExpanded}>
                {details.products.map((p: any, i: number) => (
                  <div key={i} className={styles.productRow}>
                    <span className={styles.productName}>{p.name}</span>
                    <span className={styles.productQuantity}>{p.quantity}×</span>
                    {p.valuePerUnit > 0 && (
                      <span className={styles.productValue}>€{(p.quantity * p.valuePerUnit).toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'vorverkauf':
        return (
          <div className={styles.activityDetails}>
            <span className={styles.detailWelle}>{details.welleName}</span>
            {details.products?.slice(0, 2).map((p: any, i: number) => (
              <span key={i} className={styles.detailItem}>
                {p.quantity}× {p.name} ({p.reason})
              </span>
            ))}
            {details.products?.length > 2 && (
              <span className={styles.detailMore}>+{details.products.length - 2} weitere</span>
            )}
          </div>
        );
      case 'marktbesuch':
        return (
          <div className={styles.activityDetails}>
            <span className={styles.detailItem}>Besuch #{details.visitCount}</span>
          </div>
        );
      case 'produkttausch':
        return (
          <div className={styles.activityDetails}>
            <span className={styles.detailReason}>{details.reason}</span>
            {details.items?.slice(0, 2).map((item: any, i: number) => (
              <span key={i} className={styles.detailItem}>
                {item.quantity}× {item.name} ({item.itemType === 'take_out' ? 'Raus' : 'Rein'})
              </span>
            ))}
            {details.items?.length > 2 && (
              <span className={styles.detailMore}>+{details.items.length - 2} weitere</span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderDropdown = (
    type: DropdownType,
    label: string,
    options: string[],
    currentValue: string | undefined,
    field: string
  ) => {
    const isOpen = openDropdown === type;

    return (
      <div className={styles.field} ref={el => { dropdownRefs.current[type] = el; }}>
        <label className={styles.label}>{label}</label>
        <div 
          className={styles.dropdown}
          onClick={() => handleDropdownToggle(type)}
        >
          <span className={currentValue ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {currentValue || `${label} auswählen`}
          </span>
          <CaretDown size={14} weight="bold" className={styles.dropdownIcon} />
        </div>
        {isOpen && (
          <div className={styles.dropdownMenu}>
            {options.map(option => (
              <div
                key={option}
                className={`${styles.dropdownOption} ${currentValue === option ? styles.dropdownOptionActive : ''}`}
                onClick={() => handleSelect(field, option)}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>{market.name || 'Markt Details'}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'details' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <Info size={16} weight="bold" />
            <span>Details</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'verlauf' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('verlauf')}
          >
            <ClockCounterClockwise size={16} weight="bold" />
            <span>Verlauf</span>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'details' ? (
            <>
              {/* Row 1: ID & Banner */}
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>ID</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.internalId || ''}
                    onChange={(e) => handleInputChange('internalId', e.target.value)}
                  />
                </div>
                {renderDropdown('banner', 'Banner', uniqueBanners, formData.banner, 'banner')}
              </div>

              {/* Row 2: Handelskette & Filiale */}
              <div className={styles.row}>
                {renderDropdown('chain', 'Handelskette', uniqueChains, formData.chain, 'chain')}
                {renderDropdown('branch', 'Filiale', uniqueBranches, formData.branch, 'branch')}
              </div>

              {/* Row 3: Name */}
              <div className={styles.field}>
                <label className={styles.label}>Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              {/* Row 4: PLZ & Stadt */}
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>PLZ</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.postalCode || ''}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Stadt</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
              </div>

              {/* Row 5: Straße */}
              <div className={styles.field}>
                <label className={styles.label}>Straße</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>

              {/* Row 6: GL & GL Email */}
              <div className={styles.row}>
                {renderDropdown('gl', 'Gebietsleiter', availableGLs.map(gl => gl.name), formData.gebietsleiterName, 'gl')}
                <div className={styles.field}>
                  <label className={styles.label}>GL Email</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.gebietsleiterEmail || ''}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              {/* Row 7: Status & Frequenz */}
              <div className={styles.row}>
                {renderDropdown('status', 'Status', statusOptions, formData.isActive ? 'Aktiv' : 'Inaktiv', 'status')}
                {renderDropdown('frequency', 'Frequenz', frequencyOptions, formData.frequency?.toString(), 'frequency')}
              </div>
            </>
          ) : (
            /* Verlauf Tab */
            <div className={styles.historyContainer}>
              {isLoadingHistory ? (
                <div className={styles.historyLoading}>
                  <Spinner size={24} weight="bold" className={styles.spinner} />
                  <span>Lade Verlauf...</span>
                </div>
              ) : groupedHistory.length === 0 ? (
                <div className={styles.historyEmpty}>
                  <ClockCounterClockwise size={48} weight="light" />
                  <span>Keine Aktivitäten gefunden</span>
                </div>
              ) : (
                <div className={styles.historyList}>
                  {groupedHistory.map(group => {
                    const isExpanded = expandedHistoryItems.has(group.groupId);
                    const hasMultipleEntries = group.entries.length > 1;
                    
                    return (
                      <div key={group.groupId} className={styles.historyItem}>
                        <div className={`${styles.historyIcon} ${getActivityColor(group.type)}`}>
                          {getActivityIcon(group.type)}
                        </div>
                        <div className={styles.historyContent}>
                          <div 
                            className={`${styles.historyHeader} ${hasMultipleEntries ? styles.historyHeaderClickable : ''}`}
                            onClick={() => hasMultipleEntries && toggleHistoryItem(group.groupId)}
                          >
                            <span className={styles.historyType}>{getActivityLabel(group.type)}</span>
                            <span className={styles.historyDate}>{formatDate(group.date)}</span>
                          </div>
                          <div className={styles.historyGl}>{group.glName}</div>
                          
                          {/* Compact summary for grouped entries */}
                          {hasMultipleEntries && group.type === 'vorbesteller' ? (
                            <div 
                              className={styles.groupSummary}
                              onClick={() => toggleHistoryItem(group.groupId)}
                            >
                              <div className={styles.groupSummaryRow}>
                                <span className={styles.detailWelle}>{group.entries[0]?.details?.welleName}</span>
                                <span className={styles.groupSummaryItems}>
                                  {renderGroupSummary(group)}
                                  {hasMultipleEntries && (
                                    <span className={styles.expandIndicator}>
                                      {isExpanded ? ' ▼' : ' ▶'}
                                    </span>
                                  )}
                                </span>
                                {group.totalValue > 0 && (
                                  <span className={styles.groupTotalValue}>€{group.totalValue.toFixed(2)}</span>
                                )}
                              </div>
                              
                              {/* Expanded individual entries */}
                              {isExpanded && (
                                <div className={styles.groupExpandedEntries}>
                                  {group.entries.map(entry => (
                                    <div key={entry.id} className={styles.groupEntry}>
                                      {renderActivityDetails(entry)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Single entry - show full details directly */
                            group.entries.map(entry => (
                              <div key={entry.id}>
                                {renderActivityDetails(entry)}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - only show for details tab */}
        {activeTab === 'details' && (
          <div className={styles.footer}>
            {onDelete && (
              <button 
                className={`${styles.deleteButton} ${deleteClickCount === 1 ? styles.deleteButtonConfirm : ''}`}
                onClick={handleDeleteClick}
                disabled={isSaving || isDeleting}
              >
                <Trash size={16} weight="bold" />
                {isDeleting ? 'Löschen...' : deleteClickCount === 1 ? 'Nochmal klicken!' : 'Löschen'}
              </button>
            )}
            <div className={styles.footerRight}>
              <button className={styles.cancelButton} onClick={onClose} disabled={isSaving || isDeleting}>
                Abbrechen
              </button>
              <button 
                className={`${styles.saveButton} ${isSaving ? styles.saveButtonLoading : ''}`} 
                onClick={handleSave}
                disabled={isSaving || isDeleting}
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
