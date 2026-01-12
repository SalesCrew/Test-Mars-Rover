import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CaretDown, ClockCounterClockwise, Info, Package, ShoppingCart, Storefront, ArrowsLeftRight, Spinner } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import { API_BASE_URL } from '../../config/database';
import styles from './MarketDetailsModal.module.css';

interface MarketDetailsModalProps {
  market: AdminMarket;
  allMarkets: AdminMarket[];
  availableGLs: Array<{ id: string; name: string; email: string }>;
  onClose: () => void;
  onSave: (updatedMarket: AdminMarket) => Promise<boolean>;
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
  onSave 
}) => {
  const [formData, setFormData] = useState<AdminMarket>(market);
  const [openDropdown, setOpenDropdown] = useState<DropdownType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
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
    const { type, details } = entry;
    
    switch (type) {
      case 'vorbesteller':
        return (
          <div className={styles.activityDetails}>
            <span className={styles.detailWelle}>{details.welleName}</span>
            <span className={styles.detailItem}>
              {details.quantity}× {details.itemName}
            </span>
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
              ) : history.length === 0 ? (
                <div className={styles.historyEmpty}>
                  <ClockCounterClockwise size={48} weight="light" />
                  <span>Keine Aktivitäten gefunden</span>
                </div>
              ) : (
                <div className={styles.historyList}>
                  {history.map(entry => (
                    <div key={entry.id} className={styles.historyItem}>
                      <div className={`${styles.historyIcon} ${getActivityColor(entry.type)}`}>
                        {getActivityIcon(entry.type)}
                      </div>
                      <div className={styles.historyContent}>
                        <div className={styles.historyHeader}>
                          <span className={styles.historyType}>{getActivityLabel(entry.type)}</span>
                          <span className={styles.historyDate}>{formatDate(entry.date)}</span>
                        </div>
                        <div className={styles.historyGl}>{entry.glName}</div>
                        {renderActivityDetails(entry)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - only show for details tab */}
        {activeTab === 'details' && (
          <div className={styles.footer}>
            <button className={styles.cancelButton} onClick={onClose} disabled={isSaving}>
              Abbrechen
            </button>
            <button 
              className={`${styles.saveButton} ${isSaving ? styles.saveButtonLoading : ''}`} 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
