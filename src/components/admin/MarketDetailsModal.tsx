import React, { useState, useRef, useEffect } from 'react';
import { X, CaretDown } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketDetailsModal.module.css';

interface MarketDetailsModalProps {
  market: AdminMarket;
  onClose: () => void;
  onSave: (updatedMarket: AdminMarket) => void;
}

export const MarketDetailsModal: React.FC<MarketDetailsModalProps> = ({ 
  market, 
  onClose,
  onSave 
}) => {
  const [formData, setFormData] = useState<AdminMarket>(market);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isGlDropdownOpen, setIsGlDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const glDropdownRef = useRef<HTMLDivElement>(null);

  // List of Gebietsleiter
  const gebietsleiterList = [
    'Max Mustermann',
    'Anna Schmidt',
    'Peter Weber',
    'Laura Fischer',
    'Michael Bauer',
    'Sarah Hoffmann',
    'Thomas Müller',
    'Julia Wagner'
  ];

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusSelect = (isActive: boolean) => {
    handleChange('isActive', isActive);
    setIsStatusDropdownOpen(false);
  };

  const handleGlSelect = (gl: string) => {
    handleChange('gebietsleiter', gl);
    setIsGlDropdownOpen(false);
  };

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  // Click outside handler for status dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (glDropdownRef.current && !glDropdownRef.current.contains(event.target as Node)) {
        setIsGlDropdownOpen(false);
      }
    };

    if (isStatusDropdownOpen || isGlDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusDropdownOpen, isGlDropdownOpen]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{formData.name}</h2>
            <p className={styles.subtitle}>
              {formData.address}, {formData.postalCode} {formData.city}
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Form Grid */}
        <div className={styles.formGrid}>
          {/* Row 1 */}
          <div className={styles.field}>
            <label className={styles.label}>ID</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.internalId}
              onChange={(e) => handleChange('internalId', e.target.value)}
            />
          </div>

          <div className={styles.field} ref={glDropdownRef}>
            <label className={styles.label}>Gebietsleiter</label>
            <div 
              className={styles.customDropdown}
              onClick={() => setIsGlDropdownOpen(!isGlDropdownOpen)}
            >
              <span className={styles.dropdownText}>
                {formData.gebietsleiter || 'Auswählen...'}
              </span>
              <CaretDown size={16} weight="bold" />
              
              {isGlDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {gebietsleiterList.map((gl) => (
                    <div 
                      key={gl}
                      className={`${styles.dropdownOption} ${styles.dropdownOptionGrey}`}
                      onClick={() => handleGlSelect(gl)}
                    >
                      {gl}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Channel</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.channel || ''}
              onChange={(e) => handleChange('channel', e.target.value)}
              placeholder="Channel"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Banner</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.banner || ''}
              onChange={(e) => handleChange('banner', e.target.value)}
              placeholder="Banner"
            />
          </div>

          {/* Row 2 */}
          <div className={styles.field}>
            <label className={styles.label}>Handelskette</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.chain}
              onChange={(e) => handleChange('chain', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Postleitzahl</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Stadt</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </div>

          {/* Row 3 */}
          <div className={styles.field}>
            <label className={styles.label}>Straße</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div className={styles.field} ref={statusDropdownRef}>
            <label className={styles.label}>Status</label>
            <div 
              className={styles.customDropdown}
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            >
              <span className={formData.isActive ? styles.activeText : styles.inactiveText}>
                {formData.isActive ? 'Aktiv' : 'Inaktiv'}
              </span>
              <CaretDown size={16} weight="bold" />
              
              {isStatusDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div 
                    className={`${styles.dropdownOption} ${styles.dropdownOptionActive}`}
                    onClick={() => handleStatusSelect(true)}
                  >
                    Aktiv
                  </div>
                  <div 
                    className={`${styles.dropdownOption} ${styles.dropdownOptionInactive}`}
                    onClick={() => handleStatusSelect(false)}
                  >
                    Inaktiv
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Filiale</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.branch || ''}
              onChange={(e) => handleChange('branch', e.target.value)}
              placeholder="Filiale"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Frequenz (year)</label>
            <input 
              type="number" 
              className={styles.input}
              value={formData.frequency}
              onChange={(e) => handleChange('frequency', parseInt(e.target.value))}
            />
          </div>

          {/* Row 4 */}
          <div className={styles.field}>
            <label className={styles.label}>Besuchstag</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.visitDay || ''}
              onChange={(e) => handleChange('visitDay', e.target.value)}
              placeholder="z.B. Montag"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Besuchdauer</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.visitDuration || ''}
              onChange={(e) => handleChange('visitDuration', e.target.value)}
              placeholder="z.B. 30 min"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Kundentyp</label>
            <input 
              type="text" 
              className={styles.input}
              value={formData.customerType || ''}
              onChange={(e) => handleChange('customerType', e.target.value)}
              placeholder="Kundentyp"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Telefonnummer</label>
            <input 
              type="tel" 
              className={styles.input}
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+43 ..."
            />
          </div>

          {/* Row 5 - Full Width Row */}
          <div className={styles.fullWidthRow}>
            <div className={styles.field}>
              <label className={styles.label}>E-Mail Adresse</label>
              <input 
                type="email" 
                className={styles.input}
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@beispiel.at"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Maingroup</label>
              <input 
                type="text" 
                className={styles.input}
                value={formData.maingroup || ''}
                onChange={(e) => handleChange('maingroup', e.target.value)}
                placeholder="Maingroup"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Subgroup</label>
              <input 
                type="text" 
                className={styles.input}
                value={formData.subgroup || ''}
                onChange={(e) => handleChange('subgroup', e.target.value)}
                placeholder="z.B. 3F - Adeg"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Abbrechen
          </button>
          <button className={styles.saveButton} onClick={handleSubmit}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

