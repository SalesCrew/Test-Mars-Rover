import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, CaretDown, MagnifyingGlass } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketDetailsModal.module.css';

interface MarketDetailsModalProps {
  market: AdminMarket;
  allMarkets: AdminMarket[];
  onClose: () => void;
  onSave: (updatedMarket: AdminMarket) => void;
}

type DropdownType = 'status' | 'gl' | 'channel' | 'banner' | 'handelskette' | 'filiale' | 'kundentyp' | 'maingroup' | 'subgroup';

export const MarketDetailsModal: React.FC<MarketDetailsModalProps> = ({ 
  market,
  allMarkets, 
  onClose,
  onSave 
}) => {
  const [formData, setFormData] = useState<AdminMarket>(market);
  const [openDropdown, setOpenDropdown] = useState<DropdownType | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<DropdownType, string>>({
    status: '',
    gl: '',
    channel: '',
    banner: '',
    handelskette: '',
    filiale: '',
    kundentyp: '',
    maingroup: '',
    subgroup: ''
  });
  const dropdownRefs = useRef<Record<DropdownType, HTMLDivElement | null>>({
    status: null,
    gl: null,
    channel: null,
    banner: null,
    handelskette: null,
    filiale: null,
    kundentyp: null,
    maingroup: null,
    subgroup: null
  });

  // Extract unique values from all markets
  const uniqueChannels = useMemo(() => {
    const channels = allMarkets.map(m => m.channel).filter((c): c is string => !!c);
    return Array.from(new Set(channels)).sort();
  }, [allMarkets]);

  const uniqueBanners = useMemo(() => {
    const banners = allMarkets.map(m => m.banner).filter((b): b is string => !!b);
    return Array.from(new Set(banners)).sort();
  }, [allMarkets]);

  const uniqueChains = useMemo(() => {
    const chains = allMarkets.map(m => m.chain).filter((c): c is string => !!c);
    return Array.from(new Set(chains)).sort();
  }, [allMarkets]);

  const uniqueBranches = useMemo(() => {
    const branches = allMarkets.map(m => m.branch).filter((b): b is string => !!b);
    return Array.from(new Set(branches)).sort();
  }, [allMarkets]);

  const uniqueCustomerTypes = useMemo(() => {
    const types = allMarkets.map(m => m.customerType).filter((t): t is string => !!t);
    return Array.from(new Set(types)).sort();
  }, [allMarkets]);

  const uniqueMaingroups = useMemo(() => {
    const groups = allMarkets.map(m => m.maingroup).filter((g): g is string => !!g);
    return Array.from(new Set(groups)).sort();
  }, [allMarkets]);

  const uniqueSubgroups = useMemo(() => {
    const groups = allMarkets.map(m => m.subgroup).filter((g): g is string => !!g);
    return Array.from(new Set(groups)).sort();
  }, [allMarkets]);

  // List of Gebietsleiter
  const gebietsleiterList = useMemo(() => {
    const gls = allMarkets.map(m => m.gebietsleiter).filter((gl): gl is string => !!gl);
    return Array.from(new Set(gls)).sort();
  }, [allMarkets]);

  const handleChange = (field: string, value: string | boolean | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDropdownToggle = (dropdown: DropdownType) => {
    if (openDropdown === dropdown) {
      setOpenDropdown(null);
      setDropdownPosition(null);
    } else {
      const ref = dropdownRefs.current[dropdown];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
      setOpenDropdown(dropdown);
      setSearchQueries(prev => ({ ...prev, [dropdown]: '' }));
    }
  };

  const handleSearchChange = (dropdown: DropdownType, query: string) => {
    setSearchQueries(prev => ({ ...prev, [dropdown]: query }));
  };

  const handleSelect = (field: keyof AdminMarket, value: string | boolean | undefined) => {
    handleChange(field, value);
    setOpenDropdown(null);
    setDropdownPosition(null);
  };

  const filterOptions = (options: string[], query: string) => {
    if (!query.trim()) return options;
    const lowerQuery = query.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(lowerQuery));
  };

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        const target = event.target as Node;
        
        // Check if click is outside the dropdown button
        if (ref && !ref.contains(target)) {
          // Also check if click is not on the portal dropdown menu
          const dropdownMenu = document.querySelector(`.${styles.dropdownMenuPortal}`);
          if (!dropdownMenu || !dropdownMenu.contains(target)) {
            setOpenDropdown(null);
            setDropdownPosition(null);
          }
        }
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const renderSearchableDropdown = (
    type: DropdownType,
    label: string,
    currentValue: string | undefined,
    options: string[],
    placeholder: string = 'Auswählen...',
    allowEmpty: boolean = true
  ) => {
    const filteredOptions = filterOptions(options, searchQueries[type]);
    const isOpen = openDropdown === type;

    const dropdownMenu = isOpen && dropdownPosition ? ReactDOM.createPortal(
      <div 
        className={`${styles.dropdownMenu} ${styles.dropdownMenuPortal}`}
        style={{
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`
        }}
      >
        {/* Search Bar */}
        <div className={styles.dropdownSearch} onClick={(e) => e.stopPropagation()}>
          <MagnifyingGlass size={16} weight="bold" className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Suchen..."
            value={searchQueries[type]}
            onChange={(e) => handleSearchChange(type, e.target.value)}
            autoFocus
          />
        </div>

        {/* Options */}
        <div className={styles.dropdownOptions}>
          {allowEmpty && (
            <div 
              className={`${styles.dropdownOption} ${styles.dropdownOptionGrey}`}
              onClick={() => handleSelect(getFieldNameForType(type), undefined)}
            >
              Leer
            </div>
          )}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div 
                key={option}
                className={`${styles.dropdownOption} ${styles.dropdownOptionGrey}`}
                onClick={() => handleSelect(getFieldNameForType(type), option)}
              >
                {option}
              </div>
            ))
          ) : (
            <div className={styles.dropdownEmpty}>Keine Ergebnisse</div>
          )}
        </div>
      </div>,
      document.body
    ) : null;

    return (
      <div className={styles.field} ref={(el) => { dropdownRefs.current[type] = el; }}>
        <label className={styles.label}>{label}</label>
        <div 
          className={styles.customDropdown}
          onClick={() => handleDropdownToggle(type)}
        >
          <span className={currentValue ? styles.dropdownText : styles.dropdownPlaceholder}>
            {currentValue || placeholder}
          </span>
          <CaretDown size={16} weight="bold" />
          {dropdownMenu}
        </div>
      </div>
    );
  };

  const getFieldNameForType = (type: DropdownType): keyof AdminMarket => {
    const mapping: Record<DropdownType, keyof AdminMarket> = {
      status: 'isActive',
      gl: 'gebietsleiter',
      channel: 'channel',
      banner: 'banner',
      handelskette: 'chain',
      filiale: 'branch',
      kundentyp: 'customerType',
      maingroup: 'maingroup',
      subgroup: 'subgroup'
    };
    return mapping[type];
  };

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

          <div className={styles.field} ref={(el) => { dropdownRefs.current.gl = el; }}>
            <label className={styles.label}>Gebietsleiter</label>
            <div 
              className={styles.customDropdown}
              onClick={() => handleDropdownToggle('gl')}
            >
              <span className={formData.gebietsleiter ? styles.dropdownText : styles.dropdownPlaceholder}>
                {formData.gebietsleiter || 'Auswählen...'}
              </span>
              <CaretDown size={16} weight="bold" />
              
              {openDropdown === 'gl' && dropdownPosition && ReactDOM.createPortal(
                <div 
                  className={`${styles.dropdownMenu} ${styles.dropdownMenuPortal}`}
                  style={{
                    position: 'fixed',
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`
                  }}
                >
                  {/* Search Bar */}
                  <div className={styles.dropdownSearch} onClick={(e) => e.stopPropagation()}>
                    <MagnifyingGlass size={16} weight="bold" className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Suchen..."
                      value={searchQueries.gl}
                      onChange={(e) => handleSearchChange('gl', e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* Options */}
                  <div className={styles.dropdownOptions}>
                    <div 
                      className={`${styles.dropdownOption} ${styles.dropdownOptionGrey}`}
                      onClick={() => handleSelect('gebietsleiter', undefined)}
                    >
                      Leer
                    </div>
                    {filterOptions(gebietsleiterList, searchQueries.gl).length > 0 ? (
                      filterOptions(gebietsleiterList, searchQueries.gl).map((gl) => (
                        <div 
                          key={gl}
                          className={`${styles.dropdownOption} ${styles.dropdownOptionGrey}`}
                          onClick={() => handleSelect('gebietsleiter', gl)}
                        >
                          {gl}
                        </div>
                      ))
                    ) : (
                      <div className={styles.dropdownEmpty}>Keine Ergebnisse</div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          {renderSearchableDropdown('channel', 'Channel', formData.channel, uniqueChannels, 'Channel', true)}

          {renderSearchableDropdown('banner', 'Banner', formData.banner, uniqueBanners, 'Banner', true)}

          {/* Row 2 */}
          {renderSearchableDropdown('handelskette', 'Handelskette', formData.chain, uniqueChains, 'Handelskette', false)}

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

          <div className={styles.field} ref={(el) => { dropdownRefs.current.status = el; }}>
            <label className={styles.label}>Status</label>
            <div 
              className={styles.customDropdown}
              onClick={() => handleDropdownToggle('status')}
            >
              <span className={formData.isActive ? styles.activeText : styles.inactiveText}>
                {formData.isActive ? 'Aktiv' : 'Inaktiv'}
              </span>
              <CaretDown size={16} weight="bold" />
              
              {openDropdown === 'status' && dropdownPosition && ReactDOM.createPortal(
                <div 
                  className={`${styles.dropdownMenu} ${styles.dropdownMenuPortal}`}
                  style={{
                    position: 'fixed',
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`
                  }}
                >
                  <div 
                    className={`${styles.dropdownOption} ${styles.dropdownOptionActive}`}
                    onClick={() => handleSelect('isActive', true)}
                  >
                    Aktiv
                  </div>
                  <div 
                    className={`${styles.dropdownOption} ${styles.dropdownOptionInactive}`}
                    onClick={() => handleSelect('isActive', false)}
                  >
                    Inaktiv
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          {renderSearchableDropdown('filiale', 'Filiale', formData.branch, uniqueBranches, 'Filiale', true)}

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

          {renderSearchableDropdown('kundentyp', 'Kundentyp', formData.customerType, uniqueCustomerTypes, 'Kundentyp', true)}

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

            {renderSearchableDropdown('maingroup', 'Maingroup', formData.maingroup, uniqueMaingroups, 'Maingroup', true)}

            {renderSearchableDropdown('subgroup', 'Subgroup', formData.subgroup, uniqueSubgroups, 'z.B. 3F - Adeg', true)}
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

