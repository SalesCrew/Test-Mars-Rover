import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CaretDown } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketDetailsModal.module.css';

interface MarketDetailsModalProps {
  market: AdminMarket;
  allMarkets: AdminMarket[];
  availableGLs: Array<{ id: string; name: string; email: string }>;
  onClose: () => void;
  onSave: (updatedMarket: AdminMarket) => void;
}

type DropdownType = 'banner' | 'chain' | 'branch' | 'gl' | 'status' | 'frequency';

export const MarketDetailsModal: React.FC<MarketDetailsModalProps> = ({ 
  market,
  allMarkets, 
  availableGLs,
  onClose,
  onSave 
}) => {
  const [formData, setFormData] = useState<AdminMarket>(market);
  const [openDropdown, setOpenDropdown] = useState<DropdownType | null>(null);
  
  const dropdownRefs = useRef<Record<DropdownType, HTMLDivElement | null>>({
    banner: null,
    chain: null,
    branch: null,
    gl: null,
    status: null,
    frequency: null
  });

  // Get unique values
  const uniqueBanners = Array.from(new Set(allMarkets.map(m => m.banner).filter(Boolean))).sort();
  const uniqueChains = Array.from(new Set(allMarkets.map(m => m.chain).filter(Boolean))).sort();
  const uniqueBranches = Array.from(new Set(allMarkets.map(m => m.branch).filter(Boolean))).sort();
  const statusOptions = ['Aktiv', 'Inaktiv'];
  const frequencyOptions = ['Täglich', 'Wöchentlich', '2x Woche', 'Monatlich'];

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.current.contains(event.target as Node)) {
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

  const handleSave = () => {
    onSave(formData);
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
          <h3 className={styles.title}>Markt Details</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
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
            {renderDropdown('frequency', 'Frequenz', frequencyOptions, formData.frequency, 'frequency')}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Abbrechen
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Speichern
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
